import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works | HelioSense Roof Count" };

const STEPS = [
  {
    title: "Add a photo",
    body: "Drop one photo of one roof surface, or choose a file. JPEG, PNG, HEIC and PDF all work, up to 30 MB. Keep all four roof corners in the frame.",
  },
  {
    title: "Check the roof edges",
    body: "The app proposes four corners. Drag each one onto the real roof edge. A magnifier helps you place it, and arrow keys move a selected corner one pixel at a time. The count updates when you let go.",
  },
  {
    title: "Compare the grid with the tiles",
    body: "Blue grid lines should sit on the real tile rows. If they do, the count is right. If not, adjust the corners or type the correct count. A poor photo shows “Not reliable” and leaves the count empty for you to fill in.",
  },
  {
    title: "Enter the tile size",
    body: "Enter tile height, width and overlap in millimetres, or the row spacing if you know it. The app needs this to calculate metres. If you have a photo of a tile beside a folding ruler, click the marks and it measures the tile for you.",
  },
  {
    title: "Mark obstructions",
    body: "Add roof windows, chimneys, pipes and dormers in whole tiles, or press Detect areas for suggestions. Choose the type and accept each one, because the app does not name them.",
  },
  {
    title: "Review the recommended panels",
    body: "Pick a panel type and adjust the spacing. The app tries portrait and landscape, then shows the layout that fits more panels. Treat it as a starting point for the CAD drawing, not a final design.",
  },
  {
    title: "Confirm and export",
    body: "Add a case reference, confirm the result, then export. PDF and PNG include the annotated photo; CSV and JSON carry the numbers for the CAD drawing.",
  },
];

const FACTS = [
  {
    title: "Your photos stay private",
    body: "Photos are processed in your browser and never uploaded. Location and time data is removed on opening. Closing the tab or pressing Start over discards the roof.",
  },
  {
    title: "You stay in control",
    body: "Every count is a proposal. Nothing can be exported until you confirm it, and exports record whether you changed the count.",
  },
  {
    title: "What it does not do",
    body: "It does not handle flat roofs, 3D models, roof pitch, shading or compass direction. It assumes one flat surface with four corners, so measure more complex shapes in sections.",
  },
];

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">How to count a roof</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        From photo to CAD-ready numbers in seven steps.
      </p>

      <ol className="mt-8 space-y-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4 rounded-lg border border-border bg-surface p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent text-sm font-semibold text-accent">
              {index + 1}
            </span>
            <div>
              <h2 className="text-sm font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {FACTS.map((fact) => (
          <section key={fact.title} className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">{fact.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">{fact.body}</p>
          </section>
        ))}
      </div>

      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast"
      >
        Count a roof
      </Link>
    </main>
  );
}
