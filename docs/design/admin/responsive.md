# Admin responsive rules

| Width | Layout |
|---|---|
| 1280+ | Floating sidebar 260px, topbar, content in cards. Four-up metrics, two-column forms. |
| 1024–1279 | Sidebar 220px. Metrics two-up. Side panels move below the main form card. |
| 768–1023 | Sidebar becomes the sheet. Tables scroll inside their region with the first column pinned. |
| 360–767 | Bottom tab bar plus More sheet. Tables become labelled stacked cards. Primary action sits in the page header as a full-width button. |

Rules: no horizontal page scroll at 360px; 44px touch targets; sticky save bars respect the safe area and the bottom tab bar; charts keep 16:9 down to 360px and move the legend below; dialogs become bottom sheets below 600px. Verify at 360, 390, 768 and 1440 with a real browser before sign-off.
