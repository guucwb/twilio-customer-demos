/**
 * Seeds a DEMO Twilio account for the Flash Analytics walkthrough (idempotent).
 *   npx tsx analytics-backend/src/scripts/seedDemoAccount.ts            → seed
 *   npx tsx analytics-backend/src/scripts/seedDemoAccount.ts --cleanup  → remove demo Tasks, Workers, Workflow, extra queues
 *   ... --cleanup --all                                                  → also delete the 8 CX/CQ queues
 * Env: TWILIO_API_KEY, TWILIO_API_SECRET, TASKROUTER_WORKSPACE_SID.
 * Everything created is fictitious and tagged (attributes.flash_demo / names "flash-demo-*").
 * Never touches existing Workers, Workflows or queues that it did not create.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BANK_IDS, bankName, DEMO_WORKERS, type BankId, type QueueDef, type Tower } from '../domain';

const KEY = process.env.TWILIO_API_KEY ?? '';
const SECRET = process.env.TWILIO_API_SECRET ?? '';
const WS = process.env.TASKROUTER_WORKSPACE_SID ?? '';
if (!KEY || !SECRET || !/^WS[0-9a-f]{32}$/.test(WS)) {
  console.error('Set TWILIO_API_KEY, TWILIO_API_SECRET and TASKROUTER_WORKSPACE_SID');
  process.exit(1);
}
const BASE = `https://taskrouter.twilio.com/v1/Workspaces/${WS}`;
const AUTH = `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString('base64')}`;
const args = new Set(process.argv.slice(2));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tr<T = Record<string, unknown>>(method: string, path: string, form?: Record<string, string | number>): Promise<T> {
  const res = await fetch(path.startsWith('http') ? path : BASE + path, {
    method,
    headers: { Authorization: AUTH, ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: form ? new URLSearchParams(Object.entries(form).map(([k, v]) => [k, String(v)])) : undefined,
  });
  if (res.status === 204) return {} as T;
  const body = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${body.message ?? ''}`);
  return body;
}

async function listAll<T>(path: string, key: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = BASE + path + (path.includes('?') ? '&' : '?') + 'PageSize=200';
  while (url) {
    const page: Record<string, unknown> = await tr('GET', url);
    out.push(...((page[key] as T[]) ?? []));
    url = ((page.meta as { next_page_url?: string })?.next_page_url as string) ?? null;
  }
  return out;
}

interface Queue { sid: string; friendly_name: string }
interface Worker { sid: string; friendly_name: string; attributes: string; activity_name: string }
interface Activity { sid: string; friendly_name: string }

const SHARED = 'CQ_FRANQUIAS_COMPARTILHADA';
const TRIAGE = 'TRIAGEM_FLASH_SEM_BANCO';
const WORKFLOW = 'flash-demo — roteamento por bank_id + tower';

async function ensureQueue(existing: Queue[], name: string, target: string): Promise<Queue> {
  const found = existing.find((q) => q.friendly_name === name);
  if (found) return found;
  const q = await tr<Queue>('POST', '/TaskQueues', { FriendlyName: name, TargetWorkers: target });
  console.log('  + queue', name);
  return q;
}

async function cleanup(all: boolean) {
  console.log('Cleanup…');
  const tasks = await listAll<{ sid: string }>(`/Tasks?EvaluateTaskAttributes=${encodeURIComponent('flash_demo == true')}`, 'tasks');
  for (const t of tasks) await tr('DELETE', `/Tasks/${t.sid}`);
  console.log(`  - ${tasks.length} demo tasks`);
  const activities = await listAll<Activity>('/Activities', 'activities');
  const offline = activities.find((a) => a.friendly_name === 'Offline')!;
  const workers = (await listAll<Worker>('/Workers', 'workers')).filter((w) => JSON.parse(w.attributes).flash_demo === true);
  for (const w of workers) {
    await tr('POST', `/Workers/${w.sid}`, { ActivitySid: offline.sid });
    await tr('DELETE', `/Workers/${w.sid}`);
  }
  console.log(`  - ${workers.length} demo workers`);
  const wfs = (await listAll<{ sid: string; friendly_name: string }>('/Workflows', 'workflows')).filter((w) => w.friendly_name === WORKFLOW);
  for (const w of wfs) await tr('DELETE', `/Workflows/${w.sid}`);
  console.log(`  - ${wfs.length} workflow`);
  const names = [SHARED, TRIAGE, ...(all ? BANK_IDS.flatMap((b) => [`CX_${b.toUpperCase()}`, `CQ_${b.toUpperCase()}`]) : [])];
  const queues = (await listAll<Queue>('/TaskQueues', 'task_queues')).filter((q) => names.includes(q.friendly_name));
  for (const q of queues) await tr('DELETE', `/TaskQueues/${q.sid}`);
  console.log(`  - ${queues.length} queues`);
}

async function seed() {
  // 1. Queues
  console.log('Queues…');
  const existing = await listAll<Queue>('/TaskQueues', 'task_queues');
  const catalog: QueueDef[] = [];
  for (const bankId of BANK_IDS) {
    for (const tower of ['CX', 'CQ'] as Tower[]) {
      const key = `${tower}_${bankId.toUpperCase()}`;
      const targetWorkers = `routing.banks HAS "${bankId}" AND routing.towers HAS "${tower}"`;
      const q = await ensureQueue(existing, key, targetWorkers);
      catalog.push({ key, sid: q.sid, bankId, tower, label: `${tower} · ${bankName(bankId)}`, targetWorkers });
    }
  }
  const sharedTarget = 'routing.towers HAS "CQ" AND routing.shared_backoffice == true';
  const shared = await ensureQueue(existing, SHARED, sharedTarget);
  catalog.push({ key: SHARED, sid: shared.sid, bankId: null, tower: 'CQ', label: 'CQ · Franquias (compartilhada)', targetWorkers: sharedTarget, sharedAcrossBanks: true });
  const triage = await ensureQueue(existing, TRIAGE, '1==2');
  const mapFile = join(process.cwd(), 'analytics-backend/config/queue-map.local.json');
  writeFileSync(mapFile, JSON.stringify({ queues: catalog }, null, 2));
  console.log('  queue map →', mapFile);

  // 2. Workflow
  console.log('Workflow…');
  const filters = [
    { filter_friendly_name: 'CQ compartilhada (franquias)', expression: 'shared_backoffice == true AND tower == "CQ"', targets: [{ queue: shared.sid }] },
    ...catalog
      .filter((q) => !q.sharedAcrossBanks)
      .map((q) => ({ filter_friendly_name: q.key, expression: `bank_id == "${q.bankId}" AND tower == "${q.tower}"`, targets: [{ queue: q.sid }] })),
  ];
  const configuration = JSON.stringify({ task_routing: { filters, default_filter: { queue: triage.sid } } });
  const wfs = await listAll<{ sid: string; friendly_name: string }>('/Workflows', 'workflows');
  let wf = wfs.find((w) => w.friendly_name === WORKFLOW);
  if (wf) await tr('POST', `/Workflows/${wf.sid}`, { Configuration: configuration });
  else wf = await tr('POST', '/Workflows', { FriendlyName: WORKFLOW, Configuration: configuration, TaskReservationTimeout: 120 });
  console.log('  workflow', wf!.sid.slice(0, 6) + '…');

  // 3. Reset previous demo data
  await cleanupTasksAndWorkers();

  // 4. Fictitious workers (Offline first)
  console.log('Workers…');
  const activities = await listAll<Activity>('/Activities', 'activities');
  const act = (n: string) => activities.find((a) => a.friendly_name === n)!.sid;
  const workers: Record<string, string> = {};
  for (const [i, w] of DEMO_WORKERS.entries()) {
    const attrs = {
      flash_demo: true,
      full_name: w.displayName,
      routing: { ...w.attributes.routing, ...(w.sid === 'WKdemo-cq-08' ? { shared_backoffice: true } : {}) },
    };
    const created = await tr<{ sid: string }>('POST', '/Workers', {
      FriendlyName: `flash-demo-agente-${String(i + 1).padStart(2, '0')}`,
      Attributes: JSON.stringify(attrs),
      ActivitySid: act('Offline'),
    });
    workers[w.sid] = created.sid;
  }
  console.log(`  + ${Object.keys(workers).length} workers`);

  // 5. Tasks (fictitious tickets)
  console.log('Tasks…');
  const plan: Array<[BankId, Tower, number]> = [
    ['itau', 'CX', 7], ['itau', 'CQ', 3], ['santander', 'CX', 6], ['santander', 'CQ', 3],
    ['caixa', 'CX', 5], ['caixa', 'CQ', 2], ['c6_pip', 'CX', 4], ['c6_pip', 'CQ', 2],
  ];
  let n = 0;
  const mk = (bankId: BankId, tower: Tower, extra: Record<string, unknown> = {}) =>
    tr<{ sid: string }>('POST', '/Tasks', {
      WorkflowSid: wf!.sid,
      TaskChannel: 'default',
      Timeout: 86400,
      Attributes: JSON.stringify({
        flash_demo: true,
        type: 'flash_demo_ticket',
        name: `Ticket fictício ${bankName(bankId)} ${tower}`,
        bank_id: bankId,
        origin_bank_id: bankId,
        tower,
        ticket_id: `FC-DEMO-${String(++n).padStart(4, '0')}`,
        ...extra,
      }),
    });
  for (const [bankId, tower, count] of plan) for (let i = 0; i < count; i++) await mk(bankId, tower);
  for (const bankId of ['itau', 'caixa', 'c6_pip'] as BankId[]) await mk(bankId, 'CQ', { shared_backoffice: true });
  console.log(`  + ${n} tasks`);

  // 6. Transfer CX → CQ keeping the originating bank
  const t = await mk('santander', 'CX');
  await sleep(1500);
  const before = await tr<{ task_queue_friendly_name: string; attributes: string }>('GET', `/Tasks/${t.sid}`);
  const attrs = JSON.parse(before.attributes);
  attrs.tower = 'CQ';
  attrs.transfer_history = [{ from: 'CX', to: 'CQ', at: new Date().toISOString() }];
  await tr('POST', `/Tasks/${t.sid}`, { Attributes: JSON.stringify(attrs) });
  await sleep(1500);
  const after = await tr<{ task_queue_friendly_name: string; attributes: string }>('GET', `/Tasks/${t.sid}`);
  console.log(`  transfer ${attrs.ticket_id}: ${before.task_queue_friendly_name} → ${after.task_queue_friendly_name} (bank_id=${JSON.parse(after.attributes).bank_id})`);

  // 7. Some tasks in progress: worker becomes Available with capacity K, accepts K reservations.
  console.log('Assignments…');
  const busy: Array<[string, number, string]> = [
    ['WKdemo-multi-01', 2, 'Available'],
    ['WKdemo-itau-02', 2, 'Available'],
    ['WKdemo-sant-04', 2, 'Available'],
    ['WKdemo-caixa-06', 2, 'Available'],
    ['WKdemo-c6-07', 1, 'Available'],
    ['WKdemo-cq-08', 2, 'Available'],
  ];
  for (const [demoSid, capacity, finalActivity] of busy) {
    const sid = workers[demoSid];
    await tr('POST', `/Workers/${sid}/Channels/default`, { Capacity: capacity, Available: 'true' });
    await tr('POST', `/Workers/${sid}`, { ActivitySid: act('Available') });
    let accepted = 0;
    for (let tries = 0; tries < 20 && accepted < capacity; tries++) {
      await sleep(700);
      const res = await listAll<{ sid: string; task_sid: string }>(`/Workers/${sid}/Reservations?ReservationStatus=pending`, 'reservations');
      for (const r of res) {
        await tr('POST', `/Tasks/${r.task_sid}/Reservations/${r.sid}`, { ReservationStatus: 'accepted' });
        accepted++;
      }
    }
    if (finalActivity !== 'Available') await tr('POST', `/Workers/${sid}`, { ActivitySid: act(finalActivity) });
    console.log(`  ${demoSid}: ${accepted}/${capacity} accepted`);
  }
  // Idle workers with no spare capacity (so they don't grab tasks).
  await tr('POST', `/Workers/${workers['WKdemo-itau-03']}`, { ActivitySid: act('Offline') });
  await tr('POST', `/Workers/${workers['WKdemo-sant-05']}`, { ActivitySid: act('Break') });
  console.log('Done.');
}

async function cleanupTasksAndWorkers() {
  const tasks = await listAll<{ sid: string }>(`/Tasks?EvaluateTaskAttributes=${encodeURIComponent('flash_demo == true')}`, 'tasks');
  for (const t of tasks) await tr('DELETE', `/Tasks/${t.sid}`);
  const activities = await listAll<Activity>('/Activities', 'activities');
  const offline = activities.find((a) => a.friendly_name === 'Offline')!;
  const workers = (await listAll<Worker>('/Workers', 'workers')).filter((w) => JSON.parse(w.attributes).flash_demo === true);
  for (const w of workers) {
    await tr('POST', `/Workers/${w.sid}`, { ActivitySid: offline.sid });
    await tr('DELETE', `/Workers/${w.sid}`);
  }
  if (tasks.length || workers.length) console.log(`  reset: -${tasks.length} tasks, -${workers.length} workers`);
}

if (args.has('--cleanup')) await cleanup(args.has('--all'));
else await seed();
