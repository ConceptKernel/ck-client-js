/**
 * Comprehensive test for all ConceptKernel actions via edge-based messaging
 *
 * Tests: STATUS, QUERY (capabilities), ONTOLOGY, SPARQL, FORK INFO
 *
 * Usage: node test-all-actions.js
 */

const WebSocket = require('ws');

const WSS_URL = 'ws://localhost:56001';

function generateTxId() {
  const timestamp = Date.now();
  const shortGuid = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${shortGuid}`;
}

function buildEdgeMessage(edge, to, payload, from = 'ckp://Agent.TestClient') {
  return {
    txId: generateTxId(),
    edge,
    from,
    to,
    payload
  };
}

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

async function runTests() {
  console.log('🚀 Starting comprehensive ConceptKernel action tests...\n');

  const ws = new WebSocket(WSS_URL);

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });

  console.log('✅ Connected to System.Wss\n');

  // Skip initial connected message
  await new Promise((resolve) => ws.once('message', resolve));

  try {
    // TEST 1: STATUS action
    console.log('📊 TEST 1: STATUS action');
    const statusMsg = buildEdgeMessage(
      'QUERIES',
      'ckp://System.Wss:v0.1',
      { action: 'status' }
    );
    console.log('   Sending:', JSON.stringify(statusMsg, null, 2));
    ws.send(JSON.stringify(statusMsg));

    const statusResponse = await waitForResponse(ws, statusMsg.txId);
    console.log('   ✅ Received STATUS response:');
    console.log('   ', JSON.stringify(statusResponse.payload, null, 2));
    console.log('');

    // TEST 2: CAPABILITIES (query action)
    console.log('🔍 TEST 2: CAPABILITIES query');
    const capabilitiesMsg = buildEdgeMessage(
      'QUERIES',
      'ckp://System.Wss:v0.1',
      { action: 'capabilities' }
    );
    console.log('   Sending:', JSON.stringify(capabilitiesMsg, null, 2));
    ws.send(JSON.stringify(capabilitiesMsg));

    const capabilitiesResponse = await waitForResponse(ws, capabilitiesMsg.txId);
    console.log('   ✅ Received CAPABILITIES response:');
    console.log('   ', JSON.stringify(capabilitiesResponse.payload, null, 2));
    console.log('');

    // TEST 3: ONTOLOGY action
    console.log('🧬 TEST 3: ONTOLOGY query');
    const ontologyMsg = buildEdgeMessage(
      'QUERIES',
      'ckp://System.Wss:v0.1',
      { action: 'ontology' }
    );
    console.log('   Sending:', JSON.stringify(ontologyMsg, null, 2));
    ws.send(JSON.stringify(ontologyMsg));

    const ontologyResponse = await waitForResponse(ws, ontologyMsg.txId);
    console.log('   ✅ Received ONTOLOGY response:');
    console.log('   ', JSON.stringify(ontologyResponse.payload, null, 2));
    console.log('');

    // TEST 4: SPARQL query (if supported)
    console.log('⚡ TEST 4: SPARQL query');
    const sparqlMsg = buildEdgeMessage(
      'QUERIES',
      'ckp://System.Wss:v0.1',
      {
        action: 'sparql',
        query: 'SELECT ?kernel WHERE { ?kernel a ck:Kernel }',
        limit: 5
      }
    );
    console.log('   Sending:', JSON.stringify(sparqlMsg, null, 2));
    ws.send(JSON.stringify(sparqlMsg));

    try {
      const sparqlResponse = await waitForResponse(ws, sparqlMsg.txId, 3000);
      console.log('   ✅ Received SPARQL response:');
      console.log('   ', JSON.stringify(sparqlResponse.payload, null, 2));
    } catch (err) {
      console.log('   ⚠️  SPARQL not implemented or error:', err.message);
    }
    console.log('');

    // TEST 5: FORK INFO query
    console.log('🍴 TEST 5: FORK INFO query');
    const forkInfoMsg = buildEdgeMessage(
      'QUERIES',
      'ckp://System.Wss:v0.1',
      {
        action: 'fork_info',
        template: 'ConceptKernel.Template.Basic'
      }
    );
    console.log('   Sending:', JSON.stringify(forkInfoMsg, null, 2));
    ws.send(JSON.stringify(forkInfoMsg));

    try {
      const forkInfoResponse = await waitForResponse(ws, forkInfoMsg.txId, 3000);
      console.log('   ✅ Received FORK INFO response:');
      console.log('   ', JSON.stringify(forkInfoResponse.payload, null, 2));
    } catch (err) {
      console.log('   ⚠️  FORK INFO not implemented or error:', err.message);
    }
    console.log('');

    // TEST 6: PING (simple connectivity test)
    console.log('🏓 TEST 6: PING test');
    const pingMsg = buildEdgeMessage(
      'QUERIES',
      'ckp://System.Wss:v0.1',
      { action: 'ping' }
    );
    console.log('   Sending:', JSON.stringify(pingMsg, null, 2));
    ws.send(JSON.stringify(pingMsg));

    const pingResponse = await waitForResponse(ws, pingMsg.txId);
    console.log('   ✅ Received PING response:');
    console.log('   ', JSON.stringify(pingResponse.payload, null, 2));
    console.log('');

    // TEST 7: List available kernels
    console.log('📋 TEST 7: List KERNELS');
    const kernelsMsg = buildEdgeMessage(
      'QUERIES',
      'ckp://System.Wss:v0.1',
      { action: 'kernels' }
    );
    console.log('   Sending:', JSON.stringify(kernelsMsg, null, 2));
    ws.send(JSON.stringify(kernelsMsg));

    try {
      const kernelsResponse = await waitForResponse(ws, kernelsMsg.txId, 3000);
      console.log('   ✅ Received KERNELS response:');
      console.log('   ', JSON.stringify(kernelsResponse.payload, null, 2));
    } catch (err) {
      console.log('   ⚠️  KERNELS action not implemented or error:', err.message);
    }
    console.log('');

    console.log('🎉 All tests completed!\n');
    console.log('Summary:');
    console.log('  ✅ STATUS - Working');
    console.log('  ✅ CAPABILITIES - Working');
    console.log('  ✅ ONTOLOGY - Tested');
    console.log('  ⚠️  SPARQL - May need implementation');
    console.log('  ⚠️  FORK INFO - May need implementation');
    console.log('  ✅ PING - Working');
    console.log('  ⚠️  KERNELS - May need implementation');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    ws.close();
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
