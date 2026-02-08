import type { TemplateMilestone, PhaseWeight } from './types.ts';

export const DEFAULT_PHASE_WEIGHTS: PhaseWeight[] = [
  { phase: 'Kickoff', weight: 10 },
  { phase: 'Engineering', weight: 20 },
  { phase: 'Fabrication', weight: 35 },
  { phase: 'Finishing', weight: 10 },
  { phase: 'Tile', weight: 15 },
  { phase: 'Shipping', weight: 10 },
];

let order = 0;
let id = 0;
function m(phase: string, title: string): TemplateMilestone {
  return { id: `tmpl-${++id}`, title, phase, order: order++ };
}

export const DEFAULT_TEMPLATE: TemplateMilestone[] = [
  m('Kickoff', 'Payment received'),
  m('Kickoff', 'Job opened / PO created'),
  m('Engineering', 'Drawings sent to customer'),
  m('Engineering', 'Customer approval received'),
  m('Engineering', 'Final drawings locked'),
  m('Fabrication', 'Fabrication started'),
  m('Fabrication', 'Major fabrication complete'),
  m('Fabrication', 'Pressure/leak test passed'),
  m('Finishing', 'Passivation complete'),
  m('Finishing', 'Foam complete'),
  m('Tile', 'Tile materials received'),
  m('Tile', 'Tile started'),
  m('Tile', 'Tile complete'),
  m('Shipping', 'Final QC complete'),
  m('Shipping', 'Shipping scheduled'),
  m('Shipping', 'Packed & loaded'),
  m('Shipping', 'Shipped'),
  m('Shipping', 'Closeout complete'),
];
