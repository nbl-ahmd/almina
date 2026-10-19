import { requireIdentity } from '../../../../../lib/server/admin/gateway';
import { GrowthManager } from '../../../../../components/admin/growth-manager';
export default async function GrowthPage(){await requireIdentity(true);return <GrowthManager />;}
