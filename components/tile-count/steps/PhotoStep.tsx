import { Check, CircleAlert, Eye } from "lucide-react";
import type { QueueItem } from "../browser/folder";
import type { Workspace } from "../state/useWorkspace";
import { BUTTON_CLASS, StepPanel } from "../ui/fields";

const TIPS = [
  "Photograph one roof surface at a time, with all four corners in frame.",
  "Stand as far back as you can, so the tile rows stay visible up to the ridge.",
  "Avoid low sun and heavy shadow across the roof.",
  "Send the original file. Messenger apps shrink photos.",
  "A drone photo taken square to the roof gives the best result.",
];

function QueueRow({ item, onOpen }: { item: QueueItem; onOpen: () => void }) {
  return (
    <li className="rounded-md border border-border p-2.5 text-xs">
      <div className="flex items-center gap-2">
        {item.problem && <CircleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden />}
        {item.status === "done" && <Check className="h-4 w-4 shrink-0 text-success" aria-label="Confirmed" />}
        {item.status === "open" && <Eye className="h-4 w-4 shrink-0 text-accent" aria-label="Open now" />}
        <span className="min-w-0 flex-1 truncate" title={item.name}>
          {item.name}
        </span>
        {!item.problem && item.status !== "open" && (
          <button type="button" className={BUTTON_CLASS} aria-label={`Open ${item.name}`} onClick={onOpen}>
            Open
          </button>
        )}
      </div>
      {(item.problem ?? item.notice) && <p className="mt-1 text-warning">{item.problem ?? item.notice}</p>}
    </li>
  );
}

export function PhotoStep({ workspace }: { workspace: Workspace }) {
  const { queue } = workspace;
  const ready = queue.filter((q) => !q.problem).length;

  if (queue.length > 0) {
    return (
      <StepPanel
        title="Photos in this folder"
        hint={`${ready} ready, ${queue.length - ready} refused. Open one photo per roof surface. The tile size and case reference carry over to the next photo.`}
      >
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
          {queue.map((item) => (
            <QueueRow key={item.index} item={item} onOpen={() => workspace.openQueued(item.index)} />
          ))}
        </ul>
      </StepPanel>
    );
  }

  return (
    <StepPanel title="Start with a photo" hint="The count is only as good as the photo. Red and black tiles both work.">
      <ul className="space-y-2 text-sm text-muted">
        {TIPS.map((tip) => (
          <li key={tip} className="border-l-2 border-accent pl-2.5">
            {tip}
          </li>
        ))}
      </ul>
    </StepPanel>
  );
}
