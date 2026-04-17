'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';

const PLANS = {
  starter: {
    name: 'Starter',
    price: 499,
    seats: 20,
    tagline: 'Up to 20 employees',
    color: 'from-blue-600 to-indigo-600',
    features: [
      'Team productivity dashboard',
      'Org-wide site policies',
      'Individual analytics',
      'Weekly email reports',
      'Focus garden for employees',
      'Email support',
    ],
  },
  growth: {
    name: 'Growth',
    price: 349,
    seats: 100,
    tagline: 'Up to 100 employees',
    color: 'from-violet-600 to-purple-700',
    features: [
      'Everything in Starter',
      'Advanced analytics & exports',
      'Department-level rollups',
      'Custom policies per team',
      'Priority support',
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planKey = (searchParams.get('plan') ?? 'starter') as PlanKey;
  const plan = PLANS[planKey] ?? PLANS.starter;
  const router = useRouter();

  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handlePay() {
    if (!company.trim() || !email.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setDone(true);
    await new Promise((r) => setTimeout(r, 600));
    router.push('/setup');
  }

  const estimatedTotal = plan.price * 5;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦆</span>
            <span className="font-bold text-gray-900">QuackFocus</span>
          </div>
          <Link href="/#pricing" className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to plans
          </Link>
        </div>
      </header>

      {/* Test mode banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5">
        <p className="mx-auto max-w-6xl text-center text-xs font-semibold text-amber-700">
          🧪 Test Mode — This is a demo checkout. No real payment will be processed.
        </p>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">

          {/* ── Left: Order summary ── */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complete your order</h1>
            <p className="mt-1 text-gray-500">You selected the <strong>{plan.name}</strong> plan.</p>

            <div className={`mt-8 overflow-hidden rounded-2xl bg-gradient-to-br ${plan.color} p-7 text-white shadow-xl`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">{plan.name} Plan</p>
                  <p className="mt-1 text-sm text-white/70">{plan.tagline}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold">₹{plan.price}</p>
                  <p className="text-xs text-white/60">/user/month</p>
                </div>
              </div>
              <div className="mt-6 h-px bg-white/15" />
              <ul className="mt-5 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/80">
                    <span className="text-xs font-black text-green-300">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Order summary</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{plan.name} plan × 5 users (example)</span>
                  <span className="font-semibold text-gray-900">₹{estimatedTotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>14-day free trial</span>
                  <span className="font-semibold text-green-600">FREE</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%)</span>
                  <span className="font-semibold text-gray-900">₹{Math.round(estimatedTotal * 0.18)}</span>
                </div>
                <div className="mt-2 border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
                  <span>Billed after trial ends</span>
                  <span>₹{Math.round(estimatedTotal * 1.18)}/mo</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-400">
                You won&apos;t be charged until after your 14-day free trial ends. Cancel anytime.
              </p>
            </div>
          </div>

          {/* ── Right: Payment form ── */}
          <div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Organization details</h2>
              <p className="mt-1 text-sm text-gray-500">We&apos;ll set up your workspace after checkout.</p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company name</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Work email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
              </div>

              <div className="mt-6 h-px bg-gray-100" />

              {/* Card (dummy) */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-gray-700">Card information</h3>
                <p className="mb-3 text-xs text-amber-600">Test mode — pre-filled card details, no real charge</p>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      defaultValue="4242 4242 4242 4242"
                      disabled
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm">💳</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      defaultValue="12 / 29"
                      disabled
                      className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
                    />
                    <input
                      type="text"
                      defaultValue="123"
                      disabled
                      className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={loading || done || !company.trim() || !email.trim()}
                className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all disabled:cursor-not-allowed ${
                  done
                    ? 'bg-green-500 shadow-green-200'
                    : loading
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-300 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none'
                }`}
              >
                {done ? (
                  <>✓ Payment verified — setting up workspace…</>
                ) : loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>Start 14-day free trial →</>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                🔒 No real charge in test mode · Cancel anytime · GST extra
              </p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span>✓ 14-day free trial</span>
              <span>✓ No credit card stored</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
