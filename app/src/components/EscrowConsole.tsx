import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EscrowEngine,
  Revert,
  fmtEth,
  shortAddr,
  type EscrowEvent,
} from "../lib/escrowEngine";
import {
  connectWallet,
  chainName,
  hasDeployedContract,
  CONTRACT_ADDRESS,
  mode,
  type WalletInfo,
} from "../lib/wallet";

const E = 10n ** 18n;

const CLIENT = "0xC11E17a1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7";
const FREELANCER = "0xF4EEa9b8C7d6E5f4A3b2C1d0E9f8A7b6C5d4E3F2";
const STRANGER = "0xBAD0000000000000000000000000000000000BAD";

type Scenario = "happy" | "dispute" | "attack";

const SCENARIOS: Record<
  Scenario,
  { label: string; desc: string; amounts: bigint[]; deadline: number; clientBalance: bigint }
> = {
  happy: {
    label: "happy-path",
    desc: "client funds, approves every milestone, freelancer claims all",
    amounts: [1n * E, 2n * E, 3n * E],
    deadline: 30 * 86400,
    clientBalance: 20n * E,
  },
  dispute: {
    label: "dispute",
    desc: "milestone 0 approved + claimed, then deadline passes -> reclaim the rest",
    amounts: [1n * E, 2n * E, 3n * E],
    deadline: 30 * 86400,
    clientBalance: 20n * E,
  },
  attack: {
    label: "red-team",
    desc: "stranger & freelancer try privileged calls — every one must revert",
    amounts: [1n * E, 2n * E, 3n * E],
    deadline: 30 * 86400,
    clientBalance: 20n * E,
  },
};

interface LogLine {
  id: number;
  kind: "call" | "ok" | "revert" | "info" | "event";
  text: string;
  at: number;
}

let LOG_ID = 0;

export default function EscrowConsole() {
  const [scenario, setScenario] = useState<Scenario>("happy");
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletMsg, setWalletMsg] = useState<string>("");
  const [actor, setActor] = useState<"client" | "freelancer" | "stranger">("client");
  const logBox = useRef<HTMLDivElement | null>(null);

  const build = useCallback((s: Scenario) => {
    const cfg = SCENARIOS[s];
    return new EscrowEngine({
      client: CLIENT,
      freelancer: FREELANCER,
      amounts: cfg.amounts,
      deadline: cfg.deadline,
      now: 0,
      clientBalance: cfg.clientBalance,
    });
  }, []);

  // Engine lives in state (not a ref) so it exists on the FIRST render —
  // a ref would still be null here and crash the initial paint.
  const [engine, setEngine] = useState<EscrowEngine>(() => build("happy"));

  const seedLogs = useCallback((e: EscrowEngine): LogLine[] => {
    LOG_ID = 0;
    return [
      { id: LOG_ID++, kind: "info", text: "$ escrow.deploy(freelancer, [1,2,3] ETH, deadline=+30d)", at: 0 },
      { id: LOG_ID++, kind: "ok", text: `EscrowCreated  total=6 ETH  deadline=${e.state.deadline}`, at: 0 },
    ];
  }, []);

  const reset = useCallback(
    (s: Scenario = scenario) => {
      const e = build(s);
      setEngine(e);
      setLogs(seedLogs(e));
      setTick((t) => t + 1);
    },
    [build, seedLogs, scenario]
  );

  // seed the initial log once, and rebuild whenever the scenario changes
  useEffect(() => {
    const e = build(scenario);
    setEngine(e);
    setLogs(seedLogs(e));
    setTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  useEffect(() => {
    if (logBox.current) logBox.current.scrollTop = logBox.current.scrollHeight;
  }, [logs]);

  const snap = useMemo(() => engine.snapshot(), [engine, tick]);

  const pushLog = (kind: LogLine["kind"], text: string) => {
    setLogs((l) => [...l, { id: LOG_ID++, kind, text, at: engine.clock }]);
  };

  const actorAddr =
    actor === "client" ? CLIENT : actor === "freelancer" ? FREELANCER : STRANGER;
  const actorLabel = actor === "client" ? "client" : actor === "freelancer" ? "freelancer" : "stranger";

  /** Run an engine call as the selected actor, logging the call + result. */
  const call = (fn: string, args: string, action: () => void) => {
    pushLog("call", `${actorLabel}.${fn}(${args})`);
    try {
      action();
      pushLog("ok", `✓ ${fn} — ok`);
    } catch (err) {
      const code = err instanceof Revert ? err.code : String((err as Error).message ?? err);
      pushLog("revert", `✗ revert ${code}()`);
    }
    setTick((t) => t + 1);
  };

  const onFund = () => call("fund", "{value: 6 ETH}", () => engine.fund(actorAddr, 6n * E));
  const onApprove = (i: number) => call("approveMilestone", String(i), () => engine.approveMilestone(actorAddr, i));
  const onClaim = (i: number) => call("claim", String(i), () => engine.claim(actorAddr, i));
  const onReclaim = () => call("reclaimExpired", "", () => engine.reclaimExpired(actorAddr));
  const onAdvance = () => {
    engine.advance(7 * 86400);
    pushLog("info", `⏩ vm.warp(+7d)  block.timestamp=${engine.clock}`);
    setTick((t) => t + 1);
  };

  const expired = snap.now > engine.state.deadline;
  const invariants = engine.checkInvariants();

  const onConnect = useCallback(async () => {
    if (wallet) {
      setWallet(null);
      setWalletMsg("");
      pushLog("info", "wallet disconnected");
      return;
    }
    pushLog("info", "wallet.connect() — requesting accounts…");
    const res = await connectWallet();
    if (res.ok) {
      setWallet(res.wallet);
      setWalletMsg("");
      pushLog(
        "ok",
        `✓ wallet connected ${shortAddr(res.wallet.address)} on ${chainName(res.wallet.chainId)}`
      );
      if (!hasDeployedContract) {
        pushLog(
          "info",
          "no contract address configured — actions still run in the LOCAL simulator"
        );
      }
    } else {
      setWalletMsg(res.message);
      pushLog("revert", `✗ wallet connect failed (${res.reason}): ${res.message}`);
    }
  }, [wallet, pushLog]);

  const runScenario = () => {
    if (scenario === "happy") {
      engine.fund(CLIENT, 6n * E);
      pushLog("call", `client.fund({value: 6 ETH})`);
      pushLog("ok", "✓ Funded  totalUnreleased=6 ETH");
      for (let i = 0; i < 3; i++) {
        engine.approveMilestone(CLIENT, i);
        pushLog("call", `client.approveMilestone(${i})`);
        const amt = engine.claim(FREELANCER, i);
        pushLog("ok", `✓ freelancer.claim(${i}) -> +${fmtEth(amt)} ETH`);
      }
    } else if (scenario === "dispute") {
      engine.fund(CLIENT, 6n * E);
      pushLog("call", `client.fund({value: 6 ETH})`);
      engine.approveMilestone(CLIENT, 0);
      pushLog("call", `client.approveMilestone(0)`);
      engine.claim(FREELANCER, 0);
      pushLog("ok", `✓ freelancer.claim(0) -> +1 ETH`);
      engine.setNow(engine.state.deadline + 1);
      pushLog("info", `⏩ vm.warp(deadline + 1s)`);
      const back = engine.reclaimExpired(CLIENT);
      pushLog("call", `client.reclaimExpired()`);
      pushLog("ok", `✓ ExpiredReclaimed  +${fmtEth(back)} ETH back to client`);
    } else {
      const tries: [string, () => void][] = [
        ["stranger.fund({value:6 ETH})", () => engine.fund(STRANGER, 6n * E)],
        ["stranger.approveMilestone(0)", () => engine.approveMilestone(STRANGER, 0)],
        ["freelancer.approveMilestone(0)", () => engine.approveMilestone(FREELANCER, 0)],
        ["stranger.claim(0)", () => engine.claim(STRANGER, 0)],
        ["stranger.reclaimExpired()", () => engine.reclaimExpired(STRANGER)],
      ];
      for (const [label, fn] of tries) {
        pushLog("call", label);
        try {
          fn();
          pushLog("ok", "✓ ok (UNEXPECTED — should have reverted!)");
        } catch (err) {
          const code = err instanceof Revert ? err.code : "Error";
          pushLog("revert", `✗ revert ${code}()  — RESISTED`);
        }
      }
      pushLog("info", "red team: all unauthorized paths reverted");
    }
    setTick((t) => t + 1);
  };

  const kindColor: Record<LogLine["kind"], string> = {
    call: "text-[#8fd0ff]",
    ok: "text-[#22e07a]",
    revert: "text-[#ff5c5c]",
    info: "text-[#f5b544]",
    event: "text-[#cbe6da]",
  };

  return (
    <div className="min-h-screen">
      <TopBar
        wallet={wallet}
        onConnect={onConnect}
        contractAddress={CONTRACT_ADDRESS}
        mode={mode}
      />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-6">
        {/* scenario selector */}
        <div className="panel mb-5">
          <div className="panel-head">
            <span className="dot-live inline-block h-2 w-2 rounded-full bg-[#22e07a]" />
            scenario · click a path then RUN
          </div>
          <div className="flex flex-wrap items-center gap-3 p-4">
            {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
              <button
                key={s}
                className={`btn ${scenario === s ? "btn-primary" : ""}`}
                onClick={() => setScenario(s)}
              >
                {SCENARIOS[s].label}
              </button>
            ))}
            <span className="text-xs text-[#5b7a6e]">{SCENARIOS[scenario].desc}</span>
            <div className="ml-auto flex gap-2">
              <button className="btn btn-primary" onClick={runScenario}>
                ▶ RUN {SCENARIOS[scenario].label}
              </button>
              <button className="btn" onClick={() => reset()}>
                ⟲ reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* LEFT — state */}
          <div className="space-y-5 lg:col-span-4">
            <StatePanel engine={engine} snap={snap} expired={expired} />
            <InvariantPanel invariants={invariants} />
          </div>

          {/* CENTER — milestones + actions */}
          <div className="space-y-5 lg:col-span-5">
            <ActorPanel
              actor={actor}
              setActor={setActor}
              wallet={wallet}
              walletMsg={walletMsg}
              onConnect={onConnect}
              expired={expired}
            />
            <MilestonePanel
              engine={engine}
              snap={snap}
              onApprove={onApprove}
              onClaim={onClaim}
            />
            <div className="panel">
              <div className="panel-head">escrow actions</div>
              <div className="flex flex-wrap gap-2 p-4">
                <button className="btn btn-primary" onClick={onFund} disabled={snap.escrow.funded}>
                  fund() — 6 ETH
                </button>
                <button className="btn" onClick={onReclaim} disabled={!expired}>
                  reclaimExpired()
                </button>
                <button className="btn" onClick={onAdvance}>
                  ⏩ advance +7d
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — terminal log */}
          <div className="lg:col-span-3">
            <div className="panel flex h-[560px] flex-col">
              <div className="panel-head">
                <span className="text-[#22e07a]">●</span> evm log
              </div>
              <div ref={logBox} className="flex-1 overflow-y-auto p-3 font-mono text-[11.5px] leading-relaxed">
                {logs.map((l) => (
                  <div key={l.id} className={kindColor[l.kind]}>
                    <span className="text-[#3d5a50]">[{l.at}]</span> {l.text}
                  </div>
                ))}
                <div className="cursor text-[#22e07a]" />
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

function TopBar({
  wallet,
  onConnect,
  contractAddress,
  mode,
}: {
  wallet: WalletInfo | null;
  onConnect: () => void;
  contractAddress: string;
  mode: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#16241f] bg-[#05070a]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <span className="flex gap-1.5">
          <i className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <i className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <i className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </span>
        <span className="hidden text-xs tracking-widest text-[#5b7a6e] sm:inline">
          milestone-escrow — testnet console
        </span>
        <span className="chip text-[#f5b544]">W1 · TESTNET</span>
        <span
          className="chip"
          style={{
            color: mode === "on-chain" ? "#22e07a" : "#8fd0ff",
            borderColor: mode === "on-chain" ? "#22e07a" : "#2a4a5a",
          }}
          title={
            mode === "on-chain"
              ? `contract ${contractAddress}`
              : "no contract address set — the console runs a faithful local simulator of the contract"
          }
        >
          {mode === "on-chain" ? "ON-CHAIN" : "SIMULATOR"}
        </span>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <span className="hidden truncate text-[11px] text-[#5b7a6e] md:inline">
            {wallet ? `${chainName(wallet.chainId)} · ${shortAddr(wallet.address)}` : "no wallet"}
          </span>
          <button className={`btn ${wallet ? "" : "btn-primary"}`} onClick={onConnect}>
            {wallet ? "disconnect" : "connect wallet"}
          </button>
        </div>
      </div>
    </header>
  );
}

function StatePanel({
  engine,
  snap,
  expired,
}: {
  engine: EscrowEngine;
  snap: ReturnType<EscrowEngine["snapshot"]>;
  expired: boolean;
}) {
  const s = snap.escrow;
  return (
    <div className="panel">
      <div className="panel-head">escrow state · {expired ? "EXPIRED" : "ACTIVE"}</div>
      <div className="p-4">
        <div className="mono-row">
          <span className="k">client</span>
          <span className="v text-[#8fd0ff]">{shortAddr(s.client)}</span>
        </div>
        <div className="mono-row">
          <span className="k">freelancer</span>
          <span className="v text-[#8fd0ff]">{shortAddr(s.freelancer)}</span>
        </div>
        <div className="mono-row">
          <span className="k">funded</span>
          <span className="v" style={{ color: s.funded ? "#22e07a" : "#f5b544" }}>
            {s.funded ? "true" : "false"}
          </span>
        </div>
        <div className="mono-row">
          <span className="k">totalFunded</span>
          <span className="v">{fmtEth(s.totalFunded)} ETH</span>
        </div>
        <div className="mono-row">
          <span className="k">totalReleased</span>
          <span className="v text-[#22e07a]">{fmtEth(s.totalReleased)} ETH</span>
        </div>
        <div className="mono-row">
          <span className="k">totalUnreleased</span>
          <span className="v text-[#f5b544]">{fmtEth(s.totalUnreleased)} ETH</span>
        </div>
        <div className="mono-row">
          <span className="k">totalReclaimed</span>
          <span className="v text-[#c084fc]">{fmtEth(s.totalReclaimed)} ETH</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <BalanceBox label="client" wei={snap.balances.client} color="#8fd0ff" />
          <BalanceBox label="escrow" wei={snap.balances.escrow} color="#22e07a" />
          <BalanceBox label="freelancer" wei={snap.balances.freelancer} color="#c084fc" />
        </div>
      </div>
    </div>
  );
}

function BalanceBox({ label, wei, color }: { label: string; wei: bigint; color: string }) {
  return (
    <div className="rounded-md border border-[#16241f] bg-[#060a0d] p-2">
      <div className="text-[10px] uppercase tracking-widest text-[#5b7a6e]">{label}</div>
      <div className="text-sm font-semibold" style={{ color }}>
        {fmtEth(wei)}
      </div>
      <div className="text-[10px] text-[#5b7a6e]">ETH</div>
    </div>
  );
}

function InvariantPanel({
  invariants,
}: {
  invariants: { name: string; ok: boolean; detail: string }[];
}) {
  return (
    <div className="panel">
      <div className="panel-head">invariants · checked every action</div>
      <div className="p-4 space-y-2">
        {invariants.map((inv) => (
          <div key={inv.name} className="flex items-start gap-2 text-xs">
            <span style={{ color: inv.ok ? "#22e07a" : "#ff5c5c" }}>
              {inv.ok ? "✓" : "✗"}
            </span>
            <div>
              <div style={{ color: inv.ok ? "#d6f5e6" : "#ff5c5c" }}>{inv.name}</div>
              <div className="text-[10.5px] text-[#5b7a6e]">{inv.detail}</div>
            </div>
          </div>
        ))}
        <div className="mt-2 border-t border-dashed border-[#16241f] pt-2 text-[10.5px] text-[#5b7a6e]">
          these are the same invariants the Foundry stateful test asserts on-chain.
        </div>
      </div>
    </div>
  );
}

function ActorPanel({
  actor,
  setActor,
  wallet,
  walletMsg,
  onConnect,
  expired,
}: {
  actor: "client" | "freelancer" | "stranger";
  setActor: (a: "client" | "freelancer" | "stranger") => void;
  wallet: WalletInfo | null;
  walletMsg: string;
  onConnect: () => void;
  expired: boolean;
}) {
  return (
    <div className="panel">
      <div className="panel-head">acting as · msg.sender</div>
      <div className="flex flex-wrap items-center gap-2 p-4">
        {(["client", "freelancer", "stranger"] as const).map((a) => (
          <button
            key={a}
            className={`btn ${actor === a ? "btn-primary" : ""}`}
            onClick={() => setActor(a)}
          >
            {a}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-[#5b7a6e]">
          {wallet
            ? `wallet: ${shortAddr(wallet.address)}`
            : "demo mode — no wallet needed"}
        </span>
        {wallet && (
          <span className="chip text-[#f5b544]" title="state shown is the local simulator">
            {expired ? "expired" : "active"}
          </span>
        )}
      </div>
      {!wallet && (
        <div className="border-t border-dashed border-[#16241f] px-4 py-2 text-[10.5px] text-[#5b7a6e]">
          try <span className="text-[#ff5c5c]">stranger</span> or{" "}
          <span className="text-[#ff5c5c]">freelancer</span> on{" "}
          <span className="text-[#8fd0ff]">approveMilestone</span> — the access control
          reverts. Connecting a wallet is optional.
        </div>
      )}
      {walletMsg && (
        <div className="border-t border-dashed border-[#16241f] px-4 py-2 text-[10.5px] text-[#f5b544]">
          {walletMsg}
        </div>
      )}
    </div>
  );
}

function MilestonePanel({
  engine,
  snap,
  onApprove,
  onClaim,
}: {
  engine: EscrowEngine;
  snap: ReturnType<EscrowEngine["snapshot"]>;
  onApprove: (i: number) => void;
  onClaim: (i: number) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-head">milestones · {snap.escrow.milestones.length}</div>
      <div className="divide-y divide-[#16241f]">
        {snap.escrow.milestones.map((m) => {
          const state = m.claimed ? "claimed" : m.approved ? "approved" : "pending";
          const color =
            state === "claimed" ? "#22e07a" : state === "approved" ? "#f5b544" : "#5b7a6e";
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs text-[#5b7a6e]">#{m.id}</span>
              <span className="text-sm text-[#d6f5e6]">{fmtEth(m.amount)} ETH</span>
              <span className="chip" style={{ color, borderColor: color }}>
                {state}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  className="btn !py-1 !text-[11px]"
                  onClick={() => onApprove(m.id)}
                  disabled={m.approved}
                >
                  approve
                </button>
                <button
                  className="btn !py-1 !text-[11px]"
                  onClick={() => onClaim(m.id)}
                  disabled={!m.approved || m.claimed}
                >
                  claim
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-[#16241f] px-4 py-2 text-[10.5px] text-[#5b7a6e]">
        approve = client only · claim = freelancer only · one claim per milestone
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-[#16241f] pt-6 text-center text-[11px] text-[#5b7a6e]">
      <p>
        MilestoneEscrow — Solidity 0.8.20 · 29 Foundry tests · 100% line coverage ·
        Slither clean · red-team ladder T1–T3 resisted
      </p>
      <p className="mt-1">
        Built with a security-first SOP (W1 testnet). Not audited — not for real funds.
      </p>
    </footer>
  );
}
