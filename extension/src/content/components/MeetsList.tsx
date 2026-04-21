import type { MeetsSummary } from '@/chat/types';
import type { Meet } from '@/meets/types';

type MeetsListProps = {
  summary: MeetsSummary;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatLocation = (meet: Meet): string => {
  const parts: string[] = [];
  if (meet.location.city) parts.push(meet.location.city);
  if (meet.location.state) parts.push(meet.location.state);
  return parts.length > 0 ? parts.join(', ') : 'Location TBD';
};

const MAX_VISIBLE = 12;

export const MeetsList = ({ summary }: MeetsListProps) => {
  const { meets, sources, federation, state } = summary;
  const visible = meets.slice(0, MAX_VISIBLE);
  const hiddenCount = meets.length - visible.length;

  const scopeLabel = (() => {
    const fed = federation ?? 'All federations';
    if (state) return `${fed} · ${state}`;
    return fed;
  })();

  return (
    <div className="meets-list">
      <div className="meets-meta">
        {meets.length.toLocaleString()} upcoming meet{meets.length === 1 ? '' : 's'} · {scopeLabel}
      </div>

      {meets.length === 0 && (
        <div className="empty-note">
          No upcoming meets found{state ? ` in ${state}` : ''}
          {federation ? ` for ${federation}` : ''}.
        </div>
      )}

      <div className="meet-rows">
        {visible.map((meet) => (
          <div key={meet.id} className="meet-row">
            <div className="meet-row-date">{formatDate(meet.startDate)}</div>
            <div className="meet-row-main">
              <div className="meet-row-name">{meet.name}</div>
              <div className="meet-row-sub">
                {meet.federation} · {formatLocation(meet)}
              </div>
              <div className="meet-row-links">
                {meet.registrationUrl && (
                  <a
                    href={meet.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meet-row-link"
                  >
                    Register &rarr;
                  </a>
                )}
                {meet.websiteUrl && (
                  <a
                    href={meet.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meet-row-link"
                  >
                    More info &rarr;
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <div className="meet-more">
          + {hiddenCount.toLocaleString()} more upcoming meet{hiddenCount === 1 ? '' : 's'}
        </div>
      )}

      {sources.some((s) => !s.ok) && (
        <div className="meet-source-note">
          Some sources didn&rsquo;t respond:{' '}
          {sources.filter((s) => !s.ok).map((s) => s.source).join(', ')}
        </div>
      )}
    </div>
  );
};
