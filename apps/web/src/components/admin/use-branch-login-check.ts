'use client';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { branchLoginAvailabilitySchema, branchUsernameSchema, type BranchLoginAvailability } from '@almina/contracts';
import { adminRequest } from './controls';

export function useBranchLoginCheck(username: string, automatic: boolean, setUsername: Dispatch<SetStateAction<string>>) {
  const normalized = username.trim();
  const valid = branchUsernameSchema.safeParse(normalized).success;
  const [result, setResult] = useState<(BranchLoginAvailability & { failed?: boolean }) | null>(null);
  const [revision, setRevision] = useState(0);
  const [generated, setGenerated] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => {
    if (!valid) return;
    let stopped = false;
    const timer = setTimeout(() => {
      void adminRequest('auth/branch-login-availability?' + new URLSearchParams({ username: normalized })).then(raw => {
        if (stopped) return;
        const value = branchLoginAvailabilitySchema.parse(raw);
        if (value.username !== normalized) throw new Error('Unexpected login check');
        setResult(value);
        if (automatic && !value.available && value.suggestion) {
          setGenerated({ from: normalized, to: value.suggestion });
          setUsername(value.suggestion);
        }
      }).catch(() => {
        if (!stopped) setResult({ username: normalized, available: false, suggestion: null, failed: true });
      });
    }, 400);
    return () => { stopped = true; clearTimeout(timer); };
  }, [normalized, valid, automatic, setUsername, revision]);
  const current = result?.username === normalized ? result : null;
  const checking = valid && !current;
  return {
    checking,
    taken: Boolean(current && !current.available && !current.failed),
    suggestion: current?.suggestion ?? null,
    notice: generated?.to === normalized ? `${generated.from} is reserved. This branch will use ${generated.to}.` : null,
    status: !normalized ? 'Used by this store to sign in.' : !valid ? 'Use letters, numbers, dots, underscores or hyphens.'
      : checking ? 'Checking login availability…' : current?.failed ? 'Could not check availability. The server will verify this login when you submit.'
        : current?.available ? 'Available for this store.' : 'Reserved by an existing account. Its access and history will be preserved.',
    refresh: () => { setResult(null); setRevision(value => value + 1); },
  };
}
