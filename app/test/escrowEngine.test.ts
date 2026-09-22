import { describe, it, expect } from "vitest";
import { EscrowEngine, Revert, fmtEth } from "../src/lib/escrowEngine";

const C = "0xClient000000000000000000000000000000000001";
const F = "0xFree0000000000000000000000000000000000002";
const X = "0xStranger000000000000000000000000000000003";
const E = (10n ** 18n);

function fresh(deadline = 1000, now = 0) {
  return new EscrowEngine({
    client: C,
    freelancer: F,
    amounts: [1n * E, 2n * E, 3n * E],
    deadline,
    now,
    clientBalance: 100n * E,
  });
}

describe("mirror of MilestoneEscrow.sol", () => {
  it("totalUnreleased is 0 before funding (the invariant-caught bug)", () => {
    const e = fresh();
    expect(e.state.totalUnreleased).toBe(0n);
    expect(e.state.totalFunded).toBe(6n * E);
    // Solvency must already hold: escrow holds 0, owes 0.
    expect(e.checkInvariants().find((i) => i.name === "Solvency")!.ok).toBe(true);
  });

  it("fund requires the exact total and only once", () => {
    const e = fresh();
    expect(() => e.fund(C, 5n * E)).toThrowError(Revert);
    e.fund(C, 6n * E);
    expect(e.state.totalUnreleased).toBe(6n * E);
    expect(e.balances.escrow).toBe(6n * E);
    expect(() => e.fund(C, 6n * E)).toThrowError(/AlreadyFunded/);
  });

  it("only the client can fund", () => {
    const e = fresh();
    expect(() => e.fund(X, 6n * E)).toThrowError(/NotClient/);
  });

  it("approve is client-only and idempotent", () => {
    const e = fresh();
    e.fund(C, 6n * E);
    expect(() => e.approveMilestone(F, 0)).toThrowError(/NotClient/);
    e.approveMilestone(C, 0);
    e.approveMilestone(C, 0); // idempotent, no throw
    expect(e.state.milestones[0].approved).toBe(true);
    expect(() => e.approveMilestone(C, 9)).toThrowError(/InvalidMilestone/);
  });

  it("claim requires approval, pays once, and is freelancer-only", () => {
    const e = fresh();
    e.fund(C, 6n * E);
    expect(() => e.claim(F, 0)).toThrowError(/NotApproved/);
    expect(() => e.approveMilestone(F, 0)).toThrowError(/NotClient/);
    e.approveMilestone(C, 0);
    expect(() => e.claim(X, 0)).toThrowError(/NotFreelancer/);
    e.claim(F, 0);
    expect(e.balances.freelancer).toBe(1n * E);
    expect(() => e.claim(F, 0)).toThrowError(/AlreadyClaimed/);
  });

  it("full happy path conserves every wei", () => {
    const e = fresh();
    e.fund(C, 6n * E);
    for (let i = 0; i < 3; i++) {
      e.approveMilestone(C, i);
      e.claim(F, i);
    }
    expect(e.balances.escrow).toBe(0n);
    expect(e.balances.freelancer).toBe(6n * E);
    expect(e.state.totalReleased).toBe(6n * E);
    expect(e.checkInvariants().every((i) => i.ok)).toBe(true);
  });

  it("reclaim is client-only, after deadline, only the unreleased part", () => {
    const e = fresh(1000, 0);
    e.fund(C, 6n * E);
    e.approveMilestone(C, 0);
    e.claim(F, 0); // 1 released
    expect(() => e.reclaimExpired(C)).toThrowError(/NotExpired/);
    e.setNow(1001);
    expect(() => e.reclaimExpired(X)).toThrowError(/NotClient/);
    const back = e.reclaimExpired(C);
    expect(back).toBe(5n * E);
    expect(e.balances.client).toBe(100n * E - 6n * E + 5n * E);
    expect(e.checkInvariants().every((i) => i.ok)).toBe(true);
  });

  it("reclaim with nothing left reverts NothingToReclaim", () => {
    const e = fresh(1000, 0);
    e.fund(C, 6n * E);
    for (let i = 0; i < 3; i++) {
      e.approveMilestone(C, i);
      e.claim(F, i);
    }
    e.setNow(1001);
    expect(() => e.reclaimExpired(C)).toThrowError(/NothingToReclaim/);
  });

  it("invariants hold across a random action sequence (fuzz)", () => {
    for (let seed = 0; seed < 200; seed++) {
      const e = fresh(500, 0);
      let s = seed;
      const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      for (let step = 0; step < 40; step++) {
        const pick = Math.floor(rnd() * 6);
        try {
          if (pick === 0) e.fund(C, 6n * E);
          else if (pick === 1) e.approveMilestone(C, Math.floor(rnd() * 3));
          else if (pick === 2) e.claim(F, Math.floor(rnd() * 3));
          else if (pick === 3) e.advance(100);
          else if (pick === 4) e.reclaimExpired(C);
          else e.approveMilestone(X, 0);
        } catch {
          /* reverts are fine — we only assert invariants survive */
        }
        const inv = e.checkInvariants();
        expect(inv.every((i) => i.ok)).toBe(true);
      }
    }
  });

  it("fmtEth formats wei like the UI needs", () => {
    expect(fmtEth(6n * E)).toBe("6");
    expect(fmtEth(1n * E + 5n * 10n ** 17n)).toBe("1.5");
    expect(fmtEth(0n)).toBe("0");
    expect(fmtEth(123n)).toBe("0.000000000000000123");
  });
});
