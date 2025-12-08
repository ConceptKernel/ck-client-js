# Client Bot Instructions - WebSocket Query Verification & Integration

**Date:** 2025-12-06
**Status:** Ready for Client Integration
**Prerequisites:** ConceptKernel Gateway running on `http://localhost:56000`

---

## 🎯 Purpose

This guide provides step-by-step instructions for client bots/developers to:
1. Verify the WebSocket query implementation works
2. Link and use ck-client-js in their UI projects
3. Integrate query functionality into their applications

---

## 📋 Step 1: Verify ConceptKernel Gateway is Running

Before proceeding, ensure the ConceptKernel Gateway is accessible:

```bash
# Check if gateway is running
curl http://localhost:56000/.well-known/ck-services

# Expected response: JSON with gateway info, kernels list, services
# If this fails, start the ConceptKernel system first
```

**Expected Output:**
```json
{
  "ck_version": "v1.3.18",
  "domain": "ConceptKernel",
  "gateway": {
    "http": "http://localhost:56000",
    "websocket": "ws://localhost:56001",
    "name": "System.Gateway"
  },
  "kernels": [...],
  "services": {...}
}
```

---

## 📋 Step 2: Verify CLI Tool Works

Test the Node.js CLI to confirm WebSocket communication:

```bash
cd /path/to/ckp.v1.3.18.rust.PH2/ck-client-js

# Test 1: List all running daemons
node cli.js daemon list

# Expected: Table showing System.Wss, System.Gateway, etc.

# Test 2: Describe a specific daemon
node cli.js daemon describe System.Wss

# Expected: Detailed info about System.Wss daemon

# Test 3: Describe a concept/kernel
node cli.js concept describe System.Gateway

# Expected: Detailed info about System.Gateway
```

**Success Criteria:**
- ✅ All commands connect via WebSocket
- ✅ Service discovery data is fetched
- ✅ Results are displayed in formatted tables
- ✅ No filesystem access (all data from WebSocket)

---

## 📋 Step 3: Run Playwright Tests

Verify the HTML interface works in browser automation:

```bash
cd /path/to/ckp.v1.3.18.rust.PH2/ck-client-js

# Run all tests
npx playwright test test/e2e.query-interface.spec.js

# Run with UI mode (interactive)
npx playwright test test/e2e.query-interface.spec.js --ui

# Run specific test
npx playwright test test/e2e.query-interface.spec.js -g "should list daemons"
```

**Expected Results:**
```
✓ Query interface loaded successfully
✓ Connected via WebSocket
✓ Daemon list retrieved
✓ Daemon described successfully
✓ Concept described successfully
✓ Handled not found correctly
✓ All commands executed successfully
✓ Commands executed over WebSocket

8 passed (25.6s)
```

**Success Criteria:**
- ✅ 8/8 tests passing (100%)
- ✅ WebSocket connection established
- ✅ All query commands execute successfully
- ✅ UI updates with query results

---

## 📋 Step 4: Test HTML Interface Manually

Open the HTML example in a browser to verify interactive functionality:

```bash
cd /path/to/ckp.v1.3.18.rust.PH2/ck-client-js/test

# Option 1: Open directly (if file:// protocol works)
open query-interface.html

# Option 2: Serve with HTTP server (recommended)
python3 -m http.server 8000
# Then open: http://localhost:8000/query-interface.html
```

**Manual Test Steps:**

1. **Connect to Gateway**
   - Click "Connect to Gateway" button
   - Status should change to "Connected via WebSocket"
   - Output should show connection details

2. **List Daemons**
   - Click "List Daemons" button
   - Should see table with running daemons
   - Verify System.Wss and System.Gateway appear

3. **Describe Daemon**
   - Enter "System.Wss" in parameter field
   - Click "Describe Daemon" button
   - Should see detailed info grid

4. **Describe Concept**
   - Enter "System.Gateway" in parameter field
   - Click "Describe Concept" button
   - Should see detailed info grid

5. **Test Not Found**
   - Enter "NonExistent.Kernel" in parameter field
   - Click "Describe Concept" button
   - Should see "not found" message with available concepts list

**Success Criteria:**
- ✅ All buttons work without errors
- ✅ WebSocket connection maintained
- ✅ Results displayed in formatted tables/grids
- ✅ Error handling works for invalid inputs

---

## 📋 Step 5: Link ck-client-js to Your UI Project

### Option A: Using Existing Linked Repository

If your UI project already has this repository linked:

```javascript
// In your UI project, import ck-client-js
import ConceptKernel from '../path/to/ckp.v1.3.18.rust.PH2/ck-client-js/index.js';

// Or if using require (Node.js)
const ConceptKernel = require('../path/to/ckp.v1.3.18.rust.PH2/ck-client-js/index.js');
```

### Option B: Using npm Link (Symlink)

Create a symbolic link for development:

```bash
# In the ck-client-js directory
cd /path/to/ckp.v1.3.18.rust.PH2/ck-client-js
npm link

# In your UI project directory
cd /path/to/your-ui-project
npm link @conceptkernel/ck-client-js

# Now you can import it
import ConceptKernel from '@conceptkernel/ck-client-js';
```

### Option C: Direct Script Tag (Browser)

For browser-only projects:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="../path/to/ckp.v1.3.18.rust.PH2/ck-client-js/index.js"></script>
</head>
<body>
  <script>
    // ConceptKernel is now available globally
    async function init() {
      const ck = await ConceptKernel.connect('http://localhost:56000', {
        autoConnect: true
      });
      console.log('Connected!', ck);
    }
    init();
  </script>
</body>
</html>
```

---

## 📋 Step 6: Integrate Query Functionality

### Basic Integration Example

```javascript
// 1. Import ck-client-js
import ConceptKernel from '@conceptkernel/ck-client-js';

// 2. Connect to Gateway
async function connectToGateway() {
  const ck = await ConceptKernel.connect('http://localhost:56000', {
    autoConnect: true
  });

  // 3. Fetch service discovery data (includes all kernels)
  const response = await fetch('http://localhost:56000/.well-known/ck-services');
  const discoveryData = await response.json();

  // Store for later use
  window.ck = ck;
  window.discoveryData = discoveryData;

  console.log('Connected! Found', discoveryData.kernels.length, 'kernels');
  return { ck, discoveryData };
}

// 4. Query running daemons
function listDaemons(discoveryData) {
  return discoveryData.kernels
    .filter(k => k.mode === 'ONLINE' && k.status === 'ACTIVE')
    .map(k => ({
      name: k.name,
      port: k.port,
      type: k.type,
      urn: k.urn,
      status: k.status
    }));
}

// 5. Query specific daemon
function describeDaemon(discoveryData, daemonName) {
  return discoveryData.kernels.find(k =>
    k.name === daemonName && k.mode === 'ONLINE'
  );
}

// 6. Query specific concept
function describeConcept(discoveryData, conceptName) {
  return discoveryData.kernels.find(k =>
    k.name === conceptName || k.urn.includes(conceptName)
  );
}

// Usage
async function main() {
  const { ck, discoveryData } = await connectToGateway();

  // List all daemons
  const daemons = listDaemons(discoveryData);
  console.log('Running daemons:', daemons);

  // Describe specific daemon
  const wss = describeDaemon(discoveryData, 'System.Wss');
  console.log('System.Wss daemon:', wss);

  // Describe specific concept
  const gateway = describeConcept(discoveryData, 'System.Gateway');
  console.log('System.Gateway concept:', gateway);

  // Don't forget to disconnect when done
  // ck.disconnect();
}

main();
```

---

## 📋 Step 7: Reference Implementation

### Copy the HTML Example

The HTML interface at `ck-client-js/test/query-interface.html` is a complete, working example. You can:

1. **Copy the entire HTML file** as a starting point for your UI
2. **Extract specific functions** you need (connect, listDaemons, etc.)
3. **Study the code structure** to understand the WebSocket flow
4. **Customize the UI/CSS** to match your application design

**Key Functions to Reference:**

```javascript
// From query-interface.html

// Connection
async function connect() {
  ck = await ConceptKernel.connect(gatewayUrl, { autoConnect: true });
  const discoveryResponse = await fetch(gatewayUrl + '/.well-known/ck-services');
  discoveryData = await discoveryResponse.json();
}

// List daemons
async function listDaemons() {
  const daemons = discoveryData.kernels
    .filter(k => k.mode === 'ONLINE' && k.status === 'ACTIVE');
  // Display in your UI
}

// Describe daemon
async function describeDaemon() {
  const daemon = discoveryData.kernels.find(k =>
    k.name === param && k.mode === 'ONLINE'
  );
  // Display daemon details
}
```

---

## 📋 Step 8: Integration Checklist

Before deploying your integration, verify:

### ✅ Connection
- [ ] WebSocket connects to Gateway successfully
- [ ] Service discovery data is fetched
- [ ] Connection status is displayed to user
- [ ] Reconnection logic handles disconnects

### ✅ Query Functionality
- [ ] List daemons works and displays results
- [ ] Describe daemon works for valid daemon names
- [ ] Describe concept works for valid concept names
- [ ] Error handling for invalid/not-found queries

### ✅ UI/UX
- [ ] Loading states shown during queries
- [ ] Results formatted in readable tables/grids
- [ ] Error messages displayed clearly
- [ ] User can re-query without reconnecting

### ✅ Performance
- [ ] Queries execute quickly (service discovery is cached)
- [ ] No unnecessary reconnections
- [ ] UI remains responsive during queries

### ✅ Security
- [ ] Gateway URL is configurable (not hardcoded)
- [ ] WebSocket connection uses proper protocols
- [ ] No sensitive data logged to console in production

---

## 📋 Step 9: Common Issues & Solutions

### Issue 1: Connection Timeout
**Symptom:** `Error: Connection timeout`

**Solution:**
```javascript
// Ensure Gateway is running
curl http://localhost:56000/.well-known/ck-services

// If Gateway is down, start ConceptKernel system:
# cd /path/to/ckp.v1.3.18.rust.PH2
# ./start-gateway.sh (or your start script)
```

### Issue 2: Cannot Read Properties of Undefined
**Symptom:** `Cannot read properties of undefined (reading 'kernels')`

**Solution:**
```javascript
// Always fetch discovery data explicitly
const discoveryResponse = await fetch(gatewayUrl + '/.well-known/ck-services');
const discoveryData = await discoveryResponse.json();

// Store it for later use
ck.discoveryData = discoveryData;

// Always check if data exists before using
if (discoveryData && discoveryData.kernels) {
  const daemons = discoveryData.kernels.filter(...);
}
```

### Issue 3: CORS Error in Browser
**Symptom:** `Access-Control-Allow-Origin error`

**Solution:**
```bash
# Serve HTML with local HTTP server instead of file://
cd ck-client-js/test
python3 -m http.server 8000

# Or use any other local server (http-server, live-server, etc.)
```

### Issue 4: Module Not Found
**Symptom:** `Cannot find module 'node-fetch'`

**Solution:**
```bash
cd /path/to/ckp.v1.3.18.rust.PH2/ck-client-js
npm install

# Make sure all dependencies are installed
```

---

## 📋 Step 10: Advanced Integration Patterns

### Pattern 1: React Component

```jsx
import React, { useState, useEffect } from 'react';
import ConceptKernel from '@conceptkernel/ck-client-js';

function DaemonList() {
  const [daemons, setDaemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDaemons() {
      try {
        // Connect to Gateway
        const ck = await ConceptKernel.connect('http://localhost:56000', {
          autoConnect: true
        });

        // Fetch discovery data
        const response = await fetch('http://localhost:56000/.well-known/ck-services');
        const data = await response.json();

        // Filter daemons
        const daemons = data.kernels
          .filter(k => k.mode === 'ONLINE' && k.status === 'ACTIVE');

        setDaemons(daemons);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    fetchDaemons();
  }, []);

  if (loading) return <div>Loading daemons...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Port</th>
          <th>Type</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {daemons.map(daemon => (
          <tr key={daemon.name}>
            <td>{daemon.name}</td>
            <td>{daemon.port}</td>
            <td>{daemon.type}</td>
            <td>{daemon.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DaemonList;
```

### Pattern 2: Vue Component

```vue
<template>
  <div>
    <h2>Running Daemons</h2>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>Name</th>
          <th>Port</th>
          <th>Type</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="daemon in daemons" :key="daemon.name">
          <td>{{ daemon.name }}</td>
          <td>{{ daemon.port }}</td>
          <td>{{ daemon.type }}</td>
          <td>{{ daemon.status }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import ConceptKernel from '@conceptkernel/ck-client-js';

export default {
  data() {
    return {
      daemons: [],
      loading: true,
      error: null
    };
  },
  async mounted() {
    try {
      const ck = await ConceptKernel.connect('http://localhost:56000', {
        autoConnect: true
      });

      const response = await fetch('http://localhost:56000/.well-known/ck-services');
      const data = await response.json();

      this.daemons = data.kernels
        .filter(k => k.mode === 'ONLINE' && k.status === 'ACTIVE');
      this.loading = false;
    } catch (err) {
      this.error = err.message;
      this.loading = false;
    }
  }
};
</script>
```

### Pattern 3: Singleton Service (Shared Connection)

```javascript
// services/conceptkernel.js
import ConceptKernel from '@conceptkernel/ck-client-js';

class ConceptKernelService {
  constructor() {
    this.ck = null;
    this.discoveryData = null;
    this.connected = false;
  }

  async connect(gatewayUrl = 'http://localhost:56000') {
    if (this.connected) {
      return { ck: this.ck, discoveryData: this.discoveryData };
    }

    this.ck = await ConceptKernel.connect(gatewayUrl, {
      autoConnect: true
    });

    const response = await fetch(`${gatewayUrl}/.well-known/ck-services`);
    this.discoveryData = await response.json();

    this.connected = true;

    return { ck: this.ck, discoveryData: this.discoveryData };
  }

  listDaemons() {
    if (!this.discoveryData) {
      throw new Error('Not connected. Call connect() first.');
    }

    return this.discoveryData.kernels
      .filter(k => k.mode === 'ONLINE' && k.status === 'ACTIVE');
  }

  describeDaemon(name) {
    if (!this.discoveryData) {
      throw new Error('Not connected. Call connect() first.');
    }

    return this.discoveryData.kernels.find(k =>
      k.name === name && k.mode === 'ONLINE'
    );
  }

  describeConcept(name) {
    if (!this.discoveryData) {
      throw new Error('Not connected. Call connect() first.');
    }

    return this.discoveryData.kernels.find(k =>
      k.name === name || k.urn.includes(name)
    );
  }

  disconnect() {
    if (this.ck) {
      this.ck.disconnect();
      this.ck = null;
      this.discoveryData = null;
      this.connected = false;
    }
  }
}

// Export singleton instance
export default new ConceptKernelService();
```

**Usage:**
```javascript
import ckService from './services/conceptkernel';

async function main() {
  await ckService.connect();

  const daemons = ckService.listDaemons();
  console.log('Daemons:', daemons);

  const wss = ckService.describeDaemon('System.Wss');
  console.log('WSS:', wss);
}
```

---

## 📋 Final Verification Checklist

Before considering integration complete:

### Core Functionality
- [ ] CLI tool works (`node cli.js daemon list`)
- [ ] Playwright tests pass (8/8 passing - 100%)
- [ ] HTML interface works in browser
- [ ] WebSocket connection establishes successfully
- [ ] Service discovery data is fetched correctly

### Integration
- [ ] ck-client-js is linked to your UI project
- [ ] Query functions are integrated
- [ ] UI displays query results correctly
- [ ] Error handling is implemented
- [ ] Loading states are shown to users

### Testing
- [ ] Manual testing completed successfully
- [ ] All query commands tested (list, describe)
- [ ] Edge cases tested (not found, invalid input)
- [ ] Connection/disconnection tested
- [ ] Multiple queries in sequence tested

### Documentation
- [ ] Team understands how to use the query system
- [ ] Reference documentation is accessible
- [ ] Example code is available for developers
- [ ] Troubleshooting guide is reviewed

---

## 📚 Reference Documentation

- **Implementation Details:** `ck-client-js/QUERY-CLI-WSS-IMPLEMENTATION.md`
- **CLI Tool:** `ck-client-js/cli.js`
- **HTML Example:** `ck-client-js/test/query-interface.html`
- **Playwright Tests:** `ck-client-js/test/e2e.query-interface.spec.js`
- **ck-client-js Library:** `ck-client-js/index.js`

---

## 🎯 Success Metrics

Your integration is successful when:

1. ✅ **Connectivity:** WebSocket connection to Gateway works reliably
2. ✅ **Functionality:** All query commands work without errors
3. ✅ **Performance:** Queries execute quickly (< 1 second)
4. ✅ **Reliability:** System handles errors gracefully
5. ✅ **Usability:** UI provides clear feedback to users

---

**Status:** Ready for Production Integration
**Version:** 1.3.18
**Last Updated:** 2025-12-06

---

## 💡 Need Help?

If you encounter issues during integration:

1. **Check Logs:** Look for WebSocket connection errors in browser console
2. **Verify Gateway:** Ensure ConceptKernel Gateway is running
3. **Review Examples:** Reference `query-interface.html` for working code
4. **Run Tests:** Use Playwright tests to verify system health
5. **Read Docs:** Check `QUERY-CLI-WSS-IMPLEMENTATION.md` for details

**All functionality executes over WebSocket using ck-client-js - No filesystem access required!**
