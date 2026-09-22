# HANDOFF — milestone-escrow
- Tier: W1        (pre-production, testnet Sepolia, no real funds — justified)
- Chain(s): Ethereum Sepolia (11155111)
- Value at risk: testnet only, none

## 1. Scope
- In scope: src/MilestoneEscrow.sol
- Out of scope: dispute/arbiter, multi-party, ERC-20, upgradeability (reasons in THREAT-MODEL.md)

## 2. Threat model
- Path: docs/THREAT-MODEL.md
- Invariants: (1) balance >= totalUnreleased (2) totalReleased+totalUnreleased==totalFunded
  (3) released[i] <= amounts[i] (4) one claim per milestone (5) onlyClient approve /
  onlyFreelancer claim (6) totalReleased monotonic

## 3. Acceptance criteria (EARS)
- docs/SPEC.md AC-1..AC-12

## 4. Architecture decisions
- Upgradeable: no (immutable by design — G11 N/A)
- Custody: testnet EOA (single-use key); W2+ would require multisig
- Oracle: none (N/A)
- Pausability: none (v1); documented as a v2 consideration

## 5. Tooling & gates
- Required gates for W1: G1-G8, G13, G15, E19, I1-I5
- CI: local (forge test/fuzz/invariant/coverage + slither)

## 6. Deploy & ops
- Deploy procedure: script/Deploy.s.sol, rehearsed on anvil (local fork)
- Verification: n/a for local anvil rehearsal (Sepolia verify deferred)
- Key management: ephemeral anvil key for rehearsal; no real key used
- IR plan: n/a for W1 local rehearsal (W2+ requirement)
- Monitoring: n/a for W1 local rehearsal (W2+ requirement)

## 7. Open risks / accepted exceptions
- No external human audit — accepted: W1 testnet portfolio, not production
- Local anvil rehearsal only (no Sepolia deploy) — accepted by user choice
