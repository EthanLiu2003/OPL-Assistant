import type { Meet } from './meets-types';
import { parseTribeEventsHtml, hasNoResultsIndicator } from './tribe-events-parser';

const BASE_URL = 'https://uspa.net/upcoming-events/';
const MAX_PAGES = 20;

const buildPageUrl = (page: number): string =>
  page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;

export const fetchUspaMeets = async (): Promise<Meet[]> => {
  const all: Meet[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = buildPageUrl(page);
    const resp = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; opl-assistant/1.0; +https://github.com/EthanLiu2003/OPL-Assistant)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!resp.ok) {
      if (resp.status === 404) break;
      throw new Error(`USPA events page ${page} ${resp.status}`);
    }
    const html = await resp.text();
    if (hasNoResultsIndicator(html)) break;

    const pageMeets = parseTribeEventsHtml(html, { source: 'uspa', federation: 'USPA' });
    if (pageMeets.length === 0) break;

    let added = 0;
    for (const meet of pageMeets) {
      if (seen.has(meet.id)) continue;
      seen.add(meet.id);
      all.push(meet);
      added += 1;
    }
    if (added === 0) break;
  }

  return all;
};
