import { auth, signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// ── Server actions ────────────────────────────────────────────────────────────
async function signInStarter() {
  'use server';
  await signIn('google', { redirectTo: '/checkout?plan=starter' });
}
async function signInGrowth() {
  'use server';
  await signIn('google', { redirectTo: '/checkout?plan=growth' });
}
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white font-[var(--font-geist-sans)]">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2.5">
            <span className="text-2xl">🦆</span>
            <span className="text-lg font-bold tracking-tight text-white">QuackFocus</span>
          </a>
          <nav className="hidden items-center gap-7 md:flex">
            {['Features', 'How it works', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm font-medium text-white/60 transition-colors hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-all hover:bg-blue-50"
            >
              Get started →
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="qf-hero min-h-screen pb-32 pt-32 px-6">
        {/* gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="qf-orb absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-violet-700/15 blur-[100px]" style={{ animationDelay: '4s' }} />
          <div className="absolute left-0 top-1/2 h-[400px] w-[400px] rounded-full bg-cyan-600/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          {/* badge */}
          <div className="qf-fade-up flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-blue-300 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              Enterprise-ready · Built for Indian organizations
            </div>
          </div>

          {/* headline */}
          <div className="qf-fade-up mt-8 text-center" style={{ animationDelay: '0.1s' }}>
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Your team deserves{' '}
              <span className="qf-gradient-text">better than distractions</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50">
              QuackFocus gives IT the tools to deploy, managers the data to act,
              and employees the focus to thrive — all without turning your office into a surveillance state.
            </p>
          </div>

          {/* CTAs */}
          <div className="qf-fade-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: '0.2s' }}>
            <form action={signInStarter}>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-indigo-600 hover:shadow-blue-500/40 sm:w-auto"
              >
                Start 14-day free trial
              </button>
            </form>
            <a
              href="#pricing"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-center text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
            >
              View pricing →
            </a>
          </div>
          <p className="mt-3 text-center text-xs text-white/30">
            No credit card required · Cancel anytime · GST extra
          </p>

          {/* Product preview card */}
          <div className="qf-float qf-fade-up mx-auto mt-16 max-w-4xl" style={{ animationDelay: '0.3s' }}>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur-sm">
              {/* window chrome */}
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-5 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-xs text-white/30">QuackFocus Admin — Team Overview</span>
                <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  Live
                </span>
              </div>
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-px border-b border-white/5 bg-white/5">
                {heroKpis.map((k) => (
                  <div key={k.label} className="bg-[#06091e] px-5 py-4">
                    <p className="text-xs text-white/40">{k.label}</p>
                    <p className="mt-0.5 text-xl font-bold text-white">{k.value}</p>
                    <p className={`mt-0.5 text-xs font-medium ${k.up ? 'text-green-400' : 'text-red-400'}`}>
                      {k.change}
                    </p>
                  </div>
                ))}
              </div>
              {/* Team rows */}
              <div className="divide-y divide-white/5 bg-[#040813]">
                {heroTeam.map((m) => (
                  <div key={m.name} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                      {m.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{m.name}</p>
                      <p className="text-xs text-white/40">{m.role}</p>
                    </div>
                    <div className="hidden items-center gap-6 sm:flex">
                      <div className="text-right">
                        <p className="text-xs text-white/40">Focus</p>
                        <p className="text-sm font-semibold text-white">{m.focus}</p>
                      </div>
                      <div className="w-28">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/40">Score</span>
                          <span className="text-xs font-bold text-white">{m.score}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${m.score >= 70 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : m.score >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-red-600'}`}
                            style={{ width: `${m.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${m.status === 'Focused' ? 'bg-green-500/15 text-green-400' : m.status === 'Distracted' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-gray-900">{s.number}</p>
                <p className="mt-1 text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="bg-gray-50 py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600">Features</p>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything your organization needs
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Designed for HR, IT, and managers who want real results without micromanagement.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-blue-100"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-violet-50/0 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl ring-1 ring-blue-100">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600">Process</p>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Up and running in minutes</h2>
            <p className="mt-4 text-lg text-gray-500">IT deploys once. Productivity improves every day after.</p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+2.5rem)] top-7 hidden w-[calc(100%-5rem)] border-t-2 border-dashed border-gray-200 md:block" />
                )}
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-black text-white shadow-lg shadow-blue-200">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 text-base font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WELLNESS ──────────────────────────────────────────────────────── */}
      <section className="bg-[#04081a] py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 text-5xl">🌱</div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Not surveillance.{' '}
              <span className="qf-gradient-text">Employee wellness.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/50">
              QuackFocus is built to help employees thrive — not catch them slacking.
              Employees see their own data first. Tracking is transparent and limited to work hours only.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {wellness.map((w) => (
              <div key={w.title} className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-sm">
                <div className="mb-4 text-3xl">{w.icon}</div>
                <h3 className="font-bold text-white">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600">Pricing</p>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Simple, per-seat pricing
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              For organizations only. Scale with your team, pay only for what you use.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-8 transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-b from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-500/30 md:scale-105 md:-translate-y-2'
                    : 'border border-gray-200 bg-white shadow-sm hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-1 text-xs font-black text-amber-900 shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest ${plan.popular ? 'text-blue-200' : 'text-blue-600'}`}>
                    {plan.name}
                  </p>
                  <p className={`mt-1 text-sm ${plan.popular ? 'text-blue-200' : 'text-gray-500'}`}>
                    {plan.tagline}
                  </p>
                  <div className="mt-5 flex items-end gap-1">
                    <span className={`text-5xl font-extrabold leading-none ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={`mb-1.5 text-sm ${plan.popular ? 'text-blue-200' : 'text-gray-400'}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1.5 text-sm ${plan.popular ? 'text-blue-200' : 'text-gray-500'}`}>
                    {plan.seats}
                  </p>
                </div>

                <div className={`my-6 h-px ${plan.popular ? 'bg-white/15' : 'bg-gray-100'}`} />

                <ul className="flex-1 space-y-2.5">
                  {plan.features.map((feat) => (
                    <li key={feat} className={`flex items-start gap-2.5 text-sm ${plan.popular ? 'text-blue-100' : 'text-gray-600'}`}>
                      <span className={`mt-0.5 shrink-0 text-xs font-black ${plan.popular ? 'text-green-300' : 'text-green-500'}`}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {plan.name === 'Enterprise' ? (
                    <a
                      href="mailto:sales@quackfocus.com"
                      className="block w-full rounded-xl border-2 border-gray-900 py-3 text-center text-sm font-bold text-gray-900 transition-all hover:bg-gray-900 hover:text-white"
                    >
                      Contact sales
                    </a>
                  ) : plan.popular ? (
                    <form action={signInGrowth}>
                      <button type="submit" className="w-full rounded-xl bg-white py-3 text-sm font-bold text-blue-700 transition-all hover:bg-blue-50">
                        {plan.cta}
                      </button>
                    </form>
                  ) : (
                    <form action={signInStarter}>
                      <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700">
                        {plan.cta}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-400">
            All plans include a 14-day free trial · Billed monthly · Save 20% with annual billing · GST extra
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
                <p className="font-semibold text-gray-900">{faq.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-[#04081a] py-24 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-5xl">🦆</div>
          <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl">
            Ready to help your team focus?
          </h2>
          <p className="mt-4 text-lg text-white/50">
            Start your 14-day free trial. No setup fees, no contracts, no credit card needed.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <form action={signInStarter}>
              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-indigo-600 sm:w-auto">
                Start free trial →
              </button>
            </form>
            <a
              href="mailto:sales@quackfocus.com"
              className="w-full rounded-xl border border-white/10 px-8 py-4 text-center text-sm font-semibold text-white/70 transition-all hover:border-white/25 hover:text-white sm:w-auto"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#04081a] py-10 px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦆</span>
            <span className="font-bold text-white">QuackFocus</span>
          </div>
          <p className="text-sm text-white/30">© {new Date().getFullYear()} QuackFocus. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-white/40">
            <a href="#" className="transition-colors hover:text-white">Privacy</a>
            <a href="#" className="transition-colors hover:text-white">Terms</a>
            <a href="mailto:hello@quackfocus.com" className="transition-colors hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const heroKpis = [
  { label: 'Team Avg Score', value: '78', change: '↑ 12% vs last week', up: true },
  { label: 'Focused Today', value: '11/14', change: '↑ 3 more than Monday', up: true },
  { label: 'Limit Breaches', value: '2', change: '↓ Better than yesterday', up: false },
  { label: 'Focus Hours', value: '47h', change: '↑ 9h more than last week', up: true },
];

const heroTeam = [
  { initials: 'RS', name: 'Rahul Sharma', role: 'Frontend Engineer', focus: '5.2h', score: 84, status: 'Focused' },
  { initials: 'PK', name: 'Priya Kulkarni', role: 'Product Designer', focus: '4.8h', score: 76, status: 'Focused' },
  { initials: 'AM', name: 'Arjun Mehta', role: 'Backend Engineer', focus: '2.1h', score: 38, status: 'Distracted' },
  { initials: 'SD', name: 'Sneha Desai', role: 'Data Analyst', focus: '6.0h', score: 91, status: 'Focused' },
];

const stats = [
  { number: '2.8h', label: 'Daily time saved per employee' },
  { number: '34%', label: 'Increase in deep work sessions' },
  { number: '92%', label: 'Employee satisfaction rate' },
  { number: '<5 min', label: 'IT setup time per device' },
];

const features = [
  {
    icon: '📊',
    title: 'Team Productivity Dashboard',
    description: "See your entire team's focus patterns at a glance. Spot top performers and identify who needs support.",
  },
  {
    icon: '🛡️',
    title: 'Org-wide Site Policies',
    description: 'Set blocked and allowed sites company-wide. Policies apply instantly across all IT-managed devices.',
  },
  {
    icon: '📈',
    title: 'Detailed Analytics & Reports',
    description: 'Automated weekly digests, trend charts, distraction patterns, and peak work-hour insights.',
  },
  {
    icon: '🦆',
    title: 'AI Focus Coaching',
    description: 'A friendly duck mascot gives real-time nudges when employees drift to distracting sites during work hours.',
  },
  {
    icon: '🌱',
    title: 'Focus Garden',
    description: 'Employees grow a personal digital garden tied to their focus. More focus = more plants. Motivating, not punishing.',
  },
  {
    icon: '⚡',
    title: 'Zero-Friction IT Setup',
    description: 'Deploy the Chrome extension centrally. Auto-enroll employees with zero per-device manual configuration.',
  },
];

const steps = [
  {
    title: 'IT installs & configures',
    description: 'Your IT team deploys the Chrome extension to all employee machines and sets org-wide policies from the admin panel.',
  },
  {
    title: 'Employees work naturally',
    description: 'The extension runs in the background. Employees see their personal garden and duck mood — zero friction to their workflow.',
  },
  {
    title: 'Managers get insights',
    description: 'Admins view team dashboards and weekly reports. Spot patterns, track improvement, and support struggling employees.',
  },
];

const wellness = [
  {
    icon: '👁️',
    title: 'Fully transparent',
    description: 'Employees always know tracking is on. They can see exactly what data is collected about them at any time.',
  },
  {
    icon: '🏆',
    title: 'Reward-based, not punitive',
    description: 'Focus leads to a growing garden and personal records — not penalties. Positive reinforcement beats punishment.',
  },
  {
    icon: '🔒',
    title: 'Work hours only',
    description: "Activity outside configured work hours is never tracked. Personal browsing stays completely private.",
  },
];

const plans = [
  {
    name: 'Starter',
    tagline: 'Perfect for small teams',
    price: '₹499',
    period: '/user/mo',
    seats: 'Up to 20 employees',
    popular: false,
    cta: 'Start free trial',
    features: [
      'Team productivity dashboard',
      'Org-wide site policies',
      'Individual analytics',
      'Weekly email reports',
      'Focus garden for employees',
      'Chrome extension deployment',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    tagline: 'For scaling organizations',
    price: '₹349',
    period: '/user/mo',
    seats: '21 – 100 employees',
    popular: true,
    cta: 'Start free trial',
    features: [
      'Everything in Starter',
      'Advanced analytics & CSV exports',
      'Department-level rollups',
      'Custom policies per team',
      'Slack & email integrations',
      'Employee wellness score tracking',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'For large organizations',
    price: 'Custom',
    period: null,
    seats: '100+ employees',
    popular: false,
    cta: 'Contact sales',
    features: [
      'Everything in Growth',
      'Dedicated account manager',
      'SSO & HRMS integrations',
      'SLA guarantees',
      'On-premise deployment',
      'Custom contracts & invoicing',
    ],
  },
];

const faqs = [
  {
    q: 'Do employees know they are being tracked?',
    a: 'Yes, always. QuackFocus is fully transparent. Employees can see exactly what data is collected and when. We believe informed employees perform better than surveilled ones.',
  },
  {
    q: 'What happens outside work hours?',
    a: 'Nothing. The extension only tracks activity within the configured work hours. Personal browsing outside those hours is never recorded or stored.',
  },
  {
    q: 'How does IT deploy the extension?',
    a: 'The Chrome extension can be deployed via Google Workspace Admin or any standard MDM. IT configures it once; all employees are auto-enrolled with the organization token.',
  },
  {
    q: 'Can employees change their own settings?',
    a: 'Employees can personalize things like duck mood visibility and their own focus goals, but they cannot override org-level blocked site policies set by admins.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. All plans start with a 14-day free trial. No credit card required. You can invite up to your plan\'s seat limit during the trial.',
  },
];
