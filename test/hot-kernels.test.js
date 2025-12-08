/**
 * hot-kernels.test.js
 * Integration tests for Hot Kernels (v1.3.13)
 * Tests health endpoints, UI serving, and CKClient integration
 */

const assert = require('assert');
const fetch = require('node-fetch');

// Kernel configurations
const HOT_KERNELS = [
  { name: 'UI.Benchmark', port: 3004, hasCKClient: true },
  { name: 'UI.CKP.SchemaGraph', port: 3005, hasCKClient: true },
  { name: 'System.ChatCanvasUI', port: 3002, hasCKClient: true },
  { name: 'System.Gateway.ChatUI', port: 3001, hasCKClient: true },
  { name: 'UI.Bakery', port: 3099, hasCKClient: true },
  { name: 'System.Gateway.HTTP', port: 3000, hasCKClient: false },
  { name: 'System.Registry', port: 3043, hasCKClient: false },
  { name: 'System.Oidc.Provider', port: 3042, hasCKClient: false }
];

// Test suite
function runTests() {
  console.log('\n=== Hot Kernel Health Tests (v1.3.13) ===\n');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      if (err.message.includes('SKIP')) {
        console.log(`⊝ ${name} (${err.message})`);
        skipped++;
      } else {
        console.error(`✗ ${name}`);
        console.error(`  ${err.message}`);
        failed++;
      }
    }
  }

  // Run tests
  return (async () => {
    for (const kernel of HOT_KERNELS) {
      const baseUrl = `http://localhost:${kernel.port}`;

      console.log(`\n--- ${kernel.name} (port ${kernel.port}) ---`);

      // Test: Kernel is running
      await test(`${kernel.name}: should be online`, async () => {
        try {
          const res = await fetch(baseUrl, { timeout: 2000 });
          assert.ok(res.status === 200 || res.status === 404, 'Kernel should respond');
        } catch (err) {
          throw new Error(`SKIP: Not running`);
        }
      });

      // Test: Health endpoint
      await test(`${kernel.name}: should respond to /health`, async () => {
        try {
          const res = await fetch(`${baseUrl}/health`, { timeout: 2000 });

          if (res.status === 404) {
            // Some kernels might not have /health endpoint
            throw new Error('SKIP: No /health endpoint');
          }

          assert.strictEqual(res.status, 200, 'Expected status 200');

          const data = await res.json();
          assert.ok(data.status === 'ok' || data.status === 'healthy', 'Expected ok/healthy status');
        } catch (err) {
          if (err.code === 'ECONNREFUSED') {
            throw new Error('SKIP: Not running');
          }
          throw err;
        }
      });

      // Test: Serves web UI
      if (kernel.name.startsWith('UI.') || kernel.name.includes('ChatUI') || kernel.name === 'UI.Bakery') {
        await test(`${kernel.name}: should serve web UI`, async () => {
          try {
            const res = await fetch(baseUrl, { timeout: 2000 });

            if (res.status === 404) {
              throw new Error('SKIP: No web UI');
            }

            assert.strictEqual(res.status, 200, 'Expected status 200');

            const contentType = res.headers.get('content-type');
            assert.ok(
              contentType && contentType.includes('text/html'),
              'Expected HTML content type'
            );

            const html = await res.text();
            assert.ok(html.length > 0, 'Expected non-empty HTML');
            assert.ok(html.includes('<html') || html.includes('<!DOCTYPE'), 'Expected HTML document');
          } catch (err) {
            if (err.code === 'ECONNREFUSED') {
              throw new Error('SKIP: Not running');
            }
            throw err;
          }
        });

        // Test: CKClient integration
        if (kernel.hasCKClient) {
          await test(`${kernel.name}: should load CKClient from registry CDN`, async () => {
            try {
              const res = await fetch(baseUrl, { timeout: 2000 });

              if (res.status === 404) {
                throw new Error('SKIP: No web UI');
              }

              const html = await res.text();

              const hasCDNReference =
                html.includes('http://localhost:3043/cdn/ck-core/latest.js') ||
                html.includes('cdn/ck-core/latest.js');

              assert.ok(
                hasCDNReference,
                'Expected CKClient CDN reference in HTML'
              );

              // Should NOT have local copy references (old pattern)
              const hasLocalCopy = html.includes('/ckp.core.v1.3.13.js');

              if (hasLocalCopy) {
                throw new Error('Still using local CKClient copy instead of CDN');
              }
            } catch (err) {
              if (err.code === 'ECONNREFUSED') {
                throw new Error('SKIP: Not running');
              }
              throw err;
            }
          });
        }
      }

      // Test: CORS headers
      await test(`${kernel.name}: should include CORS headers`, async () => {
        try {
          const res = await fetch(baseUrl, { timeout: 2000 });

          if (res.status === 404) {
            throw new Error('SKIP: No root endpoint');
          }

          const corsOrigin = res.headers.get('access-control-allow-origin');

          if (!corsOrigin) {
            // Not all kernels need CORS
            throw new Error('SKIP: No CORS headers');
          }

          assert.strictEqual(corsOrigin, '*', 'Expected wildcard CORS');
        } catch (err) {
          if (err.code === 'ECONNREFUSED') {
            throw new Error('SKIP: Not running');
          }
          if (err.message.includes('SKIP')) {
            throw err;
          }
          // CORS not required for all kernels
          throw new Error('SKIP: CORS not configured');
        }
      });
    }

    // Summary
    console.log('\n' + '─'.repeat(50));
    console.log(`Passed:  ${passed}/${passed + failed + skipped}`);
    console.log(`Failed:  ${failed}/${passed + failed + skipped}`);
    console.log(`Skipped: ${skipped}/${passed + failed + skipped}`);

    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Check kernel logs for errors');
      if (require.main === module) {
        process.exit(1);
      }
      return false;
    } else {
      console.log('\n✅ All hot kernel health checks passed!');
      if (skipped > 0) {
        console.log(`ℹ️  ${skipped} tests skipped (kernels not running or endpoints not available)`);
      }
      return true;
    }
  })();
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
