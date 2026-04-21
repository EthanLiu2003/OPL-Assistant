export type MeetFederation = 'USAPL' | 'PA' | 'USPA' | 'OTHER';

export type MeetSource = 'usapl' | 'pa' | 'uspa' | 'liftingcast';

export type MeetLocation = {
  city?: string;
  state?: string;
  country: string;
};

export type Meet = {
  id: string;
  source: MeetSource;
  sourceId: string;
  federation: MeetFederation;
  name: string;
  startDate: string;
  endDate?: string;
  location: MeetLocation;
  registrationUrl?: string;
  websiteUrl?: string;
  divisionsOffered?: string[];
  fetchedAt: string;
};
