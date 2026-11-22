'use client';
import { AlertDialog } from 'radix-ui';
import { useCallback, useRef, useState } from 'react';
import { buttonVariants } from './ui';

type Request = { message: string; action: string; danger: boolean };
export type ConfirmOptions = { action?: string; danger?: boolean };

/** One confirmation surface for every risky admin action. Replaces window.confirm so the
 *  prompt carries the admin tokens, names its action, and starts focus on Cancel. */
export function useConfirm() {
  const [request, setRequest] = useState<Request | null>(null);
  const pending = useRef<((answer: boolean) => void) | null>(null);
  const settle = useCallback((answer: boolean) => {
    pending.current?.(answer);
    pending.current = null;
    setRequest(null);
  }, []);
  const ask = useCallback((message: string, options: ConfirmOptions = {}) => new Promise<boolean>(resolve => {
    pending.current?.(false);
    pending.current = resolve;
    setRequest({ message, action: options.action ?? 'Continue', danger: options.danger ?? false });
  }), []);
  // The portal mounts inside .admin-app so its colours, radii and easing resolve.
  const container = request && typeof document !== 'undefined' ? document.querySelector<HTMLElement>('.admin-app') : null;
  const dialog = (
    <AlertDialog.Root open={request !== null} onOpenChange={open => { if (!open) settle(false); }}>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Overlay className="fixed inset-0 z-[90] bg-ink/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 text-ink border border-line shadow-pop max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none">
          <AlertDialog.Title className="m-0 mb-2 text-lg font-semibold">{request?.action ?? 'Confirm'}?</AlertDialog.Title>
          <AlertDialog.Description className="m-0 mb-6 text-sm leading-6 text-ink-2">{request?.message}</AlertDialog.Description>
          <div className="flex justify-end gap-2 max-sm:flex-col-reverse">
            <AlertDialog.Cancel asChild><button type="button" className={buttonVariants({ variant: 'outline' })}>Cancel</button></AlertDialog.Cancel>
            <AlertDialog.Action asChild><button type="button" className={buttonVariants({ variant: request?.danger ? 'danger' : 'dark' })} onClick={() => settle(true)}>{request?.action ?? 'Continue'}</button></AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
  return { ask, dialog };
}
