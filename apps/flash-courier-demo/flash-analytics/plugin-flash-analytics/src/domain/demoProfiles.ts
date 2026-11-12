import type { Principal } from './types';

export type DemoProfileId =
  | 'flash_admin'
  | 'supervisor_itau'
  | 'supervisor_santander'
  | 'supervisor_caixa'
  | 'supervisor_c6'
  | 'sem_vinculo';

export interface DemoProfile {
  id: DemoProfileId;
  label: string;
  principal: Principal;
}

/** DEMO ONLY. In production the scope is resolved by the backend from the verified identity. */
export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: 'flash_admin',
    label: 'Gestão Flash · Todas as operações',
    principal: {
      identity: 'gestao@demo.flash.invalid',
      role: 'flash_admin',
      allowedBanks: ['itau', 'santander', 'caixa', 'c6_pip'],
    },
  },
  {
    id: 'supervisor_itau',
    label: 'Supervisão · Itaú',
    principal: { identity: 'sup.itau@demo.flash.invalid', role: 'bank_supervisor', allowedBanks: ['itau'] },
  },
  {
    id: 'supervisor_santander',
    label: 'Supervisão · Santander',
    principal: { identity: 'sup.santander@demo.flash.invalid', role: 'bank_supervisor', allowedBanks: ['santander'] },
  },
  {
    id: 'supervisor_caixa',
    label: 'Supervisão · Caixa',
    principal: { identity: 'sup.caixa@demo.flash.invalid', role: 'bank_supervisor', allowedBanks: ['caixa'] },
  },
  {
    id: 'supervisor_c6',
    label: 'Supervisão · C6 / PIP',
    principal: { identity: 'sup.c6@demo.flash.invalid', role: 'bank_supervisor', allowedBanks: ['c6_pip'] },
  },
  {
    id: 'sem_vinculo',
    label: 'Usuário sem vínculo (deny-by-default)',
    principal: { identity: 'sem.vinculo@demo.flash.invalid', role: 'bank_supervisor', allowedBanks: [] },
  },
];

export function getDemoProfile(id: DemoProfileId): DemoProfile {
  const found = DEMO_PROFILES.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown demo profile ${id}`);
  return found;
}
