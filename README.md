# Task-App
v14 repair
- Fixed a JavaScript template-literal syntax error in src/dashboard.js that prevented the module graph from loading and caused a blank screen.
- Removed duplicate named imports in src/app.js.
- Bumped service-worker cache to put-v14 so the broken v13 cache is not reused.
