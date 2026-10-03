# Synthetic fixtures

`bootstrap-5.3.0-alpha1.min.css` is the MIT-licensed Bootstrap asset already referenced by the legacy HTML. Its upstream URL is `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css`. The upstream copyright/license notice is retained in the file. Browser tests serve these exact bytes and verify the existing SHA-384 SRI digest, so isolated tests do not need the public CDN and do not substitute a different Bootstrap release. Update this file only when the legacy HTML's pinned asset changes.

Customer, product, account and order records in tests are synthetic. Database fixtures create new loopback replica sets and UUID-named databases. No production data or credentials are copied.
