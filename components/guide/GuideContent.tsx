"use client";

import Link from "next/link";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { GUIDE } from "@/lib/i18n/content/guide";

const SECTION_IDS = ["before", "steps", "panels", "warnings", "scope", "privacy"] as const;

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-6 text-xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

export function GuideContent() {
  const { language } = useLanguage();
  const guide = GUIDE[language];

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{guide.title}</h1>
      <p className="mt-3 text-base text-muted">{guide.intro}</p>

      <nav aria-label={guide.contentsLabel} className="mt-6 flex flex-wrap gap-2">
        {SECTION_IDS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            {guide.headings[id]}
          </a>
        ))}
      </nav>

      <SectionHeading id="before">{guide.headings.before}</SectionHeading>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-base">
        {guide.checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <caption className="sr-only">{guide.photoCaption}</caption>
          <thead className="bg-surface-raised">
            <tr>
              <th className="px-4 py-2.5 font-semibold text-success">{guide.goodPhoto}</th>
              <th className="px-4 py-2.5 font-semibold text-warning">{guide.badPhoto}</th>
            </tr>
          </thead>
          <tbody>
            {guide.photoTips.map(({ good, bad }) => (
              <tr key={good} className="border-t border-border bg-surface">
                <td className="px-4 py-2.5">{good}</td>
                <td className="px-4 py-2.5 text-muted">{bad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeading id="steps">{guide.headings.steps}</SectionHeading>
      <ol className="mt-4 space-y-3">
        {guide.steps.map((step, index) => (
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

      <SectionHeading id="panels">{guide.headings.panels}</SectionHeading>
      <p className="mt-3 text-base text-muted">{guide.panelsIntro}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {guide.panelOptions.map(({ title, body }) => (
          <section key={title} className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </section>
        ))}
      </div>

      <SectionHeading id="warnings">{guide.headings.warnings}</SectionHeading>
      <dl className="mt-4 space-y-3">
        {guide.troubleshooting.map(({ problem, fix }) => (
          <div key={problem} className="rounded-lg border border-border bg-surface p-5">
            <dt className="text-base font-semibold">{problem}</dt>
            <dd className="mt-1 text-sm text-muted">{fix}</dd>
          </div>
        ))}
      </dl>

      <SectionHeading id="scope">{guide.headings.scope}</SectionHeading>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h3 className="text-base font-semibold text-success">{guide.solvesTitle}</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
            {guide.solves.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-surface p-5">
          <h3 className="text-base font-semibold text-warning">{guide.doesNotSolveTitle}</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
            {guide.doesNotSolve.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <SectionHeading id="privacy">{guide.headings.privacy}</SectionHeading>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {guide.privacy.map(({ title, body }) => (
          <section key={title} className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </section>
        ))}
      </div>

      <Link
        href="/tool"
        className="mt-10 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast"
      >
        {guide.action}
      </Link>
    </main>
  );
}
