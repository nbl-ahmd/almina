import { AccountLanguage } from '../../../components/account-locale';
import { getLocale } from '../../../lib/server/i18n';
import { headers } from 'next/headers';
import { WholesalePortal } from '../../../components/wholesale/portal';
export default async function WholesalePage({searchParams}:{searchParams:Promise<{invite?:string}>}){const params=await searchParams;const invite=typeof params.invite==='string'&&/^[A-Za-z0-9_-]{43}$/.test(params.invite)?params.invite:undefined;return <AccountLanguage locale={await getLocale()}><WholesalePortal nonce={(await headers()).get('x-nonce')??undefined} invite={invite} /></AccountLanguage>;}
