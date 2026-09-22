# Design Proposal — On-Chain Milestone Escrow

**Status:** menunggu approval manusia (Stage-1 gate SOP: *no implementation until human agrees*)
**Tier:** **W1** (pre-production, testnet only, tidak ada dana nyata)
**Chain target:** Ethereum Sepolia (chain-id 11155111) — RPC publik terverifikasi hidup
**Tanggal:** 2026-09-22

---

## 1. Kenapa project ini

| Alasan | Detail |
|--------|--------|
| **Portofolio nyata** | Bukan tutorial. Masalah nyata: freelance/client sering kena scam karena nggak ada escrow tepercaya. |
| **Nyambung ke kerjaan lu** | Ini versi on-chain dari **TerminLock** (milestone billing + BAST sign-off) yang udah lu bikin di web2. Narasi kuat: *"gw bawa escrow milestone ke on-chain".* |
| **Nge-test SEMUA gate SOP** | Access control (T1), economic/precision (T2), reentrancy (T3), invariant (G2/G5), deploy rehearsal (E12), deploy+verify (E13), red team (E19). |
| **Aman buat belajar** | W1 = testnet, nol dana nyata. Kalau ada bug, nggak ada yang rugi. |

---

## 2. Scope v1 (kecil, jelas, bisa selesai)

**Fungsi inti:**
1. `createEscrow(freelancer, milestones[], deadline)` — client bikin escrow.
2. `fund()` — client isi dana **penuh di awal** (harus == total milestone).
3. `approveMilestone(id)` — client setujui milestone (dana jadi claimable).
4. `claim(id)` — freelancer tarik dana milestone yang udah di-approve.
5. `reclaimExpired()` — lewat deadline & belum kelar → client ambil sisa.

**Yang SENGAJA di luar scope v1** (dicatat, biar jujur):
- Arbiter/dispute resolution (v2)
- Multi-freelancer / multi-client
- Token ERC-20 (v1 pakai ETH native dulu)
- Frontend (nanti, lewat `web-app-sop`)

---

## 3. Invariants (G2 — didefinisikan SEBELUM kode)

1. **Solvency:** `address(this).balance >= totalUnreleased`
2. **Conservasi:** `sum(released) + totalUnreleased == totalFunded`
3. **Batas:** `released[i] <= milestones[i].amount` untuk semua i
4. **Sekali saja:** satu milestone nggak bisa di-claim dua kali
5. **Otorisasi:** hanya client yang bisa `approveMilestone`; hanya freelancer yang bisa `claim`
6. **Monotonik:** `totalReleased` nggak pernah turun

Setiap invariant harus **bisa dibuat gagal** (mutation-checked) — hukum SOP.

---

## 4. Threat model (P1 — ringkas)

**STRIDE:** spoofing (approve sebagai client lain), tampering (ubah milestone setelah funded), repudiation (klaim tanpa bukti), info disclosure (nggak ada secret on-chain), DoS (freelancer griefing reclaim), elevation (claim milestone orang lain).

**Economic (Part B):**
- **Reentrancy (B5):** `claim()` kirim ETH → wajib checks-effects-interactions + nonReentrant.
- **Access control (B6):** ini vector #1 (43,8% kerugian). Wajib test unauthorized → revert.
- **Precision/logic (B8):** pembagian/rounding, double-claim, release > funded.
- **DoS (B10):** push vs pull payment; freelancer nggak boleh nge-block client reclaim.
- **MEV:** minimal di v1 (nggak ada oracle/harga). Dicatat N/A + alasan.

---

## 5. Gate plan (sesuai tier W1)

| Gate | Cara |
|------|-----|
| G1 threat model | dokumen ini + `references/economic-threat-model.md` |
| G2 invariant | §3 di atas, sebelum kode |
| G3 unit (TDD) | RED→GREEN tiap fungsi |
| G4 fuzz | `forge test --fuzz-runs 10000` |
| G5 invariant | `fizz` → suite stateful (Foundry invariant + Medusa) |
| G6 static | Slither + Aderyn |
| G7 coverage | `forge coverage` |
| G8 fork | Sepolia fork test |
| G11 proxy | **N/A** — v1 nggak upgradeable (dicatat + alasan) |
| G13/E12 rehearsal | `anvil` fork Sepolia, dry-run deploy |
| E13 deploy | deploy ke **Sepolia**, verify source |
| E14 monitor | event indexing + alert plan |
| E15 AI discipline | aturan R1–R10 |
| **E19 red team** | ladder T0–T5 (bot nyerang kontrak ini) |
| I1–I5 perimeter | `perimeter-check.sh` + attest |

---

## 6. Deliverables

```
/mnt/data/01_Projects/Porto/milestone-escrow/
├── DESIGN-PROPOSAL.md      ← dokumen ini (approved)
├── HANDOFF.md              ← P7 (frozen)
├── src/MilestoneEscrow.sol
├── test/                   ← unit + fuzz + invariant + redteam
├── script/Deploy.s.sol
├── foundry.toml            ← solc di-pin
├── README.md               ← dokumentasi + bukti deploy Sepolia
└── SECURITY.md             ← temuan redteam + mitigasi
```

**Bukti untuk portofolio:** alamat kontrak di Sepolia (verified), laporan invariant, laporan red team, coverage.

---

## 7. Estimasi

| Fase | Waktu |
|------|-------|
| P1–P7 planning (threat model, invariant, spec, handoff) | ~30 menit |
| E2–E7 build + test + fuzz + static | ~1–2 jam |
| E11 AI audit (`solidity-auditor`) | ~15 menit |
| E12–E13 rehearsal + deploy Sepolia | ~30 menit |
| E19 red team | ~30 menit |
| Docs + README | ~30 menit |

Total: **~3–4 jam** kerja fokus. Bisa dicicil per milestone.

---

## 8. Risiko & batasan (jujur)

- **Bukan W2/W3:** nggak ada audit manusia berbayar, nggak ada dana nyata. Ini portofolio/testnet, bukan protokol produksi.
- **v1 sengaja kecil** — fitur sedikit tapi benar, lebih baik dari fitur banyak tapi bocor.
- **T5 (infra)** tetap manual (custody key, dsb) — buat testnet pakai key sekali pakai.
- **Deploy testnet butuh ETH Sepolia** dari faucet — nanti gw bantu kalau lu mau, atau pakai akun lu.

---

## 9. Keputusan yang gw butuh dari lu

1. **Setuju project ini?** (atau mau ganti konsep)
2. **Nama folder/proyek:** `milestone-escrow`? atau lu mau nama lain (mis. `trustlock`)?
3. **Deploy ke Sepolia beneran** (butuh faucet ETH), atau **cukup sampai rehearsal `anvil`** dulu?
