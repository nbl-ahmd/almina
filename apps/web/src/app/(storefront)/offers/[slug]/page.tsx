import { GrowthLanding, growthMetadata } from '../../../../components/growth-landing';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return growthMetadata('campaign',(await params).slug);}
export default async function Page({params}:Props){return <GrowthLanding kind="campaign" slug={(await params).slug} />;}
