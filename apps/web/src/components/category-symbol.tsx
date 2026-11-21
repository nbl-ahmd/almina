import { BeakerIcon, FaceSmileIcon, ScissorsIcon, SparklesIcon, ShieldCheckIcon, UserGroupIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

const categoryOrder = ['skincare', 'vitamins', 'babycare', 'oralcare', 'haircare', 'firstaid'];

export function categoryRank(name: string) {
  const index = categoryOrder.findIndex(label => name.toLowerCase().replace(/\s+/g, '').includes(label));
  return index < 0 ? categoryOrder.length : index;
}

const departmentIcons = [SparklesIcon, BeakerIcon, UserGroupIcon, FaceSmileIcon, ScissorsIcon, ShieldCheckIcon];

export function CategorySymbol({ name }: { name: string }) {
  const Symbol = departmentIcons[categoryRank(name)] ?? Squares2X2Icon;
  return <Symbol aria-hidden="true" />;
}
