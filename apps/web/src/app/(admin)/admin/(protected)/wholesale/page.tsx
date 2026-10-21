import { requireIdentity } from '../../../../../lib/server/admin/gateway';
import { WholesaleManager } from '../../../../../components/admin/wholesale-manager';
export default async function Page(){await requireIdentity(true);return <WholesaleManager />;}
