'use client';
import { useId, useRef, type ReactNode } from 'react';
export function SectionTabs({ label, tabs, value, onChange, id: providedId }: { label: string; tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void; id?: string }) {
  const generatedId = useId(); const id = providedId ?? generatedId; const list = useRef<HTMLDivElement>(null);
  return <div ref={list} role="tablist" aria-label={label} className="admin-section-tabs" onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const index = tabs.findIndex(tab => tab.id === value); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next]!.id); list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }}>{tabs.map(tab => <button type="button" role="tab" id={`${id}-tab-${encodeURIComponent(tab.id)}`} aria-controls={value === tab.id ? `${id}-panel-${encodeURIComponent(tab.id)}` : undefined} aria-selected={value === tab.id} tabIndex={value === tab.id ? 0 : -1} key={tab.id} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div>;
}
export function SectionPanel({ id, name, active, children }: { id: string; name: string; active: boolean; children: ReactNode }) {
  return <div role="tabpanel" id={`${id}-panel-${encodeURIComponent(name)}`} aria-labelledby={`${id}-tab-${encodeURIComponent(name)}`} hidden={!active} tabIndex={0}>{children}</div>;
}
