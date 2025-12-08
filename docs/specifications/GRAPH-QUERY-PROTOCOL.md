# Graph Query Protocol

**Version:** 1.0.0
**Date:** 2025-12-06
**Status:** Specification

---

## Overview

ConceptKernel stores ontology as RDF triples (subject-predicate-object) in a graph database. This protocol defines how clients query and visualize the graph structure via WebSocket.

### Use Cases

1. **Force-directed graph visualization** (force-graph, cytoscape, d3)
2. **Network analysis** (centrality, clustering, paths)
3. **Ontology exploration** (SPARQL queries)
4. **Transaction flow tracking** (real-time edge updates)

---

## Protocol Endpoints

All queries use the ConceptKernel Edge protocol via `System.Wss`.

### Client Methods (ck-client-js)

```javascript
// 1. Query full graph structure
const graph = await ck.queryGraph(options);

// 2. Execute custom SPARQL
const results = await ck.querySPARQL(sparqlString);

// 3. Get available predicates
const predicates = await ck.getPredicates();
```

---

## 1. Query Graph Structure

### Request

```javascript
await ck.queryGraph({
    format: 'force-graph',        // Output format
    includeLabels: true,          // Include rdfs:label
    predicates: ['QUERIES'],      // Filter by predicates (optional)
    maxDepth: 3                   // Traversal depth (optional)
});
```

### Edge Message (to System.Wss)

```json
{
    "edge": "QUERIES",
    "from": "ckp://Agent.Anonymous",
    "to": "ckp://System.Wss",
    "txId": "tx_abc123",
    "timestamp": "2025-12-06T10:30:00Z",
    "payload": {
        "action": "query_graph",
        "format": "force-graph",
        "include_labels": true,
        "predicates": ["QUERIES", "ANNOUNCES"],
        "max_depth": 3
    }
}
```

### Response (from System.Wss)

```json
{
    "edge": "RESPONDS",
    "from": "ckp://System.Wss",
    "to": "ckp://Agent.Anonymous",
    "txId": "tx_abc123",
    "timestamp": "2025-12-06T10:30:00.456Z",
    "payload": {
        "nodes": [
            {
                "id": "ckp://System.Gateway",
                "label": "Gateway",
                "type": "kernel",
                "group": "system",
                "val": 15
            },
            {
                "id": "ckp://System.Wss",
                "label": "WebSocket Server",
                "type": "kernel",
                "group": "system",
                "val": 8
            }
        ],
        "links": [
            {
                "source": "ckp://System.Wss",
                "target": "ckp://System.Gateway",
                "predicate": "QUERIES",
                "label": "queries"
            }
        ]
    }
}
```

---

## 2. SPARQL Query

### Request

```javascript
const sparql = `
    PREFIX ck: <http://conceptkernel.org/ontology#>
    SELECT ?kernel ?predicate ?target
    WHERE {
        ?kernel ?predicate ?target .
        FILTER(?predicate = ck:QUERIES)
    }
`;

const results = await ck.querySPARQL(sparql, {
    format: 'json'
});
```

### Edge Message

```json
{
    "edge": "QUERIES",
    "from": "ckp://Agent.Anonymous",
    "to": "ckp://System.Wss",
    "txId": "tx_def456",
    "timestamp": "2025-12-06T10:31:00Z",
    "payload": {
        "action": "sparql",
        "query": "PREFIX ck: <http://conceptkernel.org/ontology#> SELECT ...",
        "format": "json"
    }
}
```

### Response

```json
{
    "edge": "RESPONDS",
    "from": "ckp://System.Wss",
    "to": "ckp://Agent.Anonymous",
    "txId": "tx_def456",
    "timestamp": "2025-12-06T10:31:00.123Z",
    "payload": {
        "head": {
            "vars": ["kernel", "predicate", "target"]
        },
        "results": {
            "bindings": [
                {
                    "kernel": { "type": "uri", "value": "ckp://System.Wss" },
                    "predicate": { "type": "uri", "value": "http://conceptkernel.org/ontology#QUERIES" },
                    "target": { "type": "uri", "value": "ckp://System.Gateway" }
                }
            ]
        }
    }
}
```

---

## 3. Get Predicates

### Request

```javascript
const predicates = await ck.getPredicates();
```

### Edge Message

```json
{
    "edge": "QUERIES",
    "from": "ckp://Agent.Anonymous",
    "to": "ckp://System.Wss",
    "txId": "tx_ghi789",
    "timestamp": "2025-12-06T10:32:00Z",
    "payload": {
        "action": "get_predicates"
    }
}
```

### Response

```json
{
    "edge": "RESPONDS",
    "from": "ckp://System.Wss",
    "to": "ckp://Agent.Anonymous",
    "txId": "tx_ghi789",
    "timestamp": "2025-12-06T10:32:00.789Z",
    "payload": {
        "predicates": [
            "QUERIES",
            "ANNOUNCES",
            "TRANSFORMS",
            "DEPENDS_ON",
            "IMPLEMENTS",
            "EXTENDS"
        ]
    }
}
```

---

## Graph Data Formats

### Force-Graph Format (Default)

Compatible with: https://github.com/vasturiano/force-graph

```json
{
    "nodes": [
        {
            "id": "ckp://System.Gateway",
            "label": "Gateway",
            "type": "kernel",
            "group": "system",
            "val": 15
        }
    ],
    "links": [
        {
            "source": "ckp://System.Wss",
            "target": "ckp://System.Gateway",
            "predicate": "QUERIES",
            "label": "queries"
        }
    ]
}
```

**Fields:**
- `nodes.id` - Unique URN (required)
- `nodes.label` - Display name (from rdfs:label)
- `nodes.type` - Node type (kernel, process, entity)
- `nodes.group` - Visual grouping (system, app, etc.)
- `nodes.val` - Size/weight for visualization
- `links.source` - Source node ID
- `links.target` - Target node ID
- `links.predicate` - Edge type (QUERIES, ANNOUNCES, etc.)
- `links.label` - Human-readable edge label

### Cytoscape Format

Compatible with: https://js.cytoscape.org/

```json
{
    "elements": {
        "nodes": [
            {
                "data": {
                    "id": "ckp://System.Gateway",
                    "label": "Gateway",
                    "type": "kernel"
                }
            }
        ],
        "edges": [
            {
                "data": {
                    "id": "e1",
                    "source": "ckp://System.Wss",
                    "target": "ckp://System.Gateway",
                    "predicate": "QUERIES"
                }
            }
        ]
    }
}
```

### Raw RDF Triples

```json
{
    "triples": [
        {
            "subject": "ckp://System.Wss",
            "predicate": "http://conceptkernel.org/ontology#QUERIES",
            "object": "ckp://System.Gateway"
        }
    ]
}
```

---

## Server Implementation

### System.Wss Handler

The server must handle these actions:

```rust
// In System.Wss message handler
match payload.action {
    "query_graph" => {
        // 1. Query RDF store for triples
        let triples = rdf_store.query_all();

        // 2. Convert to requested format
        let graph = match payload.format {
            "force-graph" => format_as_force_graph(triples),
            "cytoscape" => format_as_cytoscape(triples),
            "raw" => format_as_raw(triples),
            _ => return error("Unknown format")
        };

        // 3. Apply filters
        if let Some(predicates) = payload.predicates {
            graph = filter_by_predicates(graph, predicates);
        }

        // 4. Return response
        respond(graph)
    },

    "sparql" => {
        // Execute SPARQL query
        let results = rdf_store.query_sparql(payload.query);
        respond(results)
    },

    "get_predicates" => {
        // Get distinct predicates
        let predicates = rdf_store.get_distinct_predicates();
        respond({ predicates })
    }
}
```

### SPARQL Examples

#### Get All Kernels

```sparql
PREFIX ck: <http://conceptkernel.org/ontology#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?kernel ?label
WHERE {
    ?kernel rdf:type ck:Kernel .
    OPTIONAL { ?kernel rdfs:label ?label }
}
```

#### Find Kernel Dependencies

```sparql
PREFIX ck: <http://conceptkernel.org/ontology#>

SELECT ?kernel ?dependency
WHERE {
    ?kernel ck:DEPENDS_ON ?dependency .
}
```

#### Get Transaction Flow

```sparql
PREFIX ck: <http://conceptkernel.org/ontology#>

SELECT ?source ?target ?predicate
WHERE {
    ?source ?predicate ?target .
    FILTER(?predicate IN (ck:QUERIES, ck:ANNOUNCES))
}
```

---

## Usage Examples

### Example 1: Visualize Full Graph

```javascript
const ck = await ConceptKernel.connect('http://localhost:56000');

// Query graph
const graph = await ck.queryGraph({
    format: 'force-graph',
    includeLabels: true
});

// Visualize with force-graph
const Graph = ForceGraph();
Graph(document.getElementById('graph'))
    .graphData(graph);
```

### Example 2: Filter by Predicate

```javascript
// Show only QUERIES relationships
const graph = await ck.queryGraph({
    predicates: ['QUERIES']
});

console.log(`${graph.links.length} QUERIES relationships found`);
```

### Example 3: Custom SPARQL Analysis

```javascript
// Find most connected kernels
const sparql = `
    PREFIX ck: <http://conceptkernel.org/ontology#>
    SELECT ?kernel (COUNT(?connection) AS ?count)
    WHERE {
        { ?kernel ?p ?connection }
        UNION
        { ?connection ?p ?kernel }
    }
    GROUP BY ?kernel
    ORDER BY DESC(?count)
    LIMIT 10
`;

const results = await ck.querySPARQL(sparql);
console.log('Top 10 most connected:', results);
```

### Example 4: Get Available Relationships

```javascript
// Discover what predicates exist
const predicates = await ck.getPredicates();

console.log('Available relationships:', predicates);
// ['QUERIES', 'ANNOUNCES', 'TRANSFORMS', 'DEPENDS_ON', ...]
```

---

## Error Handling

### Graph Query Errors

```json
{
    "edge": "RESPONDS",
    "txId": "tx_abc123",
    "payload": {
        "error": "Graph query failed",
        "details": "RDF store unavailable"
    }
}
```

### SPARQL Syntax Errors

```json
{
    "edge": "RESPONDS",
    "txId": "tx_def456",
    "payload": {
        "error": "SPARQL syntax error",
        "details": "Parse error at line 3: unexpected token 'WHERE'"
    }
}
```

---

## Best Practices

### Client-Side

1. **Cache graph data** with TTL (e.g., 60 seconds)
2. **Filter on client** for interactive updates
3. **Use incremental updates** for transactions
4. **Handle large graphs** with pagination/windowing

### Server-Side

1. **Index predicates** for fast filtering
2. **Limit result size** (e.g., max 10,000 triples)
3. **Support depth limits** for traversal
4. **Cache frequent queries**

### Performance

```javascript
// DON'T: Query full graph every second
setInterval(async () => {
    const graph = await ck.queryGraph(); // Expensive!
}, 1000);

// DO: Cache and update incrementally
let cachedGraph = await ck.queryGraph();
ck.on('event', (event) => {
    if (event.type === 'edge_update') {
        updateGraphIncremental(cachedGraph, event);
    }
});
```

---

## Testing

### Test Query

```javascript
// Connect
const ck = await ConceptKernel.connect('http://localhost:56000');

// Query graph
const graph = await ck.queryGraph();

// Verify
console.assert(graph.nodes.length > 0, 'Should have nodes');
console.assert(graph.links.length > 0, 'Should have links');
console.assert(graph.nodes[0].id.startsWith('ckp://'), 'Nodes should have URNs');
console.assert(graph.links[0].predicate, 'Links should have predicates');

console.log('✓ Graph query test passed');
```

---

## Summary

✅ **queryGraph()** - Get graph structure in visualization-ready format
✅ **querySPARQL()** - Execute custom SPARQL queries
✅ **getPredicates()** - Discover available edge types
✅ **Force-graph format** - Direct compatibility with visualization libraries
✅ **Filter by predicate** - Show specific relationship types
✅ **Depth control** - Limit traversal for performance

**Server must implement:** `query_graph`, `sparql`, `get_predicates` actions in System.Wss
