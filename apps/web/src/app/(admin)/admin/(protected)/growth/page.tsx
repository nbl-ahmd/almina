import localFont from 'next/font/local';
import { getBanners } from '../../../../../lib/server/catalog';
import { getWebEnvironment } from '../../../../../lib/server/env';
import { requireIdentity } from '../../../../../lib/server/admin/gateway';
import { GrowthManager } from '../../../../../components/admin/growth-manager';
const previewFont=localFont({src:'../../../../fonts/Outfit-Latin.woff2',weight:'400 700',display:'swap'});
export default async function GrowthPage(){await requireIdentity(true);const artwork=await getBanners().catch(()=>[]);return <GrowthManager previewFontClass={previewFont.className} artwork={artwork} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />;}
