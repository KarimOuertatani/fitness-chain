"use client";

import { Landmark } from "lucide-react";
import { formatDate } from "@/lib/format";
import { sameAddress } from "@/lib/mappers";
import { useWallet } from "@/hooks/useWallet";
import { AddressText } from "@/components/shared/AddressText";
import { Badge, Card, EmptyState, IconTile, SectionTitle } from "@/components/ui";
import type { CenterEntry } from "@/components/gouvernance/useGovernance";

export function CentersList({ centers, memberCount }: { centers: CenterEntry[]; memberCount: number }) {
  const { address } = useWallet();
  return (
    <Card>
      <SectionTitle tone="cyan" action={<Badge tone="cyan">{memberCount} actif{memberCount > 1 ? "s" : ""}</Badge>}>
        Centres agréés
      </SectionTitle>
      {centers.length === 0 ? (
        <EmptyState icon={Landmark} title="Aucun centre" />
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {centers.map((c) => (
            <li key={c.address} className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
              <IconTile icon={Landmark} tone={c.active ? "violet" : "red"} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-semibold text-white">
                  <span className="truncate">{c.name || "Sans nom"}</span>
                  {sameAddress(c.address, address) && <Badge tone="cyan">Vous</Badge>}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <AddressText address={c.address} />
                  <span className="text-xs text-subtle">Depuis le {formatDate(c.joinedAt)}</span>
                </div>
              </div>
              <Badge tone={c.active ? "green" : "red"}>{c.active ? "Actif" : "Exclu"}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
