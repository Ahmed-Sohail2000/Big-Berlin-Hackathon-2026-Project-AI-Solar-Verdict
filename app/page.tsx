import { HomeShell } from "@/components/homeowner/HomeShell";

const OLD_WAY = [
  "On-site visit and a 2–3 week wait just to get a quote",
  "Non-binding estimates that change after the survey",
  "Pressure sales pitches instead of engineering",
];

const VERDICT_WAY = [
  "Roof read from satellite / Solar API in seconds",
  "Deterministic sizing math — the AI never guesses geometry",
  "Transparent bill of materials priced from 1,277 real projects",
  "Reviewed and approved by a certified installer",
];

const STEPS = [
  {
    n: "1",
    title: "Type your address",
    body: "See your roof in photoreal 3D and the solar segments the Solar API measured on it.",
  },
  {
    n: "2",
    title: "Answer 4 questions",
    body: "Electricity bill, EV, heating, and your goal. No phone number, no sales call.",
  },
  {
    n: "3",
    title: "Get 3 engineered proposals",
    body: "Sized variants with panel count, battery, and payback — each citing real comparable projects, sent to a certified installer for approval.",
  },
];

const STATS = [
  { value: "6–9 yrs", label: "typical payback" },
  { value: "€100–200", label: "saved monthly" },
  { value: "≈2.4 t", label: "CO₂ avoided per year" },
  { value: "3", label: "variants per roof" },
];

const TRUST_ITEMS = [
  "Grounded in 1,277 real Reonic installer projects",
  "Every quote reviewed by a certified installer",
  "Transparent BoM — no hidden line items",
  "Your data stays yours",
];

export default function Home() {
  return (
    <div className="bg-[#0A0E1A] text-[#F7F8FA]">
      {/* Sticky nav — the only nav on this page (HomeShell's was lifted here) */}
      <header className="sticky top-0 z-50 border-b border-[#2A3038] bg-[#0A0E1A]/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#top" className="text-base font-semibold tracking-tight">
            Verdict
          </a>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#how-it-works" className="text-sm text-[#9BA3AF] transition-colors hover:text-[#F7F8FA]">
              How it works
            </a>
            <a href="#benefits" className="text-sm text-[#9BA3AF] transition-colors hover:text-[#F7F8FA]">
              Benefits
            </a>
            <a href="#why-verdict" className="text-sm text-[#9BA3AF] transition-colors hover:text-[#F7F8FA]">
              Why Verdict
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/installer" className="text-sm text-[#9BA3AF] transition-colors hover:text-[#F7F8FA]">
              For installers
            </a>
            <a
              href="#app"
              className="rounded-lg bg-[#3DAEFF] px-4 py-2 text-sm font-semibold text-[#0A0E1A] transition-colors hover:bg-[#2EA1F0]"
            >
              Get instant quote
            </a>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* Hero — compact, the product itself is the next section */}
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 pb-14 pt-14 text-center sm:pb-16 sm:pt-20">
          <span className="rounded border border-[#2A3038] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#9BA3AF]">
            Precision solar engineering
          </span>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            From address to installer-approved solar quote in{" "}
            <span className="text-[#3DAEFF]">60 seconds</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#9BA3AF] sm:text-base">
            Verdict AI reads your roof from satellite data and grounds every proposal in 1,277
            real installer projects &mdash; a hardware-ready quote, not a sales estimate.
          </p>
          <a
            href="#app"
            className="rounded-lg bg-[#3DAEFF] px-6 py-3 text-base font-semibold text-[#0A0E1A] transition-colors hover:bg-[#2EA1F0]"
          >
            Get instant quote
          </a>
        </section>

        {/* The app — the existing two-pane experience, unchanged */}
        <section id="app" aria-label="Get your solar quote" className="scroll-mt-16 border-t border-[#1A1F2A]">
          <HomeShell />
        </section>

        {/* Problem vs solution */}
        <section id="why-verdict" className="scroll-mt-16 border-t border-[#1A1F2A]">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 sm:py-20">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Why the old way is broken
              </h2>
              <p className="text-sm text-[#9BA3AF]">
                Getting a solar quote in Germany shouldn&rsquo;t take three weeks and a sales visit.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[#2A3038] bg-[#12161C] p-6">
                <h3 className="mb-1 text-base font-semibold">The old way</h3>
                <p className="mb-4 text-xs uppercase tracking-wider text-[#9BA3AF]">Manual process</p>
                <ul className="flex flex-col gap-3">
                  {OLD_WAY.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-[#9BA3AF]">
                      <span aria-hidden className="mt-0.5 text-[#F2B84B]">&#10005;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-[#3DAEFF]/40 bg-[#12161C] p-6">
                <h3 className="mb-1 text-base font-semibold">The Verdict way</h3>
                <p className="mb-4 text-xs uppercase tracking-wider text-[#3DAEFF]">Engineering, not estimates</p>
                <ul className="flex flex-col gap-3">
                  {VERDICT_WAY.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-[#F7F8FA]">
                      <span aria-hidden className="mt-0.5 text-[#62E6A7]">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 border-t border-[#1A1F2A]">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n} className="rounded-lg border border-[#2A3038] bg-[#12161C] p-6">
                  <span className="text-3xl font-semibold text-[#3DAEFF]">{step.n}</span>
                  <h3 className="mb-2 mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[#9BA3AF]">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Outcome stats */}
        <section id="benefits" className="scroll-mt-16 border-t border-[#1A1F2A]">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 sm:py-20">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                What homeowners typically see
              </h2>
              <p className="text-sm text-[#9BA3AF]">
                Typical outcomes across comparable projects &mdash; not guarantees. Your quote is sized to your roof.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-[#2A3038] bg-[#12161C] p-6">
                  <div className="text-2xl font-semibold text-[#3DAEFF] sm:text-3xl">{stat.value}</div>
                  <div className="mt-1 text-sm text-[#9BA3AF]">{stat.label}</div>
                </div>
              ))}
            </div>
            {/* Trust strip */}
            <ul className="mt-2 grid gap-x-8 gap-y-3 rounded-lg border border-[#2A3038] bg-[#12161C] p-6 sm:grid-cols-2">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[#9BA3AF]">
                  <span aria-hidden className="mt-0.5 text-[#62E6A7]">&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA band */}
        <section className="border-t border-[#1A1F2A]">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 py-16 text-center sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to see your roof&rsquo;s verdict?
            </h2>
            <a
              href="#app"
              className="rounded-lg bg-[#3DAEFF] px-6 py-3 text-base font-semibold text-[#0A0E1A] transition-colors hover:bg-[#2EA1F0]"
            >
              Get instant quote
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2A3038]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-[#9BA3AF] sm:flex-row">
          <span className="font-semibold text-[#F7F8FA]">Verdict</span>
          <span>Built at Big Berlin Hack 2026</span>
          <a href="/installer" className="transition-colors hover:text-[#F7F8FA]">
            For installers
          </a>
        </div>
      </footer>
    </div>
  );
}
