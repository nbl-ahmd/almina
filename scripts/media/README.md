# Media operations

Read-only inventories and reviewed migration manifests/checksums preserve scalar and array legacy references. Maintained signed Cloudinary upload/replacement and archive workflows are documented in [the media runbook](../../docs/migration/MEDIA_RETENTION_2026-10-04.md).

No route automatically deletes surviving images. Inventory current references, `media_history`, `media_uploads`, retained orders and independent provider exports before any cleanup proposal. Failed/retried uploads can leave retained unreferenced assets; review them rather than deleting automatically. Provider account acceptance and production rendering remain deployment gates.
