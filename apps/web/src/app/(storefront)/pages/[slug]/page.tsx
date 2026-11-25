import { GrowthLanding, growthMetadata } from '../../../../components/growth-landing';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return growthMetadata('page',(await params).slug);}
export default async function Page({params}:Props){return <GrowthLanding kind="page" slug={(await params).slug} />;}
