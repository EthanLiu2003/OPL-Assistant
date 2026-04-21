import type { Meet, MeetFederation } from './meets-types';
import { makeMeetId } from './meets-types';
import { extractLocationFromText } from './location-extract';

type CouchRow = {
  id: string;
  doc: {
    _id: string;
    name?: string;
    date?: string;
    dateFormat?: string;
    federation?: string;
    units?: string;
    type?: string;
    contactEmail?: string;
    website?: string;
    description?: string;
    usaplDivisionCode?: string;
    state?: string;
    country?: string;
    birthDate?: string;
    [key: string]: unknown;
  };
};

const parseDateWithFormat = (dateStr: string, format: string): string | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    const iso = new Date(dateStr);
    return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
  }
  const fmt = format.toUpperCase();
  let day = parts[0];
  let month = parts[1];
  let year = parts[2];
  if (fmt.startsWith('MM')) {
    month = parts[0];
    day = parts[1];
    year = parts[2];
  } else if (fmt.startsWith('YYYY')) {
    year = parts[0];
    month = parts[1];
    day = parts[2];
  }
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
};

const normalizeFederation = (fed?: string, name?: string): MeetFederation => {
  const f = (fed ?? '').toUpperCase();
  if (f === 'USAPL') return 'USAPL';
  if (f === 'USPA') return 'USPA';
  if (f === 'PA' || f === 'POWERLIFTING AMERICA') return 'PA';
  const n = (name ?? '').toLowerCase();
  if (n.includes('usapl') || n.includes('usa powerlifting')) return 'USAPL';
  if (n.includes('uspa')) return 'USPA';
  if (n.includes('powerlifting america')) return 'PA';
  return 'OTHER';
};

export const parseLiftingcastMeet = (rows: CouchRow[]): Meet | null => {
  const fetchedAt = new Date().toISOString();

  const meetDoc = rows.find(
    (r) =>
      r.doc &&
      typeof r.doc.name === 'string' &&
      typeof r.doc.date === 'string' &&
      typeof r.doc.federation === 'string',
  );
  if (!meetDoc) return null;

  const name = meetDoc.doc.name ?? '';
  const federation = normalizeFederation(meetDoc.doc.federation, name);
  const startDate = parseDateWithFormat(
    meetDoc.doc.date ?? '',
    meetDoc.doc.dateFormat ?? 'MM/DD/YYYY',
  );
  if (!startDate) return null;

  const divisions: string[] = [];
  for (const r of rows) {
    if (r.doc && typeof r.doc.name === 'string' && r.doc.usaplDivisionCode) {
      divisions.push(r.doc.name);
    }
  }

  const lifterStates: string[] = [];
  for (const r of rows) {
    if (r.doc && r.doc.birthDate && typeof r.doc.state === 'string') {
      lifterStates.push(r.doc.state);
    }
  }
  let inferredState: string | undefined;
  if (lifterStates.length >= 3) {
    const counts = new Map<string, number>();
    for (const s of lifterStates) counts.set(s, (counts.get(s) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] / lifterStates.length >= 0.5) inferredState = top[0];
  }

  const nameLocation = extractLocationFromText(name);
  const state = nameLocation.state ?? inferredState;
  const city = nameLocation.city;

  const websiteUrl =
    typeof meetDoc.doc.website === 'string' ? meetDoc.doc.website : undefined;

  return {
    id: makeMeetId('liftingcast', meetDoc.doc._id),
    source: 'liftingcast',
    sourceId: meetDoc.doc._id,
    federation,
    name,
    startDate,
    location: { city, state, country: 'US' },
    websiteUrl,
    divisionsOffered: divisions.length > 0 ? divisions.slice(0, 30) : undefined,
    fetchedAt,
  };
};

export const fetchLiftingcastMeet = async (meetId: string): Promise<Meet | null> => {
  const url = `https://couchdb.liftingcast.com/${meetId}_readonly/_all_docs?include_docs=true`;
  const resp = await fetch(url, {
    headers: {
      'user-agent':
        'opl-assistant-proxy/1.0 (+https://github.com/EthanLiu2003/OPL-Assistant)',
      accept: 'application/json',
    },
  });
  if (!resp.ok) {
    if (resp.status === 404) return null;
    throw new Error(`liftingcast ${meetId} ${resp.status}`);
  }
  const data = (await resp.json()) as { rows?: CouchRow[] };
  if (!data.rows) return null;
  return parseLiftingcastMeet(data.rows);
};
