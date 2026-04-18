const SAMPLE_PROMPTS = [
  'USAPL 82.5kg raw juniors',
  '24yo raw 82.5kg hit 585 USAPL',
  'AMP 83kg raw open men 2024',
];

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
};

export const EmptyState = ({ onSubmit, disabled }: Props) => (
  <div className="empty">
    <p className="empty-hint">
      Search for lifters by filters, or give your stats to see where you stand.
    </p>
    <div className="sample-list">
      {SAMPLE_PROMPTS.map((s) => (
        <button
          key={s}
          className="sample"
          onClick={() => !disabled && onSubmit(s)}
          disabled={disabled}
          type="button"
        >
          {s}
        </button>
      ))}
    </div>
  </div>
);
