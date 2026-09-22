/**
 * wallet.ts — real EIP-1193 wallet connection (MetaMask, Rabby, …).
 *
 * Honesty rules for this portfolio demo:
 *  - We NEVER pretend a local simulation is an on-chain transaction.
 *  - If a wallet is present we connect for real and show the real address + chain.
 *  - Without a deployed contract address, actions run in the local simulator and
 *    the UI says so explicitly (`mode` below). No fake "confirmed" states.
 */

export interface WalletInfo {
  address: string;
  chainId: number;
}

export type ConnectResult =
  | { ok: true; wallet: WalletInfo }
  | { ok: false; reason: "no_wallet" | "rejected" | "error"; message: string };

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...a: unknown[]) => void) => void;
};

export function getProvider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: Eip1193 };
  return w.ethereum ?? null;
}

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  11155111: "Sepolia",
  31337: "Anvil (local)",
  17000: "Holesky",
};

export function chainName(id: number): string {
  return CHAIN_NAMES[id] ?? `chain ${id}`;
}

export async function connectWallet(): Promise<ConnectResult> {
  const provider = getProvider();
  if (!provider) {
    return {
      ok: false,
      reason: "no_wallet",
      message: "No EIP-1193 wallet found. Install MetaMask to connect — or use demo mode.",
    };
  }
  try {
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts || accounts.length === 0) {
      return { ok: false, reason: "rejected", message: "No account returned by the wallet." };
    }
    const chainHex = (await provider.request({ method: "eth_chainId" })) as string;
    return {
      ok: true,
      wallet: { address: accounts[0], chainId: Number.parseInt(chainHex, 16) },
    };
  } catch (err) {
    const message = (err as { message?: string })?.message ?? String(err);
    const rejected = /reject|denied|cancel/i.test(message);
    return { ok: false, reason: rejected ? "rejected" : "error", message };
  }
}

/** Contract address comes from build-time env; absent => simulator mode. */
export const CONTRACT_ADDRESS: string =
  (import.meta.env.PUBLIC_ESCROW_ADDRESS as string | undefined) ?? "";

export const hasDeployedContract = CONTRACT_ADDRESS.length > 0;

export type Mode = "simulator" | "on-chain";
export const mode: Mode = hasDeployedContract ? "on-chain" : "simulator";
