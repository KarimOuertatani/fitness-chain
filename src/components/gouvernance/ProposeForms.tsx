"use client";

import { useState } from "react";
import { isAddress } from "ethers";
import { Landmark, Send, User, UserMinus } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { getContract } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";
import { sameAddress } from "@/lib/mappers";
import { Button, Card, Input, SectionTitle, Select } from "@/components/ui";
import type { CenterEntry } from "@/components/gouvernance/useGovernance";

export function ProposeAddForm({ centers }: { centers: CenterEntry[] }) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const [candidate, setCandidate] = useState("");
  const [name, setName] = useState("");

  const valid = isAddress(candidate);
  const alreadyMember = centers.some((c) => c.active && sameAddress(c.address, candidate));
  const ok = valid && !alreadyMember && name.trim().length > 0;

  const submit = async () => {
    if (!ok) return;
    const receipt = await run((signer) => getContract("CenterDAO", signer).proposeAdd(candidate, name.trim()), {
      success: "Proposition d'ajout créée.",
    });
    if (receipt) {
      setCandidate("");
      setName("");
    }
  };

  return (
    <Card>
      <SectionTitle>Proposer un centre</SectionTitle>
      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          label="Nom du centre"
          placeholder="Sport Academy"
          icon={Landmark}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
        <Input
          label="Adresse du centre"
          placeholder="0x…"
          icon={User}
          value={candidate}
          onChange={(e) => setCandidate(e.target.value.trim())}
          error={candidate && !valid ? "Adresse invalide." : alreadyMember ? "Ce centre est déjà membre." : null}
          spellCheck={false}
          autoComplete="off"
        />
        <Button type="submit" icon={Send} loading={pending} disabled={!canWrite || !ok} fullWidth>
          Soumettre au vote
        </Button>
      </form>
    </Card>
  );
}

export function ProposeRemoveForm({ centers, memberCount }: { centers: CenterEntry[]; memberCount: number }) {
  const { canWrite, address } = useWallet();
  const { run, pending } = useTx();
  const [target, setTarget] = useState("");
  const options = centers.filter((c) => c.active && !sameAddress(c.address, address));
  const ok = !!target && memberCount > 1;

  const submit = async () => {
    if (!ok) return;
    const receipt = await run((signer) => getContract("CenterDAO", signer).proposeRemove(target), {
      success: "Proposition d'exclusion créée.",
    });
    if (receipt) setTarget("");
  };

  return (
    <Card variant="teal">
      <SectionTitle tone="cyan">Proposer une exclusion</SectionTitle>
      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Select
          label="Centre à exclure"
          icon={UserMinus}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          hint={memberCount <= 1 ? "Impossible : la DAO doit garder au moins un membre." : undefined}
        >
          <option value="">Choisir un centre…</option>
          {options.map((c) => (
            <option key={c.address} value={c.address}>
              {c.name || "Sans nom"} ({shortAddress(c.address)})
            </option>
          ))}
        </Select>
        <Button type="submit" variant="danger" icon={UserMinus} loading={pending} disabled={!canWrite || !ok} fullWidth>
          Proposer l&apos;exclusion
        </Button>
      </form>
    </Card>
  );
}
