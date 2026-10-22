import { leaveActionLabel, leaveNote, type LeaveState } from "@kinwoo/core/houses";

import { Button } from "../Button";

export function LeaveAction({ state, onClick }: { state: LeaveState; onClick: () => void }) {
  const note = leaveNote(state);

  return (
    <div>
      {note ? <p className="mb-5 text-sm text-muted-foreground">{note}</p> : null}
      <Button
        variant="destructive"
        label={leaveActionLabel(state)}
        disabled={state === "needs_admin"}
        onClick={onClick}
      />
    </div>
  );
}
