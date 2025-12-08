# 🎉 Release v1.3.21 - Kernel Introspection & Repository Organization

## 📦 Package Information

**Version:** 1.3.21
**Release Date:** December 8, 2024
**Package Size:** 24.6 KB (compressed), 106.9 KB (unpacked)
**Total Files:** 8 core files

## 🚀 What's New

### Major Features

#### 1. 📬 Queue Inspection API

Inspect pending work in any kernel's queue:

```javascript
const queue = await ck.listQueue('ConceptKernel.LLM.Fabric');
console.log('Pending items:', queue.queue.length);
// Shows: file names, types, sizes, payload status
```

**Use Cases:**
- Monitor kernel workload
- Debug stuck processes
- Track queue depth
- Identify bottlenecks

#### 2. 🔗 Edge Connection Viewer

View BFO predicate relationships between kernels:

```javascript
const edges = await ck.listEdges('ConceptKernel.LLM.Fabric');
console.log('Incoming edges:', edges.incoming.length);
console.log('Outgoing edges:', edges.outgoing.length);
// Shows: predicates (QUERIES, RESPONDS, ANNOUNCES), queue depths, source/target
```

**Use Cases:**
- Visualize kernel relationships
- Track message flow
- Monitor edge queue depth
- Debug routing issues

#### 3. 🔄 Process History Tracker

Track Process URN execution history:

```javascript
const processes = await ck.listProcesses('System.Wss', { limit: 20 });
processes.processes.forEach(proc => {
  console.log(`${proc.process_urn} - ${proc.duration_ms}ms - Exit: ${proc.exit_code}`);
});
// Shows: URN, txID, duration, exit code, timestamp, storage path
```

**Use Cases:**
- Audit process execution
- Track performance metrics
- Debug failures
- Monitor kernel activity

### Technical Improvements

#### ProcessTracker Integration

Now uses **official ProcessTracker API** instead of manual filesystem inspection:

**Before (Manual):**
```javascript
// Manually reading storage directories ❌
let storage_dir = concepts_dir.join(target_kernel).join("storage");
let processes = fs::read_dir(&storage_dir)
    .flat_map(|entry| { /* parse payload.json manually */ })
```

**After (Public API):**
```javascript
// Using ProcessTracker API with flexible QueryFilters ✅
const tracker = ProcessTracker::get_instance(project_root);
const filters = QueryFilters {
    kernel: Some(target_kernel.to_string()),
    limit: Some(limit),
    order: Some("desc".to_string()),
    sort_field: Some("createdAt".to_string()),
    ..Default::default()
};
const processes = tracker.query_processes(filters)?;
```

**Benefits:**
- Flexible queries (filter by kernel, type, status, time)
- BFO-compliant Process objects
- Temporal regions (start/end/duration)
- Participants and temporal parts
- Results & errors tracking

## 📚 Repository Organization

### New Directory Structure

```
ck-client-js/
├── docs/
│   ├── implementation/     - Implementation summaries
│   ├── specifications/     - Protocol specs
│   ├── status/             - Status reports
│   ├── guides/             - User guides
│   ├── analysis/           - Analysis documents
│   └── archive/            - Historical docs
├── examples/
│   ├── chat.html           - Real-time chat
│   ├── demo.html           - Full demo
│   └── fabric-demo.html    - Fabric patterns
├── test/                   - Playwright tests
├── schemas/                - JSON schemas
└── [core files]            - Library files
```

### Package Contents (NPM)

**What Users Get** (8 files, 106.9 KB):

```
✅ index.js           (49.7 KB) - Main library
✅ index.d.ts         (10.2 KB) - TypeScript definitions
✅ cli.js             (23.5 KB) - CLI tool (ck-client)
✅ schemas/           (5.3 KB)  - Runtime JSON schemas
✅ package.json       (1.6 KB)  - Package manifest
✅ LICENSE            (1.2 KB)  - MIT License
✅ README.md          (10.3 KB) - Usage documentation
✅ CHANGELOG.md       (5.3 KB)  - Version history
```

**What Stays in GitHub** (for developers):
- 📄 `/docs/` - Complete documentation (13 files)
- 🎨 `/examples/` - HTML examples (3 files)
- 🧪 `/test/` - Playwright tests (14 files)
- 🔧 Development files (configs, test scripts)

### Clean Package Policy

**Excluded from NPM:**
- ❌ Documentation (available on GitHub)
- ❌ Examples (available on GitHub)
- ❌ Tests (development only)
- ❌ Config files (development only)

**Result:** Ultra-clean 24.6 KB package with just the essentials!

## 🗑️ Cleanup

- **Removed:** `v1.3.13.js` (6 versions outdated)
- **Organized:** All documentation into `/docs/` structure
- **Consolidated:** Examples into `/examples/` directory
- **Improved:** `.gitignore` with comprehensive rules
- **Added:** `.npmignore` for clean npm packages

## 🔧 CLI Tool

The CLI tool is now available after installation:

```bash
npm install -g @conceptkernel/ck-client-js

# Use CLI
ck-client list-kernels
ck-client inspect <kernel>
ck-client query <urn>
```

## 📖 Documentation

### Updated Files
- **README.md** - Added new API methods documentation
- **CHANGELOG.md** - Complete version history
- **Examples** - Working demos for all features

### Documentation Links
- **API Reference:** See README.md
- **Implementation Details:** See `/docs/implementation/`
- **Protocol Specs:** See `/docs/specifications/`
- **User Guides:** See `/docs/guides/`

## 🔄 Migration Guide

### From v1.3.18 → v1.3.21

✅ **No breaking changes** - Fully backwards compatible!

**New methods available:**
```javascript
// Queue inspection (new in 1.3.21)
await ck.listQueue(kernel)

// Edge connections (new in 1.3.21)
await ck.listEdges(kernel)

// Process history (new in 1.3.21)
await ck.listProcesses(kernel, { limit: 20 })
```

**All existing methods still work:**
```javascript
// Still supported
await ck.listKernels()
await ck.queryStorage(kernel, { limit: 50 })
await ck.getOntology()
await ck.getCapabilities()
await ck.emit(kernel, payload)
```

## 🧪 Testing

### Test Coverage
- ✅ Unit tests (Jest/Mocha)
- ✅ Integration tests (Playwright)
- ✅ E2E authentication flows
- ✅ Edge routing tests
- ✅ Multi-project tests
- ✅ Performance benchmarks

### Run Tests
```bash
npm test                    # All tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:browser        # Playwright E2E
```

## 📊 Package Statistics

**Published Package:**
- Size: 24.6 KB (gzipped)
- Unpacked: 106.9 KB
- Files: 8 core files
- Dependencies: 1 (`ws` for WebSocket)
- Dev Dependencies: 3 (testing only)

**Repository:**
- Total Files: ~55 (including docs, tests, examples)
- Core Files: 8 (published to npm)
- Documentation: 13 files
- Examples: 3 files
- Tests: 14 files

## 🔗 Links

- **NPM Package:** https://www.npmjs.com/package/@conceptkernel/ck-client-js
- **GitHub Repository:** https://github.com/ConceptKernel/ck-client-js
- **Issue Tracker:** https://github.com/ConceptKernel/ck-client-js/issues
- **Documentation:** https://github.com/ConceptKernel/ck-client-js/tree/main/docs
- **Examples:** https://github.com/ConceptKernel/ck-client-js/tree/main/examples
- **Homepage:** https://conceptkernel.org

## 💡 Quick Start

```bash
# Install
npm install @conceptkernel/ck-client-js

# Use in your project
const ConceptKernel = require('@conceptkernel/ck-client-js');

// Connect
const ck = await ConceptKernel.connect('http://localhost:56000');

// New features in v1.3.21
const queue = await ck.listQueue('ConceptKernel.LLM.Fabric');
const edges = await ck.listEdges('ConceptKernel.LLM.Fabric');
const processes = await ck.listProcesses('System.Wss', { limit: 20 });

console.log('Queue depth:', queue.queue.length);
console.log('Connections:', edges.incoming.length + edges.outgoing.length);
console.log('Recent processes:', processes.processes.length);
```

## 🙏 Credits

Special thanks to all contributors and users who provided feedback!

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Full Changelog:** [CHANGELOG.md](CHANGELOG.md)

**Installation:** `npm install @conceptkernel/ck-client-js`

**Questions?** Open an issue: https://github.com/ConceptKernel/ck-client-js/issues
