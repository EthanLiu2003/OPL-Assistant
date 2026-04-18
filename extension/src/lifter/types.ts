export type CompetitionEntry = {
  date: string;
  federation: string;
  meetName: string;
  division: string;
  equipment: string;
  bodyweightKg: number | null;
  weightClassKg: string;
  squatKg: number | null;
  benchKg: number | null;
  deadliftKg: number | null;
  totalKg: number | null;
  dots: number | null;
  wilks: number | null;
  goodlift: number | null;
  place: string;
  age: number | null;
  sex: 'M' | 'F';
  tested: boolean;
};

export type LifterProfile = {
  username: string;
  entries: CompetitionEntry[];
  bestTotal: CompetitionEntry | null;
  latestEntry: CompetitionEntry | null;
};

export function buildLifterProfile(
  username: string,
  entries: CompetitionEntry[],
): LifterProfile {
  const withTotal = entries.filter((e) => e.totalKg != null && e.totalKg > 0);
  const sorted = [...withTotal].sort((a, b) => b.date.localeCompare(a.date));
  const bestTotal =
    withTotal.length > 0
      ? withTotal.reduce((best, e) =>
          (e.totalKg ?? 0) > (best.totalKg ?? 0) ? e : best,
        )
      : null;
  return {
    username,
    entries: sorted,
    bestTotal,
    latestEntry: sorted[0] ?? null,
  };
}
