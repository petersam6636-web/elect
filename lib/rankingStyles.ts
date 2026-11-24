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

export function getRankingTheme(index: number): RankingTheme {
  if (index === 0) {
    return {
      rank: "border-emerald-400/35 bg-emerald-400/[0.14] text-emerald-200",
      card: "border-emerald-400/35 bg-emerald-400/[0.08]",
      avatar: "border-emerald-400/25 bg-emerald-400/[0.12] text-emerald-300",
      crown: "text-emerald-300",
      badge: "border-emerald-400/25 bg-emerald-400/[0.10] text-emerald-200",
      progress: "from-emerald-600 to-emerald-300",
      action: "border-emerald-400/25 bg-emerald-400/[0.10] text-emerald-300",
      solid: "border-emerald-400 bg-emerald-400 text-[#04130c] hover:border-emerald-300 hover:bg-emerald-300",
    };
  }

  if (index === 1) {
    return {
      rank: "border-blue-400/35 bg-blue-400/[0.14] text-blue-200",
      card: "border-blue-400/30 bg-blue-400/[0.07]",
      avatar: "border-blue-400/25 bg-blue-400/[0.12] text-blue-300",
      crown: "text-blue-300",
      badge: "border-blue-400/25 bg-blue-400/[0.10] text-blue-200",
      progress: "from-blue-600 to-blue-300",
      action: "border-blue-400/25 bg-blue-400/[0.10] text-blue-300",
      solid: "border-blue-400 bg-blue-400 text-[#07111f] hover:border-blue-300 hover:bg-blue-300",
    };
  }

  if (index === 2) {
    return {
      rank: "border-amber-300/35 bg-amber-300/[0.14] text-amber-200",
      card: "border-amber-300/30 bg-amber-300/[0.07]",
      avatar: "border-amber-300/25 bg-amber-300/[0.12] text-amber-300",
      crown: "text-amber-300",
      badge: "border-amber-300/25 bg-amber-300/[0.10] text-amber-200",
      progress: "from-amber-600 to-amber-300",
      action: "border-amber-300/25 bg-amber-300/[0.10] text-amber-200",
      solid: "border-amber-300 bg-amber-300 text-[#211704] hover:border-amber-200 hover:bg-amber-200",
    };
  }

  return {
    rank: "border-white/[0.10] bg-white/[0.06] text-zinc-300",
    card: "border-white/[0.10] bg-white/[0.025]",
    avatar: "border-white/[0.10] bg-white/[0.06] text-zinc-300",
    crown: "text-zinc-300",
    badge: "border-white/[0.10] bg-white/[0.05] text-zinc-300",
    progress: "from-zinc-600 to-zinc-300",
    action: "border-white/[0.12] bg-white/[0.05] text-zinc-300",
    solid: "border-zinc-300 bg-zinc-300 text-[#111318] hover:border-zinc-200 hover:bg-zinc-200",
  };
}
