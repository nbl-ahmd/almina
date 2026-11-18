# P3-02 desktop and tablet storefront chrome

The desktop header gives search the flexible middle column and keeps delivery area, account and cart visible. At 768–1100px, these utilities share the first row and search spans the second. Department links wrap when needed. At normal text size, both languages fit in one department row at 768px. The category popover stays inside the storefront scope and has a scroll limit based on available viewport height. Existing labels, routes and language controls remain in use.

The footer uses the accepted white surface and compact spacing. On desktop, the four link groups are expanded. On phones, shoppers can open the same groups using native disclosures. Contact details, policy destinations, local links, account links, language switching and configured preference controls remain available. Shared search colours, focus and shape now have one owner in `storefront-chrome.css`. Mobile search geometry and task navigation remain in `storefront-mobile-shell.css`. The root fallback and separate admin and wholesale surfaces retain their own consumers.

The isolated local build, typecheck, lint and 20 browser checks passed. These include live resize across 768/1024/1100/1101/1440px, bilingual utility visibility, keyboard category opening and focus return, current department links, footer disclosure transitions and destination preservation. Earlier mobile, checkout quote, admin and root fallback cases ran in the same suite. Live Chromium preview captures show both scripts at desktop, tablet and phone sizes. Native-device and browser-specific checks remain part of the staged verification.

[Preview](http://127.0.0.1:4880/) · [Bilingual captures](p3-02-chrome/)

P3-03 covers the home campaign, category and product sections shown below the shell in the captures.
