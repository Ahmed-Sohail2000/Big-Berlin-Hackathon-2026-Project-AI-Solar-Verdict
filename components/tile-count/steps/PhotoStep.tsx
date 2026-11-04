import { StepPanel } from "../fields";

const TIPS = [
  "Photograph one roof surface at a time, with all four corners in frame.",
  "Stand as far back as you can, so the tile rows stay visible up to the ridge.",
  "Avoid low sun and heavy shadow across the roof.",
  "A drone photo taken square to the roof gives the best result.",
];

export function PhotoStep() {
  return (
    <StepPanel title="Start with a photo" hint="The count is only as good as the photo. Red and black tiles both work.">
      <ul className="space-y-2 text-xs leading-relaxed text-muted">
        {TIPS.map((tip) => (
          <li key={tip} className="border-l-2 border-accent pl-2.5">
            {tip}
          </li>
        ))}
      </ul>
    </StepPanel>
  );
}
