import type { AssistantTurn, ChatTurn } from '@/chat/types';
import type { DisplayUnit } from '@/lib/types';
import { UserBubble } from '@/chat/UserBubble';
import { ClarifyBubble } from '@/chat/ClarifyBubble';
import { WhereYouStandCard as WhereYouStandCardUi } from '@/card/WhereYouStandCard';
import { CohortPreview } from './CohortPreview';
import { MeetsList } from './MeetsList';

type TurnViewProps = {
  turn: ChatTurn;
  displayUnit: DisplayUnit;
  onClarifyPick: (option: string) => void;
  onOpenCohort: (turn: AssistantTurn) => void;
  onRefreshCard: (turn: AssistantTurn) => void;
  onWhereYouStand: (turn: AssistantTurn) => void;
};

export const TurnView = ({
  turn,
  displayUnit,
  onClarifyPick,
  onOpenCohort,
  onRefreshCard,
  onWhereYouStand,
}: TurnViewProps) => {
  if (turn.role === 'user') return <UserBubble turn={turn} />;
  if (turn.kind === 'clarify') return <ClarifyBubble turn={turn} onPick={onClarifyPick} />;
  if (turn.kind === 'error') {
    return (
      <div className="bubble-row assistant">
        <div className="bubble assistant-bubble error">{turn.text}</div>
      </div>
    );
  }

  return (
    <div className="bubble-row assistant">
      <div className="bubble assistant-bubble">
        <div className="result-template">{turn.templateText}</div>
        {turn.meets ? (
          <MeetsList summary={turn.meets} />
        ) : turn.card ? (
          <WhereYouStandCardUi
            card={turn.card}
            displayUnit={displayUnit}
            onRefresh={() => onRefreshCard(turn)}
          />
        ) : turn.cohort ? (
          <CohortPreview turn={turn} displayUnit={displayUnit} onOpen={onOpenCohort} onWhereYouStand={onWhereYouStand} />
        ) : (
          <div className="empty-note">No cohort data available.</div>
        )}
        {turn.narrateLine && (
          <div className="narrate-line">{turn.narrateLine}</div>
        )}
      </div>
    </div>
  );
};
