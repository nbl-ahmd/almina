import { GrowthLanding, growthMetadata } from '../../../../components/growth-landing';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return growthMetadata('category',(await params).slug);}
export default async function Page({params}:Props){return <GrowthLanding kind="category" slug={(await params).slug} />;}
