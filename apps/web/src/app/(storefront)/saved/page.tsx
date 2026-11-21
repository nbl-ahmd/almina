import { SavedProducts } from '../../../components/saved-products';
import { getWebEnvironment } from '../../../lib/server/env';
export const metadata={title:'Saved products',robots:{index:false,follow:false}};
export default function SavedPage(){return <SavedProducts cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />;}
