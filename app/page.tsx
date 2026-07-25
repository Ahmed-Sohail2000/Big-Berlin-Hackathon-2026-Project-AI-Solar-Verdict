import { HomeShell } from "@/components/homeowner/HomeShell";

const OLD_WAY = [
  "A solar engineer drives out and measures the roof by hand",
  "Panels laid out in CAD, strings and inverters sized manually",
  "Bill of materials priced over days — per site, per revision",
  "You wait, and the estimate still moves after the survey",
];

const VERDICT_WAY = [
  "The AI reads the real 3D roof from satellite / Solar data",
  "Panels placed and the system sized with real engineering rules",
  "A fully costed, itemized proposal returned in seconds",
  "Reviewed by a certified installer before you commit",
];

const STEPS = [
  {
    n: "1",
    title: "Enter your building's address",
    body: "See your actual roof in photoreal 3D — with the AI's recommended panel layout already placed on it.",
  },
  {
    n: "2",
    title: "Add usage & building type",
    body: "Share your commercial electricity use and what the building is. The AI tailors the system to how you operate.",
  },
  {
    n: "3",
    title: "Get an engineered proposal",
    body: "Panel count, inverters, wiring and full BoM, plus ROI — ready to hand to an installer.",
  },
];

const STATS = [
  { value: "5–8 yrs", label: "typical payback" },
  { value: "€30k+", label: "typical annual opex cut" },
  { value: "100–500 kWp", label: "typical system size" },
  { value: "≈120 t", label: "CO₂ avoided per year" },
];

const TRUST_ITEMS = [
  "Deterministic engineering math — the AI never guesses geometry",
  "Transparent, itemized bill of materials — every line costed",
  "Benchmarked on real installer project data",
  "Reviewed by a certified installer before you commit",
  "Adapts to the market and tariff of the country you enter — while keeping the numbers honest",
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
              Design a system
            </a>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* Hero — compact, the product itself is the next section */}
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 pb-14 pt-14 text-center sm:pb-16 sm:pt-20">
          <span className="rounded border border-[#2A3038] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#9BA3AF]">
            White-label AI solar design · license it for your team
          </span>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The AI that designs solar systems, so your team can sell them &mdash; in{" "}
            <span className="text-[#3DAEFF]">60 seconds</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#9BA3AF] sm:text-base">
            Verdict turns any address into a roof-measured, engineered, and priced proposal.
            Solar companies license it into their own sales pipeline &mdash; the AI reads the roof
            from satellite data, sizes the system, prices the bill of materials, and hands your
            installers a design that&rsquo;s ready to quote. No manual CAD, any building, any country.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#app"
              className="rounded-lg bg-[#3DAEFF] px-6 py-3 text-base font-semibold text-[#0A0E1A] transition-colors hover:bg-[#2EA1F0]"
            >
              See it on a building
            </a>
            <a
              href="/installer"
              className="rounded-lg border border-[#2A3038] px-6 py-3 text-base font-semibold text-[#F7F8FA] transition-colors hover:border-[#3DAEFF]/50"
            >
              Installer dashboard
            </a>
          </div>
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
                Commercial solar design is stuck in the past
              </h2>
              <p className="text-sm text-[#9BA3AF]">
                Every rooftop today is measured, drawn in CAD, and priced by hand &mdash; days of
                engineering per site. The AI does the same work in seconds.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[#2A3038] bg-[#12161C] p-6">
                <h3 className="mb-1 text-base font-semibold">The old way</h3>
                <p className="mb-4 text-xs uppercase tracking-wider text-[#9BA3AF]">Manual process, days per site</p>
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
                <h3 className="mb-1 text-base font-semibold">The AI way</h3>
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
            {/* Time + money emphasis */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[#2A3038] bg-[#12161C] p-6">
                <p className="text-xs uppercase tracking-wider text-[#3DAEFF]">Saves time</p>
                <p className="mt-1 text-lg font-semibold">Days of manual design &rarr; seconds</p>
                <p className="mt-1 text-sm text-[#9BA3AF]">
                  Get a costed layout the moment you enter the address &mdash; no survey backlog, no CAD queue.
                </p>
              </div>
              <div className="rounded-lg border border-[#2A3038] bg-[#12161C] p-6">
                <p className="text-xs uppercase tracking-wider text-[#3DAEFF]">Saves money</p>
                <p className="mt-1 text-lg font-semibold">No manual design cost, optimized system</p>
                <p className="mt-1 text-sm text-[#9BA3AF]">
                  Skip the engineering hours and get a system sized to your roof and demand &mdash; not oversold.
                </p>
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
                What commercial owners typically see
              </h2>
              <p className="text-sm text-[#9BA3AF]">
                Typical outcomes across comparable commercial projects &mdash; not guarantees. Every
                proposal is sized to your specific roof, demand, and market.
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
              Ready to design your building&rsquo;s solar system?
            </h2>
            <a
              href="#app"
              className="rounded-lg bg-[#3DAEFF] px-6 py-3 text-base font-semibold text-[#0A0E1A] transition-colors hover:bg-[#2EA1F0]"
            >
              Design a system
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2A3038]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-[#9BA3AF] sm:flex-row">
          <span className="font-semibold text-[#F7F8FA]">Verdict</span>
          <span>AI-engineered solar proposals for commercial buildings</span>
          <a href="/installer" className="transition-colors hover:text-[#F7F8FA]">
            For installers
          </a>
        </div>
      </footer>
    </div>
  );
}
