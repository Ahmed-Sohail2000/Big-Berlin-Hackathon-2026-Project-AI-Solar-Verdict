"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/tile-count/ui/fields";
import { LANDING } from "@/lib/i18n/content/landing";
import { RoofIllustration } from "./RoofIllustration";

function Section({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-16">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {heading}
      </h2>
      {children}
    </section>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

/** What the product is and how it works, in front of the tool itself. */
export function LandingPage() {
  const { language } = useLanguage();
  const page = LANDING[language];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-semibold text-accent">{page.hero.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight lg:text-[2.5rem] lg:leading-[1.15]">
            {page.hero.title}
          </h1>
          <p className="mt-4 text-base text-muted">{page.hero.body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/tool" className={PRIMARY_BUTTON_CLASS}>
              {page.hero.primary}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/guide" className={BUTTON_CLASS}>
              {page.hero.secondary}
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted">{page.hero.note}</p>
        </div>
        <RoofIllustration caption={page.hero.illustration} />
      </div>

      <dl className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {page.facts.map(({ value, label }) => (
          <div key={label} className="flex flex-col-reverse bg-surface px-5 py-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-mono text-2xl font-semibold text-accent">{value}</dd>
          </div>
        ))}
      </dl>

      <Section id="what" heading={page.what.heading}>
        <div className="mt-3 grid gap-4 text-base text-muted md:grid-cols-2">
          {page.what.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Section>

      <Section id="does" heading={page.does.heading}>
        <p className="mt-3 text-base text-muted">{page.does.intro}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-warning">
              <Clock className="h-4 w-4" aria-hidden />
              {page.does.todayTitle}
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
              {page.does.today.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-success">
              <Check className="h-4 w-4" aria-hidden />
              {page.does.withTitle}
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
              {page.does.with.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="how" heading={page.how.heading}>
        <ol className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {page.how.steps.map((step, index) => (
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
      </Section>

      <Section id="gets" heading={page.gets.heading}>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {page.gets.items.map((item) => (
            <Card key={item.title} {...item} />
          ))}
        </div>
      </Section>

      <Section id="privacy" heading={page.privacy.heading}>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {page.privacy.items.map((item) => (
            <Card key={item.title} {...item} />
          ))}
        </div>
      </Section>

      <Section id="limits" heading={page.limits.heading}>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-5">
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {page.limits.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href="/guide#scope" className="mt-3 inline-block text-sm text-accent underline">
              {page.limits.more}
            </Link>
          </div>
          <Card title={page.limits.accuracyTitle} body={page.limits.accuracy} />
        </div>
      </Section>

      <section className="mt-16 rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight">{page.closing.heading}</h2>
        <p className="mx-auto mt-2 max-w-xl text-base text-muted">{page.closing.body}</p>
        <Link href="/tool" className={`${PRIMARY_BUTTON_CLASS} mt-4`}>
          {page.closing.primary}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
