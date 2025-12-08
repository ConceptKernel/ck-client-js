# Fabric Demo Analysis

## Connection Details

### ✅ fabric-demo.html is working correctly

**WebSocket Connection:**
- Connects to: `ws://localhost:56001` (direct, no service discovery)
- Protocol: `ws://` (WebSocket, not secure)
- Target: System.Wss kernel directly

**Authentication Status:**
- **NOT authenticated** - Uses anonymous identity
- Identity: `ckp://Agent.WebClient` (hardcoded)
- No JWT token handling
- No login/upgrade flow

**Message Format:**
```javascript
{
  txId: "1234567890-a1b2c3d4",
  edge: "REQUESTS",
  from: "ckp://Agent.WebClient",
  to: "ckp://ConceptKernel.LLM.Fabric:v0.1",
  payload: {
    query: "...",
    pattern: "extract_wisdom"
  }
}
```

**Why It Works:**
1. Direct WebSocket connection (no discovery overhead)
2. Uses edge-based messaging (`REQUESTS` → `RESPONDS`)
3. Simple request/response pattern
4. No authentication required for Fabric queries

---

## Comparison with ck-client-js

### fabric-demo.html
- **Connection:** Direct `ws://localhost:56001`
- **Auth:** Anonymous only
- **Identity:** Fixed `ckp://Agent.WebClient`
- **Complexity:** Minimal (~50 lines JS)
- **Use case:** Single-purpose (Fabric queries)

### ck-client-js
- **Connection:** Service discovery → `http://localhost:56000` → discovers WSS endpoint
- **Auth:** Anonymous + JWT + upgrade flow
- **Identity:** Configurable + token persistence
- **Complexity:** Full client library (~1000 lines)
- **Use case:** General-purpose CKP client

---

## Graph Explorer Bug Fix

**Issue:** Response structure mismatch
- Expected: `Array` of results
- Actual: `Object` with nested data

**Fix Applied:**
- Added response structure detection
- Handles: `Array`, `{data: [...]}`, `{results: [...]}`, etc.
- Shows raw response when no data found (debugging)

**Files Updated:**
- `ckp-graph-explorer.html`:
  - `loadProcesses()` - handles response structure
  - `loadWorkflows()` - handles response structure
  - `loadImprovements()` - handles response structure

---

## Recommendations

### For Production Use:

1. **Fabric Demo:**
   - Keep as-is for simple Fabric integration
   - Add authentication if needed:
     ```javascript
     await ck.authenticate('alice', 'alice123');
     ```

2. **Graph Explorer:**
   - Use ck-client-js (handles auth, discovery, persistence)
   - Reload page to test bug fix
   - Check console logs for response structure
   - Click "Show raw response" to debug

3. **Authentication:**
   - fabric-demo: No auth (anonymous WebClient)
   - graph-explorer: Full auth flow (anonymous → login → JWT)

---

## Connection Flow

### fabric-demo.html:
```
Browser → ws://localhost:56001 → System.Wss
```

### ck-client-js:
```
Browser → http://localhost:56000/.well-known/ck-services (discovery)
        → ws://localhost:56001 (WebSocket endpoint)
        → System.Wss
        → Anonymous JWT received
        → [Optional] authenticate() → Upgraded JWT
```

---

## Summary

| Feature | fabric-demo.html | ck-client-js |
|---------|------------------|--------------|
| **WSS Connection** | ✅ Yes (ws://) | ✅ Yes (via discovery) |
| **Authentication** | ❌ No (anonymous only) | ✅ Yes (JWT + upgrade) |
| **Token Persistence** | ❌ No | ✅ Yes (localStorage) |
| **Service Discovery** | ❌ No (hardcoded) | ✅ Yes (auto) |
| **URN Queries** | ❌ No (Fabric only) | ✅ Yes (all types) |
| **Edge Messaging** | ✅ Yes (REQUESTS) | ✅ Yes (all predicates) |
| **Use Case** | Single-purpose demo | Full CKP client |

---

**Conclusion:**
- fabric-demo works because it's simple and direct
- ck-client-js is more complex but handles full CKP protocol
- Graph explorer bug fixed - handles various response structures
- Both connect over WebSocket ✅
- Only ck-client-js supports authentication ✅
