# Threat Model — MilestoneEscrow (P1)

Tier **W1** · Sepolia testnet · value at risk: **testnet only, none**.

## Assets
- ETH terkunci di escrow — yang bisa memindahkan: client (reclaim sisa setelah deadline), freelancer (claim milestone yang di-approve).

## Actors & privileges
| Actor | Bisa apa | Tipe key |
|-------|----------|----------|
| client | create, fund, approveMilestone, reclaimExpired | EOA (testnet) |
| freelancer | claim | EOA (testnet) |
| siapa pun | baca state | — |

## STRIDE (Part A)
| Threat | Risiko konkret | Kontrol | Test pembuktinya |
|--------|----------------|---------|------------------|
| Spoofing | bukan client memanggil approve | `onlyClient` modifier + test unauthorized revert | `test_RevertWhen_ApproveNotClient` |
| Tampering | ubah milestone setelah funded | milestones immutable setelah create | `test_MilestonesImmutable` |
| Repudiation | klaim tanpa approve | event `MilestoneApproved` + cek status | `test_ClaimRequiresApproval` |
| Info disclosure | tidak ada secret on-chain | N/A | — |
| DoS | freelancer griefing reclaim | pull-over-push; reclaim hanya ambil unreleased | `test_ReclaimAfterDeadline` |
| Elevation | claim milestone orang lain | `onlyFreelancer` + milestone milik escrow ini | `test_RevertWhen_ClaimNotFreelancer` |

## Economic (Part B) — tiap kategori addressed atau "N/A: reason"
| Kategori | Risiko | Kontrol | Gate |
|----------|--------|---------|------|
| B5 Reentrancy | claim() kirim ETH → re-enter | checks-effects-interactions + nonReentrant | G5 |
| B6 Access control | approve/claim tanpa izin (vector #1) | RBAC per-role, test unauthorized revert | G10 |
| B8 Logic/precision | double-claim, released > amount, total mismatch | invariant + fuzz | G4/G5 |
| B10 Integration | v1 pakai ETH native (bukan ERC-20) | N/A: reason — no external token | — |
| B1 Oracle | tidak ada oracle/harga | N/A: reason — no price dependency | — |
| B2 Flash loan | tidak ada ambil keputusan berbasis saldo instan | N/A: reason — no instant-balance logic | — |
| B3 MEV | tidak ada slippage/ordering-sensitif di v1 | N/A: reason — amounts fixed at create | — |
| B4 Governance | tidak ada governance | N/A: reason — single client/freelancer | — |
| B7 Key compromise | key testnet sekali pakai | N/A untuk W1; W2+ wajib multisig | I4 |
| B9 Cross-chain | tidak ada bridge | N/A: reason — single chain | — |

## Invariants (Part C) — didefinisikan SEBELUM kode
1. `address(this).balance >= totalUnreleased`
2. `totalReleased + totalUnreleased == totalFunded`
3. `released[i] <= milestones[i].amount` ∀i
4. satu milestone di-claim maksimal sekali
5. hanya client bisa approve; hanya freelancer bisa claim
6. `totalReleased` monotonik naik

Tiap invariant **mutation-checked** (harus bisa dibuat gagal).

## Out of scope (dengan alasan)
- Dispute/arbiter — v2.
- Multi-freelancer — v2.
- ERC-20 token — v2 (v1 ETH native).
- Upgradeability — v1 sengaja immutable (G11 = N/A).
