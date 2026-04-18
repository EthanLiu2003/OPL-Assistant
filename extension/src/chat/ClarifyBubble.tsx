import type { ClarifyTurn } from './types';

export const ClarifyBubble = ({
  turn,
  onPick,
}: {
  turn: ClarifyTurn;
  onPick: (option: string) => void;
}) => (
  <div className="bubble-row assistant">
    <div className="bubble assistant-bubble clarify">
      <div className="clarify-q">{turn.question}</div>
      <div className="clarify-options">
        {turn.options.map((opt) => (
          <button
            key={opt}
            className="clarify-opt"
            onClick={() => onPick(opt)}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  </div>
);
