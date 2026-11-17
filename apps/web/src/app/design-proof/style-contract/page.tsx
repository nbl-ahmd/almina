import { requireProof } from '../../../components/design-proof/shared';
import { StyleContract } from '../../../components/design-proof/style-contract';
import { getLocale } from '../../../lib/server/i18n';
export default async function Page() {
 requireProof();
 return <StyleContract lang={await getLocale()} />;
}
