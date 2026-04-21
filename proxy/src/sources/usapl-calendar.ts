import type { Meet } from './meets-types';
import { makeMeetId } from './meets-types';

const CALENDAR_URL = 'https://www.usapowerlifting.com/calendar/';

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const parseUsaplDate = (dateStr: string): string | null => {
  const m = dateStr.match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (month === undefined) return null;
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  return new Date(Date.UTC(year, month, day)).toISOString();
};

const stripTags = (s: string): string =>
  s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

const extractFirstAttr = (html: string, attr: string): string | undefined => {
  const re = new RegExp(`${attr}\\s*=\\s*"([^"]+)"`, 'i');
  const m = html.match(re);
  return m?.[1];
};

export const fetchUsaplMeets = async (): Promise<Meet[]> => {
  const resp = await fetch(CALENDAR_URL, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (compatible; opl-assistant/1.0; +https://github.com/EthanLiu2003/OPL-Assistant)',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!resp.ok) throw new Error(`USAPL calendar ${resp.status}`);
  const html = await resp.text();

  const panelRe =
    /<div class="vc_tta-panel"[^>]*id="event-(\d+)"[^>]*>([\s\S]*?)(?=<div class="vc_tta-panel"[^>]*id="event-|<\/div>\s*<\/div>\s*<\/div>\s*<!-- \.event-container)/g;

  const meets: Meet[] = [];
  const fetchedAt = new Date().toISOString();

  let m: RegExpExecArray | null;
  while ((m = panelRe.exec(html)) !== null) {
    const sourceId = m[1];
    const chunk = m[2];

    const stateMatch = chunk.match(/<div class='event-state'>([A-Z]{2})<\/div>/);
    const nameMatch = chunk.match(/<div class='event-name'>([^<]+)<\/div>/);
    const dateMatch = chunk.match(/<div class='event-date'>([^<]+)<\/div>/);
    const locationMatch = chunk.match(/Location:\s*([^<\n]+?)\s*<br/);
    if (!nameMatch || !dateMatch) continue;

    const name = stripTags(nameMatch[1]);
    const startDate = parseUsaplDate(dateMatch[1]);
    if (!startDate) continue;

    let city: string | undefined;
    let state = stateMatch?.[1];
    if (locationMatch) {
      const locText = stripTags(locationMatch[1]);
      const cityState = locText.match(/^(.+?),\s*([A-Z]{2})\s*$/);
      if (cityState) {
        city = cityState[1].trim();
        state = state ?? cityState[2];
      }
    }

    const registrationUrls = [...chunk.matchAll(/<a\s+href\s*=\s*"([^"]+)"[^>]*>\s*Registration/gi)];
    const moreInfoUrls = [...chunk.matchAll(/<a\s+href\s*=\s*"([^"]+)"[^>]*>\s*More Info/gi)];

    meets.push({
      id: makeMeetId('usapl', sourceId),
      source: 'usapl',
      sourceId,
      federation: 'USAPL',
      name,
      startDate,
      location: { city, state, country: 'US' },
      registrationUrl: registrationUrls[0]?.[1],
      websiteUrl: moreInfoUrls[0]?.[1],
      fetchedAt,
    });
  }

  void extractFirstAttr;
  return meets;
};
