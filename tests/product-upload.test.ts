import assert from 'node:assert/strict';
import { test } from 'node:test';
import type sharpFactory from 'sharp';
import { createRequire } from 'node:module';
import { accountText } from '../apps/web/src/lib/account/copy';
import { cartCountText, itemCountText } from '../apps/web/src/lib/i18n';
const require = createRequire(import.meta.url);
const sharp = require('sharp') as typeof sharpFactory;
const { prepareProductImage } = require('../backend/security/product-image.cjs') as { prepareProductImage(buffer: Buffer): Promise<Buffer> };

test('product normalization preserves tall packs and never enlarges small originals', async () => {
  for (const [width,height,expectedWidth,expectedHeight] of [[600,1200,600,1200],[3000,1500,2000,1000],[80,120,80,120]]) {
    const source = await sharp({create:{width:width!,height:height!,channels:3,background:'#eee'}}).png().toBuffer();
    const image = await prepareProductImage(source), metadata = await sharp(image).metadata();
    assert.equal(metadata.format,'webp'); assert.equal(metadata.width,expectedWidth); assert.equal(metadata.height,expectedHeight);
  }
});
test('server normalization applies EXIF orientation and rejects non-images', async () => {
  const source = await sharp({create:{width:120,height:80,channels:3,background:'#eee'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const metadata = await sharp(await prepareProductImage(source)).metadata();
  assert.equal(metadata.width,80);assert.equal(metadata.height,120);assert.equal(metadata.orientation,undefined);
  await assert.rejects(prepareProductImage(Buffer.from('<script>not an image</script>')));
});
test('account copy translates interface messages while retaining English and user data', () => {
  assert.equal(accountText('en','Your Al Mina account'),'Your Al Mina account');
  assert.equal(accountText('ar','Your Al Mina account'),'حسابك في الميناء');
  assert.equal(accountText('ar','Resend code in 25s'),'إعادة إرسال الرمز بعد 25 ثانية');
  assert.equal(accountText('ar','Quantity for Private Brand 500 ml'),'الكمية لـ Private Brand 500 ml');
  assert.equal(accountText('ar','salon@example.invalid'),'salon@example.invalid');
  assert.equal(cartCountText('en',2),'Your cart, 2 items');
  assert.equal(itemCountText('ar',1),'عنصر');assert.equal(itemCountText('ar',2),'عنصران');
  assert.match(itemCountText('ar',5),/عناصر/);assert.match(itemCountText('ar',15),/عنصراً/);
});

test('legacy mapping accepts only versioned originals in the configured pharmacy cloud', async()=>{
 const {mappedTarget}=await import('../apps/api/src/modules/media/legacy-migration');
 assert.equal(mappedTarget('https://res.cloudinary.com/pharmacy/image/upload/v123/almina/legacy/products/a.webp','pharmacy'),'https://res.cloudinary.com/pharmacy/image/upload/v123/almina/legacy/products/a.webp');
 for(const url of ['https://res.cloudinary.com/other/image/upload/v123/a.webp','https://res.cloudinary.com/pharmacy/image/upload/w_100/a.webp','https://res.cloudinary.com/pharmacy/image/upload/v1/a.webp?url=https://evil.invalid'])assert.equal(mappedTarget(url,'pharmacy'),null);
});

test('admin cost editor can identify v2 orders without exposing private auth fields',async()=>{
 const {projectAdminResponse}=await import('../apps/web/src/lib/admin/policy');
 assert.deepEqual(projectAdminResponse('orders/aaaaaaaaaaaaaaaaaaaaaaaa',{_id:'aaaaaaaaaaaaaaaaaaaaaaaa',schemaVersion:2,password:'hidden',token:'hidden'}),{_id:'aaaaaaaaaaaaaaaaaaaaaaaa',schemaVersion:2});
});
