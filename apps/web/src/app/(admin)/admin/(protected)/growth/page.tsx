import { getBanners } from '../../../../../lib/server/catalog';
import { getWebEnvironment } from '../../../../../lib/server/env';
import { requireIdentity } from '../../../../../lib/server/admin/gateway';
import { GrowthManager } from '../../../../../components/admin/growth-manager';
export default async function GrowthPage(){await requireIdentity(true);const artwork=await getBanners().catch(()=>[]);return <GrowthManager artwork={artwork} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />;}
