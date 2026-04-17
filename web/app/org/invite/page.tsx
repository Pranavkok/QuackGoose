'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type MemberRole = 'MEMBER' | 'ADMIN';

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const raw = await res.text();
    if (!raw.trim()) return fallback;
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? fallback;
  } catch {
    return fallback;
  }
}

export default function OrgInvitePage() {
  const router = useRouter();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState<MemberRole>('MEMBER');
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const normalized = inviteEmail.trim().toLowerCase();
    if (!normalized) {
      setInviteError('Please enter an email address.');
      return;
    }

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    const res = await fetch('/api/org/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, role: inviteRole }),
    });

    if (!res.ok) {
      setInviteError(await readErrorMessage(res, 'Could not send invite.'));
      setInviteLoading(false);
      return;
    }

    setInviteSuccess(`Invite sent to ${normalized}.`);
    setInviteEmail('');
    setInviteLoading(false);
  }

  async function handleCreateMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const normalizedEmail = memberEmail.trim().toLowerCase();
    if (!memberName.trim() || !normalizedEmail || !memberPassword) {
      setMemberError('Name, email and password are required.');
      return;
    }
    if (memberPassword.length < 8) {
      setMemberError('Password must be at least 8 characters.');
      return;
    }

    setMemberLoading(true);
    setMemberError('');
    setMemberSuccess('');

    const res = await fetch('/api/org/members/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: memberName.trim(),
        email: normalizedEmail,
        password: memberPassword,
        role: memberRole,
      }),
    });

    if (!res.ok) {
      setMemberError(await readErrorMessage(res, 'Could not create member account.'));
      setMemberLoading(false);
      return;
    }

    setMemberSuccess(`Member account created for ${normalizedEmail}.`);
    setMemberName('');
    setMemberEmail('');
    setMemberPassword('');
    setMemberLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Employees</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invite employees or create login credentials directly.
          </p>
        </div>
        <Link
          href="/org/members"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to Members
        </Link>
      </div>

      <form
        onSubmit={handleInvite}
        className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Send Invite</h2>
          <p className="text-xs text-gray-500">Invites expire in 7 days</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Work email</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="employee@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Role</label>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as MemberRole)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {inviteError && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{inviteError}</div>
        )}
        {inviteSuccess && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{inviteSuccess}</div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={inviteLoading}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
          >
            {inviteLoading ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>

      <form
        onSubmit={handleCreateMember}
        className="space-y-5 rounded-2xl border border-blue-100 bg-blue-50/30 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Member Login</h2>
          <p className="text-xs text-gray-500">Adds member immediately</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Full name</label>
          <input
            type="text"
            autoComplete="name"
            placeholder="Employee name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Work email</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="employee@company.com"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Temporary password</label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={memberPassword}
            onChange={(e) => setMemberPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Role</label>
          <select
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value as MemberRole)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {memberError && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{memberError}</div>
        )}
        {memberSuccess && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{memberSuccess}</div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/org/members')}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Done
          </button>
          <button
            type="submit"
            disabled={memberLoading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {memberLoading ? 'Creating…' : 'Create Member Login'}
          </button>
        </div>
      </form>
    </div>
  );
}
