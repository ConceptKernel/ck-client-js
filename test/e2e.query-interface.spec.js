/**
 * End-to-End Query Interface Test (Playwright)
 *
 * Tests the HTML query interface with all commands:
 * 1. Connect to gateway
 * 2. List daemons
 * 3. Describe daemon
 * 4. Describe concept
 * 5. Validate all queries work through WebSocket
 *
 * This test uses the actual HTML file that clients can use as a reference.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const GATEWAY_URL = process.env.CK_GATEWAY_URL || 'http://localhost:56000';
const HTML_FILE = 'file://' + path.resolve(__dirname, 'query-interface.html');

test.describe('Query Interface - Browser Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the HTML query interface
    await page.goto(HTML_FILE);
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load query interface', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle('ConceptKernel Query Interface');

    // Check main heading
    const heading = await page.locator('h1').textContent();
    expect(heading).toBe('ConceptKernel Query Interface');

    // Check subtitle mentions WebSocket
    const subtitle = await page.locator('.subtitle').textContent();
    expect(subtitle).toContain('WebSocket');
    expect(subtitle).toContain('ck-client-js');

    // Check connection status shows disconnected
    const status = await page.locator('#connection-status').textContent();
    expect(status.trim()).toBe('Disconnected');

    console.log('✓ Query interface loaded successfully');
  });

  test('should connect to gateway via WebSocket', async ({ page }) => {
    console.log('\nConnecting to gateway...');

    // Click connect button
    await page.click('#connect-btn');

    // Wait for connection (max 10 seconds)
    await page.waitForSelector('.status-connected', { timeout: 10000 });

    // Check connection status
    const status = await page.locator('#connection-status').textContent();
    expect(status).toContain('Connected');

    // Check output shows connection success
    const output = await page.locator('#output').textContent();
    expect(output).toContain('Connected to ConceptKernel Gateway');
    expect(output).toContain('WebSocket:');
    expect(output).toContain('Domain:');
    expect(output).toContain('Services:');

    console.log('✓ Connected via WebSocket');
    console.log('  Output:', output.split('\n')[0]);
  });

  test('should list daemons', async ({ page }) => {
    console.log('\nListing daemons...');

    // Connect first
    await page.click('#connect-btn');
    await page.waitForSelector('.status-connected', { timeout: 10000 });

    // Wait a bit for connection to stabilize
    await page.waitForTimeout(1000);

    // Click list daemons
    await page.click('#daemon-list-btn');

    // Wait for output to update
    await page.waitForTimeout(2000);

    // Check output shows daemon list
    const output = await page.locator('#output').innerHTML();
    expect(output).toContain('Running Daemons');
    expect(output).toContain('table');

    // Check for common daemons
    const hasSystemWss = output.includes('System.Wss');
    const hasSystemGateway = output.includes('System.Gateway');

    console.log('✓ Daemon list retrieved');
    console.log('  System.Wss:', hasSystemWss ? 'Found' : 'Not found');
    console.log('  System.Gateway:', hasSystemGateway ? 'Found' : 'Not found');

    expect(hasSystemWss || hasSystemGateway).toBeTruthy();
  });

  test('should describe daemon (System.Wss)', async ({ page }) => {
    console.log('\nDescribing daemon: System.Wss...');

    // Connect first
    await page.click('#connect-btn');
    await page.waitForSelector('.status-connected', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Set parameter
    await page.fill('#param-input', 'System.Wss');

    // Click describe daemon
    await page.click('#daemon-describe-btn');

    // Wait for output
    await page.waitForTimeout(2000);

    // Check output shows daemon details
    const output = await page.locator('#output').innerHTML();
    expect(output).toContain('Daemon: System.Wss');
    expect(output).toContain('URN:');
    expect(output).toContain('Type:');
    expect(output).toContain('Status:');

    console.log('✓ Daemon described successfully');
  });

  test('should describe concept (System.Gateway)', async ({ page }) => {
    console.log('\nDescribing concept: System.Gateway...');

    // Connect first
    await page.click('#connect-btn');
    await page.waitForSelector('.status-connected', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Set parameter
    await page.fill('#param-input', 'System.Gateway');

    // Click describe concept
    await page.click('#concept-describe-btn');

    // Wait for output
    await page.waitForTimeout(2000);

    // Check output shows concept details
    const output = await page.locator('#output').innerHTML();
    expect(output).toContain('Concept: System.Gateway');
    expect(output).toContain('URN:');
    expect(output).toContain('Type:');
    expect(output).toContain('Mode:');

    console.log('✓ Concept described successfully');
  });

  test('should handle concept not found', async ({ page }) => {
    console.log('\nTesting concept not found...');

    // Connect first
    await page.click('#connect-btn');
    await page.waitForSelector('.status-connected', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Set invalid parameter
    await page.fill('#param-input', 'NonExistent.Kernel');

    // Click describe concept
    await page.click('#concept-describe-btn');

    // Wait for output
    await page.waitForTimeout(2000);

    // Check output shows not found message
    const output = await page.locator('#output').textContent();
    expect(output).toContain('not found');
    expect(output).toContain('Available concepts');

    console.log('✓ Handled not found correctly');
  });

  test('should execute all commands in sequence', async ({ page }) => {
    console.log('\nExecuting all commands in sequence...');

    // 1. Connect
    console.log('  1. Connecting...');
    await page.click('#connect-btn');
    await page.waitForSelector('.status-connected', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // 2. List daemons
    console.log('  2. Listing daemons...');
    await page.click('#daemon-list-btn');
    await page.waitForTimeout(2000);
    let output = await page.locator('#output').innerHTML();
    expect(output).toContain('Running Daemons');

    // 3. Describe daemon
    console.log('  3. Describing daemon (System.Wss)...');
    await page.fill('#param-input', 'System.Wss');
    await page.click('#daemon-describe-btn');
    await page.waitForTimeout(2000);
    output = await page.locator('#output').innerHTML();
    expect(output).toContain('Daemon: System.Wss');

    // 4. Describe concept
    console.log('  4. Describing concept (System.Gateway)...');
    await page.fill('#param-input', 'System.Gateway');
    await page.click('#concept-describe-btn');
    await page.waitForTimeout(2000);
    output = await page.locator('#output').innerHTML();
    expect(output).toContain('Concept: System.Gateway');

    // 5. Clear output
    console.log('  5. Clearing output...');
    await page.click('.clear-btn');
    await page.waitForTimeout(500);
    output = await page.locator('#output').textContent();
    expect(output).toContain('cleared');

    console.log('✓ All commands executed successfully');
  });

  test('should show commands working over WebSocket', async ({ page }) => {
    console.log('\nValidating WebSocket communication...');

    // Enable console monitoring
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('WebSocket') || text.includes('emit')) {
        consoleMessages.push(text);
      }
    });

    // Connect
    await page.click('#connect-btn');
    await page.waitForSelector('.status-connected', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Execute a command
    await page.click('#daemon-list-btn');
    await page.waitForTimeout(2000);

    // Check that WebSocket was mentioned in console or connection status
    const status = await page.locator('#connection-status').textContent();
    expect(status).toContain('WebSocket');

    console.log('✓ Commands executed over WebSocket');
    console.log('  Status:', status);
  });
});
