'use client';
import type { ReactNode } from 'react';
import { Tooltip } from 'radix-ui';
import { Switch } from './shadcn/switch';
import { adminPortal, cn } from './cn';

/** Radix Switch as a settings row: label and hint on the left, the control on the right. */
export function SwitchRow({ checked, onCheckedChange, title, hint, disabled, ariaLabel, className }: {
  checked: boolean; onCheckedChange: (value: boolean) => void; title: ReactNode; hint?: ReactNode;
  disabled?: boolean | undefined; ariaLabel?: string; className?: string;
}) {
  return (
    <label className={cn('flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-line px-3 py-2.5 text-left has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60', className)}>
      <span className="grid gap-0.5 text-[13px]">
        <strong className="font-medium text-ink">{title}</strong>
        {hint ? <span className="text-xs text-mute">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={ariaLabel} />
    </label>
  );
}

/** Tooltip for icon-only controls. A single provider lives in the shell. */
export function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal container={adminPortal()}>
        <Tooltip.Content side="bottom" sideOffset={8} className="z-[95] rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white border border-line shadow-pop">{label}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
export const TipProvider = Tooltip.Provider;
