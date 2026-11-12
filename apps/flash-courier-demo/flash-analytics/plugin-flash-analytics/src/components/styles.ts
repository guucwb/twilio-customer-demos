/** Scoped CSS (prefix .fa-) injected once. Palette close to Flex UI 2 / Twilio Paste defaults. */
export const STYLE_ID = 'flash-analytics-styles';

export const CSS = `
.fa-root{--fa-ink:#121c2d;--fa-muted:#606b85;--fa-line:#e1e3ea;--fa-bg:#f4f4f6;--fa-card:#fff;--fa-blue:#0263e0;--fa-blue-pale:#ebf4ff;
  --fa-red:#d61f1f;--fa-red-pale:#feeceb;--fa-green:#0c7a41;--fa-green-pale:#edfdf3;--fa-gold:#8d3100;--fa-gold-pale:#fef5ee;--fa-accent:#ed294a;
  font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:var(--fa-ink);background:var(--fa-bg);
  height:100%;width:100%;overflow:auto;box-sizing:border-box;font-size:14px;line-height:1.45}
.fa-root *{box-sizing:border-box}
.fa-header{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between;padding:16px 24px;background:var(--fa-card);border-bottom:1px solid var(--fa-line);position:sticky;top:0;z-index:2}
.fa-title{display:flex;align-items:center;gap:12px}
.fa-logo{width:36px;height:36px;border-radius:8px;background:var(--fa-accent);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:14px;letter-spacing:-1px;flex:none}
.fa-title h1{font-size:18px;margin:0;font-weight:700}
.fa-title p{margin:0;color:var(--fa-muted);font-size:12px}
.fa-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.fa-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
.fa-badge.demo{background:var(--fa-gold-pale);color:var(--fa-gold);border:1px solid #fbd6b4}
.fa-badge.live{background:var(--fa-green-pale);color:var(--fa-green);border:1px solid #aeeac6}
.fa-badge.api{background:var(--fa-blue-pale);color:var(--fa-blue);border:1px solid #b6d6fc}
.fa-badge.err{background:var(--fa-red-pale);color:var(--fa-red);border:1px solid #f7b7b5}
.fa-badge.neutral{background:#f4f4f6;color:var(--fa-muted);border:1px solid var(--fa-line)}
.fa-dot{width:7px;height:7px;border-radius:50%;background:currentColor}
.fa-field{display:flex;flex-direction:column;gap:2px}
.fa-field label{font-size:10px;font-weight:700;text-transform:uppercase;color:var(--fa-muted);letter-spacing:.06em}
.fa-select,.fa-btn{font:inherit;font-size:13px;border:1px solid #8891aa;border-radius:4px;background:#fff;color:var(--fa-ink);padding:6px 10px;min-height:34px}
.fa-btn{cursor:pointer;font-weight:600}
.fa-btn:hover{background:#f4f4f6}
.fa-btn.primary{background:var(--fa-blue);border-color:var(--fa-blue);color:#fff}
.fa-btn.primary:hover{background:#0150b8}
.fa-btn:disabled{opacity:.55;cursor:not-allowed}
.fa-tabs{display:flex;gap:2px;padding:0 24px;background:var(--fa-card);border-bottom:1px solid var(--fa-line);overflow-x:auto}
.fa-tab{font:inherit;border:0;background:none;padding:12px 14px;cursor:pointer;color:var(--fa-muted);font-weight:600;border-bottom:3px solid transparent;white-space:nowrap}
.fa-tab[aria-selected=true]{color:var(--fa-blue);border-bottom-color:var(--fa-blue)}
.fa-body{padding:20px 24px 40px;max-width:1400px}
.fa-banner{display:flex;gap:10px;align-items:flex-start;border:1px solid #fbd6b4;background:var(--fa-gold-pale);color:#5e2200;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:13px}
.fa-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px}
.fa-row h2{margin:0;font-size:17px}
.fa-row p{margin:2px 0 0;color:var(--fa-muted);font-size:13px}
.fa-chips{display:flex;flex-wrap:wrap;gap:6px}
.fa-chip{font:inherit;font-size:12px;border:1px solid var(--fa-line);background:#fff;border-radius:999px;padding:4px 12px;cursor:pointer;color:var(--fa-ink)}
.fa-chip[aria-pressed=true]{background:var(--fa-ink);border-color:var(--fa-ink);color:#fff}
.fa-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.fa-card{background:var(--fa-card);border:1px solid var(--fa-line);border-radius:8px;padding:16px}
.fa-kpi .k{font-size:12px;color:var(--fa-muted);font-weight:600}
.fa-kpi .v{font-size:28px;font-weight:700;margin:4px 0 2px;font-variant-numeric:tabular-nums}
.fa-kpi .s{font-size:11px;color:var(--fa-muted)}
.fa-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:12px;margin-bottom:16px}
@media (max-width:1100px){.fa-grid{grid-template-columns:minmax(0,1fr)}}
.fa-card h3{font-size:14px;margin:0 0 4px}
.fa-hint{font-size:12px;color:var(--fa-muted)}
.fa-cardhead{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:10px;flex-wrap:wrap}
.fa-tablewrap{overflow-x:auto}
.fa-table{width:100%;border-collapse:collapse;font-size:13px}
.fa-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fa-muted);font-weight:700;padding:8px 10px;border-bottom:1px solid var(--fa-line);white-space:nowrap}
.fa-table td{padding:9px 10px;border-bottom:1px solid #f0f1f4;font-variant-numeric:tabular-nums;vertical-align:top}
.fa-table td.num,.fa-table th.num{text-align:right}
.fa-table tr.hl td{background:#fff8e6}
.fa-bankdot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}
.fa-tag{display:inline-block;font-size:11px;font-weight:600;border-radius:4px;padding:1px 6px;margin:1px 4px 1px 0;background:#f4f4f6;border:1px solid var(--fa-line)}
.fa-tag.cx{background:var(--fa-blue-pale);border-color:#b6d6fc;color:#030b5d}
.fa-tag.cq{background:#f5f0fc;border-color:#ddc7f7;color:#4b1a8a}
.fa-tag.warn{background:var(--fa-gold-pale);border-color:#fbd6b4;color:var(--fa-gold)}
.fa-callout{border-radius:8px;padding:10px 14px;font-size:13px;margin:0 0 12px;border:1px solid var(--fa-line);background:#fff}
.fa-callout.warn{background:var(--fa-gold-pale);border-color:#fbd6b4;color:#5e2200}
.fa-callout.ok{background:var(--fa-green-pale);border-color:#aeeac6;color:#05341a}
.fa-callout.err{background:var(--fa-red-pale);border-color:#f7b7b5;color:#5c0a0a}
.fa-callout.info{background:var(--fa-blue-pale);border-color:#b6d6fc;color:#030b5d}
.fa-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-bottom:16px}
.fa-legend{display:flex;gap:14px;font-size:12px;color:var(--fa-muted);margin-top:6px;flex-wrap:wrap}
.fa-legend span{display:inline-flex;align-items:center;gap:6px}
.fa-sw{width:10px;height:10px;border-radius:2px;display:inline-block}
.fa-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:#121c2d;color:#e1e3ea;border-radius:6px;padding:12px 14px;white-space:pre-wrap;word-break:break-word;margin:8px 0 0}
.fa-mode{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.fa-mode button{flex:1 1 220px;text-align:left;font:inherit;border:2px solid var(--fa-line);background:#fff;border-radius:8px;padding:12px;cursor:pointer}
.fa-mode button[aria-pressed=true]{border-color:var(--fa-blue);background:var(--fa-blue-pale)}
.fa-mode strong{display:block;font-size:14px}
.fa-list{margin:6px 0 0;padding-left:18px;font-size:13px}
.fa-list li{margin:3px 0}
.fa-empty{padding:28px;text-align:center;color:var(--fa-muted)}
.fa-arch{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.fa-arch div{border:1px solid var(--fa-line);border-radius:8px;padding:12px;background:#fafafb;font-size:13px}
.fa-arch div.em{border-color:var(--fa-blue);background:var(--fa-blue-pale)}
.fa-foot{color:var(--fa-muted);font-size:11px;margin-top:20px}
.fa-spinner{display:inline-block;width:12px;height:12px;border:2px solid #c3c8d4;border-top-color:var(--fa-blue);border-radius:50%;animation:fa-spin .8s linear infinite;vertical-align:middle}
@keyframes fa-spin{to{transform:rotate(360deg)}}
.fa-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:700px){.fa-header,.fa-body{padding-left:16px;padding-right:16px}.fa-tabs{padding:0 8px}}
`;
