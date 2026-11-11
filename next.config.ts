import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ne pas générer AGENTS.md automatiquement à chaque `next dev`
  agentRules: false,
  // Indicateur de développement en bas à droite (évite de masquer la barre latérale)
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
