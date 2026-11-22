'use client';
import type { ComponentProps } from 'react';
import { DropdownMenu as Menu } from 'radix-ui';
import { adminPortal, cn } from '../cn';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export function DropdownMenuContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof Menu.Content>) {
  return <Menu.Portal container={adminPortal()}><Menu.Content sideOffset={sideOffset} collisionPadding={12} className={cn('z-50 min-w-48 rounded-2xl bg-surface p-1.5 shadow-pop outline-none', className)} {...props} /></Menu.Portal>;
}
export function DropdownMenuItem({ className, variant, ...props }: ComponentProps<typeof Menu.Item> & { variant?: 'danger' }) {
  return <Menu.Item className={cn('flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-xl px-3 text-[13px] font-medium text-ink outline-none data-[highlighted]:bg-fill data-[disabled]:opacity-50', variant === 'danger' && 'text-bad data-[highlighted]:bg-bad-soft', className)} {...props} />;
}
export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof Menu.CheckboxItem>) {
  return <Menu.CheckboxItem className={cn('flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-xl px-3 text-[13px] text-ink outline-none data-[highlighted]:bg-fill', className)} {...props}><span aria-hidden="true" className="grid size-4 place-items-center rounded border border-line-strong text-[10px] data-[state=checked]:bg-ink">{props.checked ? <span className="text-white">✓</span> : null}</span>{children}</Menu.CheckboxItem>;
}
export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-3 py-1.5 text-xs font-medium text-mute', className)} {...props} />;
}
export const DropdownMenuSeparator = (props: ComponentProps<typeof Menu.Separator>) => <Menu.Separator className="my-1 h-px bg-line" {...props} />;
