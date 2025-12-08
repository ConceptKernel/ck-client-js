# Changelog

All notable changes to @conceptkernel/ck-client-js will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.21] - 2024-12-08

### 🎉 Major Features

#### New API Methods for Kernel Introspection
- **`listQueue(kernel)`** - Inspect pending work queue for any kernel
  - Returns pending items in `queue/inbox/` directory
  - Shows file names, types, sizes, and payload status
  - Example: `await ck.listQueue('ConceptKernel.LLM.Fabric')`

- **`listEdges(kernel)`** - View incoming/outgoing edge connections
  - Returns BFO predicate relationships between kernels
  - Tracks queue depth for each edge type
  - Shows incoming and outgoing connections
  - Example: `await ck.listEdges('ConceptKernel.LLM.Fabric')`

- **`listProcesses(kernel, options)`** - Track Process URN history
  - Lists recent Process occurrents: `ckp://Process#KernelAction-txId`
  - Returns: URN, transaction ID, duration, exit code, timestamp, storage path
  - Supports pagination with `limit` option
  - Uses new ProcessTracker API with flexible QueryFilters
  - Example: `await ck.listProcesses('System.Wss', { limit: 20 })`

### ✨ Enhancements

- **ProcessTracker Integration** - Now uses official ProcessTracker API instead of manual filesystem inspection
  - Flexible filtering by: kernel, process_type, status, time range
  - Pagination and sorting support
  - BFO-compliant Process objects with temporal regions and participants

- **Improved Error Handling** - Better timeout messages with troubleshooting hints

- **Enhanced Logging** - More verbose client-side logging for debugging

### 📚 Documentation

- **Comprehensive Reorganization** - All documentation moved to `/docs/` structure:
  - `/docs/implementation/` - Implementation summaries
  - `/docs/specifications/` - Protocol specifications
  - `/docs/status/` - Status reports
  - `/docs/guides/` - User guides and roadmaps
  - `/docs/analysis/` - Analysis documents

- **Examples Consolidated** - All example files moved to `/examples/`
  - `examples/chat.html` - Real-time chat interface
  - `examples/demo.html` - Full-featured demo
  - `examples/fabric-demo.html` - Fabric pattern integration

- **Updated README.md** - Added documentation for new API methods

### 🔧 Development

- **Clean Package Structure** - Proper `.npmignore` configuration
  - Published package contains only core files (~100KB)
  - Development files (docs, tests, examples) excluded from npm
  - CI/CD files excluded

- **Comprehensive .gitignore** - Properly ignore:
  - `node_modules/`
  - `test-results/`
  - Build artifacts
  - IDE files
  - OS files (.DS_Store, Thumbs.db)

### 🗑️ Removed

- **v1.3.13.js** - Removed outdated version file (6 versions behind)

### 📦 Package Contents

**Published to NPM (7 core files, ~100KB):**
```
✅ index.js           (49KB) - Main library
✅ index.d.ts         (10KB) - TypeScript definitions
✅ cli.js             (23KB) - CLI tool
✅ schemas/           (1KB)  - Runtime JSON schemas
✅ package.json       (1KB)  - Package manifest
✅ LICENSE            (1KB)  - MIT License
✅ README.md          (10KB) - Usage documentation
```

### 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/@conceptkernel/ck-client-js
- **GitHub Repository**: https://github.com/ConceptKernel/ck-client-js
- **Documentation**: See `/docs/` directory in repository
- **Examples**: See `/examples/` directory in repository

---

## [1.3.18] - 2024-12-05

### Added
- Edge-based messaging using BFO predicates
- Message format with `edge`, `from`, `to`, `payload` fields
- Support for QUERIES, RESPONDS, ANNOUNCES edge types
- Identity-based connections with `ckp://` URNs

### Changed
- Default message edge is now `QUERIES` instead of `INVOKES`
- Updated `emit()` to use edge-based routing

---

## [1.3.17] - 2024-12-03

### Added
- URN query API (`queryUrn`)
- Process query methods (`queryProcesses`)
- Workflow query methods (`queryWorkflows`)
- Improvement process queries (`queryImprovements`)

---

## [1.3.16] - 2024-12-02

### Added
- Kernel introspection API
- Schema discovery methods
- Permission management system

---

## [1.3.15] - 2024-12-01

### Added
- Token persistence across browser reloads
- 7-day token expiry with session management
- Anonymous JWT tokens

---

## [Earlier Versions]

See git history for changes prior to v1.3.15.

---

## Upgrade Guide

### From v1.3.18 to v1.3.21

**New API methods available:**
```javascript
// Queue inspection
const queue = await ck.listQueue('ConceptKernel.LLM.Fabric');
console.log('Pending items:', queue.queue.length);

// Edge connections
const edges = await ck.listEdges('ConceptKernel.LLM.Fabric');
console.log('Incoming:', edges.incoming.length);
console.log('Outgoing:', edges.outgoing.length);

// Process history
const processes = await ck.listProcesses('System.Wss', { limit: 20 });
console.log('Recent processes:', processes.processes.length);
```

**No breaking changes** - fully backwards compatible!

---

## Contributing

Please see [CLIENT-BOT-INSTRUCTIONS.md](docs/guides/CLIENT-BOT-INSTRUCTIONS.md) for development guidelines.

## License

MIT - See [LICENSE](LICENSE) file for details.
