import { parseArgs } from 'node:util';
import { MongoClient } from 'mongodb';
import { imagePublicationActionSchema } from '@almina/contracts';
import { runImagePublicationLocally } from '../../apps/api/src/modules/media/image-review-publication.js';

async function main() {
  let args;
  try {
    args = parseArgs({ options: { job: { type: 'string' }, apply: { type: 'boolean' } } }).values;
  } catch {
    console.error('Usage: npm run media:review:publish -- --job RUN_ID --apply');
    return 1;
  }
  const job = imagePublicationActionSchema.safeParse({ jobId: args.job });
  if (!args.apply || !job.success) {
    console.error('Provide the administrator-queued run ID with --job and acknowledge catalogue writes with --apply.');
    return 1;
  }

  const uri = process.env.IMAGE_REVIEW_MONGODB_URI;
  const database = process.env.IMAGE_REVIEW_MONGODB_DATABASE;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!uri?.startsWith('mongodb+srv://') || !database || !/^[\w-]{1,63}$/.test(database) || !cloudName || !/^[\w-]{1,100}$/.test(cloudName)) {
    console.error('Set the Atlas SRV connection, target database and Cloudinary cloud name in the local runner environment.');
    return 1;
  }

  const controller = new AbortController();
  const stop = () => controller.abort();
  const client = new MongoClient(uri, {
    appName: 'almina-image-review-local', tls: true, tlsInsecure: false,
    serverSelectionTimeoutMS: 5000, socketTimeoutMS: 15000, maxPoolSize: 5,
  });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    await client.connect();
    const status = await runImagePublicationLocally(client.db(database), job.data.jobId, cloudName, controller.signal);
    console.log(`Image publication: ${status}. Check saved progress in admin.`);
    return status === 'complete' ? 0 : 1;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await client.close();
  }
}

try {
  process.exitCode = await main();
} catch {
  console.error('Image publication failed. Check the local Atlas connection and saved publication progress.');
  process.exitCode = 1;
}
