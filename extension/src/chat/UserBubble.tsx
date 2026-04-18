import type { UserTurn } from './types';

export const UserBubble = ({ turn }: { turn: UserTurn }) => (
  <div className="bubble-row user">
    <div className="bubble user-bubble">{turn.text}</div>
  </div>
);
