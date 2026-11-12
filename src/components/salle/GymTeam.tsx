"use client";

import { UserMinus, Users } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { getContract } from "@/lib/contracts";

import { AddressText } from "@/components/shared/AddressText";
import { Button, Card, EmptyState, IconTile, FtcAmount } from "@/components/ui";

export function GymTeam({ gymId, coaches }: { gymId: bigint; coaches: { coach: string; price: bigint }[] }) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();

  if (coaches.length === 0) {
    return (
      <Card>
        <EmptyState icon={Users} title="Aucun coach dans l'équipe" description="Acceptez des candidatures pour constituer votre équipe." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {coaches.map((c) => (
        <Card key={c.coach} padding="sm" className="flex items-center gap-3">
          <IconTile icon={Users} tone="cyan" />
          <div className="min-w-0 flex-1">
            <AddressText address={c.coach} chars={6} className="text-sm text-white" />
            <p className="text-xs text-subtle">
              Coaching privé : <FtcAmount value={c.price} className="font-semibold text-gold" /> / mois
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon={UserMinus}
            disabled={!canWrite || pending}
            onClick={() =>
              void run((signer) => getContract("GymManager", signer).removeCoach(gymId, c.coach), { success: "Coach retiré de l'équipe." })
            }
          >
            Retirer
          </Button>
        </Card>
      ))}
    </div>
  );
}
