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

## Real-Time Events

```javascript
// Listen for events from all kernels
ck.on('event', (event) => {
  console.log('Event from', event.kernel);
  console.log('Data:', event.data);
  console.log('Tx ID:', event.txId);
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

## Examples

See `/examples/` directory:
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
