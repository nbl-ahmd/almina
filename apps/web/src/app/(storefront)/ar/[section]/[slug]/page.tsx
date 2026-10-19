import { notFound } from 'next/navigation';
import { GrowthLanding, growthMetadata } from '../../../../../components/growth-landing';
import type { GrowthPage } from '@almina/contracts';
const kinds:Record<string,GrowthPage['kind']>={brands:'brand',shop:'category','health-guides':'guide',offers:'campaign',routines:'collection'};
type Props={params:Promise<{section:string;slug:string}>};
export async function generateMetadata({params}:Props){const p=await params,kind=kinds[p.section];if(!kind)notFound();return growthMetadata(kind,p.slug,'ar');}
export default async function Page({params}:Props){const p=await params,kind=kinds[p.section];if(!kind)notFound();return <GrowthLanding kind={kind} slug={p.slug} locale="ar" />;}
