import { Check, CircleAlert, Eye } from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageProvider";
import type { QueueItem } from "../browser/folder";
import type { Workspace } from "../state/useWorkspace";
import { BUTTON_CLASS, StepPanel } from "../ui/fields";

function QueueRow({ item, onOpen }: { item: QueueItem; onOpen: () => void }) {
  const { t, msg } = useLanguage();
  const note = item.problem ?? item.notice;
  return (
    <li className="rounded-md border border-border p-2.5 text-xs">
      <div className="flex items-center gap-2">
        {item.problem && <CircleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden />}
        {item.status === "done" && <Check className="h-4 w-4 shrink-0 text-success" aria-label={t.photo.confirmed} />}
        {item.status === "open" && <Eye className="h-4 w-4 shrink-0 text-accent" aria-label={t.photo.openNow} />}
        <span className="min-w-0 flex-1 truncate" title={item.name}>
          {item.name}
        </span>
        {!item.problem && item.status !== "open" && (
          <button type="button" className={BUTTON_CLASS} aria-label={t.photo.openFile(item.name)} onClick={onOpen}>
            {t.photo.open}
          </button>
        )}
      </div>
      {note && <p className="mt-1 text-warning">{msg(note)}</p>}
    </li>
  );
}

export function PhotoStep({ workspace }: { workspace: Workspace }) {
  const { t } = useLanguage();
  const { queue } = workspace;
  const ready = queue.filter((q) => !q.problem).length;

  if (queue.length > 0) {
    return (
      <StepPanel title={t.photo.folderTitle} hint={t.photo.folderHint(ready, queue.length - ready)}>
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
          {queue.map((item) => (
            <QueueRow key={item.index} item={item} onOpen={() => workspace.openQueued(item.index)} />
          ))}
        </ul>
      </StepPanel>
    );
  }

  return (
    <StepPanel title={t.photo.title} hint={t.photo.hint}>
      <ul className="space-y-2 text-sm text-muted">
        {t.photo.tips.map((tip) => (
          <li key={tip} className="border-l-2 border-accent pl-2.5">
            {tip}
          </li>
        ))}
      </ul>
    </StepPanel>
  );
}
