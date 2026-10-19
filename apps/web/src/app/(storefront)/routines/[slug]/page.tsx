import { GrowthLanding, growthMetadata } from '../../../../components/growth-landing';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return growthMetadata('collection',(await params).slug);}
export default async function Page({params}:Props){return <GrowthLanding kind="collection" slug={(await params).slug} />;}
