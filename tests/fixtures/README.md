# Synthetic fixtures

Browser tests run compiled Next.js with self-hosted styling and fonts. They block external scripts/providers; representative image responses are synthetic. The retired Bootstrap/CDN fixture is removed along with its client consumer. Historical baseline reproduction requires the recorded source commit.

Customer, product, account and order records in tests are synthetic. Database fixtures create new loopback replica sets and UUID-named databases. No production data or credentials are copied.
