import { GrowthLanding, growthMetadata } from '../../../../components/growth-landing';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return growthMetadata('guide',(await params).slug);}
export default async function Page({params}:Props){return <GrowthLanding kind="guide" slug={(await params).slug} />;}
