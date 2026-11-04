import { ArrowRight } from "lucide-react";
import { PRIMARY_BUTTON_CLASS } from "../fields";

export function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={`${PRIMARY_BUTTON_CLASS} mt-4 w-full`} onClick={onClick}>
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </button>
  );
}
