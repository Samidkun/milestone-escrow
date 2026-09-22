# Security — MilestoneEscrow

## Gates passed (tier W1)
| Gate | Result |
|------|--------|
| G1 threat model | docs/THREAT-MODEL.md |
| G2 invariants (before code) | 6 named invariants |
| G3 unit (TDD) | 12 tests, RED→GREEN proven |
| G4 property fuzz | 10,000 runs |
| G5 stateful invariant | 3 invariants, **found 2 real accounting bugs** (see below) |
| G6 static (Slither) | 0 High/Medium; docs/SLITHER-TRIAGE.md |
| G7 coverage | 100% lines, 87% branch |
| E12 rehearsal | anvil deploy OK |
| E15 AI discipline | R1–R10 applied |
| E19 red team | T1–T3 RESISTED; T4 NOT TESTED (no oracle/proxy); T5 manual |

## Bugs the SOP caught (real, not staged)
1. **`totalUnreleased` set in constructor** — escrow claimed it owed 6 ETH before
   it held any. Found by `invariant_Solvency`.
2. **No `totalReclaimed` accounting** — after `reclaimExpired()` funds left with no
   ledger entry. Found by `invariant_Conservation`.

Both were **invisible to the unit tests** and caught by the stateful invariant (G5) —
exactly the class of bug that drains protocols.

## Mutation check (the gates can fail)
Deleting `totalUnreleased -= amount` in `claim()` makes `invariant_Conservation`
and `invariant_Solvency` go **RED**. The gate is real.

## Known limits (honest)
- **No external human audit** — W1 testnet portfolio, not production.
- **T4 not tested** (no oracle/proxy/governance/signature in scope).
- **T5 infra is manual** — key custody, front-end, supply chain (see integrity-gates.md).
- **Not W2/W3** — do not use with real user funds without the W2 gate set.
