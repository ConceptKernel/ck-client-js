#!/usr/bin/env node
/**
 * Test script for edge-based ck-client-js library
 * Tests the new edge protocol with System.Wss
 */

const ConceptKernel = require('./index.js');
const WebSocket = require('ws');
const fs = require('fs');

// Make WebSocket available globally for the client library
global.WebSocket = WebSocket;

async function testEdgeClient() {
  console.log('=== Testing Edge-Based ck-client-js ===\n');

  // Read port from .ckports file
  const ckportsPath = '/Users/neoxr/git_ckp/ckp.v1.3.18.rust.PH2/.ckports';
  const ckports = JSON.parse(fs.readFileSync(ckportsPath, 'utf8'));
  const port = ckports['System.Wss'] || 56001;

  console.log(`Connecting to System.Wss on port ${port}...\n`);

  // Connect directly to WebSocket (bypassing gateway discovery)
  const wsUrl = `ws://localhost:${port}`;
  const client = new ConceptKernel(wsUrl, {
    identity: 'ckp://Agent.TestClient',
    autoConnect: false
  });

  // Manually connect to WebSocket
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);

    ws.on('open', async () => {
      console.log('✓ Connected to System.Wss\n');
      client.websocket = ws;

      // Setup message handler
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log('Received message:', JSON.stringify(msg, null, 2), '\n');
      });

      try {
        console.log('Test 1: Query System.Wss capabilities (edge-based)');
        console.log('-----------------------------------------------');

        const response = await client.emit('System.Wss', { action: 'capabilities' });

        console.log('✓ Test 1 PASSED: Received RESPONDS message');
        console.log('Response payload:', JSON.stringify(response.payload, null, 2));
        console.log('');

        // Test 2: Query status
        console.log('Test 2: Query System.Wss status');
        console.log('--------------------------------');

        const statusResponse = await client.emit('System.Wss', { action: 'status' });

        console.log('✓ Test 2 PASSED: Received status response');
        console.log('Status payload:', JSON.stringify(statusResponse.payload, null, 2));
        console.log('');

        console.log('=== All tests passed! ===');
        ws.close();
        resolve();
      } catch (error) {
        console.error('✗ Test failed:', error.message);
        ws.close();
        reject(error);
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      reject(err);
    });

    ws.on('close', () => {
      console.log('Connection closed');
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      console.error('✗ Test timeout');
      ws.close();
      reject(new Error('Test timeout'));
    }, 15000);
  });
}

// Run the test
testEdgeClient()
  .then(() => {
    console.log('\n✓ Edge client test completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ Edge client test failed:', err.message);
    process.exit(1);
  });
