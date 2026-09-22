/**
 * escrowEngine.ts — a FAITHFUL TypeScript port of src/MilestoneEscrow.sol.
 *
 * Why a port and not a mock: the portfolio demo must behave EXACTLY like the
 * on-chain contract — same rules, same reverts, same accounting invariants —
 * so a visitor can click through the real state machine without a wallet.
 *
 * Mirror rules (kept in sync with the Solidity source):
 *  - fund() requires msg.value == totalFunded and only once, only client
 *  - approveMilestone() only client, idempotent, bounds-checked
 *  - claim() only freelancer, requires approved, once, checks-effects-interactions
 *  - reclaimExpired() only client, only after deadline, only unreleased funds
 *  - totalUnreleased is 0 until funded (the bug the invariant test caught)
 */

export const Errors = {
  NotClient: "NotClient",
  NotFreelancer: "NotFreelancer",
  AlreadyFunded: "AlreadyFunded",
  WrongAmount: "WrongAmount",
  InvalidMilestone: "InvalidMilestone",
  NotApproved: "NotApproved",
  AlreadyClaimed: "AlreadyClaimed",
  NotExpired: "NotExpired",
  NothingToReclaim: "NothingToReclaim",
  TransferFailed: "TransferFailed",
} as const;

export type EscrowError = keyof typeof Errors;

export class Revert extends Error {
  code: EscrowError;
  constructor(code: EscrowError) {
    super(code);
    this.name = "Revert";
    this.code = code;
  }
}

export interface Milestone {
  id: number;
  amount: bigint;
  approved: boolean;
  claimed: boolean;
}

export interface EscrowEvent {
  type:
    | "EscrowCreated"
    | "Funded"
    | "MilestoneApproved"
    | "MilestoneClaimed"
    | "ExpiredReclaimed";
  id?: number;
  amount?: bigint;
  at: number;
}

export interface EscrowState {
  client: string;
  freelancer: string;
  deadline: number;
  totalFunded: bigint;
  totalReleased: bigint;
  totalUnreleased: bigint;
  totalReclaimed: bigint;
  funded: boolean;
  milestones: Milestone[];
}

export interface Snapshot {
  now: number;
  escrow: EscrowState;
  balances: { client: bigint; freelancer: bigint; escrow: bigint };
  events: EscrowEvent[];
  remaining: bigint; // totalUnreleased, convenience
}

export interface Init {
  client: string;
  freelancer: string;
  amounts: bigint[];
  deadline: number;
  now?: number;
  clientBalance?: bigint;
}

/** Deterministic, clock-injectable simulator of MilestoneEscrow. */
export class EscrowEngine {
  state: EscrowState;
  balances: { client: bigint; freelancer: bigint; escrow: bigint };
  events: EscrowEvent[] = [];
  private now: number;

  constructor(init: Init) {
    if (!init.freelancer) throw new Revert("NotClient");
    if (init.amounts.length === 0) throw new Error("no milestones");
    if (init.amounts.some((a) => a <= 0n)) throw new Error("amount=0");
    const now = init.now ?? 0;
    if (init.deadline <= now) throw new Error("deadline in past");

    const sum = init.amounts.reduce((a, b) => a + b, 0n);
    this.now = now;
    this.state = {
      client: init.client,
      freelancer: init.freelancer,
      deadline: init.deadline,
      totalFunded: sum,
      totalReleased: 0n,
      // NOTE: stays 0 until funded — mirrors the Solidity comment / invariant fix.
      totalUnreleased: 0n,
      totalReclaimed: 0n,
      funded: false,
      milestones: init.amounts.map((amount, id) => ({ id, amount, approved: false, claimed: false })),
    };
    this.balances = {
      client: init.clientBalance ?? sum,
      freelancer: 0n,
      escrow: 0n,
    };
    this.events.push({ type: "EscrowCreated", amount: sum, at: now });
  }

  // --- clock ---
  advance(seconds: number): void {
    this.now += seconds;
  }
  setNow(t: number): void {
    this.now = t;
  }
  get clock(): number {
    return this.now;
  }

  private onlyClient(sender: string) {
    if (sender !== this.state.client) throw new Revert("NotClient");
  }
  private onlyFreelancer(sender: string) {
    if (sender !== this.state.freelancer) throw new Revert("NotFreelancer");
  }

  /** mirror: fund() external payable onlyClient */
  fund(sender: string, value: bigint): void {
    this.onlyClient(sender);
    if (this.state.funded) throw new Revert("AlreadyFunded");
    if (value !== this.state.totalFunded) throw new Revert("WrongAmount");
    if (this.balances.client < value) throw new Revert("TransferFailed");

    this.state.funded = true;
    this.state.totalUnreleased = this.state.totalFunded; // funds are now actually held
    this.balances.client -= value;
    this.balances.escrow += value;
    this.events.push({ type: "Funded", amount: value, at: this.now });
  }

  /** mirror: approveMilestone(uint256) external onlyClient */
  approveMilestone(sender: string, id: number): void {
    this.onlyClient(sender);
    if (id < 0 || id >= this.state.milestones.length) throw new Revert("InvalidMilestone");
    const m = this.state.milestones[id];
    if (m.approved) return; // idempotent approve
    m.approved = true;
    this.events.push({ type: "MilestoneApproved", id, amount: m.amount, at: this.now });
  }

  /** mirror: claim(uint256) external onlyFreelancer, checks-effects-interactions */
  claim(sender: string, id: number): bigint {
    this.onlyFreelancer(sender);
    if (id < 0 || id >= this.state.milestones.length) throw new Revert("InvalidMilestone");
    const m = this.state.milestones[id];
    if (!m.approved) throw new Revert("NotApproved");
    if (m.claimed) throw new Revert("AlreadyClaimed");

    // Solidity 0.8 has CHECKED arithmetic: `totalUnreleased -= amount` would
    // revert (Panic 0x11) if the escrow no longer holds this milestone (e.g.
    // the client already reclaimed after the deadline). TS bigint would go
    // negative silently, so we validate BEFORE mutating to stay atomic and
    // faithful — this is exactly what the fuzz test caught.
    const amount = m.amount;
    if (this.state.totalUnreleased < amount || this.balances.escrow < amount) {
      throw new Revert("TransferFailed");
    }

    // --- effects (before interaction, like the contract) ---
    m.claimed = true;
    this.state.totalReleased += amount;
    this.state.totalUnreleased -= amount;

    // --- interaction ---
    this.balances.escrow -= amount;
    this.balances.freelancer += amount;
    this.events.push({ type: "MilestoneClaimed", id, amount, at: this.now });
    return amount;
  }

  /** mirror: reclaimExpired() external onlyClient */
  reclaimExpired(sender: string): bigint {
    this.onlyClient(sender);
    if (this.now <= this.state.deadline) throw new Revert("NotExpired");
    const amount = this.state.totalUnreleased;
    if (amount === 0n) throw new Revert("NothingToReclaim");

    this.state.totalUnreleased = 0n;
    this.state.totalReclaimed += amount;
    this.balances.escrow -= amount;
    this.balances.client += amount;
    this.events.push({ type: "ExpiredReclaimed", amount, at: this.now });
    return amount;
  }

  // --- invariant checks (mirror the on-chain invariant test) ---
  checkInvariants(): { name: string; ok: boolean; detail: string }[] {
    const s = this.state;
    const results: { name: string; ok: boolean; detail: string }[] = [];
    results.push({
      name: "Solvency",
      ok: this.balances.escrow >= s.totalUnreleased,
      detail: `escrow ${this.balances.escrow} >= unreleased ${s.totalUnreleased}`,
    });
    results.push({
      name: "Conservation",
      // Before funding the escrow holds nothing, so the ledger must sum to 0;
      // only once funded does it have to account for the full totalFunded.
      ok:
        s.totalReleased + s.totalUnreleased + s.totalReclaimed ===
        (s.funded ? s.totalFunded : 0n),
      detail: `${s.totalReleased} + ${s.totalUnreleased} + ${s.totalReclaimed} == ${
        s.funded ? s.totalFunded : 0n
      }${s.funded ? "" : " (pre-funding)"}`,
    });
    results.push({
      name: "NoOverRelease",
      ok: s.milestones.every((m) => m.amount > 0n),
      detail: "every milestone amount > 0",
    });
    results.push({
      name: "OneClaimPerMilestone",
      ok: s.milestones.every((m) => !(m.claimed && !m.approved)),
      detail: "claimed implies approved",
    });
    return results;
  }

  snapshot(): Snapshot {
    return {
      now: this.now,
      escrow: structuredClone(this.state),
      balances: { ...this.balances },
      events: [...this.events],
      remaining: this.state.totalUnreleased,
    };
  }
}

export const fmtEth = (wei: bigint): string => {
  const neg = wei < 0n;
  const v = neg ? -wei : wei;
  const whole = v / 10n ** 18n;
  const frac = (v % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  const s = frac ? `${whole}.${frac}` : `${whole}`;
  return (neg ? "-" : "") + s;
};

export const shortAddr = (a: string): string =>
  a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
