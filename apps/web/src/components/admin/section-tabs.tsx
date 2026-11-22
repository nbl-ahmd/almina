import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from './shadcn/tabs';

/** Tab strip (Radix Tabs: roving focus, arrow keys, Home/End). Panels stay with the caller so tabs keep unsaved form state mounted. */
export function SectionTabs({ label, tabs, value, onChange }: { label: string; tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void; id?: string }) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList aria-label={label}>
        {tabs.map(tab => <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}
export function SectionPanel({ id, name, active, children }: { id: string; name: string; active: boolean; children: ReactNode }) {
  return <div role="tabpanel" id={`${id}-panel-${encodeURIComponent(name)}`} hidden={!active} tabIndex={0}>{children}</div>;
}
