# Spec — MilestoneEscrow (EARS)

## Acceptance criteria
- **AC-1** WHEN client memanggil `createEscrow(freelancer, amounts, deadline)`, THE system SHALL menyimpan escrow dengan client=msg.sender, freelancer, daftar milestone, deadline, dan status belum funded.
- **AC-2** WHEN client memanggil `fund()` dengan `msg.value == sum(amounts)`, THE system SHALL menandai escrow funded dan menyimpan `totalFunded`.
- **AC-3** IF `fund()` dipanggil dengan `msg.value != sum(amounts)`, THEN THE system SHALL revert.
- **AC-4** WHEN client memanggil `approveMilestone(i)`, THE system SHALL menandai milestone i approved (sekali saja).
- **AC-5** WHEN freelancer memanggil `claim(i)` untuk milestone i yang approved dan belum claimed, THE system SHALL mentransfer `amounts[i]` ke freelancer dan menandai claimed.
- **AC-6** IF bukan client yang memanggil `approveMilestone`, THEN THE system SHALL revert.
- **AC-7** IF bukan freelancer yang memanggil `claim`, THEN THE system SHALL revert.
- **AC-8** IF milestone belum approved atau sudah claimed saat `claim`, THEN THE system SHALL revert.
- **AC-9** WHEN `block.timestamp > deadline` dan ada dana belum dirilis, THE system SHALL mengizinkan client `reclaimExpired()` mengambil sisa.
- **AC-10** IF `reclaimExpired()` dipanggil sebelum deadline, THEN THE system SHALL revert.
- **AC-11** THE system SHALL selalu menjaga invariant §Part C (solvency, conservation, batas, sekali-claim, otorisasi, monotonik).
- **AC-12** THE system SHALL memancarkan event untuk create/fund/approve/claim/reclaim.

## Non-functional
- Solidity ^0.8.20 (checked arithmetic bawaan), solc di-pin.
- Tidak ada upgradeability (immutable).
- Gas wajar (< ~150k per claim).
