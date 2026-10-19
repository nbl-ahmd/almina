import { headers } from 'next/headers';
import { CustomerAccount } from '../../../components/customer-account';
export const metadata={title:'Your account',robots:{index:false,follow:false}};
export default async function AccountPage(){const nonce=(await headers()).get('x-nonce')??undefined;return <CustomerAccount nonce={nonce} />;}
