# CK Client JS - File Organization Plan for Next Release

## Current Git Status

**Currently Tracked (7 files):**
- `.github/workflows/release.yml` ✅ Keep
- `LICENSE` ✅ Keep
- `README.md` ✅ Keep
- `index.d.ts` ✅ Keep (TypeScript definitions)
- `index.js` ✅ Keep (main library)
- `package.json` ✅ Keep
- `package-lock.json` ✅ Keep

**Untracked Files (need to organize):**

### Documentation Files (13 files) → Move to `/docs/`
```
ADMIN-API-IMPLEMENTATION-SUMMARY.md
ADMIN-API-SPEC.md
CLIENT-BOT-INSTRUCTIONS.md
COMPREHENSIVE-QUERY-STATUS.md
EDGE-IMPLEMENTATION-SUMMARY.md
EDGE-PROTOCOL-UPGRADE.md
EDGE-ROUTING-STATUS.md
FABRIC-DEMO-ANALYSIS.md
FABRIC-ROUTING-STATUS.md
GRAPH-QUERY-PROTOCOL.md
PLAYWRIGHT-IMPLEMENTATION-SUMMARY.md
PLAYWRIGHT-TEST-ROADMAP.md
QUERY-CLI-WSS-IMPLEMENTATION.md
```

### Example Files → Move to `/examples/`
```
fabric-demo.html (currently in root - move to examples/)
examples/chat.html ✅ Already in examples/
examples/demo.html ✅ Already in examples/
```

### CLI Tool
```
cli.js ✅ Keep in root (but maybe should be optional/excluded from npm?)
```

### Test Files (root level) → Move to `/test/` or Keep for Development
```
test-admin-api.js
test-all-actions.js
test-client-methods.js
test-edge-client.js
test-explorer-features.js
test-fabric-roundtrip.js
test-query-all.js
test-storage-pagination.js
```

### Schema Files ✅ Already Organized
```
schemas/envelope.payload.v1.3.18.schema.json ✅ Keep in schemas/
```

### Test Directory ✅ Keep for Development
```
test/ (contains 14 files - playwright tests)
test-results/ (test output - should be ignored)
```

### Other Files
```
v1.3.13.js (old version - purpose unclear, investigate)
playwright.config.js (test config - should be ignored or tracked)
node_modules/ (already ignored by git default)
```

## Proposed Actions

### 1. Create `/docs/` Directory Structure
```
docs/
├── implementation/
│   ├── admin-api-implementation-summary.md
│   ├── edge-implementation-summary.md
│   ├── playwright-implementation-summary.md
│   └── query-cli-wss-implementation.md
├── specifications/
│   ├── admin-api-spec.md
│   ├── edge-protocol-upgrade.md
│   └── graph-query-protocol.md
├── status/
│   ├── comprehensive-query-status.md
│   ├── edge-routing-status.md
│   └── fabric-routing-status.md
├── guides/
│   ├── client-bot-instructions.md
│   └── playwright-test-roadmap.md
└── analysis/
    └── fabric-demo-analysis.md
```

### 2. Move Examples
```bash
# Move fabric-demo.html to examples/
mv fabric-demo.html examples/
```

### 3. Organize Test Files
**Option A:** Move to `/test/manual/`
```bash
mkdir -p test/manual
mv test-*.js test/manual/
```

**Option B:** Keep in root but exclude from npm package (via .npmignore)

### 4. Update `.gitignore`
```gitignore
# Dependencies
node_modules/

# Test Results
test-results/
playwright-report/
*.log

# Build Output
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Temporary Files
*.tmp
*.temp

# Environment
.env
.env.local

# Coverage
coverage/
.nyc_output/
```

### 5. Create `.npmignore` (what NOT to publish to npm)
```npmignore
# Documentation (keep in repo, exclude from npm)
docs/

# Examples (keep in repo, exclude from npm)
examples/

# Tests (exclude from npm)
test/
test-*.js
*.spec.js
playwright.config.js

# Development Files
.github/
.git/
.gitignore
FILE-ORGANIZATION-PLAN.md

# Old Versions
v1.3.13.js

# Build/Test Artifacts
test-results/
node_modules/
```

## What Goes in NPM Package (Published)

**Essential Files Only:**
```
✅ index.js           - Main library
✅ index.d.ts         - TypeScript definitions
✅ cli.js             - CLI tool (optional)
✅ package.json       - Package manifest
✅ LICENSE            - MIT license
✅ README.md          - Usage documentation
✅ schemas/           - Schema definitions (if needed at runtime)
```

**Total package size: ~100KB** (very clean!)

## What Stays in Git Repository (Development)

```
✅ All essential files (above)
✅ docs/              - Full documentation
✅ examples/          - Example HTML files
✅ test/              - Playwright tests
✅ test-*.js          - Manual test scripts
✅ .github/workflows/ - CI/CD workflows
✅ .gitignore         - Git ignore rules
✅ .npmignore         - NPM ignore rules
✅ playwright.config.js - Test configuration
```

## Decision Points

### 1. cli.js - Should it be published?
- **Yes:** If users need CLI tool for debugging
- **No:** If CLI is only for internal development
- **Recommendation:** Publish it - it's useful for users

### 2. v1.3.13.js - What is this?
- **Investigate:** Check if it's needed for backwards compatibility
- **If not needed:** Delete it
- **If needed:** Document why and keep it

### 3. schemas/ - Runtime or development?
- **If runtime:** Keep in npm package
- **If development only:** Exclude from npm
- **Recommendation:** Keep in npm (seems runtime)

## Next Steps

1. ✅ First confirm file list with .gitignore update
2. Create docs/ directory structure
3. Move documentation files
4. Move fabric-demo.html to examples/
5. Decide on test files location
6. Create .npmignore
7. Update package.json (files field)
8. Test npm pack to verify package contents
9. Commit all changes
10. Bump version (v1.3.19 or v1.4.0?)
11. Publish to npm

## Questions to Answer

1. **Is cli.js essential for end users?**
   - Used for development/debugging?
   - Should it be a separate package?

2. **What is v1.3.13.js?**
   - Backwards compatibility?
   - Can it be deleted?

3. **Should examples/ be published to npm?**
   - Useful for users to see working examples?
   - Or keep only in GitHub repo?

4. **Should docs/ be published to npm?**
   - npm package is minimal (code only)?
   - Or include full docs?
   - **Recommendation:** Keep docs in GitHub, not npm

5. **Test files - keep in root or move to test/?**
   - More organized in test/manual/?
   - Or keep for easy access?
