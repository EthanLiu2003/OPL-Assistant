import type { ParsedFilter } from '@/search/opl-url';

export const buildSuggestions = (parsed: ParsedFilter): string[] => {
  const suggestions: string[] = [];

  if (!parsed.federationSlug) suggestions.push('narrow by federation');
  if (!parsed.ageSlug) suggestions.push('add age division');
  if (!parsed.year) suggestions.push('filter by year');
  if (!parsed.equipment) suggestions.push('specify equipment');
  if (!parsed.sex) suggestions.push('men or women');
  return suggestions.slice(0, 3);
};

export const SuggestionChips = ({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
}) => {
  if (suggestions.length === 0) return null;
  return (
    <div className="suggestion-chips">
      {suggestions.map((s) => (
        <button
          key={s}
          className="suggestion-chip"
          onClick={() => onPick(s)}
          type="button"
        >
          {s}
        </button>
      ))}
    </div>
  );
};
