import type { MeetLocation } from './meets-types';

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), code]),
);

const extractStateFromText = (text: string): string | undefined => {
  if (!text) return undefined;
  const codeMatch = text.match(/\b([A-Z]{2})\b/g);
  if (codeMatch) {
    for (const code of codeMatch) {
      if (US_STATES[code]) return code;
    }
  }
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (lower.includes(name)) return code;
  }
  return undefined;
};

const STREET_SUFFIXES = /\b(St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Pkwy|Parkway|Hwy|Highway|Pl|Place|Sq|Square|Ter|Terrace|Cir|Circle)\b\.?/i;

const looksLikeStreet = (s: string): boolean => STREET_SUFFIXES.test(s) || /\d/.test(s);

const extractCityFromText = (text: string, state?: string): string | undefined => {
  if (!text) return undefined;
  const stateCode = state ?? '';
  const matches = [
    ...text.matchAll(/([A-Z][a-zA-Z\s.'-]+?),\s*([A-Z]{2})\b/g),
  ];
  for (const m of matches) {
    const candidate = m[1].trim();
    const matchedState = m[2];
    if (looksLikeStreet(candidate)) continue;
    if (stateCode && matchedState !== stateCode) continue;
    return candidate;
  }
  return undefined;
};

export const extractLocationFromText = (
  text: string,
  fallbackCountry = 'US',
): MeetLocation => {
  const state = extractStateFromText(text);
  const city = extractCityFromText(text, state);
  return { city, state, country: fallbackCountry };
};

export const mergeLocations = (...locations: MeetLocation[]): MeetLocation => {
  const merged: MeetLocation = { country: 'US' };
  for (const loc of locations) {
    if (loc.city && !merged.city) merged.city = loc.city;
    if (loc.state && !merged.state) merged.state = loc.state;
    if (loc.country) merged.country = loc.country;
  }
  return merged;
};

export const hasLocation = (loc: MeetLocation): boolean =>
  Boolean(loc.state || loc.city);

export { US_STATES };
