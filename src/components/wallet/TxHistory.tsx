"use client";

import { ArrowDownLeft, ArrowUpRight, Gift, History, ShoppingCart, type LucideIcon } from "lucide-react";
import type { EventLog, Log, Provider } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";
import { CONTRACT_NAMES, getContract, getContractAddress } from "@/lib/contracts";
import { ZERO_ADDRESS, sameAddress } from "@/lib/mappers";
import { formatDate, formatETH, formatFTC, shortAddress } from "@/lib/format";
import { Card, EmptyState, IconTile, SectionTitle, SkeletonList, type IconTone } from "@/components/ui";

type Kind = "purchase" | "sent" | "received" | "reward";

interface HistoryItem {
  key: string;
  kind: Kind;
  amount: bigint;
  ethAmount?: bigint;
  counterparty: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number;
}

const KIND: Record<Kind, { label: string; icon: LucideIcon; tone: IconTone; sign: string }> = {
  purchase: { label: "Achat de FTC", icon: ShoppingCart, tone: "gold", sign: "+" },
  sent: { label: "Envoi", icon: ArrowUpRight, tone: "red", sign: "−" },
  received: { label: "Réception", icon: ArrowDownLeft, tone: "green", sign: "+" },
  reward: { label: "Récompense", icon: Gift, tone: "violet", sign: "+" },
};

const MAX_ITEMS = 50;

function isEventLog(log: Log | EventLog): log is EventLog {
  return "args" in log;
}

function contractLabel(address: string): string | null {
  for (const name of CONTRACT_NAMES) {
    if (sameAddress(getContractAddress(name), address)) return name;
  }
  return null;
}

async function loadHistory(provider: Provider, me: string): Promise<HistoryItem[]> {
  const fitCoin = getContract("FitCoin", provider);
  const [purchases, sent, received] = await Promise.all([
    fitCoin.queryFilter(fitCoin.filters.TokensPurchased(me), 0, "latest"),
    fitCoin.queryFilter(fitCoin.filters.Transfer(me, null), 0, "latest"),
    fitCoin.queryFilter(fitCoin.filters.Transfer(null, me), 0, "latest"),
  ]);

  const purchaseTx = new Set(purchases.map((l) => l.transactionHash));
  const items: Omit<HistoryItem, "timestamp">[] = [];

  for (const log of purchases) {
    if (!isEventLog(log)) continue;
    items.push({
      key: `${log.transactionHash}-${log.index}`,
      kind: "purchase",
      amount: BigInt(log.args.tokenAmount),
      ethAmount: BigInt(log.args.ethAmount),
      counterparty: ZERO_ADDRESS,
      blockNumber: log.blockNumber,
      logIndex: log.index,
    });
  }
  for (const log of sent) {
    if (!isEventLog(log)) continue;
    items.push({
      key: `${log.transactionHash}-${log.index}`,
      kind: "sent",
      amount: BigInt(log.args.value),
      counterparty: String(log.args.to),
      blockNumber: log.blockNumber,
      logIndex: log.index,
    });
  }
  for (const log of received) {
    if (!isEventLog(log)) continue;
    const from = String(log.args.from);
    if (sameAddress(from, ZERO_ADDRESS) && purchaseTx.has(log.transactionHash)) continue; // déjà affiché comme achat
    items.push({
      key: `${log.transactionHash}-${log.index}`,
      kind: sameAddress(from, ZERO_ADDRESS) ? "reward" : "received",
      amount: BigInt(log.args.value),
      counterparty: from,
      blockNumber: log.blockNumber,
      logIndex: log.index,
    });
  }

  const latest = items
    .sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex)
    .slice(0, MAX_ITEMS);

  const blocks = [...new Set(latest.map((i) => i.blockNumber))];
  const timestamps = new Map<number, number>();
  await Promise.all(
    blocks.map(async (n) => {
      const block = await provider.getBlock(n);
      timestamps.set(n, block?.timestamp ?? 0);
    })
  );
  return latest.map((i) => ({ ...i, timestamp: timestamps.get(i.blockNumber) ?? 0 }));
}

export function TxHistory() {
  const { address } = useWallet();
  const { data, loading, error } = useContractData((provider) => loadHistory(provider, address as string), ["history", address], {
    enabled: !!address,
    requires: ["FitCoin"],
  });

  return (
    <Card>
      <SectionTitle>Historique</SectionTitle>
      <div className="mt-4">
        {loading ? (
          <SkeletonList count={3} />
        ) : error ? (
          <p className="py-6 text-center text-sm text-muted">Historique indisponible : {error}</p>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={History} title="Aucune opération" description="Vos achats et transferts de FTC apparaîtront ici." />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.map((item) => {
              const meta = KIND[item.kind];
              const known = contractLabel(item.counterparty);
              const detail =
                item.kind === "purchase"
                  ? `Payé ${formatETH(item.ethAmount)}`
                  : item.kind === "reward"
                    ? "Créés par RewardManager"
                    : `${item.kind === "sent" ? "Vers" : "De"} ${known ?? shortAddress(item.counterparty)}`;
              return (
                <li key={item.key} className="flex min-w-0 items-center gap-3 py-3">
                  <IconTile icon={meta.icon} tone={meta.tone} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{meta.label}</p>
                    <p className="truncate text-xs text-muted">
                      {detail} · {formatDate(item.timestamp, true)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${item.kind === "sent" ? "text-danger" : "text-gold"}`}>
                    {meta.sign}
                    {formatFTC(item.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
