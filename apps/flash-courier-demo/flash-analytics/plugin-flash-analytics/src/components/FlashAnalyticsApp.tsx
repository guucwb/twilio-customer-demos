import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { bankName } from '../domain/catalog';
import { DEMO_PROFILES, DemoProfileId, getDemoProfile } from '../domain/demoProfiles';
import type { AgentsReport, AnalyticsDataProvider, HistoryReport, MeReport, RealtimeSnapshot, TrendPoint } from '../domain/types';
import { createMockDataProvider } from '../providers/mockDataProvider';
import { AgentsPanel, ArchitecturePanel, ErrorState, HistoryPanel, LivePanel, SecurityPanel } from './Panels';
import { CSS, STYLE_ID } from './styles';

type Tab = 'live' | 'history' | 'agents' | 'security' | 'architecture';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'live', label: 'Tempo real' },
  { id: 'history', label: 'Histórico' },
  { id: 'agents', label: 'Agentes e filas' },
  { id: 'security', label: 'Segurança da segregação' },
  { id: 'architecture', label: 'Arquitetura' },
];

export interface FlashAnalyticsAppProps {
  /** 'mock' → in-browser simulation with demo profile switcher. 'api' → secure backend (Architecture B). */
  source: 'mock' | 'api';
  /** Builds the Architecture B client; getViewAs returns the demo "view as" profile (server-enforced, narrow-only). */
  apiProviderFactory?: (getViewAs: () => string | undefined) => AnalyticsDataProvider;
  /** Backend accepts X-Flash-View-As (demo deployments only). */
  demoViewAs?: boolean;
  /** Present only inside Flex: apply/remove the Architecture A filter on the native Real-Time Queues View. */
  onApplyQueuesFilter?: (sids: string[] | null) => void;
  queuesFilter?: { applied: boolean; sidCount: number } | null;
  flexIdentity?: string;
  pollMs?: number;
  /** Preview/demo deep-link helpers. */
  initialProfile?: DemoProfileId;
  initialTab?: string;
}

type Err = { status: number; error: string; simulated: boolean };

function useInjectedStyles() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

export function FlashAnalyticsApp(props: FlashAnalyticsAppProps): JSX.Element {
  useInjectedStyles();
  const pollMs = props.pollMs ?? 4000;
  const canUseApi = props.source === 'api' && Boolean(props.apiProviderFactory);
  const [dataMode, setDataMode] = useState<'api' | 'mock'>(canUseApi ? 'api' : 'mock');
  const isMock = dataMode === 'mock';
  const showProfileSwitcher = isMock || Boolean(props.demoViewAs);

  const [profileId, setProfileId] = useState<DemoProfileId>(
    props.initialProfile && DEMO_PROFILES.some((p) => p.id === props.initialProfile) ? props.initialProfile : 'flash_admin',
  );
  const profileRef = useRef(profileId);
  profileRef.current = profileId;
  const [simulateFailure, setSimulateFailure] = useState(false);
  const failRef = useRef(simulateFailure);
  failRef.current = simulateFailure;

  const provider = useMemo<AnalyticsDataProvider>(() => {
    if (!isMock && props.apiProviderFactory) {
      return props.apiProviderFactory(() => (props.demoViewAs && profileRef.current !== 'flash_admin' ? profileRef.current : undefined));
    }
    return createMockDataProvider({ getProfile: () => getDemoProfile(profileRef.current), shouldFail: () => failRef.current, latencyMs: 150 });
  }, [isMock, props.apiProviderFactory, props.demoViewAs]);

  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === props.initialTab) ? (props.initialTab as Tab) : 'live');
  const [bankFilter, setBankFilter] = useState<string>('');
  const [me, setMe] = useState<MeReport | null>(null);
  const [meErr, setMeErr] = useState<Err | null>(null);
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);
  const [rtErr, setRtErr] = useState<Err | null>(null);
  const [history, setHistory] = useState<HistoryReport | null>(null);
  const [histErr, setHistErr] = useState<Err | null>(null);
  const [agents, setAgents] = useState<AgentsReport | null>(null);
  const [agErr, setAgErr] = useState<Err | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [polled, setPolled] = useState<Array<{ t: number; active: number; waiting: number }>>([]);

  // Generation counter: responses from a previous profile/scope are discarded,
  // so a slow response can never paint another tenant's data after a switch.
  const gen = useRef(0);

  const loadRealtime = useCallback(
    async (g: number) => {
      const r = await provider.getRealtime(bankFilter || undefined);
      if (g !== gen.current) return;
      if (r.ok) {
        setSnapshot(r.data);
        setRtErr(null);
        if (!r.data.trend) {
          const segregated = r.data.queues.filter((q) => !q.sharedAcrossBanks);
          setPolled((p) =>
            [
              ...p,
              {
                t: Date.now(),
                active: segregated.reduce((s, q) => s + q.tasksActive, 0),
                waiting: segregated.reduce((s, q) => s + q.tasksWaiting, 0),
              },
            ].filter((x) => Date.now() - x.t <= 60 * 60000),
          );
        }
      } else {
        // Never keep previous data as a fallback.
        setSnapshot(null);
        setRtErr({ status: r.status, error: r.error, simulated: r.simulated });
      }
      setLastRefresh(new Date());
    },
    [provider, bankFilter],
  );

  const loadAll = useCallback(async () => {
    const g = ++gen.current;
    setLoading(true);
    setMe(null);
    setSnapshot(null);
    setHistory(null);
    setAgents(null);
    setPolled([]);
    setExportStatus(null);
    const [m, h, a] = await Promise.all([provider.getMe(), provider.getHistory(bankFilter || undefined, 7), provider.getAgents()]);
    if (g !== gen.current) return;
    setMe(m.ok ? m.data : null);
    setMeErr(m.ok ? null : { status: m.status, error: m.error, simulated: m.simulated });
    setHistory(h.ok ? h.data : null);
    setHistErr(h.ok ? null : { status: h.status, error: h.error, simulated: h.simulated });
    setAgents(a.ok ? a.data : null);
    setAgErr(a.ok ? null : { status: a.status, error: a.error, simulated: a.simulated });
    await loadRealtime(g);
    if (g === gen.current) setLoading(false);
  }, [provider, bankFilter, loadRealtime]);

  useEffect(() => {
    void loadAll();
  }, [loadAll, profileId]);

  useEffect(() => {
    const id = setInterval(() => void loadRealtime(gen.current), pollMs);
    return () => clearInterval(id);
  }, [loadRealtime, pollMs]);

  const onProfileChange = (id: DemoProfileId) => {
    setBankFilter('');
    setProfileId(id);
  };

  const onExport = async () => {
    const r = await provider.exportHistoryCsv(bankFilter || undefined);
    if (!r.ok) {
      setExportStatus(`Exportação negada: HTTP ${r.status} (${r.error})${r.simulated ? ' — simulado' : ''}`);
      return;
    }
    try {
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flash-analytics-historico-${bankFilter || 'escopo'}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportStatus(`CSV gerado com ${r.data.trim().split('\n').length - 1} linhas do escopo autorizado.`);
    } catch {
      setExportStatus('Não foi possível iniciar o download neste ambiente.');
    }
  };

  const trend: TrendPoint[] = useMemo(() => {
    if (snapshot?.trend) return snapshot.trend;
    const now = Date.now();
    return polled.map((p) => ({ minutesAgo: Math.round(((now - p.t) / 60000) * 10) / 10, active: p.active, waiting: p.waiting }));
  }, [snapshot, polled]);

  const flexUser = props.flexIdentity ?? 'usuário Flex';
  const viewerLabel = isMock
    ? getDemoProfile(profileId).label
    : props.demoViewAs && profileId !== 'flash_admin'
      ? `${flexUser} → ver como ${getDemoProfile(profileId).label}`
      : flexUser;
  const scopeTitle = !me
    ? '—'
    : bankFilter
      ? bankName(bankFilter as never)
      : me.allowedBanks.length > 1
        ? `Consolidado · ${me.allowedBanks.map((b) => bankName(b)).join(', ')}`
        : bankName(me.allowedBanks[0]);

  const tabError = tab === 'live' ? rtErr : tab === 'history' ? histErr : tab === 'agents' ? agErr : null;

  return (
    <div className="fa-root">
      <header className="fa-header">
        <div className="fa-title">
          <div className="fa-logo" aria-hidden="true">
            FC
          </div>
          <div>
            <h1>Flash Analytics</h1>
            <p>Supervisão segregada por banco · uma instância Twilio Flex</p>
          </div>
        </div>
        <div className="fa-controls">
          {isMock ? (
            <span className="fa-badge demo">DEMO — DADOS FICTÍCIOS</span>
          ) : (
            <span className="fa-badge api">CONTA TWILIO REAL · backend autorizado (B)</span>
          )}
          {rtErr ? (
            <span className="fa-badge err">
              <i className="fa-dot" /> Fonte indisponível
            </span>
          ) : (
            <span className="fa-badge live">
              <i className="fa-dot" /> {isMock ? 'Atualização simulada' : 'Ao vivo'} · {pollMs / 1000}s
            </span>
          )}
          <span className="fa-hint" aria-live="polite">
            Último refresh: {lastRefresh ? lastRefresh.toLocaleTimeString('pt-BR') : '—'}
          </span>
          {canUseApi ? (
            <div className="fa-field">
              <label htmlFor="fa-source">Fonte de dados</label>
              <select id="fa-source" className="fa-select" value={dataMode} onChange={(e) => { setBankFilter(''); setDataMode(e.target.value as 'api' | 'mock'); }}>
                <option value="api">Conta Twilio (TaskRouter real)</option>
                <option value="mock">Simulação offline</option>
              </select>
            </div>
          ) : null}
          {showProfileSwitcher ? (
            <div className="fa-field">
              <label htmlFor="fa-profile">{isMock ? 'Perfil (somente demo)' : 'Ver como (aplicado no servidor)'}</label>
              <select id="fa-profile" className="fa-select" value={profileId} onChange={(e) => onProfileChange(e.target.value as DemoProfileId)}>
                {DEMO_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="fa-field">
              <label>Usuário</label>
              <strong>{viewerLabel}</strong>
            </div>
          )}
        </div>
      </header>

      <nav className="fa-tabs" role="tablist" aria-label="Seções do Flash Analytics">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="fa-tab" onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="fa-body">
        {isMock ? (
          <div className="fa-banner">
            <span aria-hidden="true">⚠</span>
            <div>
              <strong>DEMO — DADOS FICTÍCIOS.</strong> Perfis, métricas e bloqueios desta tela são simulados no navegador. O seletor de perfil existe
              apenas em modo demo; em produção o escopo vem do backend a partir do token Flex verificado.{' '}
              <label style={{ whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} /> simular falha da fonte de
                tempo real
              </label>
            </div>
          </div>
        ) : null}

        {meErr ? (
          <ErrorState {...meErr} />
        ) : (
          <>
            <div className="fa-row">
              <div>
                <h2>{scopeTitle}</h2>
                <p>
                  Escopo de {viewerLabel}
                  {me ? ` · ${me.allowedBanks.length} banco(s) autorizado(s)` : ''}
                </p>
              </div>
              <div className="fa-controls">
                {me && me.allowedBanks.length > 1 && tab !== 'security' && tab !== 'architecture' ? (
                  <div className="fa-chips" role="group" aria-label="Filtro de banco">
                    <button type="button" className="fa-chip" aria-pressed={bankFilter === ''} onClick={() => setBankFilter('')}>
                      Consolidado
                    </button>
                    {me.allowedBanks.map((b) => (
                      <button key={b} type="button" className="fa-chip" aria-pressed={bankFilter === b} onClick={() => setBankFilter(b)}>
                        {bankName(b)}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button type="button" className="fa-btn" onClick={() => void loadAll()}>
                  ↻ Atualizar
                </button>
              </div>
            </div>
            {tabError ? <ErrorState {...tabError} /> : null}
            {tab === 'live' && !rtErr ? <LivePanel snapshot={snapshot} trend={trend} loading={loading} /> : null}
            {tab === 'history' && !histErr ? (
              <HistoryPanel report={history} loading={loading} onExport={() => void onExport()} exportStatus={exportStatus} />
            ) : null}
            {tab === 'agents' && !agErr ? <AgentsPanel report={agents} loading={loading} /> : null}
          </>
        )}
        {tab === 'security' ? (
          <SecurityPanel
            key={`${dataMode}-${profileId}-${me ? me.allowedBanks.join(',') : 'none'}`}
            provider={provider}
            me={me}
            viewerLabel={viewerLabel}
            queuesFilter={props.queuesFilter ?? null}
            onApplyQueuesFilter={isMock ? undefined : props.onApplyQueuesFilter}
          />
        ) : null}
        {tab === 'architecture' ? <ArchitecturePanel /> : null}
        <div className="fa-foot">
          Flash Analytics · PoC · {isMock ? 'dados fictícios, sem chamadas à Twilio' : 'TaskRouter real via analytics backend (Tasks/Workers fictícios do seed)'} · nenhum Auth Token no navegador.
        </div>
      </div>
    </div>
  );
}
