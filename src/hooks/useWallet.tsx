"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { BrowserProvider, getAddress, type JsonRpcSigner, type Provider } from "ethers";
import { TARGET_CHAIN_ID, TARGET_NETWORK, type NetworkConfig } from "@/config/networks";
import { CONTRACT_NAMES, getDeployedContracts, getReadProvider, isDeployed, type ContractName } from "@/lib/contracts";
import { WrongNetworkError, translateError } from "@/lib/errors";
import { toast } from "sonner";

const DISCONNECTED_KEY = "fitnesschain:disconnected";
const DEPLOYED_CONTRACTS = getDeployedContracts(TARGET_CHAIN_ID);

export interface WalletContextValue {
  /** null tant que le navigateur n'a pas été inspecté (rendu serveur) */
  hasMetaMask: boolean | null;
  address: string | null;
  chainId: number | null;
  targetChainId: number;
  network: NetworkConfig;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  /** Les 5 contrats ont une adresse pour le réseau cible */
  deployed: boolean;
  /** Contrats ayant une adresse pour le réseau cible (déploiement partiel possible) */
  deployedContracts: readonly ContractName[];
  /** true si tous les contrats demandés sont déployés */
  isAvailable: (names?: readonly ContractName[]) => boolean;
  /** Connecté, bon réseau et au moins un contrat déployé : les écritures sont possibles */
  canWrite: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  /** Signer MetaMask (lève une erreur si non connecté ou mauvais réseau) */
  getSigner: () => Promise<JsonRpcSigner>;
  /** Provider de lecture (JSON-RPC, sans wallet) */
  readProvider: Provider | null;
  /** Incrémenté après chaque transaction confirmée pour rafraîchir les données */
  refreshKey: number;
  refresh: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/* Détection de MetaMask sans setState dans un effet */
const subscribeNoop = () => () => {};
const getHasMetaMask = () => typeof window !== "undefined" && !!window.ethereum;
const getHasMetaMaskServer = () => null;

function readDisconnectedFlag(): boolean {
  try {
    return window.localStorage.getItem(DISCONNECTED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDisconnectedFlag(value: boolean) {
  try {
    if (value) window.localStorage.setItem(DISCONNECTED_KEY, "1");
    else window.localStorage.removeItem(DISCONNECTED_KEY);
  } catch {
    // stockage indisponible : sans conséquence
  }
}

function parseChainId(value: unknown): number | null {
  if (typeof value === "string") return Number.parseInt(value, value.startsWith("0x") ? 16 : 10);
  if (typeof value === "number") return value;
  return null;
}

function firstAccount(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[0] === "string") return getAddress(value[0]);
  return null;
}

function nestedCode(error: unknown): unknown {
  const e = error as { code?: unknown; data?: { originalError?: { code?: unknown } } } | null;
  return e?.data?.originalError?.code ?? e?.code;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const hasMetaMask = useSyncExternalStore(subscribeNoop, getHasMetaMask, getHasMetaMaskServer);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Lecture initiale + écoute des changements de compte / réseau
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    let cancelled = false;

    const init = async () => {
      try {
        const [accounts, chain] = await Promise.all([
          ethereum.request({ method: "eth_accounts" }),
          ethereum.request({ method: "eth_chainId" }),
        ]);
        if (cancelled) return;
        setChainId(parseChainId(chain));
        setAddress(readDisconnectedFlag() ? null : firstAccount(accounts));
      } catch {
        // MetaMask verrouillé ou indisponible
      }
    };
    void init();

    const onAccounts = (...args: unknown[]) => {
      const account = firstAccount(args[0]);
      setAddress(account && !readDisconnectedFlag() ? account : null);
    };
    const onChain = (...args: unknown[]) => setChainId(parseChainId(args[0]));

    ethereum.on?.("accountsChanged", onAccounts);
    ethereum.on?.("chainChanged", onChain);
    return () => {
      cancelled = true;
      ethereum.removeListener?.("accountsChanged", onAccounts);
      ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      toast.error("MetaMask n'est pas installé.", {
        action: { label: "Installer", onClick: () => window.open("https://metamask.io/download/", "_blank") },
      });
      return;
    }
    setConnecting(true);
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const chain = await ethereum.request({ method: "eth_chainId" });
      writeDisconnectedFlag(false);
      setAddress(firstAccount(accounts));
      setChainId(parseChainId(chain));
    } catch (error) {
      toast.error(translateError(error));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    writeDisconnectedFlag(true);
    setAddress(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TARGET_NETWORK.hexChainId }],
      });
    } catch (error) {
      if (nestedCode(error) === 4902 && TARGET_NETWORK.rpcUrl) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: TARGET_NETWORK.hexChainId,
                chainName: TARGET_NETWORK.name,
                rpcUrls: [TARGET_NETWORK.rpcUrl],
                nativeCurrency: TARGET_NETWORK.nativeCurrency,
                ...(TARGET_NETWORK.blockExplorerUrl ? { blockExplorerUrls: [TARGET_NETWORK.blockExplorerUrl] } : {}),
              },
            ],
          });
        } catch (addError) {
          toast.error(translateError(addError));
        }
      } else {
        toast.error(translateError(error));
      }
    }
  }, []);

  const getSigner = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum) throw new Error("MetaMask n'est pas installé.");
    if (!address) throw new Error("Connectez d'abord votre wallet MetaMask.");
    const provider = new BrowserProvider(ethereum);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== TARGET_CHAIN_ID) {
      throw new WrongNetworkError(TARGET_NETWORK.name);
    }
    return provider.getSigner(address);
  }, [address]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const isCorrectNetwork = chainId === TARGET_CHAIN_ID;

  const readProvider = useMemo<Provider | null>(() => {
    const rpc = getReadProvider(TARGET_CHAIN_ID);
    if (rpc) return rpc;
    // Pas d'URL RPC configurée : on lit via MetaMask s'il est sur le bon réseau
    if (hasMetaMask && isCorrectNetwork && typeof window !== "undefined" && window.ethereum) {
      return new BrowserProvider(window.ethereum);
    }
    return null;
  }, [hasMetaMask, isCorrectNetwork]);

  const deployed = isDeployed(TARGET_CHAIN_ID);
  const deployedContracts = DEPLOYED_CONTRACTS;
  const isAvailable = useCallback(
    (names: readonly ContractName[] = CONTRACT_NAMES) => names.every((n) => deployedContracts.includes(n)),
    [deployedContracts]
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      hasMetaMask,
      address,
      chainId,
      targetChainId: TARGET_CHAIN_ID,
      network: TARGET_NETWORK,
      isConnected: !!address,
      isCorrectNetwork,
      deployed,
      deployedContracts,
      isAvailable,
      canWrite: !!address && isCorrectNetwork && deployedContracts.length > 0,
      connecting,
      connect,
      disconnect,
      switchNetwork,
      getSigner,
      readProvider,
      refreshKey,
      refresh,
    }),
    [
      hasMetaMask,
      address,
      chainId,
      isCorrectNetwork,
      deployed,
      deployedContracts,
      isAvailable,
      connecting,
      connect,
      disconnect,
      switchNetwork,
      getSigner,
      readProvider,
      refreshKey,
      refresh,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet doit être utilisé dans <WalletProvider>.");
  return ctx;
}
