"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ImageIcon } from "lucide-react";
import { ipfsUrl } from "@/lib/ipfs";
import { cn } from "@/lib/utils";

/** Image IPFS (ou dégradé de remplacement si absente). */
export function IpfsImage({
  uri,
  alt,
  className,
  fallbackIcon: Icon = ImageIcon,
}: {
  uri: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: LucideIcon;
}) {
  const src = ipfsUrl(uri);
  return (
    <div className={cn("relative overflow-hidden bg-gradient-hero", className)}>
      {src ? (
        <Image src={src} alt={alt} fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 400px" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.35),transparent_55%)]" aria-hidden />
          <Icon className="relative size-10 text-white/70" aria-hidden />
        </div>
      )}
    </div>
  );
}
