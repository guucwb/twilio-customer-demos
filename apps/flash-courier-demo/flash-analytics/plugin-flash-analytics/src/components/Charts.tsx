import React from 'react';

import type { TrendPoint } from '../domain/types';

const W = 640;
const H = 220;
const PAD = { l: 36, r: 12, t: 12, b: 26 };

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

export function TrendChart({ points }: { points: TrendPoint[] }): JSX.Element {
  if (points.length < 2) {
    return <div className="fa-empty">Coletando pontos de tendência…</div>;
  }
  const max = niceMax(Math.max(...points.map((p) => Math.max(p.active, p.waiting))));
  const span = Math.max(...points.map((p) => p.minutesAgo)) || 1;
  const x = (p: TrendPoint) => PAD.l + ((span - p.minutesAgo) / span) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const line = (pick: (p: TrendPoint) => number) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p)},${y(pick(p))}`).join(' ');
  const area = `${line((p) => p.active)} L${x(points[points.length - 1])},${y(0)} L${x(points[0])},${y(0)} Z`;
  const ticks = [0, max / 2, max];
  const last = points[points.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Tendência: ${last.active} em andamento e ${last.waiting} aguardando agora`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e1e3ea" strokeDasharray={t ? '3 4' : undefined} />
            <text x={PAD.l - 6} y={y(t) + 4} fontSize="10" textAnchor="end" fill="#606b85">
              {Math.round(t)}
            </text>
          </g>
        ))}
        <path d={area} fill="#0263e0" opacity="0.08" />
        <path d={line((p) => p.active)} fill="none" stroke="#0263e0" strokeWidth="2.5" strokeLinejoin="round" />
        <path d={line((p) => p.waiting)} fill="none" stroke="#ed294a" strokeWidth="2" strokeDasharray="5 4" />
        <circle cx={x(last)} cy={y(last.active)} r="4" fill="#0263e0" />
        {points
          .filter((_, i) => i % 3 === 0 || i === points.length - 1)
          .map((p) => (
            <text
              key={p.minutesAgo}
              x={x(p)}
              y={H - 6}
              fontSize="10"
              textAnchor={p.minutesAgo === 0 ? 'end' : p.minutesAgo === span ? 'start' : 'middle'}
              fill="#606b85"
            >
              {p.minutesAgo === 0 ? 'agora' : `−${p.minutesAgo} min`}
            </text>
          ))}
      </svg>
      <div className="fa-legend">
        <span>
          <i className="fa-sw" style={{ background: '#0263e0' }} /> Em andamento
        </span>
        <span>
          <i className="fa-sw" style={{ background: '#ed294a' }} /> Aguardando
        </span>
      </div>
    </div>
  );
}

export interface BarDatum {
  label: string;
  cx: number;
  cq: number;
}

export function StackedBars({ data }: { data: BarDatum[] }): JSX.Element {
  if (data.length === 0) return <div className="fa-empty">Sem dados no período.</div>;
  const max = niceMax(Math.max(...data.map((d) => d.cx + d.cq)));
  const innerW = W - PAD.l - PAD.r;
  const bw = (innerW / data.length) * 0.6;
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Atendimentos encerrados por dia, CX e CQ">
        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e1e3ea" strokeDasharray={t ? '3 4' : undefined} />
            <text x={PAD.l - 6} y={y(t) + 4} fontSize="10" textAnchor="end" fill="#606b85">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx0 = PAD.l + (innerW / data.length) * (i + 0.2);
          return (
            <g key={d.label}>
              <title>{`${d.label}: CX ${d.cx} · CQ ${d.cq}`}</title>
              <rect x={cx0} y={y(d.cx)} width={bw} height={y(0) - y(d.cx)} fill="#0263e0" rx="2" />
              <rect x={cx0} y={y(d.cx + d.cq)} width={bw} height={y(d.cx) - y(d.cx + d.cq)} fill="#8c5bd8" rx="2" />
              <text x={cx0 + bw / 2} y={H - 6} fontSize="10" textAnchor="middle" fill="#606b85">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="fa-legend">
        <span>
          <i className="fa-sw" style={{ background: '#0263e0' }} /> CX (bancos/clientes)
        </span>
        <span>
          <i className="fa-sw" style={{ background: '#8c5bd8' }} /> CQ (retaguarda/franquias)
        </span>
      </div>
    </div>
  );
}
