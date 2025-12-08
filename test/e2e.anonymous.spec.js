/**
 * Stage 1: Anonymous User Flow - Comprehensive E2E Tests
 *
 * Tests the foundation of ConceptKernel client communication:
 * 1. Create new anonymous session
 * 2. Establish WebSocket connection to System.Gateway
 * 3. Verify connection handshake and session token
 * 4. Test echo service (send message → receive echo)
 * 5. Verify bidirectional message flow
 * 6. Test connection stability (no unexpected disconnects)
 * 7. Validate session cleanup on disconnect
 *
 * Success Criteria:
 * - All anonymous operations complete without authentication
 * - Echo service responds within 100ms
 * - Connection remains stable for 60 seconds
 * - Session cleanup leaves no orphaned resources
 *
 * Version: v1.3.18
 * Date: 2025-12-04
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Environment configuration
const CK_PROJECT_PATH = process.env.CK_PROJECT_PATH || path.resolve(__dirname, '../..');
const CK_BASE_PORT = parseInt(process.env.CK_BASE_PORT || '56000');
const CK_GATEWAY_PORT = CK_BASE_PORT + 0; // System.Gateway always at base_port + 0
const GATEWAY_URL = `http://localhost:${CK_GATEWAY_PORT}`;

// Test configuration
const ECHO_SERVICE_TIMEOUT = 5000; // Echo should respond within 5s
const CONNECTION_STABILITY_DURATION = 60000; // Connection should stay stable for 60s
const EXPECTED_ECHO_LATENCY = 100; // Echo should respond within 100ms

test.describe('Stage 1: Anonymous User Flow', () => {
  let consoleLogs = [];
  let consoleErrors = [];
  let pageReloaded = false;
  let connectionDropped = false;
  let testStartTime = null;
  let sessionMetrics = {
    connectionTime: null,
    tokenReceivedTime: null,
    firstEchoLatency: null,
    messageCount: 0,
    errorsCount: 0,
    connectionDrops: 0
  };

  test.beforeEach(async ({ page }) => {
    // Reset tracking variables
    consoleLogs = [];
    consoleErrors = [];
    pageReloaded = false;
    connectionDropped = false;
    testStartTime = Date.now();
    sessionMetrics = {
      connectionTime: null,
      tokenReceivedTime: null,
      firstEchoLatency: null,
      messageCount: 0,
      errorsCount: 0,
      connectionDrops: 0
    };

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      const timestamp = Date.now() - testStartTime;
      const logEntry = { timestamp, type: msg.type(), text };

      consoleLogs.push(logEntry);
      console.log(`[+${timestamp}ms] [${msg.type()}] ${text}`);

      if (msg.type() === 'error') {
        consoleErrors.push(logEntry);
        sessionMetrics.errorsCount++;
      }

      // Track connection events
      if (text.includes('WebSocket connected') || text.includes('Connected to gateway')) {
        if (!sessionMetrics.connectionTime) {
          sessionMetrics.connectionTime = timestamp;
        }
      }

      // Track token receipt
      if (text.includes('Token received') || text.includes('Anonymous token')) {
        if (!sessionMetrics.tokenReceivedTime) {
          sessionMetrics.tokenReceivedTime = timestamp;
        }
      }

      // Track connection drops
      if (text.includes('WebSocket disconnected') || text.includes('Connection lost')) {
        connectionDropped = true;
        sessionMetrics.connectionDrops++;
      }

      // Track messages
      if (text.includes('Message sent') || text.includes('emit:')) {
        sessionMetrics.messageCount++;
      }
    });

    // Detect page reload events
    let loadCount = 0;
    page.on('load', () => {
      loadCount++;
      if (loadCount > 1) {
        pageReloaded = true;
        console.error(`\n❌ PAGE RELOADED (unexpected)\n`);
      }
    });

    // Capture uncaught exceptions
    page.on('pageerror', error => {
      const timestamp = Date.now() - testStartTime;
      console.error(`\n❌ UNCAUGHT EXCEPTION at +${timestamp}ms:`, error.message);
      consoleErrors.push({ timestamp, text: `UNCAUGHT: ${error.message}` });
      sessionMetrics.errorsCount++;
    });

    // Capture network errors
    page.on('requestfailed', request => {
      const timestamp = Date.now() - testStartTime;
      console.error(`\n❌ REQUEST FAILED at +${timestamp}ms:`, request.url(), request.failure().errorText);
    });
  });

  test.afterEach(() => {
    // Print session metrics summary
    console.log('\n📊 SESSION METRICS SUMMARY:');
    console.log(`  Connection Time: ${sessionMetrics.connectionTime || 'N/A'}ms`);
    console.log(`  Token Received Time: ${sessionMetrics.tokenReceivedTime || 'N/A'}ms`);
    console.log(`  First Echo Latency: ${sessionMetrics.firstEchoLatency || 'N/A'}ms`);
    console.log(`  Messages Sent: ${sessionMetrics.messageCount}`);
    console.log(`  Errors Count: ${sessionMetrics.errorsCount}`);
    console.log(`  Connection Drops: ${sessionMetrics.connectionDrops}`);
    console.log(`  Page Reloaded: ${pageReloaded}`);
    console.log(`  Total Console Logs: ${consoleLogs.length}`);
  });

  test('should create new anonymous session', async ({ page }) => {
    console.log(`\n🚀 TEST: Create Anonymous Session`);
    console.log(`   Gateway URL: ${GATEWAY_URL}`);
    console.log(`   Project Path: ${CK_PROJECT_PATH}`);

    // Navigate to test client HTML
    const testHtmlPath = path.resolve(__dirname, '../examples/demo.html');
    const fileUrl = `file://${testHtmlPath}`;

    console.log(`   Opening: ${fileUrl}`);

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    console.log('✓ Page loaded');

    // Inject ConceptKernel client library if not already loaded
    const ckLoaded = await page.evaluate(() => typeof ConceptKernel !== 'undefined');

    if (!ckLoaded) {
      console.log('   Injecting ConceptKernel library...');
      const clientLibPath = path.resolve(__dirname, '../index.js');
      const clientLibContent = fs.readFileSync(clientLibPath, 'utf-8');
      await page.addScriptTag({ content: clientLibContent });
      console.log('✓ ConceptKernel library injected');
    } else {
      console.log('✓ ConceptKernel library already loaded');
    }

    // Create anonymous session
    const sessionResult = await page.evaluate(async (gatewayUrl) => {
      try {
        // Connect without authentication (anonymous)
        const ck = await ConceptKernel.connect(gatewayUrl, {
          autoConnect: true  // Establish WebSocket connection
        });

        return {
          success: true,
          hasToken: !!ck.token,
          isAuthenticated: ck.authenticated,
          actor: ck.actor,
          roles: ck.roles,
          token: ck.token ? ck.token.substring(0, 20) + '...' : null,
          services: ck.getAvailableServices()
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, GATEWAY_URL);

    console.log('   Session Result:', JSON.stringify(sessionResult, null, 2));

    // Verify anonymous session created
    expect(sessionResult.success).toBe(true);
    expect(sessionResult.hasToken).toBe(true);
    expect(sessionResult.isAuthenticated).toBe(false);
    expect(sessionResult.actor).toContain('anonymous');
    expect(sessionResult.services).toContain('gateway');
    expect(sessionResult.services).toContain('websocket');

    console.log('✓ Anonymous session created successfully');
    console.log(`   Actor: ${sessionResult.actor}`);
    console.log(`   Roles: ${sessionResult.roles.join(', ')}`);
    console.log(`   Token: ${sessionResult.token}`);
    console.log(`   Services: ${sessionResult.services.join(', ')}`);
  });

  test('should establish WebSocket connection and verify handshake', async ({ page }) => {
    console.log(`\n🔌 TEST: WebSocket Connection & Handshake`);

    const testHtmlPath = path.resolve(__dirname, '../examples/demo.html');
    const fileUrl = `file://${testHtmlPath}`;

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Inject library if needed
    const ckLoaded = await page.evaluate(() => typeof ConceptKernel !== 'undefined');
    if (!ckLoaded) {
      const clientLibPath = path.resolve(__dirname, '../index.js');
      const clientLibContent = fs.readFileSync(clientLibPath, 'utf-8');
      await page.addScriptTag({ content: clientLibContent });
    }

    // Establish connection and monitor handshake
    const handshakeResult = await page.evaluate(async (gatewayUrl) => {
      const handshakeEvents = [];
      const startTime = Date.now();

      try {
        const ck = await ConceptKernel.connect(gatewayUrl, { autoConnect: true });

        // Wait for WebSocket ready state
        let wsReady = false;
        const checkInterval = setInterval(() => {
          if (ck.ws && ck.ws.readyState === 1) {
            wsReady = true;
            clearInterval(checkInterval);
          }
        }, 50);

        await new Promise(resolve => {
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 3000);
        });

        const connectionTime = Date.now() - startTime;

        // Listen for initial events
        const eventPromise = new Promise(resolve => {
          const timeout = setTimeout(() => resolve([]), 2000);
          const events = [];

          ck.on('event', (event) => {
            events.push(event);
            if (events.length >= 1) {
              clearTimeout(timeout);
              resolve(events);
            }
          });
        });

        const receivedEvents = await eventPromise;

        return {
          success: true,
          wsReady,
          connectionTime,
          readyState: ck.ws ? ck.ws.readyState : null,
          eventsReceived: receivedEvents.length,
          firstEvent: receivedEvents[0] || null,
          hasToken: !!ck.token
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, GATEWAY_URL);

    console.log('   Handshake Result:', JSON.stringify(handshakeResult, null, 2));

    // Verify handshake success
    expect(handshakeResult.success).toBe(true);
    expect(handshakeResult.wsReady).toBe(true);
    expect(handshakeResult.readyState).toBe(1); // WebSocket.OPEN
    expect(handshakeResult.connectionTime).toBeLessThan(5000); // Connect within 5s
    expect(handshakeResult.hasToken).toBe(true);

    console.log('✓ WebSocket connection established');
    console.log(`   Connection Time: ${handshakeResult.connectionTime}ms`);
    console.log(`   Ready State: ${handshakeResult.readyState} (1 = OPEN)`);
    console.log(`   Events Received: ${handshakeResult.eventsReceived}`);

    if (handshakeResult.firstEvent) {
      console.log(`   First Event Type: ${handshakeResult.firstEvent.type || 'N/A'}`);
    }
  });

  test('should test echo service with single message', async ({ page }) => {
    console.log(`\n📡 TEST: Echo Service - Single Message`);

    const testHtmlPath = path.resolve(__dirname, '../examples/demo.html');
    const fileUrl = `file://${testHtmlPath}`;

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Inject library
    const ckLoaded = await page.evaluate(() => typeof ConceptKernel !== 'undefined');
    if (!ckLoaded) {
      const clientLibPath = path.resolve(__dirname, '../index.js');
      const clientLibContent = fs.readFileSync(clientLibPath, 'utf-8');
      await page.addScriptTag({ content: clientLibContent });
    }

    // Send echo message and measure latency
    const echoResult = await page.evaluate(async (gatewayUrl) => {
      try {
        const ck = await ConceptKernel.connect(gatewayUrl, { autoConnect: true });

        // Wait for connection ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        const testPayload = {
          message: 'Hello ConceptKernel',
          timestamp: Date.now(),
          testId: 'stage1-echo-test'
        };

        const sendTime = Date.now();

        // Send to echo service
        const result = await ck.emit('System.Echo', testPayload);

        // Wait for echo response
        const echoPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000);

          ck.on('event', (event) => {
            if (event.txId === result.txId ||
                (event.payload && event.payload.testId === testPayload.testId)) {
              const receiveTime = Date.now();
              clearTimeout(timeout);
              resolve({
                event,
                latency: receiveTime - sendTime
              });
            }
          });
        });

        const echoResponse = await echoPromise;

        return {
          success: true,
          txId: result.txId,
          sent: testPayload,
          received: echoResponse ? echoResponse.event : null,
          latency: echoResponse ? echoResponse.latency : null,
          echoReceived: !!echoResponse
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, GATEWAY_URL);

    console.log('   Echo Result:', JSON.stringify(echoResult, null, 2));

    // Verify echo response
    expect(echoResult.success).toBe(true);
    expect(echoResult.txId).toBeTruthy();
    expect(echoResult.echoReceived).toBe(true);

    if (echoResult.latency) {
      expect(echoResult.latency).toBeLessThan(EXPECTED_ECHO_LATENCY);
      sessionMetrics.firstEchoLatency = echoResult.latency;
    }

    console.log('✓ Echo service responded');
    console.log(`   Transaction ID: ${echoResult.txId}`);
    console.log(`   Latency: ${echoResult.latency}ms`);
    console.log(`   Payload Sent: ${JSON.stringify(echoResult.sent)}`);

    if (echoResult.received) {
      console.log(`   Payload Received: ${JSON.stringify(echoResult.received)}`);
    }
  });

  test('should verify bidirectional message flow (5 messages)', async ({ page }) => {
    console.log(`\n↔️  TEST: Bidirectional Message Flow (5 messages)`);

    const testHtmlPath = path.resolve(__dirname, '../examples/demo.html');
    const fileUrl = `file://${testHtmlPath}`;

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Inject library
    const ckLoaded = await page.evaluate(() => typeof ConceptKernel !== 'undefined');
    if (!ckLoaded) {
      const clientLibPath = path.resolve(__dirname, '../index.js');
      const clientLibContent = fs.readFileSync(clientLibPath, 'utf-8');
      await page.addScriptTag({ content: clientLibContent });
    }

    // Send 5 messages and verify all responses
    const flowResult = await page.evaluate(async (gatewayUrl) => {
      try {
        const ck = await ConceptKernel.connect(gatewayUrl, { autoConnect: true });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const messageCount = 5;
        const results = [];
        const startTime = Date.now();

        for (let i = 0; i < messageCount; i++) {
          const payload = {
            message: `Test message ${i + 1}`,
            messageNumber: i + 1,
            timestamp: Date.now()
          };

          const sendTime = Date.now();
          const emitResult = await ck.emit('System.Echo', payload);

          // Wait for response
          const responsePromise = new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 3000);

            ck.on('event', (event) => {
              if (event.txId === emitResult.txId) {
                clearTimeout(timeout);
                resolve({
                  received: true,
                  latency: Date.now() - sendTime,
                  event
                });
              }
            });
          });

          const response = await responsePromise;

          results.push({
            messageNumber: i + 1,
            txId: emitResult.txId,
            sent: payload,
            response: response,
            latency: response ? response.latency : null
          });

          // Small delay between messages
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        const totalTime = Date.now() - startTime;
        const successCount = results.filter(r => r.response).length;

        return {
          success: true,
          messageCount,
          successCount,
          totalTime,
          results,
          allReceived: successCount === messageCount
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, GATEWAY_URL);

    console.log(`   Flow Result: ${flowResult.successCount}/${flowResult.messageCount} messages echoed`);

    // Verify all messages received
    expect(flowResult.success).toBe(true);
    expect(flowResult.allReceived).toBe(true);
    expect(flowResult.successCount).toBe(flowResult.messageCount);

    console.log('✓ All messages received bidirectionally');
    console.log(`   Total Time: ${flowResult.totalTime}ms`);
    console.log(`   Average Latency: ${flowResult.totalTime / flowResult.messageCount}ms per message`);

    flowResult.results.forEach((result, idx) => {
      console.log(`   Message ${idx + 1}: txId=${result.txId.substring(0, 12)}..., latency=${result.latency}ms`);
    });
  });

  test('should maintain connection stability for 60 seconds', async ({ page }) => {
    console.log(`\n🕒 TEST: Connection Stability (60 seconds)`);

    const testHtmlPath = path.resolve(__dirname, '../examples/demo.html');
    const fileUrl = `file://${testHtmlPath}`;

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Inject library
    const ckLoaded = await page.evaluate(() => typeof ConceptKernel !== 'undefined');
    if (!ckLoaded) {
      const clientLibPath = path.resolve(__dirname, '../index.js');
      const clientLibContent = fs.readFileSync(clientLibPath, 'utf-8');
      await page.addScriptTag({ content: clientLibContent });
    }

    // Establish connection and monitor for 60 seconds
    const stabilityResult = await page.evaluate(async (gatewayUrl, duration) => {
      try {
        const ck = await ConceptKernel.connect(gatewayUrl, { autoConnect: true });
        await new Promise(resolve => setTimeout(resolve, 2000));

        let disconnectCount = 0;
        let reconnectCount = 0;
        const events = [];

        // Monitor connection events
        ck.on('disconnected', () => {
          disconnectCount++;
          events.push({ time: Date.now(), type: 'disconnected' });
        });

        ck.on('connected', () => {
          reconnectCount++;
          events.push({ time: Date.now(), type: 'connected' });
        });

        // Wait for duration
        console.log(`Monitoring connection for ${duration / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, duration));

        const finalState = ck.ws ? ck.ws.readyState : null;

        return {
          success: true,
          disconnectCount,
          reconnectCount,
          finalState,
          stayedConnected: disconnectCount === 0,
          events
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, GATEWAY_URL, CONNECTION_STABILITY_DURATION);

    console.log('   Stability Result:', JSON.stringify(stabilityResult, null, 2));

    // Verify connection stayed stable
    expect(stabilityResult.success).toBe(true);
    expect(stabilityResult.stayedConnected).toBe(true);
    expect(stabilityResult.disconnectCount).toBe(0);
    expect(stabilityResult.finalState).toBe(1); // Still OPEN

    console.log('✓ Connection remained stable');
    console.log(`   Disconnect Events: ${stabilityResult.disconnectCount}`);
    console.log(`   Reconnect Events: ${stabilityResult.reconnectCount}`);
    console.log(`   Final State: ${stabilityResult.finalState} (1 = OPEN)`);
  });

  test('should cleanup session on disconnect', async ({ page }) => {
    console.log(`\n🧹 TEST: Session Cleanup`);

    const testHtmlPath = path.resolve(__dirname, '../examples/demo.html');
    const fileUrl = `file://${testHtmlPath}`;

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Inject library
    const ckLoaded = await page.evaluate(() => typeof ConceptKernel !== 'undefined');
    if (!ckLoaded) {
      const clientLibPath = path.resolve(__dirname, '../index.js');
      const clientLibContent = fs.readFileSync(clientLibPath, 'utf-8');
      await page.addScriptTag({ content: clientLibContent });
    }

    // Create session, disconnect, verify cleanup
    const cleanupResult = await page.evaluate(async (gatewayUrl) => {
      try {
        const ck = await ConceptKernel.connect(gatewayUrl, { autoConnect: true });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const beforeDisconnect = {
          hasToken: !!ck.token,
          hasWs: !!ck.ws,
          wsReadyState: ck.ws ? ck.ws.readyState : null
        };

        // Disconnect
        ck.disconnect();

        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));

        const afterDisconnect = {
          hasToken: !!ck.token,
          hasWs: !!ck.ws,
          wsReadyState: ck.ws ? ck.ws.readyState : null
        };

        return {
          success: true,
          beforeDisconnect,
          afterDisconnect,
          cleanedUp: !afterDisconnect.hasWs || afterDisconnect.wsReadyState === 3 // CLOSED
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, GATEWAY_URL);

    console.log('   Cleanup Result:', JSON.stringify(cleanupResult, null, 2));

    // Verify cleanup
    expect(cleanupResult.success).toBe(true);
    expect(cleanupResult.beforeDisconnect.hasWs).toBe(true);
    expect(cleanupResult.cleanedUp).toBe(true);

    console.log('✓ Session cleanup successful');
    console.log(`   Before: hasWs=${cleanupResult.beforeDisconnect.hasWs}, state=${cleanupResult.beforeDisconnect.wsReadyState}`);
    console.log(`   After: hasWs=${cleanupResult.afterDisconnect.hasWs}, state=${cleanupResult.afterDisconnect.wsReadyState}`);
  });

  test('should not cause page reload during normal operations', async ({ page }) => {
    console.log(`\n🔄 TEST: No Page Reload Verification`);

    const testHtmlPath = path.resolve(__dirname, '../examples/demo.html');
    const fileUrl = `file://${testHtmlPath}`;

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Inject library
    const ckLoaded = await page.evaluate(() => typeof ConceptKernel !== 'undefined');
    if (!ckLoaded) {
      const clientLibPath = path.resolve(__dirname, '../index.js');
      const clientLibContent = fs.readFileSync(clientLibPath, 'utf-8');
      await page.addScriptTag({ content: clientLibContent });
    }

    // Perform typical operations
    await page.evaluate(async (gatewayUrl) => {
      const ck = await ConceptKernel.connect(gatewayUrl, { autoConnect: true });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Send a few messages
      for (let i = 0; i < 3; i++) {
        await ck.emit('System.Echo', { test: i });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }, GATEWAY_URL);

    // Verify no reload occurred
    expect(pageReloaded).toBe(false);
    expect(sessionMetrics.errorsCount).toBe(0);

    console.log('✓ No page reload detected');
    console.log(`   Total operations completed without reload`);
  });
});

/**
 * Test Summary Report
 *
 * Stage 1 covers the following scenarios:
 * 1. ✅ Create anonymous session
 * 2. ✅ Establish WebSocket connection and verify handshake
 * 3. ✅ Test echo service with single message
 * 4. ✅ Verify bidirectional message flow (5 messages)
 * 5. ✅ Maintain connection stability for 60 seconds
 * 6. ✅ Cleanup session on disconnect
 * 7. ✅ No page reload during operations
 *
 * Metrics Collected:
 * - Connection establishment time
 * - Token receipt time
 * - Echo latency (target: <100ms)
 * - Message delivery success rate
 * - Connection stability (target: 0 drops in 60s)
 * - Session cleanup verification
 *
 * Next Stage: Stage 2 - Authentication and Role Upgrade
 */
