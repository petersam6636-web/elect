export type RankingTheme = {
  rank: string;
  card: string;
  avatar: string;
  crown: string;
  badge: string;
  progress: string;
  action: string;
  solid: string;
};

export function getOrdinalLabel(index: number) {
  const position = index + 1;
  if (position === 1) return "1st place";
  if (position === 2) return "2nd place";
  if (position === 3) return "3rd place";

  const lastTwoDigits = position % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${position}th place`;
  }

  const lastDigit = position % 10;
  if (lastDigit === 1) return `${position}st place`;
  if (lastDigit === 2) return `${position}nd place`;
  if (lastDigit === 3) return `${position}rd place`;
  return `${position}th place`;
}



export function getCompetitionRanks(voteCounts: readonly number[]) {
  const sortedCounts = [...voteCounts].sort((a, b) => b - a);
  const rankByCount = new Map<number, number>();

  sortedCounts.forEach((count, index) => {
    if (!rankByCount.has(count)) rankByCount.set(count, index + 1);
  });

  return voteCounts.map((count) => rankByCount.get(count) ?? 0);
}

export function getRankingTheme(index: number): RankingTheme {
  if (index === 0) {
    return {
      rank: "border-amber-300/45 bg-amber-300/[0.20] text-amber-100",
      card: "border-amber-300/40 bg-[#211d14]/90",
      avatar: "border-amber-300/30 bg-amber-300/[0.18] text-amber-200",
      crown: "text-amber-200",
      badge: "border-amber-300/35 bg-amber-300/[0.20] text-amber-100",
      progress: "from-amber-500 to-yellow-200",
      action: "border-amber-300/35 bg-amber-300/[0.16] text-amber-100",
      solid: "border-amber-300 bg-amber-300 text-[#211704] hover:border-amber-200 hover:bg-amber-200",
    };
  }

  if (index === 1) {
    return {
      rank: "border-violet-300/40 bg-violet-300/[0.19] text-violet-100",
      card: "border-violet-300/35 bg-[#1d1827]/90",
      avatar: "border-violet-300/25 bg-violet-300/[0.17] text-violet-200",
      crown: "text-violet-200",
      badge: "border-violet-300/30 bg-violet-300/[0.19] text-violet-100",
      progress: "from-violet-500 to-purple-200",
      action: "border-violet-300/30 bg-violet-300/[0.15] text-violet-100",
      solid: "border-violet-300 bg-violet-300 text-[#1b1024] hover:border-violet-200 hover:bg-violet-200",
    };
  }

  if (index === 2) {
    return {
      rank: "border-[#d99a68]/45 bg-[#d99a68]/[0.20] text-[#f4c7a2]",
      card: "border-[#d99a68]/40 bg-[#241a14]/90",
      avatar: "border-[#d99a68]/30 bg-[#d99a68]/[0.18] text-[#edb98e]",
      crown: "text-[#edb98e]",
      badge: "border-[#d99a68]/35 bg-[#d99a68]/[0.19] text-[#f4c7a2]",
      progress: "from-[#9a5b32] to-[#e0a06a]",
      action: "border-[#d99a68]/35 bg-[#d99a68]/[0.15] text-[#f4c7a2]",
      solid: "border-[#d99a68] bg-[#d99a68] text-[#21140b] hover:border-[#e6ad7d] hover:bg-[#e6ad7d]",
    };
  }

  if (index === 3) {
    return {
      rank: "border-slate-300/40 bg-slate-300/[0.18] text-slate-100",
      card: "border-slate-300/35 bg-[#192029]/90",
      avatar: "border-slate-300/25 bg-slate-300/[0.16] text-slate-200",
      crown: "text-slate-200",
      badge: "border-slate-300/30 bg-slate-300/[0.18] text-slate-100",
      progress: "from-slate-500 to-slate-200",
      action: "border-slate-300/30 bg-slate-300/[0.14] text-slate-100",
      solid: "border-slate-200 bg-slate-200 text-[#111318] hover:border-white hover:bg-white",
    };
  }

  return {
    rank: "border-white/[0.10] bg-white/[0.11] text-zinc-100",
    card: "border-white/[0.10] bg-[#141a24]/90",
    avatar: "border-white/[0.10] bg-white/[0.11] text-zinc-100",
    crown: "text-zinc-300",
    badge: "border-white/[0.10] bg-white/[0.12] text-zinc-100",
    progress: "from-zinc-600 to-zinc-300",
    action: "border-white/[0.12] bg-white/[0.10] text-zinc-100",
    solid: "border-zinc-300 bg-zinc-300 text-[#111318] hover:border-zinc-200 hover:bg-zinc-200",
  };
}
