/**
 * Test WSS → Fabric → WSS Roundtrip
 *
 * Flow:
 * 1. Client sends REQUESTS to Fabric via WSS
 * 2. Governor writes task to Fabric inbox
 * 3. Fabric executes (cold kernel)
 * 4. Fabric mints storage instance
 * 5. Governor creates symlink in .edges/PRODUCES.ConceptKernel.LLM.Fabric/
 * 6. WSS detects notification, processes, emits over WebSocket
 * 7. Client receives response
 */

const WebSocket = require('ws');

const WSS_URL = 'ws://localhost:56001';

function generateTxId() {
  const timestamp = Date.now();
  const shortGuid = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${shortGuid}`;
}

async function testFabricRoundtrip() {
  console.log('🧪 Testing WSS → Fabric → WSS Roundtrip\n');

  const ws = new WebSocket(WSS_URL);

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });

  console.log('✅ Connected to System.Wss\n');

  // Skip welcome message
  await new Promise((resolve) => ws.once('message', resolve));

  // Send request to Fabric
  const txId = generateTxId();
  const fabricRequest = {
    txId,
    edge: 'REQUESTS',
    from: 'ckp://Agent.TestClient',
    to: 'ckp://ConceptKernel.LLM.Fabric:v0.1',
    payload: {
      query: 'What is ConceptKernel?',
      pattern: 'extract_wisdom'
    }
  };

  console.log('📤 Sending REQUESTS to Fabric:');
  console.log(JSON.stringify(fabricRequest, null, 2));
  console.log('');

  ws.send(JSON.stringify(fabricRequest));

  // Wait for response
  console.log('⏳ Waiting for Fabric response via WSS broadcast...\n');

  const timeout = setTimeout(() => {
    console.log('❌ Timeout - No response received after 30 seconds');
    ws.close();
    process.exit(1);
  }, 30000);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      console.log('📥 Received message:');
      console.log(JSON.stringify(msg, null, 2));
      console.log('');

      // Check if this is our response (not just acknowledgment)
      if (msg.txId === txId && (msg.edge === 'RESPONDS' || msg.edge === 'PRODUCES')) {
        clearTimeout(timeout);
        console.log('✅ Received response from Fabric!');
        console.log('');
        console.log('📊 Response payload:');
        console.log(JSON.stringify(msg.payload || msg.data, null, 2));
        ws.close();
        process.exit(0);
      }

      // Log acknowledgments but keep waiting
      if (msg.type === 'kernel_request_accepted') {
        console.log('ℹ️  Request acknowledged - waiting for actual response...\n');
      }
    } catch (err) {
      console.log('⚠️  Parse error:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('\n🔌 Connection closed');
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message);
    process.exit(1);
  });
}

testFabricRoundtrip().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
