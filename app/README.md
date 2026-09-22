# MilestoneEscrow — dApp console

An interactive, portfolio-ready console for the `MilestoneEscrow` contract.
**Astro 5 + React 19 + Tailwind 4**, dark terminal theme.

![preview](./docs/preview.png)

## What it shows
A visitor can click through the *entire* escrow lifecycle with no wallet:

- **happy-path** — client funds, approves all milestones, freelancer claims all
- **dispute** — milestone 0 paid, deadline passes, client reclaims the rest
- **red-team** — stranger & freelancer try every privileged call → all revert

…plus a live **invariant panel** (Solvency, Conservation, …) checked after every
action, an **EVM-style log** of every call/revert, and an **actor switch**
(`client` / `freelancer` / `stranger`) so you can watch access control bite.

## Design principle: the demo is a faithful port, not a mock
`src/lib/escrowEngine.ts` is a line-by-line port of `../src/MilestoneEscrow.sol`:
same functions, same reverts (`NotClient`, `AlreadyClaimed`, …), same
checks-effects-interactions ordering, same accounting invariants. It is covered by
`test/escrowEngine.test.ts` (10 tests, incl. a 200-seed fuzz) so the simulation
cannot drift from the contract silently.

> The fuzz test immediately caught two real bugs in the port (checked-arithmetic
> underflow on `claim()` after `reclaimExpired()`, and a missing pre-funding guard
> in the invariant check) — the same class of bug the on-chain invariant test
> catches. The port is only trusted because the test proves it.

## Wallet (optional, honest)
"Connect wallet" uses real **EIP-1193** (`eth_requestAccounts` / `eth_chainId`).
With no contract address configured the badge reads **SIMULATOR** and the UI says
so — it never pretends a local simulation is an on-chain transaction.

To wire a deployed contract, set a build-time env var:

```bash
PUBLIC_ESCROW_ADDRESS=0xYourDeployedAddress npm run build
```

With it set, the badge flips to **ON-CHAIN**.

## Run
```bash
npm install
npm run dev        # http://localhost:4321
npm test           # engine tests (vitest)
npm run build      # static output in dist/
```

## Deploy
Static site — deploy `dist/` anywhere (Vercel / Netlify / Cloudflare Pages / GitHub Pages).

## Status
Part of the `milestone-escrow` W1 portfolio project. **Not audited — not for real funds.**
