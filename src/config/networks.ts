export interface NetworkConfig {
  chainId: number;
  /** chainId au format hexadécimal attendu par MetaMask */
  hexChainId: string;
  name: string;
  rpcUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrl: string | null;
}

export const HARDHAT_CHAIN_ID = 31337;
export const SEPOLIA_CHAIN_ID = 11155111;

export const NETWORKS: Record<number, NetworkConfig> = {
  [HARDHAT_CHAIN_ID]: {
    chainId: HARDHAT_CHAIN_ID,
    hexChainId: "0x7a69",
    name: "Hardhat local",
    rpcUrl: "http://127.0.0.1:8545",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrl: null,
  },
  [SEPOLIA_CHAIN_ID]: {
    chainId: SEPOLIA_CHAIN_ID,
    hexChainId: "0xaa36a7",
    name: "Sepolia",
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrl: "https://sepolia.etherscan.io",
  },
};

function readTargetChainId(): number {
  const raw = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? HARDHAT_CHAIN_ID);
  return NETWORKS[raw] ? raw : HARDHAT_CHAIN_ID;
}

/** Réseau sur lequel l'application travaille (NEXT_PUBLIC_CHAIN_ID). */
export const TARGET_CHAIN_ID = readTargetChainId();
export const TARGET_NETWORK: NetworkConfig = NETWORKS[TARGET_CHAIN_ID];

export function getNetwork(chainId: number | null | undefined): NetworkConfig | null {
  if (chainId == null) return null;
  return NETWORKS[chainId] ?? null;
}
