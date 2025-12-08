/**
 * Edge-Based Message Routing E2E Tests
 *
 * Tests v1.3.18 edge-based protocol routing through System.Wss to kernels
 * Requires running services:
 * - System.Wss (56001) with edge routing support
 * - ConceptKernel.LLM.Fabric with governor watching inbox
 */

const { test, expect } = require('@playwright/test');
const WebSocket = require('ws');

const WSS_URL = 'ws://localhost:56001';
const TEST_TIMEOUT = 15000;

/**
 * Generate transaction ID in format {timestampMs}-{shortGuid}
 */
function generateTxId() {
  const timestamp = Date.now();
  const shortGuid = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${shortGuid}`;
}

/**
 * Build edge-based message
 */
function buildEdgeMessage(edge, to, payload, from = 'ckp://Agent.TestClient') {
  return {
    txId: generateTxId(),
    edge,
    from,
    to,
    payload
  };
}

/**
 * Wait for a response message matching txId
 */
function waitForResponse(ws, txId, timeoutMs = TEST_TIMEOUT) {
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
        // Ignore parse errors, wait for correct message
      }
    };

    ws.on('message', messageHandler);
  });
}

test.describe('Edge-Based Message Routing (v1.3.18)', () => {

  test('should connect to System.Wss via WebSocket', async () => {
    const ws = new WebSocket(WSS_URL);

    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  test('should query System.Wss capabilities using QUERIES edge', async () => {
    const ws = new WebSocket(WSS_URL);
    await new Promise((resolve) => ws.on('open', resolve));

    const msg = buildEdgeMessage(
      'QUERIES',
      'ckp://System.Wss:v0.1',
      { action: 'capabilities' }
    );

    // Send QUERIES message
    ws.send(JSON.stringify(msg));

    // Wait for RESPONDS message
    const response = await waitForResponse(ws, msg.txId);

    expect(response.edge).toBe('RESPONDS');
    expect(response.from).toContain('System.Wss');
    expect(response.to).toContain('Agent.TestClient');
    expect(response.payload).toBeDefined();
    expect(response.payload.capabilities).toBeDefined();

    ws.close();
  });

  test('should route QUERIES message to ConceptKernel.LLM.Fabric', async () => {
    const ws = new WebSocket(WSS_URL);
    await new Promise((resolve) => ws.on('open', resolve));

    const msg = buildEdgeMessage(
      'QUERIES',
      'ckp://ConceptKernel.LLM.Fabric',
      {
        action: 'query',
        query: 'Test query from Playwright',
        pattern: 'test-pattern'
      }
    );

    console.log('[Test] Sending QUERIES message to Fabric:', msg.txId);

    // Send QUERIES message
    ws.send(JSON.stringify(msg));

    // First we should get an acceptance message
    const acceptance = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No acceptance received')), 5000);

      ws.once('message', (data) => {
        clearTimeout(timeout);
        resolve(JSON.parse(data.toString()));
      });
    });

    console.log('[Test] Received acceptance:', acceptance);
    expect(acceptance.type).toBe('kernel_request_accepted');
    expect(acceptance.txId).toBe(msg.txId);
    expect(acceptance.target).toBe('ConceptKernel.LLM.Fabric');

    // Now wait for the actual RESPONDS message from Fabric
    console.log('[Test] Waiting for RESPONDS from Fabric...');
    const response = await waitForResponse(ws, msg.txId, 15000);

    console.log('[Test] Received RESPONDS from Fabric:', response);

    expect(response.edge).toBe('RESPONDS');
    expect(response.from).toContain('ConceptKernel.LLM.Fabric');
    expect(response.txId).toBe(msg.txId);
    expect(response.payload).toBeDefined();

    ws.close();
  });

  test('should handle validation errors with preserved txId', async () => {
    const ws = new WebSocket(WSS_URL);
    await new Promise((resolve) => ws.on('open', resolve));

    // Send an invalid message (missing required fields)
    const invalidMsg = {
      txId: generateTxId(),
      edge: 'QUERIES',
      from: 'ckp://Agent.TestClient',
      to: 'ckp://NonExistent.Kernel',
      payload: {}
    };

    ws.send(JSON.stringify(invalidMsg));

    // Wait for error response
    const response = await waitForResponse(ws, invalidMsg.txId, 5000);

    expect(response.txId).toBe(invalidMsg.txId);
    expect(response.edge).toBe('RESPONDS');
    expect(response.payload.error).toBe(true);
    expect(response.payload.message).toBeDefined();

    ws.close();
  });

  test('should support multiple concurrent queries', async () => {
    const ws = new WebSocket(WSS_URL);
    await new Promise((resolve) => ws.on('open', resolve));

    // Send 3 queries concurrently
    const queries = [
      buildEdgeMessage('QUERIES', 'ckp://System.Wss:v0.1', { action: 'capabilities' }),
      buildEdgeMessage('QUERIES', 'ckp://System.Wss:v0.1', { action: 'status' }),
      buildEdgeMessage('QUERIES', 'ckp://System.Wss:v0.1', { action: 'ping' })
    ];

    // Send all queries
    queries.forEach(q => ws.send(JSON.stringify(q)));

    // Wait for all responses
    const responses = await Promise.all(
      queries.map(q => waitForResponse(ws, q.txId))
    );

    // Verify each response matches its query
    responses.forEach((response, i) => {
      expect(response.txId).toBe(queries[i].txId);
      expect(response.edge).toBe('RESPONDS');
    });

    ws.close();
  });

  test('should validate edge predicate format (SCREAMING_SNAKE_CASE)', async () => {
    const ws = new WebSocket(WSS_URL);
    await new Promise((resolve) => ws.on('open', resolve));

    // Test various valid edge predicates
    const validEdges = ['QUERIES', 'RESPONDS', 'ANNOUNCES', 'TRANSFORMS', 'VALIDATES'];

    for (const edge of validEdges) {
      const msg = buildEdgeMessage(edge, 'ckp://System.Wss:v0.1', { action: 'ping' });
      ws.send(JSON.stringify(msg));

      const response = await waitForResponse(ws, msg.txId, 5000);
      expect(response.edge).toBe('RESPONDS');
    }

    ws.close();
  });

  test('should handle URN with version in "to" field', async () => {
    const ws = new WebSocket(WSS_URL);
    await new Promise((resolve) => ws.on('open', resolve));

    const msg = buildEdgeMessage(
      'QUERIES',
      'ckp://System.Wss:v0.1',  // URN with version
      { action: 'capabilities' }
    );

    ws.send(JSON.stringify(msg));
    const response = await waitForResponse(ws, msg.txId);

    expect(response.edge).toBe('RESPONDS');
    expect(response.from).toContain('System.Wss');

    ws.close();
  });

  test('should maintain transaction context across routing hops', async () => {
    const ws = new WebSocket(WSS_URL);
    await new Promise((resolve) => ws.on('open', resolve));

    const originalTxId = generateTxId();
    const msg = {
      txId: originalTxId,
      edge: 'QUERIES',
      from: 'ckp://Agent.TestClient',
      to: 'ckp://ConceptKernel.LLM.Fabric',
      payload: {
        action: 'query',
        query: 'Transaction context test',
        pattern: 'test'
      }
    };

    ws.send(JSON.stringify(msg));

    // Skip acceptance message
    await new Promise((resolve) => ws.once('message', resolve));

    // Wait for final response
    const response = await waitForResponse(ws, originalTxId, 15000);

    // Verify txId was preserved through the entire chain:
    // Browser → System.Wss → Fabric → System.Wss → Browser
    expect(response.txId).toBe(originalTxId);
    expect(response.edge).toBe('RESPONDS');

    ws.close();
  });
});
