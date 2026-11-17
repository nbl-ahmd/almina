import { requireProof } from "../../../components/design-proof/shared";
import { CartContinuation } from "../../../components/design-proof/cart";
import { getLocale } from "../../../lib/server/i18n";
export default async function Cart() {
  requireProof();
  return <CartContinuation lang={await getLocale()} />;
}
