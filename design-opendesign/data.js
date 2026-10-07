/* MilestoneEscrow — shared demo dataset + helpers.
   Demo data is fictional by design (a product prototype has no real
   contracts behind it); every figure is labelled as demo in the UI. */

const ETH_USD = 3184.20;

const PARTIES = {
  'Northwind Studios':  'NS',
  'Helio Robotics':     'HR',
  'Cascade Logistics':  'CL',
  'Ravel Analytics':    'RA',
  'Orchard Bio':        'OB',
  'Meridian Fabric':    'MF',
  'Arclight Media':     'AM',
};

const PROJECTS = [
  {
    id: 'EV-2041',
    name: 'Warehouse Robotics Retrofit',
    client: 'Cascade Logistics',
    contractor: 'Helio Robotics',
    contract: '0x7A3f9c1E4b8D2a06F5cE91B73d40A8e2C6f1B5d9',
    network: 'Ethereum mainnet',
    token: 'ETH',
    opened: '2026-01-14',
    arbiter: '0x9F24aB7e0D31c58E6a2B4d07C3f8E15a7D0c92b6',
    milestones: [
      { name: 'Site survey & actuator spec',      amount: 12.0, state: 'released',  due: '2026-02-02', tx: '0x4c8e2a1f9b7d3e5a0c6f8b2d4e1a9c7f3b5d0e8a2c4f6b1d9e3a5c7f0b2d4e6a', approved: '2026-02-04', note: 'Signed scope of work and actuator torque spec accepted by both parties.' },
      { name: 'Gripper array — 40 units',         amount: 38.5, state: 'released',  due: '2026-03-11', tx: '0x1d9e3a5c7f0b2d4e6a8c1f3b5d7e9a0c2f4b6d8e1a3c5f7b9d0e2a4c6f8b1d3e', approved: '2026-03-15', note: '40 units serialised and received at dock 4. Inbound inspection passed.' },
      { name: 'Conveyor control integration',     amount: 54.0, state: 'approved',  due: '2026-04-28', tx: null, approved: '2026-05-06', note: 'Approved by depositor. Beneficiary release pending — 10-day claim window open.' },
      { name: 'Fleet telemetry handover',         amount: 31.25, state: 'released', due: '2026-05-20', tx: '0x8b2d4e6a9c1f3b5d7e0a2c4f6b8d1e3a5c7f9b0d2e4a6c8f1b3d5e7a9c0f2b4d', approved: '2026-05-24', note: 'MQTT bridge deployed to staging; telemetry parity verified over 72h.' },
      { name: 'Production cutover & support',     amount: 23.0, state: 'funded',   due: '2026-06-30', tx: null, approved: null, note: 'Funded and locked. No work submitted yet.' },
    ],
    feed: [
      ['2026-05-24', '<b>Northwind Studios</b> approved milestone 4 and released <b>31.25 ETH</b>.'],
      ['2026-05-20', '<b>Helio Robotics</b> submitted evidence for milestone 4.'],
      ['2026-05-06', '<b>Northwind Studios</b> approved milestone 3 on-chain.'],
      ['2026-04-30', '<b>Helio Robotics</b> requested release for milestone 3.'],
      ['2026-02-04', '<b>Northwind Studios</b> approved milestone 1 and released <b>12.00 ETH</b>.'],
    ],
  },
  {
    id: 'EV-2038',
    name: 'Design System Migration',
    client: 'Ravel Analytics',
    contractor: 'Northwind Studios',
    contract: '0x2B7e5D1a9C3f846E0b7D2a5C9e1F4b8D60a3C7e9',
    network: 'Base',
    token: 'ETH',
    opened: '2026-02-03',
    arbiter: '0x9F24aB7e0D31c58E6a2B4d07C3f8E15a7D0c92b6',
    milestones: [
      { name: 'Component inventory audit',       amount: 9.5,  state: 'released', due: '2026-02-24', tx: '0x6f8b1d3e5a7c9f0b2d4e6a8c1f3b5d7e9a0c2f4b6d8e1a3c5f7b9d0e2a4c6f8b1', approved: '2026-02-27', note: '314 components catalogued with migration priority tiers.' },
      { name: 'Token layer + theming',           amount: 22.0, state: 'released', due: '2026-03-30', tx: '0x3e5a7c9f0b2d4e6a8c1f3b5d7e9a0c2f4b6d8e1a3c5f7b9d0e2a4c6f8b1d3e5a', approved: '2026-04-02', note: 'Light and dark themes shipped behind a feature flag.' },
      { name: 'Data-viz primitives',             amount: 28.5, state: 'disputed', due: '2026-05-15', tx: null, approved: null, note: 'Depositor raised an accessibility objection on chart contrast. Arbiter engaged — 0x9F24…92b6.' },
      { name: 'Docs site + codemods',            amount: 18.0, state: 'funded',   due: '2026-06-18', tx: null, approved: null, note: 'Funded. Blocked on the dispute outcome for milestone 3.' },
    ],
    feed: [
      ['2026-05-17', '<b>Ravel Analytics</b> opened a dispute on milestone 3.'],
      ['2026-05-09', '<b>Northwind Studios</b> submitted evidence for milestone 3.'],
      ['2026-04-02', '<b>Ravel Analytics</b> approved milestone 2 and released <b>22.00 ETH</b>.'],
      ['2026-02-27', '<b>Ravel Analytics</b> approved milestone 1 and released <b>9.50 ETH</b>.'],
    ],
  },
  {
    id: 'EV-2035',
    name: 'Seed Trial Data Pipeline',
    client: 'Orchard Bio',
    contractor: 'Ravel Analytics',
    contract: '0x9C1f4b8D60a3E7d2B5c9A1f4E8b3D7c0A5e9B2f6',
    network: 'Ethereum mainnet',
    token: 'ETH',
    opened: '2025-11-21',
    arbiter: '0x4A81cE6b2F9d05a37C1e8B4f60D2a9E5c3B7f14d',
    milestones: [
      { name: 'Ingest schema v1',               amount: 15.0, state: 'released', due: '2025-12-19', tx: '0x5c7f9b0d2e4a6c8f1b3d5e7a9c0f2b4d6e8a1c3f5b7d9e0a2c4f6b8d1e3a5c7f9b', approved: '2026-01-06', note: 'Schema signed off after a two-week field trial.' },
      { name: 'Anonymisation service',          amount: 26.0, state: 'reclaimed', due: '2026-02-10', tx: '0x7a9c0f2b4d6e8a1c3f5b7d9e0a2c4f6b8d1e3a5c7f9b0d2e4a6c8f1b3d5e7a9c0f', approved: null, note: 'Reclaimed by depositor after the 30-day deadline elapsed with no submission.' },
      { name: 'Analyst console',                amount: 21.5, state: 'released', due: '2026-04-14', tx: '0x0d2e4a6c8f1b3d5e7a9c0f2b4d6e8a1c3f5b7d9e0a2c4f6b8d1e3a5c7f9b0d2e4a', approved: '2026-04-18', note: 'Console live for 12 analysts; p95 query latency 340 ms.' },
      { name: 'Regulatory export pack',         amount: 14.25, state: 'pending', due: '2026-07-08', tx: null, approved: null, note: 'Not yet funded. Awaiting the depositor to lock the final tranche.' },
    ],
    feed: [
      ['2026-04-18', '<b>Orchard Bio</b> approved milestone 3 and released <b>21.50 ETH</b>.'],
      ['2026-03-12', '<b>Orchard Bio</b> reclaimed <b>26.00 ETH</b> for milestone 2 after deadline.'],
      ['2026-01-06', '<b>Orchard Bio</b> approved milestone 1 and released <b>15.00 ETH</b>.'],
    ],
  },
  {
    id: 'EV-2033',
    name: 'Textile Provenance Ledger',
    client: 'Meridian Fabric',
    contractor: 'Arclight Media',
    contract: '0x1E8b3D7c0A5e9B2f6C4a8E1b5D9f3A7c2B6e0D4f',
    network: 'Arbitrum One',
    token: 'ETH',
    opened: '2026-01-30',
    arbiter: '0x4A81cE6b2F9d05a37C1e8B4f60D2a9E5c3B7f14d',
    milestones: [
      { name: 'Chain + schema design',           amount: 8.0,  state: 'released', due: '2026-02-20', tx: '0x9b0d2e4a6c8f1b3d5e7a9c0f2b4d6e8a1c3f5b7d9e0a2c4f6b8d1e3a5c7f9b0d2e', approved: '2026-02-23', note: 'Ledger schema and anchor contract merged.' },
      { name: 'Weaver onboarding app',           amount: 19.5, state: 'claimed',  due: '2026-04-08', tx: '0x2f4b6d8e1a3c5f7b9d0e2a4c6f8b1d3e5a7c9f0b2d4e6a8c1f3b5d7e9a0c2f4b6', approved: '2026-04-11', note: 'Claimed by beneficiary on 2026-04-11. 214 weavers onboarded in the pilot.' },
      { name: 'Auditor export API',              amount: 16.75, state: 'approved', due: '2026-05-26', tx: null, approved: '2026-06-01', note: 'Approved. Beneficiary has not claimed yet — funds remain in escrow.' },
      { name: 'Certification integration',       amount: 11.0, state: 'funded',   due: '2026-07-15', tx: null, approved: null, note: 'Funded and locked.' },
    ],
    feed: [
      ['2026-06-01', '<b>Meridian Fabric</b> approved milestone 3.'],
      ['2026-05-28', '<b>Arclight Media</b> submitted evidence for milestone 3.'],
      ['2026-04-11', '<b>Arclight Media</b> claimed <b>19.50 ETH</b> for milestone 2.'],
      ['2026-02-23', '<b>Meridian Fabric</b> approved milestone 1 and released <b>8.00 ETH</b>.'],
    ],
  },
  {
    id: 'EV-2029',
    name: 'Clinical Consent Registry',
    client: 'Orchard Bio',
    contractor: 'Northwind Studios',
    contract: '0x6A5e9B2f4C8d1E5b7D3f0A6c9B4e2D8f1C5a7E3b',
    network: 'Ethereum mainnet',
    token: 'ETH',
    opened: '2025-12-09',
    arbiter: '0x9F24aB7e0D31c58E6a2B4d07C3f8E15a7D0c92b6',
    milestones: [
      { name: 'Consent capture flow',            amount: 13.5, state: 'released', due: '2026-01-16', tx: '0x4e6a8c1f3b5d7e9a0c2f4b6d8e1a3c5f7b9d0e2a4c6f8b1d3e5a7c9f0b2d4e6a8', approved: '2026-01-19', note: 'Flow reviewed by the ethics board with no findings.' },
      { name: 'Zero-knowledge proof module',     amount: 42.0, state: 'released', due: '2026-03-24', tx: '0x8c1f3b5d7e9a0c2f4b6d8e1a3c5f7b9d0e2a4c6f8b1d3e5a7c9f0b2d4e6a8c1f3b', approved: '2026-03-29', note: 'Groth16 verifier deployed; gas per proof down to 214k.' },
      { name: 'Registry explorer',               amount: 24.0, state: 'released', due: '2026-05-05', tx: '0x0a2c4f6b8d1e3a5c7f9b0d2e4a6c8f1b3d5e7a9c0f2b4d6e8a1c3f5b7d9e0a2c4', approved: '2026-05-08', note: 'Explorer shipped with per-site filtering and CSV export.' },
      { name: 'Audit remediation',               amount: 17.0, state: 'approved', due: '2026-06-12', tx: null, approved: '2026-06-14', note: 'Approved. Two medium findings remediated with regression coverage.' },
      { name: 'Maintenance retainer — Q3',       amount: 20.0, state: 'funded',   due: '2026-09-30', tx: null, approved: null, note: 'Funded and locked for the third-quarter retainer.' },
    ],
    feed: [
      ['2026-06-14', '<b>Orchard Bio</b> approved milestone 4.'],
      ['2026-05-08', '<b>Orchard Bio</b> approved milestone 3 and released <b>24.00 ETH</b>.'],
      ['2026-03-29', '<b>Orchard Bio</b> approved milestone 2 and released <b>42.00 ETH</b>.'],
    ],
  },
  {
    id: 'EV-2026',
    name: 'Freight Settlement Oracle',
    client: 'Cascade Logistics',
    contractor: 'Ravel Analytics',
    contract: '0x3D7c0A5e9B2f6C4a8E1b5D9f3A7c2B6e0D4f8A1c',
    network: 'Base',
    token: 'ETH',
    opened: '2026-03-02',
    arbiter: '0x9F24aB7e0D31c58E6a2B4d07C3f8E15a7D0c92b6',
    milestones: [
      { name: 'Oracle contract v1',              amount: 10.5, state: 'released', due: '2026-03-27', tx: '0x1b3d5e7a9c0f2b4d6e8a1c3f5b7d9e0a2c4f6b8d1e3a5c7f9b0d2e4a6c8f1b3d5e', approved: '2026-03-31', note: 'First oracle deployed to Base with a three-signer quorum.' },
      { name: 'Carrier API adapters',            amount: 27.75, state: 'funded',  due: '2026-06-05', tx: null, approved: null, note: 'Funded. Adapters for four carriers in review.' },
      { name: 'Settlement reconciliation',       amount: 19.0, state: 'pending', due: '2026-08-20', tx: null, approved: null, note: 'Tranche not yet funded.' },
    ],
    feed: [
      ['2026-03-31', '<b>Cascade Logistics</b> approved milestone 1 and released <b>10.50 ETH</b>.'],
      ['2026-03-24', '<b>Ravel Analytics</b> submitted evidence for milestone 1.'],
    ],
  },
];

/* ── derived ─────────────────────────────────────────────────────── */

const STATE_LABEL = {
  released:  'released',
  claimed:   'claimed',
  approved:  'approved',
  funded:    'funded',
  disputed:  'disputed',
  reclaimed: 'reclaimed',
  pending:   'pending',
};

/* The roll-up status shown in the project table's status column. */
function projectStatus(p) {
  const s = p.milestones.map(m => m.state);
  if (s.includes('disputed')) return 'disputed';
  const open = p.milestones.filter(m => m.state !== 'released' && m.state !== 'reclaimed');
  if (open.length === 0) {
    return s.includes('reclaimed') ? 'reclaimed' : 'claimed';
  }
  if (open.every(m => m.state === 'pending')) return 'pending';
  if (open.every(m => m.state === 'approved' || m.state === 'claimed')) return 'approved';
  if (open.some(m => m.state === 'funded')) return 'funded';
  return 'approved';
}

function totals(p) {
  const sum = st => p.milestones.filter(m => st.includes(m.state)).reduce((a, m) => a + m.amount, 0);
  const locked = sum(['funded', 'disputed', 'approved', 'pending']);
  const inEscrow = sum(['funded', 'disputed', 'approved']);
  const released = sum(['released', 'claimed']);
  const done = p.milestones.filter(m => ['released', 'claimed'].includes(m.state)).length;
  const claimable = sum(['approved']);
  return {
    locked, inEscrow, released, claimable,
    reclaimed: sum(['reclaimed']),
    done,
    total: p.milestones.length,
    value: p.milestones.reduce((a, m) => a + m.amount, 0),
    pct: Math.round((done / p.milestones.length) * 100),
  };
}

const ALL = PROJECTS.map(p => ({ p, t: totals(p), status: projectStatus(p) }));

const SUMMARY = {
  locked:   ALL.reduce((a, r) => a + r.t.inEscrow, 0),
  claimable:ALL.reduce((a, r) => a + r.t.claimable, 0),
  released: ALL.reduce((a, r) => a + r.t.released, 0),
  reclaimed:ALL.reduce((a, r) => a + r.t.reclaimed, 0),
  funded:   ALL.reduce((a, r) => a + r.p.milestones.filter(m => m.state === 'funded').length, 0),
  approved: ALL.reduce((a, r) => a + r.p.milestones.filter(m => ['approved', 'claimed'].includes(m.state)).length, 0),
  total:    ALL.reduce((a, r) => a + r.t.total, 0),
  done:     ALL.reduce((a, r) => a + r.t.done, 0),
  contracts: PROJECTS.length,
};

SUMMARY.pct = Math.round((SUMMARY.done / SUMMARY.total) * 100);

/* ── formatting ──────────────────────────────────────────────────── */

const fmtEth = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUsd = n => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const short = a => a.slice(0, 6) + '…' + a.slice(-4);
const initials = n => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const avClass = n => 'av-' + ('abcd'[Object.keys(PARTIES).indexOf(n) % 4] || 'a');
const dateFmt = s => new Date(s + 'T00:00:00Z')
  .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/* ── storage ─────────────────────────────────────────────────────── */

const store = {
  get(k, d) { try { const v = localStorage.getItem('me.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('me.' + k, JSON.stringify(v)); } catch {} },
};

/* ── icons (monoline) ────────────────────────────────────────────── */

const ICON = {
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.8l3.2 2"/></svg>',
  dot: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4.5L21 19H3z"/><path d="M12 10v4M12 16.6v.2"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5h10"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h10a5 5 0 0 1 0 10h-3"/><path d="M7.5 5.5L4 9l3.5 3.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.5l7 2.6v5.4c0 4.2-2.8 7.4-7 9-4.2-1.6-7-4.8-7-9V6.1z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.7v.3"/></svg>',
};

/* Small helper: a milestone's rail/track segment key. */
const SEG = {
  released: 'seg-claimed', claimed: 'seg-claimed', approved: 'seg-approved',
  funded: 'seg-funded', disputed: 'seg-disputed', reclaimed: 'seg-reclaimed',
  pending: '',
};

Object.assign(window, {
  ETH_USD, PARTIES, PROJECTS, STATE_LABEL, ALL, SUMMARY,
  projectStatus, totals, fmtEth, fmtUsd, short, initials, avClass,
  dateFmt, store, ICON, SEG,
});
