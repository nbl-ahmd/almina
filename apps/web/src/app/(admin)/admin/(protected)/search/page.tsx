import { requireIdentity } from '../../../../../lib/server/admin/gateway';
import { SearchManager } from '../../../../../components/admin/search-manager';
export default async function SearchPage(){await requireIdentity(true);return <SearchManager/>;}
