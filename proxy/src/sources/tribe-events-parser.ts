import type { Meet, MeetFederation, MeetSource } from './meets-types';
import { makeMeetId } from './meets-types';
import { extractLocationFromText } from './location-extract';

type ParseOptions = {
  source: MeetSource;
  federation: MeetFederation;
};

const stripTags = (s: string): string =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '-')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

export const parseTribeEventsHtml = (html: string, opts: ParseOptions): Meet[] => {
  const meets: Meet[] = [];
  const fetchedAt = new Date().toISOString();

  const articleRe =
    /<article[^>]*class="[^"]*tribe-events-calendar-list__event[^"]*"[^>]*>([\s\S]*?)<\/article>/g;

  let m: RegExpExecArray | null;
  while ((m = articleRe.exec(html)) !== null) {
    const chunk = m[0];
    const inner = m[1];

    const postIdMatch = chunk.match(/post-(\d+)/);
    if (!postIdMatch) continue;
    const sourceId = postIdMatch[1];

    const titleMatch = inner.match(
      /<h[1-6][^>]*class="[^"]*tribe-events-calendar-list__event-title[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/,
    );
    const titleHrefMatch = titleMatch?.[1].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const name = titleHrefMatch
      ? stripTags(titleHrefMatch[2])
      : titleMatch
      ? stripTags(titleMatch[1])
      : undefined;
    const websiteUrl = titleHrefMatch?.[1];
    if (!name) continue;

    const datetimeMatch = inner.match(
      /<time[^>]*class="[^"]*tribe-events-calendar-list__event-datetime[^"]*"[^>]*datetime="([^"]+)"/,
    );
    const startDate = datetimeMatch
      ? new Date(datetimeMatch[1]).toISOString()
      : null;
    if (!startDate) continue;

    const venueMatch = inner.match(
      /<address[^>]*class="[^"]*tribe-events-calendar-list__event-venue[^"]*"[^>]*>([\s\S]*?)<\/address>/,
    );
    const venueText = venueMatch ? stripTags(venueMatch[1]) : '';
    const venueNameMatch = venueMatch?.[1].match(
      /<span[^>]*class="[^"]*tribe-events-calendar-list__event-venue-title[^"]*"[^>]*>([\s\S]*?)<\/span>/,
    );
    const venueName = venueNameMatch ? stripTags(venueNameMatch[1]) : undefined;
    void venueName;

    const location = extractLocationFromText(venueText || name);

    meets.push({
      id: makeMeetId(opts.source, sourceId),
      source: opts.source,
      sourceId,
      federation: opts.federation,
      name,
      startDate,
      location,
      websiteUrl,
      fetchedAt,
    });
  }

  return meets;
};

export const hasNoResultsIndicator = (html: string): boolean => {
  return (
    /tribe-events-view-notice-nothing-found/i.test(html) ||
    /No matching events listed/i.test(html) ||
    /No results found/i.test(html)
  );
};
