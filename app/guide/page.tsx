import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "User guide | HelioSense Roof Count" };

const CONTENTS = [
  { id: "before", label: "Before you start" },
  { id: "steps", label: "Step by step" },
  { id: "panels", label: "Panel options" },
  { id: "warnings", label: "When something looks wrong" },
  { id: "scope", label: "What it solves, and what it does not" },
  { id: "privacy", label: "Privacy and file safety" },
];

const CHECKLIST = [
  "One photo of each roof surface, with all four corners visible.",
  "The tile height and width in millimetres, from the consultation form or a photo of a tile beside a folding ruler.",
  "The overlap between rows, or the row spacing (batten gauge) if you know it.",
  "A case reference for the export. Avoid customer names here; a case number is enough.",
];

const PHOTO_TIPS = [
  { good: "Stand far back and include the whole surface.", bad: "Standing under the eave, where the top rows disappear." },
  { good: "Even daylight, or a bright overcast day.", bad: "Low sun that throws long shadows across the tiles." },
  { good: "The original file from the phone.", bad: "A screenshot or a copy sent through a messenger." },
  { good: "A drone photo taken square to the roof, when you have one.", bad: "A very flat angle along the roof surface." },
];

const STEPS = [
  {
    title: "Add a photo or a customer folder",
    body: "Drop one photo, or a whole folder. JPEG, PNG, HEIC and PDF all work, up to 30 MB each. A folder is checked file by file: you see which photos are ready, which were refused and why, and you open them one at a time.",
  },
  {
    title: "Check the roof edges",
    body: "The app proposes four corners. Drag each one onto the real corner of the roof surface. A magnifier helps you place it, and arrow keys move a selected corner one pixel at a time, or ten with Shift. The count updates when you let go.",
  },
  {
    title: "Compare the grid with the tiles",
    body: "This is the most important check. The blue lines must sit on the real tile rows from one edge to the other. Spot-check all four corners of the grid. If it is off, move the corners or type the right count. A poor photo shows “Not reliable” and leaves the count empty for you to fill in.",
  },
  {
    title: "Enter the tile size",
    body: "Enter height, width and overlap in millimetres, or the row spacing if you know it. The app will not guess the overlap, because a wrong one makes the whole roof the wrong height. If you have a photo of a tile beside a folding ruler, click the marks and the app measures the tile.",
  },
  {
    title: "Mark obstructions",
    body: "Press Detect areas for suggestions, drag across the tiles on the photo with Draw on photo, or type the position with Add by numbers. Choose the type and accept each suggestion, because the app does not name them.",
  },
  {
    title: "Choose a panel option",
    body: "Stop at the counts, take the automatic proposal, or place panels yourself. The three options are explained below.",
  },
  {
    title: "Confirm and export",
    body: "Add a case reference, confirm the result, then export. DXF is a true-scale drawing for the CAD program. PDF and PNG include the annotated photo. CSV and JSON carry the numbers. Any later change needs a new confirmation.",
  },
  {
    title: "Finish the roof",
    body: "With a folder open, press Next photo in this folder for the next surface. Tile size and case reference carry over. Press Start over, or close the tab, to discard everything.",
  },
];

const PANEL_OPTIONS = [
  {
    title: "Counts only",
    body: "The exact scope of the request: roof, tiles and obstructions go to CAD, and modules are planned there. Choose this for difficult roofs.",
  },
  {
    title: "Automatic",
    body: "Straight rows from the eave, around the obstructions, in whichever orientation fits more panels. Good for a quick first figure in a sales conversation. Press Edit this layout by hand to adjust it.",
  },
  {
    title: "Manual",
    body: "Click the photo to add a panel. A green preview shows it fits and a red one shows it does not. Click a panel to remove it, or use the list. Panels snap to whole tiles, and you can type an exact position. Edge distance, gap and clearance are checked for every panel.",
  },
];

const TROUBLESHOOTING = [
  {
    problem: "“Not reliable”, and the count is empty",
    fix: "The tile pattern could not be found. Tighten the corners to the roof, or use a sharper photo. If the grid still does not fit, count that axis by hand and type it in.",
  },
  {
    problem: "“The roof edge does not land on a tile edge”",
    fix: "A corner sits part-way along a tile, so the count may be off by one. Zoom in with the magnifier and move the corner onto a tile edge.",
  },
  {
    problem: "“Tile spacing changes across the roof”",
    fix: "The corners may be misplaced, or the surface is not one flat plane. Check the corners first. Measure a bent or stepped surface in sections.",
  },
  {
    problem: "The width count is about double the real one",
    fix: "Double-wave tiles can read as two tiles. The grid will show it. Type the correct count.",
  },
  {
    problem: "The roof outline starts on the wrong roof",
    fix: "The first guess goes by colour, so a neighbour's roof can fool it. Drag the corners to the right surface.",
  },
  {
    problem: "Metres look wrong, but the tile count is right",
    fix: "Check the overlap and the row spacing. The app warns about values that look like centimetres.",
  },
  {
    problem: "A photo is refused or marked incomplete",
    fix: "The reason is shown beside the file. Copy the original from the phone again, because an interrupted transfer often cuts a file short.",
  },
];

const SOLVES = [
  "Replaces 30 to 60 minutes of counting per roof side with a result you only review.",
  "Corrects oblique phone photos, the normal case, by flattening the roof first.",
  "Keeps counting through moss, shadow and blurred tile edges, and warns rather than guesses when it cannot.",
  "Makes every count traceable: the grid is visible, and exports record any change you made.",
  "Turns tiles into outer dimensions in metres from your tile size.",
  "Gives obstruction positions in tiles, such as “10 from the bottom, 20 from the left, 4 wide, 5 high”.",
  "Hands results to CAD as a true-scale DXF, with PDF, PNG, CSV and JSON.",
  "Measures without anyone climbing the roof.",
  "Keeps customer photos on your own computer.",
];

const DOES_NOT_SOLVE = [
  "Flat roofs without tiles. Measure these with a laser or folding ruler.",
  "3D models or photogrammetry. This is exact 2D counting by design.",
  "Roof pitch, shading and compass direction. Pitch is entered separately in your process.",
  "The final module, substructure and string plan. Those stay in CAD. Panel options here are a planning aid.",
  "Non-rectangular surfaces in one go. Hipped, L-shaped and dormer-split surfaces need measuring in sections.",
  "Tiles hidden behind the eave or ridge at a low camera angle. They cannot be counted from that photo.",
  "Saving results or photos to customer folders. Nothing is stored, so keep your exports.",
  "Drone flight or a mobile app. Drone photos work as ordinary files.",
  "Guaranteed accuracy. Results on real customer photos have not been measured yet, so the grid check stays your job.",
];

const PRIVACY = [
  {
    title: "Nothing is uploaded",
    body: "“Upload” here means opening a file in your browser. The app has no server route for photos, and the browser policy blocks sending data elsewhere.",
  },
  {
    title: "Files are checked before opening",
    body: "The type is read from the file's contents, not its name. Oversized files, files that declare enormous images, and anything that is not a photo or PDF are refused. Duplicates and system files in a folder are skipped.",
  },
  {
    title: "Only pixels are kept",
    body: "Each photo is redrawn as plain pixels. Location, time and device data, and anything else hidden in the file, are left behind and never reach an export.",
  },
  {
    title: "Nothing stays behind",
    body: "Everything lives in this tab. Start over or closing the tab discards it. File names stay on your screen and are not written into exports.",
  },
  {
    title: "There is no virus scan in the app",
    body: "Files are only drawn as images, never run or stored, so your computer's own antivirus remains the check. A scan would be needed if server storage is added later.",
  },
];

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-6 text-xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">How to count a roof</h1>
      <p className="mt-3 text-base text-muted">
        From a roof photo to exact numbers for the CAD drawing. The app proposes; you check and confirm.
      </p>

      <nav aria-label="Contents" className="mt-6 flex flex-wrap gap-2">
        {CONTENTS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>

      <SectionHeading id="before">Before you start</SectionHeading>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-base">
        {CHECKLIST.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <caption className="sr-only">What makes a good roof photo</caption>
          <thead className="bg-surface-raised">
            <tr>
              <th className="px-4 py-2.5 font-semibold text-success">Good photo</th>
              <th className="px-4 py-2.5 font-semibold text-warning">Likely to cause trouble</th>
            </tr>
          </thead>
          <tbody>
            {PHOTO_TIPS.map(({ good, bad }) => (
              <tr key={good} className="border-t border-border bg-surface">
                <td className="px-4 py-2.5">{good}</td>
                <td className="px-4 py-2.5 text-muted">{bad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeading id="steps">Step by step</SectionHeading>
      <ol className="mt-4 space-y-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4 rounded-lg border border-border bg-surface p-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent font-mono text-sm font-semibold text-accent">
              {index + 1}
            </span>
            <div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <SectionHeading id="panels">Panel options</SectionHeading>
      <p className="mt-3 text-base text-muted">
        Yes, you can add and remove panels by hand. The counts are the same in all three options.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {PANEL_OPTIONS.map(({ title, body }) => (
          <section key={title} className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </section>
        ))}
      </div>

      <SectionHeading id="warnings">When something looks wrong</SectionHeading>
      <dl className="mt-4 space-y-3">
        {TROUBLESHOOTING.map(({ problem, fix }) => (
          <div key={problem} className="rounded-lg border border-border bg-surface p-5">
            <dt className="text-base font-semibold">{problem}</dt>
            <dd className="mt-1 text-sm text-muted">{fix}</dd>
          </div>
        ))}
      </dl>

      <SectionHeading id="scope">What it solves, and what it does not</SectionHeading>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h3 className="text-base font-semibold text-success">Solves</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
            {SOLVES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-surface p-5">
          <h3 className="text-base font-semibold text-warning">Does not solve</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
            {DOES_NOT_SOLVE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <SectionHeading id="privacy">Privacy and file safety</SectionHeading>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {PRIVACY.map(({ title, body }) => (
          <section key={title} className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </section>
        ))}
      </div>

      <Link
        href="/"
        className="mt-10 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast"
      >
        Count a roof
      </Link>
    </main>
  );
}
