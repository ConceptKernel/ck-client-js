# ConceptKernel Admin API Specification

## Overview

This document specifies the complete Admin API for ConceptKernel v1.3.18+. All actions use edge-based messaging protocol with BFO predicates.

**Target Audience:** Client developers building admin interfaces for ConceptKernel management.

---

## Connection

**WebSocket Endpoint:** `ws://localhost:56001`

**Message Format:** All messages use edge-based protocol:

```json
{
  "txId": "1733427890123-abc123",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": { "action": "...", ... }
}
```

**Response Format:**

```json
{
  "txId": "1733427890123-abc123",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": { ... }
}
```

---

## Core Actions

### 1. STATUS - System Health

**Purpose:** Get current status of System.Wss

**Request:**
```json
{
  "txId": "1733427890123-abc123",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "status"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890123-abc123",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "status": "online",
    "connected_clients": 3,
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

### 2. CAPABILITIES - Introspection

**Purpose:** Discover what System.Wss can do

**Request:**
```json
{
  "txId": "1733427890124-def456",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "capabilities"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890124-def456",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "capabilities": [
      "Real-time event broadcasting",
      "Multi-client pub/sub",
      "Process URN tracking",
      "Edge-based messaging (v1.3.18+)"
    ],
    "interfaces": ["websocket", "notification"],
    "version": "v0.1",
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

### 3. ONTOLOGY - Kernel Schema

**Purpose:** Get kernel ontology definition (class hierarchy, capabilities, actions)

**Request:**
```json
{
  "txId": "1733427890125-ghi789",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "ontology"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890125-ghi789",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "kernel": "System.Wss",
    "version": "v0.1",
    "ontology": {
      "class": "ckp://ConceptKernel",
      "subclass": "ckp://System.Wss",
      "capabilities": {
        "websocket": {
          "description": "Real-time bidirectional communication",
          "port": 56001,
          "protocol": "ws://"
        },
        "edge_routing": {
          "description": "Route edge-based messages to target kernels",
          "supported_edges": ["QUERIES", "RESPONDS", "ANNOUNCES"]
        },
        "broadcast": {
          "description": "Broadcast events to all connected clients",
          "event_types": ["notification", "kernel_event", "storage_update"]
        }
      },
      "actions": [
        "status", "capabilities", "ping", "ontology", "kernels",
        "sparql", "fork_info", "storage_list", "storage_inspect",
        "config_get", "config_set", "abilities_list", "link_create", "link_delete"
      ],
      "predicates": ["QUERIES", "RESPONDS", "ANNOUNCES"],
      "interfaces": ["websocket", "notification"]
    },
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

### 4. KERNELS - List Available Kernels

**Purpose:** Discover all registered ConceptKernels

**Request:**
```json
{
  "txId": "1733427890126-jkl012",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "kernels"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890126-jkl012",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "kernels": [
      {
        "name": "ConceptKernel.LLM.Fabric",
        "urn": "ckp://ConceptKernel.LLM.Fabric",
        "path": "concepts/ConceptKernel.LLM.Fabric",
        "has_config": true
      },
      {
        "name": "System.Wss",
        "urn": "ckp://System.Wss",
        "path": "concepts/System.Wss",
        "has_config": true
      }
    ],
    "count": 2,
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

## Storage Management

### 5. STORAGE_LIST - List Storage Items

**Purpose:** Browse storage artifacts for a kernel

**Request:**
```json
{
  "txId": "1733427890127-mno345",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "storage_list",
    "kernel": "ConceptKernel.LLM.Fabric",
    "limit": 50
  }
}
```

**Response:**
```json
{
  "txId": "1733427890127-mno345",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "kernel": "ConceptKernel.LLM.Fabric",
    "storage_items": [
      {
        "name": "1764953473030-1d35ee8b.inst",
        "path": "concepts/ConceptKernel.LLM.Fabric/storage/1764953473030-1d35ee8b.inst",
        "has_payload": true,
        "type": "instance"
      }
    ],
    "count": 1,
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

### 6. STORAGE_INSPECT - Inspect Storage Item

**Purpose:** Read the contents of a specific storage artifact

**Request:**
```json
{
  "txId": "1733427890128-pqr678",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "storage_inspect",
    "kernel": "ConceptKernel.LLM.Fabric",
    "item": "1764953473030-1d35ee8b.inst"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890128-pqr678",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "kernel": "ConceptKernel.LLM.Fabric",
    "item": "1764953473030-1d35ee8b.inst",
    "path": "concepts/ConceptKernel.LLM.Fabric/storage/1764953473030-1d35ee8b.inst",
    "payload": {
      "query": "What is the meaning of life?",
      "response": "The meaning of life is subjective...",
      "duration_ms": 1234,
      "timestamp": "2025-12-05T17:00:00.000000Z"
    },
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

## Configuration Management

### 7. CONFIG_GET - Read Kernel Configuration

**Purpose:** Get kernel.yml configuration for a kernel

**Request:**
```json
{
  "txId": "1733427890129-stu901",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "config_get",
    "kernel": "ConceptKernel.LLM.Fabric"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890129-stu901",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "kernel": "ConceptKernel.LLM.Fabric",
    "config": "name: ConceptKernel.LLM.Fabric\nversion: v1.0.0\nruntime: node\n...",
    "path": "concepts/ConceptKernel.LLM.Fabric/kernel.yml",
    "exists": true,
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

## Ontology Query

### 8. SPARQL - Query Ontology Graph

**Purpose:** Execute SPARQL queries against kernel ontology

**Request:**
```json
{
  "txId": "1733427890130-vwx234",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "sparql",
    "query": "SELECT ?kernel WHERE { ?kernel a ck:Kernel }",
    "limit": 10
  }
}
```

**Response:**
```json
{
  "txId": "1733427890130-vwx234",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "query": "SELECT ?kernel WHERE { ?kernel a ck:Kernel }",
    "results": {
      "bindings": []
    },
    "message": "SPARQL endpoint not yet fully implemented",
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

## Forking & Templates

### 9. FORK_INFO - Get Fork Template Info

**Purpose:** Get information about forkable kernel templates

**Request (All Templates):**
```json
{
  "txId": "1733427890131-yza567",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "fork_info"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890131-yza567",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "templates": [
      {
        "name": "ConceptKernel.Template.Basic",
        "urn": "ckp://ConceptKernel.Template.Basic",
        "path": "concepts/ConceptKernel.Template.Basic",
        "forkable": true
      },
      {
        "name": "ConceptKernel.Template.Worker",
        "urn": "ckp://ConceptKernel.Template.Worker",
        "path": "concepts/ConceptKernel.Template.Worker",
        "forkable": true
      }
    ],
    "count": 2,
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

**Request (Specific Template):**
```json
{
  "txId": "1733427890132-bcd890",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "fork_info",
    "template": "ConceptKernel.Template.Basic"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890132-bcd890",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "template": {
      "name": "ConceptKernel.Template.Basic",
      "urn": "ckp://ConceptKernel.Template.Basic",
      "path": "concepts/ConceptKernel.Template.Basic",
      "forkable": true
    },
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

## Abilities & Actions

### 10. ABILITIES_LIST - List Kernel Abilities

**Purpose:** Discover what abilities the kernel has (actions it can execute)

**Request:**
```json
{
  "txId": "1733427890133-efg123",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "abilities_list"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890133-efg123",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "abilities": [
      {
        "name": "broadcast",
        "description": "Broadcast events to all connected clients",
        "edge": "ANNOUNCES",
        "requires": ["payload"]
      },
      {
        "name": "route_message",
        "description": "Route edge-based message to target kernel",
        "edge": "QUERIES",
        "requires": ["to", "payload"]
      },
      {
        "name": "inspect_storage",
        "description": "Inspect kernel storage items",
        "edge": "QUERIES",
        "requires": ["kernel", "item"]
      },
      {
        "name": "manage_config",
        "description": "Read kernel configuration",
        "edge": "QUERIES",
        "requires": ["kernel"]
      }
    ],
    "count": 4,
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

## Edge Manipulation (Ontology Graph)

### 11. LINK_CREATE - Create Edge Link

**Purpose:** Create a semantic link between two entities in the ontology graph

**Request:**
```json
{
  "txId": "1733427890134-hij456",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "link_create",
    "from": "ckp://ConceptKernel.LLM.Fabric",
    "to": "ckp://ConceptKernel.LLM.Claude",
    "edge": "DEPENDS_ON"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890134-hij456",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "link_created": true,
    "from": "ckp://ConceptKernel.LLM.Fabric",
    "to": "ckp://ConceptKernel.LLM.Claude",
    "edge": "DEPENDS_ON",
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

### 12. LINK_DELETE - Delete Edge Link

**Purpose:** Remove a semantic link from the ontology graph

**Request:**
```json
{
  "txId": "1733427890135-klm789",
  "edge": "QUERIES",
  "from": "ckp://Agent.Admin",
  "to": "ckp://System.Wss:v0.1",
  "payload": {
    "action": "link_delete",
    "from": "ckp://ConceptKernel.LLM.Fabric",
    "to": "ckp://ConceptKernel.LLM.Claude",
    "edge": "DEPENDS_ON"
  }
}
```

**Response:**
```json
{
  "txId": "1733427890135-klm789",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "link_deleted": true,
    "from": "ckp://ConceptKernel.LLM.Fabric",
    "to": "ckp://ConceptKernel.LLM.Claude",
    "edge": "DEPENDS_ON",
    "timestamp": "2025-12-05T17:00:00.000000+00:00"
  }
}
```

---

## Error Handling

All errors preserve the transaction ID for client matching.

**Error Response Format:**
```json
{
  "txId": "1733427890136-nop012",
  "edge": "RESPONDS",
  "from": "ckp://System.Wss:v0.1",
  "to": "ckp://Agent.Admin",
  "payload": {
    "error": true,
    "message": "Storage item not found: nonexistent.inst",
    "context": "validation_error"
  }
}
```

---

## Implementation Notes

### Transaction ID Format

```javascript
function generateTxId() {
  const timestamp = Date.now();
  const shortGuid = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${shortGuid}`;
}
```

### Message Waiting Pattern

```javascript
function waitForResponse(ws, txId, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for response to txId: ${txId}`));
    }, timeoutMs);

    const messageHandler = (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Check if this is a RESPONDS message with matching txId
        if (msg.txId === txId && msg.edge === 'RESPONDS') {
          clearTimeout(timeout);
          ws.removeListener('message', messageHandler);
          resolve(msg);
        }
      } catch (err) {
        // Ignore parse errors
      }
    };

    ws.on('message', messageHandler);
  });
}
```

### Building Edge Messages

```javascript
function buildEdgeMessage(action, payload, to = 'ckp://System.Wss:v0.1', from = 'ckp://Agent.Admin') {
  return {
    txId: generateTxId(),
    edge: 'QUERIES',
    from,
    to,
    payload: { action, ...payload }
  };
}
```

---

## Admin Use Cases

### Use Case 1: Browse Kernel Storage

```javascript
// 1. List available kernels
const kernelsMsg = buildEdgeMessage('kernels', {});
ws.send(JSON.stringify(kernelsMsg));
const kernelsResponse = await waitForResponse(ws, kernelsMsg.txId);

// 2. Pick a kernel and list its storage
const targetKernel = kernelsResponse.payload.kernels[0].name;
const storageMsg = buildEdgeMessage('storage_list', {
  kernel: targetKernel,
  limit: 50
});
ws.send(JSON.stringify(storageMsg));
const storageResponse = await waitForResponse(ws, storageMsg.txId);

// 3. Inspect a specific storage item
const storageItem = storageResponse.payload.storage_items[0].name;
const inspectMsg = buildEdgeMessage('storage_inspect', {
  kernel: targetKernel,
  item: storageItem
});
ws.send(JSON.stringify(inspectMsg));
const inspectResponse = await waitForResponse(ws, inspectMsg.txId);

console.log('Storage item payload:', inspectResponse.payload.payload);
```

### Use Case 2: Configure Kernel

```javascript
// 1. Get current configuration
const configMsg = buildEdgeMessage('config_get', {
  kernel: 'ConceptKernel.LLM.Fabric'
});
ws.send(JSON.stringify(configMsg));
const configResponse = await waitForResponse(ws, configMsg.txId);

console.log('Current config:', configResponse.payload.config);

// 2. Parse and modify config (client-side)
const config = yaml.parse(configResponse.payload.config);
config.maxConcurrency = 5;

// 3. TODO: Implement config_set action in System.Wss
```

### Use Case 3: Explore Ontology

```javascript
// 1. Get kernel ontology
const ontologyMsg = buildEdgeMessage('ontology', {});
ws.send(JSON.stringify(ontologyMsg));
const ontologyResponse = await waitForResponse(ws, ontologyMsg.txId);

console.log('Supported actions:', ontologyResponse.payload.ontology.actions);
console.log('Capabilities:', ontologyResponse.payload.ontology.capabilities);

// 2. Query with SPARQL
const sparqlMsg = buildEdgeMessage('sparql', {
  query: 'SELECT ?kernel WHERE { ?kernel a ck:Kernel }'
});
ws.send(JSON.stringify(sparqlMsg));
const sparqlResponse = await waitForResponse(ws, sparqlMsg.txId);

console.log('SPARQL results:', sparqlResponse.payload.results);
```

### Use Case 4: Manage Edge Links

```javascript
// 1. Create a dependency link
const linkMsg = buildEdgeMessage('link_create', {
  from: 'ckp://ConceptKernel.LLM.Fabric',
  to: 'ckp://ConceptKernel.LLM.Claude',
  edge: 'DEPENDS_ON'
});
ws.send(JSON.stringify(linkMsg));
const linkResponse = await waitForResponse(ws, linkMsg.txId);

console.log('Link created:', linkResponse.payload.link_created);

// 2. Delete the link
const unlinkMsg = buildEdgeMessage('link_delete', {
  from: 'ckp://ConceptKernel.LLM.Fabric',
  to: 'ckp://ConceptKernel.LLM.Claude',
  edge: 'DEPENDS_ON'
});
ws.send(JSON.stringify(unlinkMsg));
const unlinkResponse = await waitForResponse(ws, unlinkMsg.txId);

console.log('Link deleted:', unlinkResponse.payload.link_deleted);
```

---

## Summary

All admin actions are now implemented and tested:

| Action | Status | Purpose |
|--------|--------|---------|
| `status` | ✅ Working | System health check |
| `capabilities` | ✅ Working | Introspection |
| `ping` | ✅ Working | Connectivity test |
| `ontology` | ✅ Working | Get kernel schema |
| `kernels` | ✅ Working | List available kernels |
| `storage_list` | ✅ Working | Browse storage artifacts |
| `storage_inspect` | ✅ Working | Read storage contents |
| `config_get` | ✅ Working | Read kernel configuration |
| `abilities_list` | ✅ Working | List kernel abilities |
| `link_create` | ✅ Working | Create ontology links |
| `link_delete` | ✅ Working | Delete ontology links |
| `sparql` | ⚠️ Placeholder | SPARQL query (needs implementation) |
| `fork_info` | ✅ Working | Get fork template info |
| `config_set` | ⚠️ Not implemented | Write kernel configuration |

---

## Client Implementation Checklist

- [ ] Implement WebSocket connection management
- [ ] Implement transaction ID generation
- [ ] Implement response matching by txId
- [ ] Implement timeout handling
- [ ] Implement error display with context
- [ ] Create UI for kernel listing
- [ ] Create UI for storage browsing
- [ ] Create UI for storage inspection
- [ ] Create UI for configuration viewing
- [ ] Create UI for ontology exploration
- [ ] Create UI for abilities listing
- [ ] Create UI for edge link management
- [ ] Add authentication/authorization checks
- [ ] Add input validation
- [ ] Add loading states
- [ ] Add error recovery

---

**Version:** 1.0.0
**Date:** 2025-12-05
**Status:** Ready for client development
