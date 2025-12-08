# ck-client-js Edge Protocol Upgrade Guide

## Overview

The client library needs updating to use the new edge-based message format defined in `envelope.payload.v1.3.18.schema.json`.

## Message Format Changes

### OLD Format (v1.3.17 and earlier)
```json
{
  "type": "kernel_request",
  "target": "System.Wss",
  "payload": { "action": "status" }
}
```

### NEW Format (v1.3.18+)
```json
{
  "txId": "1733445678901-a1b2c3d4",
  "edge": "QUERIES",
  "from": "ckp://Agent.Alice",
  "to": "ckp://System.Wss:v0.1",
  "payload": { "action": "status" }
}
```

## Key Changes Required

### 1. Message Builder
Need to generate proper edge-based messages:

```javascript
class MessageBuilder {
  constructor(fromUrn) {
    this.from = fromUrn; // e.g., "ckp://Agent.Alice"
  }

  generateTxId() {
    const timestamp = Date.now();
    const guid = Array.from({length: 8}, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `${timestamp}-${guid}`;
  }

  build(edge, to, payload) {
    return {
      txId: this.generateTxId(),
      edge,
      from: this.from,
      to,
      payload
    };
  }
}
```

### 2. URN Utilities
Need to parse and validate URNs:

```javascript
class UrnParser {
  static parse(urn) {
    // ckp://System.Wss:v0.1#schema
    const match = urn.match(/^ckp:\/\/([^:]+)(?::([^#]+))?(?:#(.+))?$/);
    if (!match) throw new Error(`Invalid URN: ${urn}`);

    return {
      kernel: match[1],
      version: match[2] || null,
      fragment: match[3] || null
    };
  }

  static build(kernel, version, fragment) {
    let urn = `ckp://${kernel}`;
    if (version) urn += `:${version}`;
    if (fragment) urn += `#${fragment}`;
    return urn;
  }

  static normalize(input) {
    // Convert "System.Wss" to "ckp://System.Wss"
    if (!input.startsWith('ckp://')) {
      return `ckp://${input}`;
    }
    return input;
  }
}
```

### 3. Updated emit() Method
```javascript
async emit(kernelUrn, payload, options = {}) {
  if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket not connected');
  }

  const edge = options.edge || 'QUERIES';
  const to = UrnParser.normalize(kernelUrn);

  const message = this.messageBuilder.build(edge, to, payload);

  console.log('[CK Client] Sending edge message:', message);
  this.websocket.send(JSON.stringify(message));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, options.timeout || 10000);

    const handler = (event) => {
      const data = JSON.parse(event.data);

      // Match response by txId and edge predicate
      if (data.txId === message.txId && data.edge === 'RESPONDS') {
        clearTimeout(timeout);
        this.websocket.removeEventListener('message', handler);
        resolve(data);
      }
    };

    this.websocket.addEventListener('message', handler);
  });
}
```

### 4. Schema Validation (Optional)
```javascript
class SchemaManager {
  constructor() {
    this.schemaCache = new Map();
    this.envelopeSchema = null;
  }

  async loadEnvelopeSchema() {
    const response = await fetch('/schemas/envelope.payload.v1.3.18.schema.json');
    this.envelopeSchema = await response.json();
  }

  async fetchPayloadSchema(kernelUrn, edge, action) {
    const key = `${kernelUrn}#${edge}/${action}`;
    if (this.schemaCache.has(key)) {
      return this.schemaCache.get(key);
    }

    // Fetch from: ckp://System.Wss:v0.1#schema/QUERIES/capabilities
    const schemaUrn = `${kernelUrn}#schema/${edge}/${action}`;
    // TODO: Implement URN resolution to fetch schema

    return null; // Graceful degradation if schema not available
  }

  validate(message, schema) {
    // Use ajv or similar JSON schema validator
    // Return { valid: true/false, errors: [...] }
  }
}
```

## Migration Path

### Phase 1: Backward Compatible (Current)
- Keep existing `kernel_request` format
- System.Wss supports both formats

### Phase 2: Add Edge Support (Next)
- Add `edge` parameter to emit()
- Generate txId automatically
- Parse URNs properly
- Update examples

### Phase 3: Full Migration (Future)
- Remove old format support
- Make `edge` required
- Add schema validation
- Edge-based error handling

## Updated API Example

```javascript
// Connect to System.Wss directly
const ck = await ConceptKernel.connect('ws://localhost:56001', {
  identity: 'ckp://Agent.Alice'
});

// Query with edge predicate
await ck.send('QUERIES', 'ckp://System.Wss:v0.1', {
  action: 'capabilities'
});

// Listen for responses
ck.on('message', (msg) => {
  if (msg.edge === 'RESPONDS' && msg.from === 'ckp://System.Wss:v0.1') {
    console.log('Capabilities:', msg.payload.capabilities);
  }
});

// Authenticate (token upgrade via WebSocket)
await ck.authenticate('alice', 'alice123');
```

## Files to Update

1. `index.js` - Main client library
   - Add MessageBuilder class
   - Add UrnParser class
   - Update emit() method
   - Update authenticate() method
   - Update _handleWebSocketMessage()

2. `README.md` - Documentation
   - Update examples to show edge-based format
   - Document new URN handling
   - Add edge predicate documentation

3. `package.json` - Version bump
   - Bump to v1.3.18

4. `test/*.spec.js` - Tests
   - Update test expectations for new format
   - Add URN parser tests
   - Add message builder tests

## Testing Checklist

- [ ] Connect to System.Wss on port 56001
- [ ] Send QUERIES edge message
- [ ] Receive RESPONDS edge message
- [ ] Authenticate via WebSocket (token upgrade)
- [ ] Parse ckp:// URNs correctly
- [ ] Generate valid txId format
- [ ] Handle edge-based errors
- [ ] Validate messages against schema (optional)

## Next Steps

1. Implement MessageBuilder and UrnParser utilities
2. Update emit() to use edge-based format
3. Test with System.Wss running on port 56001
4. Update README with new examples
5. Version bump and publish
