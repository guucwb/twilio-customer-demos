import React, { useState } from 'react';

import { BANKS, bankName } from '../domain/catalog';
import { formatDuration, formatPercent, summarizeHistory, summarizeRealtime } from '../domain/metrics';
import type {
  AgentsReport,
  AnalyticsDataProvider,
  ApiResult,
  BankId,
  HistoryReport,
  MeReport,
  RealtimeSnapshot,
  TrendPoint,
} from '../domain/types';
import { StackedBars, TrendChart } from './Charts';

const bankColor = (id: BankId | null) => BANKS.find((b) => b.id === id)?.color ?? '#8891aa';
const fmtInt = (n: number) => n.toLocaleString('pt-BR');

function Kpi({ k, v, s }: { k: string; v: string; s?: string }): JSX.Element {
  return (
    <div className="fa-card fa-kpi">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {s ? <div className="s">{s}</div> : null}
    </div>
  );
}

export function ErrorState({ status, error, simulated }: { status: number; error: string; simulated: boolean }): JSX.Element {
  const msg =
    status === 403
      ? 'Acesso negado pela política de escopo (deny-by-default).'
      : status === 401
        ? 'Sessão não autenticada ou token expirado.'
        : status === 502 || status === 0
          ? 'Fonte de dados indisponível. Nenhum dado é exibido como fallback (nem cache de outro escopo).'
          : 'Falha ao carregar dados.';
  return (
    <div className="fa-callout err" role="alert">
      <strong>
        HTTP {status || '—'} · {error}
      </strong>{' '}
      {simulated ? <span className="fa-badge demo">SIMULADO</span> : null}
      <div>{msg}</div>
    </div>
  );
}

export function Limitations({ items }: { items: string[] }): JSX.Element | null {
  if (!items.length) return null;
  return (
    <>
      {items.map((t) => (
        <div key={t} className="fa-callout warn">
          ⚠ {t}
        </div>
      ))}
    </>
  );
}

/* ───────────────────────────── Tempo real ───────────────────────────── */

export function LivePanel(props: {
  snapshot: RealtimeSnapshot | null;
  trend: TrendPoint[];
  loading: boolean;
}): JSX.Element {
  const { snapshot, trend, loading } = props;
  if (!snapshot) return <div className="fa-empty">{loading ? <span className="fa-spinner" /> : 'Sem dados.'}</div>;
  if (snapshot.queues.length === 0) return <div className="fa-empty">Nenhuma fila no seu escopo.</div>;
  const segregated = snapshot.queues.filter((q) => !q.sharedAcrossBanks);
  const t = summarizeRealtime(segregated);
  return (
    <>
      <div className="fa-kpis">
        <Kpi k="Tarefas aguardando" v={fmtInt(t.waiting)} s={`${fmtInt(t.reserved)} reservadas`} />
        <Kpi k="Em andamento" v={fmtInt(t.active)} s="Tasks atribuídas nas filas visíveis" />
        <Kpi k="Maior espera" v={formatDuration(t.longestWaitSeconds)} s="Task mais antiga em fila" />
        <Kpi
          k="SLA de fila"
          v={formatPercent(t.slaPercent)}
          s={snapshot.source === 'mock' ? 'Ilustrativo (simulado)' : 'n/d no RealTimeStatistics'}
        />
        <Kpi
          k="Agentes elegíveis (únicos)"
          v={snapshot.agents.eligible === null ? 'n/d' : fmtInt(snapshot.agents.eligible)}
          s={`${snapshot.agents.available ?? 'n/d'} disponíveis · soma de elegibilidades: ${snapshot.agents.eligibilitySum}`}
        />
      </div>
      <div className="fa-callout info">ℹ {snapshot.agents.note}</div>
      <Limitations items={snapshot.limitations} />
      <div className="fa-grid">
        <div className="fa-card">
          <div className="fa-cardhead">
            <h3>Volume em andamento</h3>
            <span className="fa-hint">{snapshot.trend ? 'Últimos 60 min · simulado' : 'Pontos coletados nesta sessão'}</span>
          </div>
          <TrendChart points={trend} />
        </div>
        <div className="fa-card">
          <div className="fa-cardhead">
            <h3>Filas monitoradas</h3>
            <span className="fa-hint">{snapshot.queues.length} filas no escopo</span>
          </div>
          {snapshot.queues.map((q) => (
            <div key={q.queueKey} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f0f1f4' }}>
              <div>
                <span className="fa-bankdot" style={{ background: bankColor(q.bankId) }} />
                <strong>{q.label}</strong>
                {q.sharedAcrossBanks ? <span className="fa-tag warn" style={{ marginLeft: 6 }}>sem quebra por banco</span> : null}
                <div className="fa-hint">{q.tasksActive} em andamento</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: 18 }}>{q.tasksWaiting}</strong>
                <div className="fa-hint">aguardando</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="fa-card">
        <div className="fa-cardhead">
          <h3>Real-Time Queues — recorte autorizado</h3>
          <span className="fa-hint">Fonte: {snapshot.source === 'mock' ? 'simulação' : 'TaskRouter RealTimeStatistics (via backend)'}</span>
        </div>
        <div className="fa-tablewrap">
          <table className="fa-table">
            <thead>
              <tr>
                <th>Fila</th>
                <th>Banco</th>
                <th>Torre</th>
                <th className="num">Aguardando</th>
                <th className="num">Reservadas</th>
                <th className="num">Em andamento</th>
                <th className="num">Elegíveis</th>
                <th className="num">Disponíveis</th>
                <th className="num">Maior espera</th>
                <th className="num">SLA</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.queues.map((q) => (
                <tr key={q.queueKey} className={q.sharedAcrossBanks ? 'hl' : undefined}>
                  <td>
                    <code>{q.queueKey}</code>
                  </td>
                  <td>
                    <span className="fa-bankdot" style={{ background: bankColor(q.bankId) }} />
                    {bankName(q.bankId)}
                  </td>
                  <td>
                    <span className={`fa-tag ${q.tower.toLowerCase()}`}>{q.tower}</span>
                  </td>
                  <td className="num">{q.tasksWaiting}</td>
                  <td className="num">{q.tasksReserved}</td>
                  <td className="num">{q.tasksActive}</td>
                  <td className="num">{q.eligibleWorkers}</td>
                  <td className="num">{q.availableWorkers}</td>
                  <td className="num">{formatDuration(q.longestWaitSeconds)}</td>
                  <td className="num">{formatPercent(q.slaPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────────── Histórico ───────────────────────────── */

export function HistoryPanel(props: {
  report: HistoryReport | null;
  loading: boolean;
  onExport: () => void;
  exportStatus: string | null;
}): JSX.Element {
  const { report, loading } = props;
  if (!report) return <div className="fa-empty">{loading ? <span className="fa-spinner" /> : 'Sem dados.'}</div>;
  const totals = summarizeHistory(report.days);
  const dates = Array.from(new Set(report.days.map((d) => d.date)));
  const bars = dates.map((date) => {
    const ofDay = report.days.filter((d) => d.date === date);
    return {
      label: date.slice(8, 10) + '/' + date.slice(5, 7),
      cx: ofDay.filter((d) => d.tower === 'CX').reduce((s, d) => s + d.handled, 0),
      cq: ofDay.filter((d) => d.tower === 'CQ').reduce((s, d) => s + d.handled, 0),
    };
  });
  return (
    <>
      <div className="fa-kpis">
        <Kpi k="Atendimentos encerrados" v={totals ? fmtInt(totals.handled) : '0'} s={`${report.from} → ${report.to}`} />
        <Kpi k="Primeira resposta (média)" v={totals ? formatDuration(totals.firstResponseSeconds) : 'n/d'} s="Ponderada por volume" />
        <Kpi k="Resolução do ticket (média)" v={totals ? formatDuration(totals.resolutionMinutes * 60) : 'n/d'} s="Em produção: Insights + JALL" />
        <Kpi k="SLA de atendimento" v={totals ? formatPercent(totals.slaPercent) : 'n/d'} s="Ilustrativo" />
      </div>
      <Limitations items={report.limitations} />
      <div className="fa-grid">
        <div className="fa-card">
          <div className="fa-cardhead">
            <h3>Evolução diária</h3>
            <span className="fa-hint">Atendimentos encerrados · CX + CQ</span>
          </div>
          <StackedBars data={bars} />
        </div>
        <div className="fa-card">
          <div className="fa-cardhead">
            <h3>Por banco e torre</h3>
            <button type="button" className="fa-btn" onClick={props.onExport}>
              Exportar CSV
            </button>
          </div>
          {props.exportStatus ? <div className="fa-hint" style={{ marginBottom: 8 }}>{props.exportStatus}</div> : null}
          <div className="fa-tablewrap">
            <table className="fa-table">
              <thead>
                <tr>
                  <th>Banco</th>
                  <th>Torre</th>
                  <th className="num">Atend.</th>
                  <th className="num">1ª resp.</th>
                  <th className="num">Resolução</th>
                </tr>
              </thead>
              <tbody>
                {report.scope.flatMap((bankId) =>
                  (['CX', 'CQ'] as const).map((tower) => {
                    const rows = report.days.filter((d) => d.bankId === bankId && d.tower === tower);
                    const s = summarizeHistory(rows);
                    return (
                      <tr key={`${bankId}-${tower}`}>
                        <td>
                          <span className="fa-bankdot" style={{ background: bankColor(bankId) }} />
                          {bankName(bankId)}
                        </td>
                        <td>
                          <span className={`fa-tag ${tower.toLowerCase()}`}>{tower}</span>
                        </td>
                        <td className="num">{s ? fmtInt(s.handled) : 0}</td>
                        <td className="num">{s ? formatDuration(s.firstResponseSeconds) : '—'}</td>
                        <td className="num">{s ? formatDuration(s.resolutionMinutes * 60) : '—'}</td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="fa-two">
        <div className="fa-card">
          <h3>Fontes históricas (produção)</h3>
          <ul className="fa-list">
            <li>
              <strong>Flex Insights Export API</strong> — executada por backend/ETL, nunca pelo navegador; grava em data mart por banco com RLS e
              auditoria.
            </li>
            <li>
              <strong>JALL</strong> — status e encerramento do ticket de negócio (tempo até resolução).
            </li>
            <li>
              <strong>TaskRouter Events / Event Streams</strong> — eventos por Task com <code>bank_id</code>, <code>tower</code> e{' '}
              <code>ticket_id</code>.
            </li>
          </ul>
        </div>
        <div className="fa-callout warn" style={{ margin: 0 }}>
          ⚠ Insights não é fonte de streaming em segundos. Tempo real vem do TaskRouter; histórico vem do data mart.
        </div>
      </div>
    </>
  );
}

/* ───────────────────────────── Agentes e filas ───────────────────────────── */

export function AgentsPanel({ report, loading }: { report: AgentsReport | null; loading: boolean }): JSX.Element {
  if (!report) return <div className="fa-empty">{loading ? <span className="fa-spinner" /> : 'Sem dados.'}</div>;
  const multi = report.agents.find((a) => a.workerSid === 'WKdemo-multi-01');
  return (
    <>
      {report.scope.length > 1 ? (
        <div className="fa-callout ok">
          <strong>Uma identidade, várias TaskQueues.</strong> O Worker <code>Agente 01</code> tem os atributos{' '}
          <code>{'{"routing":{"banks":["itau","santander","caixa"],"towers":["CX"]}}'}</code> e é elegível para CX_ITAU, CX_SANTANDER e
          CX_CAIXA pelas target expressions <code>routing.banks HAS "&lt;banco&gt;" AND routing.towers HAS "CX"</code>. Não existem três logins.
        </div>
      ) : (
        <div className="fa-callout ok">
          <strong>Agentes compartilhados, visão segregada.</strong> Agentes podem atender outras operações na mesma instância Flex; a
          elegibilidade fora do seu escopo não é exibida.
        </div>
      )}
      <div className="fa-kpis">
        <Kpi k="Headcount único (escopo)" v={fmtInt(report.uniqueHeadcount)} s="Workers distintos" />
        <Kpi k="Soma de elegibilidades" v={fmtInt(report.eligibilitySum)} s="Não somar como pessoas" />
        <Kpi
          k="Agente 01 neste escopo"
          v={multi ? `${multi.eligibleQueueKeys.length} fila(s)` : 'fora do escopo'}
          s={multi ? multi.eligibleQueueKeys.join(' · ') : 'Não elegível às filas visíveis'}
        />
      </div>
      <div className="fa-callout info">ℹ {report.note} Supervisores de banco veem apenas as filas do próprio escopo na elegibilidade de cada agente.</div>
      <div className="fa-card">
        <div className="fa-cardhead">
          <h3>Workers ilustrativos</h3>
          <span className="fa-hint">Dados fictícios · elegibilidade calculada pelas target expressions</span>
        </div>
        <div className="fa-tablewrap">
          <table className="fa-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Atividade</th>
                <th>Filas elegíveis (no seu escopo)</th>
              </tr>
            </thead>
            <tbody>
              {report.agents.map((a) => (
                <tr key={a.workerSid} className={a.workerSid === 'WKdemo-multi-01' ? 'hl' : undefined}>
                  <td>
                    <strong>{a.displayName}</strong>
                    <div className="fa-hint">
                      <code>{a.workerSid}</code>
                    </div>
                  </td>
                  <td>{a.activity}</td>
                  <td>
                    {a.eligibleQueueKeys.map((k) => (
                      <span key={k} className={`fa-tag ${k.startsWith('CX') ? 'cx' : 'cq'}`}>
                        {k}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────────── Segurança ───────────────────────────── */

interface ProbeResult {
  line: string;
  result: ApiResult<unknown>;
  at: string;
}

function summarizeBody(result: ApiResult<unknown>): string {
  if (!result.ok) return JSON.stringify({ error: result.error }, null, 2);
  const data = result.data as Partial<RealtimeSnapshot> | string;
  if (typeof data === 'string') return `${data.split('\n').length - 2} linhas CSV (escopo autorizado)`;
  const banks = Array.from(new Set((data.queues ?? []).map((q) => q.bankId)));
  return JSON.stringify({ scope: data.scope, queues: (data.queues ?? []).map((q) => q.queueKey), banksInBody: banks }, null, 2);
}

export function SecurityPanel(props: {
  provider: AnalyticsDataProvider;
  me: MeReport | null;
  viewerLabel: string;
  queuesFilter: { applied: boolean; sidCount: number } | null;
  onApplyQueuesFilter?: (sids: string[] | null) => void;
}): JSX.Element {
  const { provider, me } = props;
  const [filterMsg, setFilterMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'A' | 'B'>('B');
  const defaultTarget = BANKS.find((b) => !me?.allowedBanks.includes(b.id))?.id ?? 'santander';
  const [target, setTarget] = useState<string>(defaultTarget);
  const [probes, setProbes] = useState<ProbeResult[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async (kind: 'queues' | 'export') => {
    setBusy(true);
    const result: ApiResult<unknown> = kind === 'queues' ? await provider.getRealtime(target) : await provider.exportHistoryCsv(target);
    const line =
      (!result.ok && result.requestLine) ||
      (kind === 'queues' ? `GET /api/analytics/queues?bankId=${target}` : `GET /api/analytics/history/export.csv?bankId=${target}`);
    setProbes((p) => [{ line, result, at: new Date().toLocaleTimeString('pt-BR') }, ...p].slice(0, 6));
    setBusy(false);
  };

  return (
    <>
      <div className="fa-mode" role="group" aria-label="Arquitetura">
        <button type="button" aria-pressed={mode === 'A'} onClick={() => setMode('A')}>
          <strong>A · Filtro visual (Real-Time Queues View)</strong>
          <span className="fa-hint">setFilter + setSubscriptionFilter por SID. Experiência, não segurança.</span>
        </button>
        <button type="button" aria-pressed={mode === 'B'} onClick={() => setMode('B')}>
          <strong>B · Reporting autorizado no backend</strong>
          <span className="fa-hint">Token verificado + escopo resolvido no servidor + 403 por padrão.</span>
        </button>
      </div>

      {mode === 'A' ? (
        <div className="fa-two">
          <div className="fa-card">
            <h3>O que o modo A faz</h3>
            <ul className="fa-list">
              <li>
                <code>Flex.QueuesStats.setFilter(q =&gt; allowed.has(q.key))</code> esconde filas na Real-Time Queues View.
              </li>
              <li>
                <code>Flex.QueuesStats.setSubscriptionFilter(q =&gt; allowed.has(q.sid))</code> evita assinar atualizações das filas ocultas.
              </li>
              <li>
                Estado neste Flex:{' '}
                {props.queuesFilter
                  ? props.queuesFilter.applied
                    ? `aplicado com ${props.queuesFilter.sidCount} SID(s)`
                    : 'desativado (FLEX_APP_ENABLE_QUEUES_FILTER=false)'
                  : 'pré-visualização fora do Flex'}
                .
              </li>
              <li>SIDs no seu escopo: {me ? me.allowedQueueSids.length : '—'}.</li>
            </ul>
            {props.onApplyQueuesFilter ? (
              <div className="fa-controls" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="fa-btn primary"
                  disabled={!me}
                  onClick={() => {
                    props.onApplyQueuesFilter?.(me ? me.allowedQueueSids : []);
                    setFilterMsg(`Filtro aplicado nesta sessão com ${me?.allowedQueueSids.length ?? 0} SID(s). Abra Queues Stats no menu lateral.`);
                  }}
                >
                  Aplicar filtro A nesta sessão
                </button>
                <button
                  type="button"
                  className="fa-btn"
                  onClick={() => {
                    props.onApplyQueuesFilter?.(null);
                    setFilterMsg('Filtro removido: a Real-Time Queues View volta a mostrar todas as filas.');
                  }}
                >
                  Remover filtro
                </button>
              </div>
            ) : null}
            {filterMsg ? <div className="fa-hint" style={{ marginTop: 8 }}>{filterMsg}</div> : null}
          </div>
          <div className="fa-callout warn" style={{ margin: 0 }}>
            <strong>⚠ O modo A não comprova isolamento.</strong>
            <ul className="fa-list">
              <li>O filtro roda no navegador e pode ser contornado (DevTools, outro plugin, chamadas diretas).</li>
              <li>Não altera a autorização de APIs, deep links, exports, Flex Insights, gravações ou outras telas nativas.</li>
              <li>A doc Twilio avisa: os filtros não ajustam os totais globais de agentes disponíveis.</li>
              <li>Use A para organizar a operação de supervisores internos com confiança mútua — não para fronteira entre bancos.</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="fa-card" style={{ marginBottom: 12 }}>
            <div className="fa-cardhead">
              <h3>Teste de acesso cruzado</h3>
              {provider.kind === 'mock' ? (
                <span className="fa-badge demo">RESULTADO SIMULADO NO NAVEGADOR — não é teste real</span>
              ) : (
                <span className="fa-badge api">BACKEND REAL</span>
              )}
            </div>
            <div className="fa-controls" style={{ marginBottom: 10 }}>
              <div className="fa-field">
                <label>Usuário autenticado</label>
                <strong>{props.viewerLabel}</strong>
              </div>
              <div className="fa-field">
                <label htmlFor="fa-target">bankId solicitado</label>
                <select id="fa-target" className="fa-select" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {BANKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.id})
                    </option>
                  ))}
                  <option value="bradesco">bradesco (inexistente)</option>
                </select>
              </div>
              <button type="button" className="fa-btn primary" disabled={busy} onClick={() => run('queues')}>
                GET /queues?bankId={target}
              </button>
              <button type="button" className="fa-btn" disabled={busy} onClick={() => run('export')}>
                GET /history/export.csv
              </button>
            </div>
            {probes.length === 0 ? <div className="fa-hint">Execute uma requisição para ver a resposta.</div> : null}
            {probes.map((p, i) => (
              <div key={i} className={`fa-callout ${p.result.ok ? 'ok' : 'err'}`}>
                <strong>
                  {p.result.ok ? '200 OK' : `${p.result.status} ${p.result.status === 403 ? 'Forbidden' : p.result.error}`}
                </strong>{' '}
                · <code>{p.line}</code> · {p.at}{' '}
                {!p.result.ok && p.result.simulated ? <span className="fa-badge demo">SIMULADO</span> : null}
                <pre className="fa-code">{summarizeBody(p.result)}</pre>
              </div>
            ))}
          </div>
          <div className="fa-two">
            <div className="fa-card">
              <h3>Como o backend decide</h3>
              <ol className="fa-list">
                <li>Verifica o token Flex (assinatura/validade via Twilio, conta esperada).</li>
                <li>Resolve banks/Queue SIDs no servidor a partir da identidade (RBAC/SSO) — nunca do request.</li>
                <li>Nega por padrão: sem vínculo → 403; bankId fora do escopo ou inexistente → 403 sem dados.</li>
                <li>Consulta TaskRouter só para SIDs autorizados; cache por SID com TTL.</li>
                <li>Audita cada decisão (identidade com hash).</li>
              </ol>
            </div>
            <div className="fa-callout info" style={{ margin: 0 }}>
              O 403 <strong>real</strong> é comprovado pelos testes automatizados do <code>analytics-backend</code> e pelo script{' '}
              <code>npm run demo:cross-tenant</code>, que chama o servidor Node local com tokens assinados.
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ───────────────────────────── Arquitetura ───────────────────────────── */

export function ArchitecturePanel(): JSX.Element {
  return (
    <>
      <div className="fa-card" style={{ marginBottom: 12 }}>
        <h3>Uma instância Flex, reporting em duas camadas</h3>
        <div className="fa-arch" style={{ marginTop: 10 }}>
          <div className="em">
            <strong>Agentes Flash</strong>
            <br />
            <span className="fa-hint">1 Worker, elegível a várias filas por atributos</span>
          </div>
          <div>
            <strong>TaskRouter</strong>
            <br />
            <span className="fa-hint">Workflow por bank_id + tower → CX_* / CQ_*</span>
          </div>
          <div>
            <strong>A · Queues View filtrada</strong>
            <br />
            <span className="fa-hint">UX por supervisor (setFilter/setSubscriptionFilter)</span>
          </div>
          <div className="em">
            <strong>B · Analytics API</strong>
            <br />
            <span className="fa-hint">Token verificado, escopo no servidor, 403 por padrão</span>
          </div>
          <div>
            <strong>Data mart por banco</strong>
            <br />
            <span className="fa-hint">ETL Insights + JALL, RLS, auditoria</span>
          </div>
        </div>
      </div>
      <div className="fa-two">
        <div className="fa-card">
          <h3>Princípios</h3>
          <ul className="fa-list">
            <li>
              <code>bank_id</code> vem da integração que cria a Task (JALL/URA/API), nunca do navegador.
            </li>
            <li>Transferência CX→CQ preserva o banco de origem; o Workflow só roteia para filas do mesmo banco.</li>
            <li>Filas CQ segregadas por banco; fila compartilhada não gera números por banco.</li>
            <li>Auth Token/API Key apenas no backend; navegador envia só o token Flex do usuário.</li>
          </ul>
        </div>
        <div className="fa-card">
          <h3>Requer aprovação (não aplicado)</h3>
          <ul className="fa-list">
            <li>Roles/SSO: claim de banco no IdP → RBAC do backend; supervisores externos sem acesso a telas nativas sensíveis.</li>
            <li>Workflow TaskRouter: filtros por bank_id/tower para as filas CX_*/CQ_*.</li>
            <li>Worker attributes: routing.banks / routing.towers.</li>
            <li>Insights: restringir acesso/roles; ETL para data mart.</li>
            <li>Deploy do plugin e do backend.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
