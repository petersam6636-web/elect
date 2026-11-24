export type RankingTheme = {
  rank: string;
  card: string;
  avatar: string;
  crown: string;
  badge: string;
  progress: string;
  action: string;
};

export function getRankingTheme(index: number): RankingTheme {
  if (index === 0) {
    return {
      rank: "border-emerald-400/35 bg-emerald-400/[0.14] text-emerald-200",
      card: "border-emerald-400/30 bg-emerald-400/[0.055]",
      avatar: "border-emerald-400/25 bg-emerald-400/[0.12] text-emerald-300",
      crown: "text-emerald-300",
      badge: "border-emerald-400/25 bg-emerald-400/[0.10] text-emerald-200",
      progress: "from-emerald-600 to-emerald-300",
      action: "border-emerald-400/25 bg-emerald-400/[0.10] text-emerald-300",
    };
  }

  if (index === 1) {
    return {
      rank: "border-blue-400/35 bg-blue-400/[0.14] text-blue-200",
      card: "border-blue-400/25 bg-blue-400/[0.045]",
      avatar: "border-blue-400/25 bg-blue-400/[0.12] text-blue-300",
      crown: "text-blue-300",
      badge: "border-blue-400/25 bg-blue-400/[0.10] text-blue-200",
      progress: "from-blue-600 to-blue-300",
      action: "border-blue-400/25 bg-blue-400/[0.10] text-blue-300",
    };
  }

  if (index === 2) {
    return {
      rank: "border-amber-300/35 bg-amber-300/[0.14] text-amber-200",
      card: "border-amber-300/25 bg-amber-300/[0.045]",
      avatar: "border-amber-300/25 bg-amber-300/[0.12] text-amber-300",
      crown: "text-amber-300",
      badge: "border-amber-300/25 bg-amber-300/[0.10] text-amber-200",
      progress: "from-amber-600 to-amber-300",
      action: "border-amber-300/25 bg-amber-300/[0.10] text-amber-200",
    };
  }

  return {
    rank: "border-white/[0.08] bg-white/[0.06] text-white/50",
    card: "border-white/[0.10] bg-white/[0.025]",
    avatar: "border-white/[0.08] bg-white/[0.06] text-white/50",
    crown: "text-white/45",
    badge: "border-white/[0.08] bg-white/[0.05] text-white/55",
    progress: "from-emerald-600 to-emerald-300",
    action: "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300",
  };
}
