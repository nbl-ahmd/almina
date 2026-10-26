import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { imageIdentitySchema, imageReviewPackageSchema, type ImageReviewSource } from '@almina/contracts';

// Read local evidence only. No model, service credentials or production connection.
const args = process.argv.slice(2);
const argument = (name: string) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; };
if (args.some((value, index) => index % 2 === 0 && !['--pipeline', '--output'].includes(value))) throw new Error('Use --pipeline DIR [--output DIR]');
const pipeline = fs.realpathSync(path.resolve(argument('--pipeline') ?? '../almina-image-pipeline'));
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.resolve(argument('--output') ?? path.join(root, 'outputs/image-review-module-2026-10-26'));
const read = (file: string): unknown => JSON.parse(fs.readFileSync(file, 'utf8'));
const digest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const obj = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const str = (value: unknown) => typeof value === 'string' ? value : '';
const catalogueChecksum = digest(fs.readFileSync(path.join(pipeline, 'input/products.json')));
if (obj(read(path.join(pipeline, 'input/manifest.json'))).sha256 !== catalogueChecksum) throw new Error('Immutable catalogue checksum mismatch');
const latest = obj(read(path.join(pipeline, 'reports/approval-review-2026-10-26/LATEST.json')));
const reportPath = fs.realpathSync(path.join(str(latest.directory), 'all-current-decisions.json'));
if (!reportPath.startsWith(pipeline + path.sep)) throw new Error('Report must be inside the pipeline');
const rows = read(reportPath); if (!Array.isArray(rows)) throw new Error('Expected saved review rows');
const dbs = new Map<string, DatabaseSync>(), barriers = new Map<string, { assetId: string; productId: string; reason: string }>();
const sources: ImageReviewSource[] = [];
try {
  for (const raw of rows) {
    const row = obj(raw), run = str(row.run), worker = str(row.worker);
    if (!/^parallel-\d{4}-\d{2}-\d{2}(?:-round-\d+)?$/.test(run) || !['codex', 'opencode'].includes(worker)) throw new Error('Invalid worker provenance');
    const key = run + '/' + worker;
    if (!dbs.has(key)) {
      const config = obj(read(path.join(pipeline, 'state', run, worker, 'worker.json')));
      const file = fs.realpathSync(str(config.dbPath)); if (!file.startsWith(pipeline + '/state/')) throw new Error('Worker database outside pipeline');
      const db = new DatabaseSync(file, { readOnly: true }); dbs.set(key, db);
      for (const event of db.prepare("SELECT event_json FROM review_events WHERE decision='withdrawn' ORDER BY seq").all()) {
        const value = obj(JSON.parse(str(event.event_json)));
        const barrier = { assetId: str(value.assetId), productId: str(value.productId), reason: str(value.note) };
        barriers.set(barrier.assetId + ':' + barrier.productId, barrier);
      }
    }
    const db = dbs.get(key)!;
    const current = db.prepare('SELECT event_id FROM review_events WHERE asset_key=? ORDER BY seq DESC LIMIT 1').get(str(row.assetId));
    if (current?.event_id !== row.eventId) throw new Error('Review report is stale. Run the pipeline approval-review-export.mjs first.');
    const asset = obj(row.asset), original = fs.realpathSync(str(asset.download_path));
    if (!original.startsWith(pipeline + '/downloads/')) throw new Error('Original outside pipeline downloads');
    const sha = digest(fs.readFileSync(original)); if (sha !== asset.download_sha256) throw new Error('Source file hash changed');
    const e = obj(row.extraction), shortlist = db.prepare('SELECT run_id,shortlist_json FROM match_results WHERE cache_id=? ORDER BY rowid DESC LIMIT 1').get(str(row.extractionCacheId));
    const cache = db.prepare('SELECT source_sha256,asset_key FROM extraction_cache WHERE cache_id=?').get(str(row.extractionCacheId));
    if (!cache || cache.source_sha256 !== sha || cache.asset_key !== row.assetId) throw new Error('Extraction does not belong to these verified original bytes');
    const parsed: unknown = shortlist ? JSON.parse(str(shortlist.shortlist_json)) : [];
    const candidates = Array.isArray(parsed) ? parsed : Array.isArray(obj(parsed).candidates) ? obj(parsed).candidates as unknown[] : [];
    const candidateProductIds = [...new Set([str(row.productId), ...candidates.map(c => str(obj(c).productId))].filter(Boolean))].slice(0, 8);
    const flags = obj(e.flags);
    sources.push({
      assetId: str(row.assetId), sourceSha256: sha, publicId: str(asset.public_id), imageUrl: str(asset.secure_url),
      identity: imageIdentitySchema.parse({ name: str(e.visibleName), brand: str(e.brand), line: str(e.productLine), strength: str(e.strength), form: str(e.form),
        size: str(e.netContent) || str(e.size), quantity: str(e.count) || str(e.quantity), multipack: str(e.multipack), flavour: str(e.flavour),
        shadeModel: str(e.shadeModel), variantSize: str(e.variantSize), ageStage: str(e.ageStage), barcode: str(e.barcode), gtin: str(e.gtin) }),
      labelText: Array.isArray(e.labelText) ? e.labelText.filter((v): v is string => typeof v === 'string').slice(0, 40).map(s => s.slice(0, 1000)) : [],
      flags: (['placeholder', 'promotion', 'watermark', 'multipleViews', 'blurry', 'notProduct'] as const).filter(flag => flags[flag] === true),
      candidateProductIds, priorDecision: row.decision as ImageReviewSource['priorDecision'],
      sourceNote: [str(row.note), str(e.notes)].filter(Boolean).join('\n').slice(0, 3000), extractionReference: [str(row.extractionCacheId), str(row.eventId), str(shortlist?.run_id)].filter(Boolean).join(':'),
    });
  }
} finally { for (const db of dbs.values()) db.close(); }
sources.sort((a, b) => a.assetId.localeCompare(b.assetId));
const data = imageReviewPackageSchema.parse({ schemaVersion: 'image-review-package-v1', sourceRun: 'two-splits-2026-10-26', catalogueChecksum,
  withdrawals: [...barriers.values()].sort((a, b) => (a.assetId + a.productId).localeCompare(b.assetId + b.productId)), items: sources });
const json = JSON.stringify(data, null, 2) + '\n', revision = digest(json), dir = path.join(output, revision);
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'image-review-package.json');
if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') !== json) throw new Error('Immutable output collision');
fs.writeFileSync(file, json);
const result = { file, sha256: revision, images: sources.length, withdrawalBarriers: barriers.size, sourceCatalogueChecksum: catalogueChecksum, humanApprovalRequired: true, productionWrites: false };
fs.writeFileSync(path.join(output, 'LATEST.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
