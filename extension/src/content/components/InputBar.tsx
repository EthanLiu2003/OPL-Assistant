import { forwardRef } from 'react';

type InputBarProps = {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
};

export const InputBar = forwardRef<HTMLInputElement, InputBarProps>(
  ({ value, busy, onChange, onSubmit }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key !== 'Escape') e.stopPropagation();
      if (e.key === 'Enter' && value.trim()) onSubmit(value.trim());
    };

    return (
      <div className="input-area">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => e.stopPropagation()}
          placeholder="ask a filter or 'where I stand\u2026'"
          className="input"
          aria-label="Chat prompt"
        />
        <button
          className="send-btn"
          onClick={() => onSubmit(value.trim())}
          disabled={!value.trim()}
          aria-label="Send"
          type="button"
        >
          {busy ? '\u2026' : '\u21B5'}
        </button>
      </div>
    );
  },
);

InputBar.displayName = 'InputBar';
