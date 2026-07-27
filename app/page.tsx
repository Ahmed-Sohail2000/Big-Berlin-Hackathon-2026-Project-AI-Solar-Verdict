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

const CAPABILITIES = [
  {
    tag: "01",
    title: "AI roof modeling",
    blurb:
      "Type an address and the AI reads the real roof from satellite and Solar data, then auto-places the panel array in seconds — no manual CAD.",
    points: [
      "Pulls real roof geometry — segments, pitch, azimuth, usable area — from Google Solar / satellite data.",
      "Auto-places the array on the highest-yield faces, weak north faces skipped rather than padded.",
      "Per-panel yield sampled from the irradiance layer, so the layout is grounded in real sun, not a flat assumption.",
    ],
  },
  {
    tag: "02",
    title: "Design tools",
    blurb:
      "AI auto-sizing with the engineer's manual override. Approve the AI's design or reshape it — every edit flows through to the price and bill of materials.",
    points: [
      "Edit, approve or remove individual panels on the 3D roof; toggle whole roof faces on or off.",
      "Add batteries, heat pumps, inverters and balance-of-system wiring to the bill of materials.",
      "Three strategies — Best Margin, Best Close Rate, Best LTV — that change size, price and BoM together.",
    ],
  },
  {
    tag: "03",
    title: "3D visualization",
    blurb:
      "See the recommended system on a photoreal model of the real building — live with keys, or a fully offline simulation when there are none. Client-ready either way.",
    points: [
      "Photoreal 3D tiles of the actual building when Google keys are live.",
      "A fully offline synthetic 3D simulation when they're not — the demo never goes blank.",
      "The recommended array rendered on the roof, ready to show a customer.",
    ],
  },
];

const TEAM_VALUE = [
  {
    title: "White-label & license it",
    body: "License Verdict into your own sales pipeline under your brand — your logo on the proposal, your installers reviewing and sending the offer.",
  },
  {
    title: "Country & DEWA-aware",
    body: "Climate-aware yield and market pricing adapt to the country you enter. UAE proposals include the DEWA DC isolator and Gulf soiling / temperature losses.",
  },
  {
    title: "Deterministic engineering",
    body: "The AI writes rationale, never geometry. Panel counts, kWp and string layouts come from pure, repeatable sizing math a certified installer can build to.",
  },
  {
    title: "Transparent bill of materials",
    body: "Every line — panels, inverter, storage, wiring — is costed from a real catalog. Nothing is invented, so your team can quote with confidence.",
  },
];

const FAQS = [
  {
    q: "How accurate is the design?",
    a: "It reads real roof geometry — pitch, azimuth, usable area — from Google Solar data and sizes the system with deterministic engineering math, not guesswork. It's a fast, credible starting design: the on-roof layout is fully editable and a certified installer reviews and adjusts it before anything is quoted.",
  },
  {
    q: "Do I need Google API keys or billing?",
    a: "Not to try it. Verdict ships with a mock mode that runs the entire flow on cached fixture data — no keys, no billing. Add your own Google Maps / Solar keys to switch on live geocoding, live roof analysis and photoreal 3D.",
  },
  {
    q: "Does it work for the UAE / DEWA?",
    a: "Yes. The yield model is climate-aware — Gulf irradiance with soiling and high-temperature losses — and the bill of materials includes the DEWA-required DC isolator. Pricing follows the market of the country you enter.",
  },
  {
    q: "Can I white-label it?",
    a: "Yes. Verdict is built to be licensed into a solar company's own pipeline: your branding on the customer proposal and email, your installers reviewing and sending the final offer.",
  },
  {
    q: "Residential or commercial?",
    a: "Both. Choose a building type from residential up to warehouse or industrial; sizing defaults, roof assumptions and engineering — flat-roof tilt, row spacing, string layout — adjust accordingly.",
  },
  {
    q: "What does the customer get?",
    a: "A branded, itemized proposal: system size, the panel layout on their own roof, the full bill of materials, and estimated yield and payback — reviewed by a certified installer and delivered by email.",
  },
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
            <a href="#capabilities" className="text-sm text-[#9BA3AF] transition-colors hover:text-[#F7F8FA]">
              Capabilities
            </a>
            <a href="#how-it-works" className="text-sm text-[#9BA3AF] transition-colors hover:text-[#F7F8FA]">
              How it works
            </a>
            <a href="#for-teams" className="text-sm text-[#9BA3AF] transition-colors hover:text-[#F7F8FA]">
              For solar teams
            </a>
            <a href="#faq" className="text-sm text-[#9BA3AF] transition-colors hover:text-[#F7F8FA]">
              FAQ
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

        {/* Capabilities — three feature sections in SurgePV's format */}
        <section id="capabilities" className="scroll-mt-16 border-t border-[#1A1F2A]">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 sm:py-20">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3DAEFF]">
                Capabilities
              </span>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything from the roof to the quote
              </h2>
              <p className="max-w-2xl text-sm text-[#9BA3AF]">
                One pipeline: read the roof, design the system, price it, and show it in 3D —
                with a certified installer in the loop before anything ships.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.title}
                  className="grid gap-6 rounded-lg border border-[#2A3038] bg-[#12161C] p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:p-8"
                >
                  <div className="flex flex-col gap-3">
                    <span className="text-sm font-semibold tabular-nums text-[#3DAEFF]">
                      {cap.tag}
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{cap.title}</h3>
                    <p className="text-sm leading-relaxed text-[#9BA3AF]">{cap.blurb}</p>
                  </div>
                  <ul className="flex flex-col justify-center gap-3">
                    {cap.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-[#F7F8FA]">
                        <span aria-hidden className="mt-0.5 text-[#62E6A7]">&#10003;</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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

        {/* Built for solar teams — honest value props, no fabricated proof */}
        <section id="for-teams" className="scroll-mt-16 border-t border-[#1A1F2A]">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 sm:py-20">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3DAEFF]">
                Built for solar teams
              </span>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Made to sit inside your business
              </h2>
              <p className="max-w-2xl text-sm text-[#9BA3AF]">
                No borrowed logos, no invented numbers — just what a solar company actually
                needs from a design tool it puts its name on.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {TEAM_VALUE.map((item) => (
                <div key={item.title} className="rounded-lg border border-[#2A3038] bg-[#12161C] p-6">
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#9BA3AF]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ — honest answers about how Verdict actually works */}
        <section id="faq" className="scroll-mt-16 border-t border-[#1A1F2A]">
          <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Frequently asked questions
            </h2>
            <div className="flex flex-col gap-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-lg border border-[#2A3038] bg-[#12161C] px-5 py-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#F7F8FA] [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span
                      aria-hidden
                      className="text-lg leading-none text-[#3DAEFF] transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[#9BA3AF]">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA band */}
        <section className="border-t border-[#1A1F2A]">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 py-16 text-center sm:py-24">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Design it. Price it. <span className="text-[#3DAEFF]">Sell it.</span>
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-[#9BA3AF] sm:text-base">
              Turn an address into a roof-measured, engineered, priced proposal your team can
              put its name on — in about a minute.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#app"
                className="rounded-lg bg-[#3DAEFF] px-6 py-3 text-base font-semibold text-[#0A0E1A] transition-colors hover:bg-[#2EA1F0]"
              >
                Design a system
              </a>
              <a
                href="/installer"
                className="rounded-lg border border-[#2A3038] px-6 py-3 text-base font-semibold text-[#F7F8FA] transition-colors hover:border-[#3DAEFF]/50"
              >
                Installer dashboard
              </a>
            </div>
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
