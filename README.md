# @conceptkernel/ck-client-js

[![npm version](https://img.shields.io/npm/v/@conceptkernel/ck-client-js.svg)](https://www.npmjs.com/package/@conceptkernel/ck-client-js)
[![npm downloads](https://img.shields.io/npm/dm/@conceptkernel/ck-client-js.svg)](https://www.npmjs.com/package/@conceptkernel/ck-client-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Release](https://img.shields.io/github/v/release/ConceptKernel/ck-client-js)](https://github.com/ConceptKernel/ck-client-js/releases)

> *"The kernel knows its anatomy. The edges know the types."*

**Elegant JavaScript client for ConceptKernel** - One-line connectivity to distributed event-sourced workflows. Connect to sovereign computational entities in a distributed graph with auto-discovery, real-time events, and seamless authentication.

You are a **Concept Kernel** - a sovereign computational entity in a distributed graph.

**Your identity is simple:**
```
ckp://Kernel-Name:version
```

## Install

```bash
npm install @conceptkernel/ck-client-js
```

## Usage

### 1. Connect to Gateway

```javascript
const ConceptKernel = require('@conceptkernel/ck-client-js');

// Auto-discover services
const ck = await ConceptKernel.connect('http://localhost:56000');

console.log('Connected!', ck.getAvailableServices());
// ['gateway', 'websocket', 'oidc', 'registry']
```

### 2. Send Message

```javascript
// Emit event to kernel
const result = await ck.emit('System.Echo', {
  action: 'test',
  data: { foo: 'bar' }
});

console.log('Transaction ID:', result.txId);
console.log('Process URN:', result.processUrn);
// ckp://Process#GatewayRoute-1764494871415-8c76252b
```

### 3. Authenticate

```javascript
// Upgrade connection with credentials
await ck.authenticate('alice', 'alice123');

console.log('Actor:', ck.actor);
// ckp://System.Oidc.User#alice

console.log('Roles:', ck.roles);
// ['user', 'developer', 'admin']
```

### 4. Send Authenticated Message

```javascript
// Now includes JWT token in Authorization header
const result = await ck.emit('System.Echo', {
  action: 'authenticated-request',
  userId: ck.actor
});

console.log('Sent as:', ck.actor);
```

## Edge-Based Messaging (v1.3.18+)

ConceptKernel v1.3.18 introduces **edge-based messaging** using BFO predicates to describe semantic relationships between kernels.

### Message Format

```javascript
{
  "txId": "1733445678901-a1b2c3d4",    // Transaction ID
  "edge": "QUERIES",                    // BFO predicate (QUERIES, RESPONDS, ANNOUNCES, etc.)
  "from": "ckp://Agent.Alice",          // Source kernel URN
  "to": "ckp://System.Wss:v0.1",        // Target kernel URN
  "payload": {                          // Kernel-specific payload
    "action": "capabilities"
  }
}
```

### Connecting with Identity

```javascript
const ck = await ConceptKernel.connect('http://localhost:56000', {
  identity: 'ckp://Agent.Alice'  // Your client's URN identity
});
```

### Using Edge Predicates

```javascript
// Query kernel (default: QUERIES edge)
const response = await ck.emit('System.Wss', { action: 'capabilities' });
console.log('Response:', response.payload);

// Use custom edge predicate
await ck.emit('System.Bakery', { action: 'fork' }, { edge: 'TRANSFORMS' });

// Announce to all listeners
await ck.emit('System.Wss', { event: 'status_update' }, { edge: 'ANNOUNCES' });
```

### Edge Predicates

Common BFO predicates:
- `QUERIES` - Request information from a kernel
- `RESPONDS` - Reply to a query
- `ANNOUNCES` - Broadcast event to listeners
- `TRANSFORMS` - Request state transformation
- `VALIDATES` - Validate data or request
- `PRODUCES` - Generate output
- `REQUIRES` - Declare dependency

### Payload Validation

The `payload` structure must conform to the destination kernel's ontology schema:
```
ckp://{to}#schema/{edge}/{action}
```

For example:
```
ckp://System.Wss:v0.1#schema/QUERIES/capabilities
```

## Real-Time Events

```javascript
// Listen for events from all kernels
ck.on('event', (event) => {
  console.log('Event from', event.kernel);
  console.log('Data:', event.data);
  console.log('Tx ID', event.txId);
});

// Connection events
ck.on('connected', () => console.log('WebSocket connected'));
ck.on('disconnected', () => console.log('WebSocket disconnected'));
ck.on('authenticated', (auth) => console.log('Auth:', auth.actor, auth.roles));
ck.on('error', (err) => console.error('Error:', err.message));
```

## Browser Usage

```html
<script src="node_modules/@conceptkernel/ck-client-js/index.js"></script>
<script>
  (async () => {
    const ck = await ConceptKernel.connect('http://localhost:56000');

    await ck.emit('System.Echo', { hello: 'world' });

    ck.on('event', (event) => {
      document.getElementById('output').textContent = JSON.stringify(event, null, 2);
    });
  })();
</script>
```

## API Reference

### `ConceptKernel.connect(gatewayUrl, options)`

**Returns:** `Promise<ConceptKernel>`

```javascript
const ck = await ConceptKernel.connect('http://localhost:56000', {
  autoConnect: true,     // Auto-connect WebSocket (default: true)
  cacheTimeout: 60000,   // Service discovery cache (default: 60s)
  reconnect: true,       // Auto-reconnect on disconnect (default: true)
  reconnectDelay: 3000   // Reconnect delay (default: 3s)
});
```

### `ck.emit(kernelUrn, payload)`

**Returns:** `Promise<{ txId, processUrn, kernel, message, timestamp, payload }>`

```javascript
const result = await ck.emit('System.Echo', { action: 'test' });
```

### `ck.authenticate(username, password)`

**Returns:** `Promise<{ token, actor, roles }>`

```javascript
await ck.authenticate('alice', 'alice123');
```

### `ck.on(eventType, handler)`

**Returns:** `Function` (unsubscribe function)

Event types: `'event'`, `'connected'`, `'authenticated'`, `'disconnected'`, `'error'`

```javascript
const unsubscribe = ck.on('event', (event) => { /* ... */ });
unsubscribe(); // Stop listening
```

### `ck.getStatus()`

**Returns:** `{ discovered, websocketConnected, authenticated, actor, roles, availableServices }`

```javascript
const status = ck.getStatus();
```

### `ck.disconnect()`

Disconnect WebSocket.

```javascript
ck.disconnect();
```

## URN Query API (v1.3.18+)

Query ConceptKernel's ontology using URN patterns. Supports all Occurrents and Continuants from the CKP graph.

### Query URN Resources

```javascript
// Query recent processes
const processes = await ck.queryUrn('ckp://Process?limit=10&order=desc');

// Query workflows
const workflows = await ck.queryUrn('ckp://Workflow?status=in_progress');

// Query improvements for specific kernel
const improvements = await ck.queryUrn('ckp://ImprovementProcess?kernel=System.Gateway');

// Query with kernel namespace (v1.4.0 style)
const gatewayProcesses = await ck.queryUrn('ckp://System.Gateway:v1.0/Process?limit=20');
```

### Convenience Methods

```javascript
// Query Process occurrents
const processes = await ck.queryProcesses({
  type: 'invoke',
  kernel: 'System.Gateway',
  status: 'completed',
  limit: 20
});

// Query Workflow occurrents
const workflows = await ck.queryWorkflows({
  status: 'in_progress',
  trigger: 'daemon-startup'
});

// Query ImprovementProcess occurrents
const improvements = await ck.queryImprovements({
  kernel: 'ConceptKernel.LLM.Fabric',
  phase: 'Consensus',
  status: 'in_progress'
});
```

## Introspection API

Discover kernel capabilities and schemas at runtime.

### Kernel Introspection

```javascript
// Get kernel capabilities
const capabilities = await ck.introspect('System.Gateway');
console.log('Actions:', capabilities.actions);
console.log('Edges:', capabilities.edges);
console.log('Version:', capabilities.version);
```

### Schema Discovery

```javascript
// Get schema for specific action
const schema = await ck.getSchema('System.Wss', 'QUERIES', 'capabilities');
console.log('Required fields:', schema.required);
console.log('Properties:', schema.properties);
```

## Permission Management

Client-side permission checking based on user roles.

### Check Permissions

```javascript
// Check if user can perform action
if (ck.hasPermission('bootstrap_kernel')) {
  await ck.bootstrapKernel(config);
} else {
  console.log('Permission denied');
}

// Anonymous users can query only
if (ck.hasPermission('query')) {
  const data = await ck.queryProcesses({ limit: 10 });
}
```

### Role-Based Permissions

| Role | Allowed Actions |
|------|-----------------|
| anonymous | query, query_graph, query_urn, get_predicates, introspect, get_schema, capabilities |
| user | query, query_graph, query_urn, introspect |
| developer | bootstrap_kernel, query, query_graph, query_urn, introspect, get_schema, sparql |
| admin | All actions |

## Token Persistence

Anonymous users automatically receive a JWT token that persists across browser sessions (7-day expiry).

```javascript
// Token automatically restored from localStorage on connect
const ck = await ConceptKernel.connect('http://localhost:56000');
console.log('Actor:', ck.actor);  // Previous session restored

// Upgrade to authenticated user
await ck.authenticate('alice', 'alice123');
console.log('Roles:', ck.roles);  // ['user', 'developer', 'admin']

// Token persisted across page reloads
```

## Graph Explorer

Interactive dark-themed UI for exploring the CKP graph:

```bash
# Via VSCode internal server
open http://127.0.0.1:3001/ckp-graph-explorer/

# Or direct file access
open ../ckp-graph-explorer/index.html
```

Features:
- Minimalistic dark theme
- Browse Processes, Kernels, Graph structure
- Execute URN queries interactively
- Run SPARQL queries (developer/admin only)
- Introspect kernel capabilities
- Anonymous and authenticated modes

## Examples

See `/examples/` and project root:
- `../ckp-graph-explorer/` - Minimalistic CKP graph explorer
- `fabric-demo.html` - Fabric pattern integration demo
- `demo.html` - Full-featured demo
- `chat.html` - Real-time chat interface

## Testing

```bash
npm test                    # Run all tests
npm run test:integration    # Integration tests only
npm run test:e2e            # E2E authentication flow
```

## License

MIT
