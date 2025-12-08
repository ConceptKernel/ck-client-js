/**
 * Comprehensive Admin API Test Suite
 *
 * Tests all admin actions available in ConceptKernel v1.3.18+
 *
 * Usage: node test-admin-api.js
 */

const WebSocket = require('ws');

const WSS_URL = 'ws://localhost:56001';

function generateTxId() {
  const timestamp = Date.now();
  const shortGuid = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${shortGuid}`;
}

function buildEdgeMessage(action, payload, to = 'ckp://System.Wss:v0.1', from = 'ckp://Agent.AdminTest') {
  return {
    txId: generateTxId(),
    edge: 'QUERIES',
    from,
    to,
    payload: { action, ...payload }
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

function printSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

function printResult(testName, passed, data) {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${testName}`);
  if (data) {
    console.log(`   ${JSON.stringify(data, null, 2).split('\n').join('\n   ')}`);
  }
  console.log('');
}

async function runAdminTests() {
  console.log('🚀 Starting ConceptKernel Admin API Test Suite...\n');

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
    // ===== CORE ACTIONS =====
    printSection('CORE ACTIONS');

    // TEST 1: STATUS
    console.log('📊 TEST 1: STATUS');
    const statusMsg = buildEdgeMessage('status', {});
    ws.send(JSON.stringify(statusMsg));
    const statusResponse = await waitForResponse(ws, statusMsg.txId);
    printResult('Status Check',
      statusResponse.payload.status === 'online',
      statusResponse.payload);

    // TEST 2: CAPABILITIES
    console.log('🔍 TEST 2: CAPABILITIES');
    const capabilitiesMsg = buildEdgeMessage('capabilities', {});
    ws.send(JSON.stringify(capabilitiesMsg));
    const capabilitiesResponse = await waitForResponse(ws, capabilitiesMsg.txId);
    printResult('Capabilities Query',
      Array.isArray(capabilitiesResponse.payload.capabilities),
      capabilitiesResponse.payload);

    // TEST 3: PING
    console.log('🏓 TEST 3: PING');
    const pingMsg = buildEdgeMessage('ping', {});
    ws.send(JSON.stringify(pingMsg));
    const pingResponse = await waitForResponse(ws, pingMsg.txId);
    printResult('Ping Test',
      pingResponse.payload.status === 'pong',
      pingResponse.payload);

    // TEST 4: ONTOLOGY
    console.log('🧬 TEST 4: ONTOLOGY');
    const ontologyMsg = buildEdgeMessage('ontology', {});
    ws.send(JSON.stringify(ontologyMsg));
    const ontologyResponse = await waitForResponse(ws, ontologyMsg.txId);
    printResult('Ontology Retrieval',
      ontologyResponse.payload.ontology !== undefined,
      {
        kernel: ontologyResponse.payload.kernel,
        version: ontologyResponse.payload.version,
        actions: ontologyResponse.payload.ontology.actions,
        predicates: ontologyResponse.payload.ontology.predicates
      });

    // ===== DISCOVERY ACTIONS =====
    printSection('DISCOVERY ACTIONS');

    // TEST 5: KERNELS
    console.log('📋 TEST 5: KERNELS');
    const kernelsMsg = buildEdgeMessage('kernels', {});
    ws.send(JSON.stringify(kernelsMsg));
    const kernelsResponse = await waitForResponse(ws, kernelsMsg.txId);
    printResult('Kernels Discovery',
      Array.isArray(kernelsResponse.payload.kernels),
      {
        count: kernelsResponse.payload.count,
        kernels: kernelsResponse.payload.kernels.slice(0, 3).map(k => k.name)
      });

    // Save a kernel for later tests
    const targetKernel = kernelsResponse.payload.kernels.find(k =>
      k.name === 'ConceptKernel.LLM.Fabric' || k.name === 'System.Wss'
    );

    // ===== STORAGE MANAGEMENT =====
    printSection('STORAGE MANAGEMENT');

    if (targetKernel) {
      // TEST 6: STORAGE_LIST
      console.log('💾 TEST 6: STORAGE_LIST');
      const storageListMsg = buildEdgeMessage('storage_list', {
        kernel: targetKernel.name,
        limit: 10
      });
      ws.send(JSON.stringify(storageListMsg));
      const storageListResponse = await waitForResponse(ws, storageListMsg.txId);
      printResult('Storage Listing',
        Array.isArray(storageListResponse.payload.storage_items),
        {
          kernel: storageListResponse.payload.kernel,
          count: storageListResponse.payload.count,
          items: storageListResponse.payload.storage_items.slice(0, 3).map(i => i.name)
        });

      // TEST 7: STORAGE_INSPECT
      if (storageListResponse.payload.storage_items.length > 0) {
        console.log('🔬 TEST 7: STORAGE_INSPECT');
        const storageItem = storageListResponse.payload.storage_items[0];
        const storageInspectMsg = buildEdgeMessage('storage_inspect', {
          kernel: targetKernel.name,
          item: storageItem.name
        });
        ws.send(JSON.stringify(storageInspectMsg));
        const storageInspectResponse = await waitForResponse(ws, storageInspectMsg.txId);
        printResult('Storage Inspection',
          storageInspectResponse.payload.item === storageItem.name,
          {
            kernel: storageInspectResponse.payload.kernel,
            item: storageInspectResponse.payload.item,
            has_payload: storageInspectResponse.payload.payload !== null
          });
      } else {
        console.log('⚠️  TEST 7: STORAGE_INSPECT - Skipped (no storage items)\n');
      }
    } else {
      console.log('⚠️  TEST 6-7: STORAGE - Skipped (no suitable kernel found)\n');
    }

    // ===== CONFIGURATION MANAGEMENT =====
    printSection('CONFIGURATION MANAGEMENT');

    if (targetKernel) {
      // TEST 8: CONFIG_GET
      console.log('⚙️  TEST 8: CONFIG_GET');
      const configGetMsg = buildEdgeMessage('config_get', {
        kernel: targetKernel.name
      });
      ws.send(JSON.stringify(configGetMsg));
      const configGetResponse = await waitForResponse(ws, configGetMsg.txId);
      printResult('Configuration Retrieval',
        configGetResponse.payload.kernel === targetKernel.name,
        {
          kernel: configGetResponse.payload.kernel,
          exists: configGetResponse.payload.exists,
          config_preview: configGetResponse.payload.config
            ? configGetResponse.payload.config.substring(0, 100) + '...'
            : null
        });
    } else {
      console.log('⚠️  TEST 8: CONFIG_GET - Skipped (no suitable kernel found)\n');
    }

    // ===== ABILITIES & ACTIONS =====
    printSection('ABILITIES & ACTIONS');

    // TEST 9: ABILITIES_LIST
    console.log('⚡ TEST 9: ABILITIES_LIST');
    const abilitiesListMsg = buildEdgeMessage('abilities_list', {});
    ws.send(JSON.stringify(abilitiesListMsg));
    const abilitiesListResponse = await waitForResponse(ws, abilitiesListMsg.txId);
    printResult('Abilities Listing',
      Array.isArray(abilitiesListResponse.payload.abilities),
      {
        count: abilitiesListResponse.payload.count,
        abilities: abilitiesListResponse.payload.abilities.map(a => ({
          name: a.name,
          edge: a.edge
        }))
      });

    // ===== EDGE MANIPULATION =====
    printSection('EDGE MANIPULATION (Ontology Graph)');

    // TEST 10: LINK_CREATE
    console.log('🔗 TEST 10: LINK_CREATE');
    const linkCreateMsg = buildEdgeMessage('link_create', {
      from: 'ckp://Agent.AdminTest',
      to: 'ckp://System.Wss',
      edge: 'TESTS'
    });
    ws.send(JSON.stringify(linkCreateMsg));
    const linkCreateResponse = await waitForResponse(ws, linkCreateMsg.txId);
    printResult('Link Creation',
      linkCreateResponse.payload.link_created === true,
      {
        link_created: linkCreateResponse.payload.link_created,
        from: linkCreateResponse.payload.from,
        to: linkCreateResponse.payload.to,
        edge: linkCreateResponse.payload.edge
      });

    // TEST 11: LINK_DELETE
    console.log('🔓 TEST 11: LINK_DELETE');
    const linkDeleteMsg = buildEdgeMessage('link_delete', {
      from: 'ckp://Agent.AdminTest',
      to: 'ckp://System.Wss',
      edge: 'TESTS'
    });
    ws.send(JSON.stringify(linkDeleteMsg));
    const linkDeleteResponse = await waitForResponse(ws, linkDeleteMsg.txId);
    printResult('Link Deletion',
      linkDeleteResponse.payload.link_deleted === true,
      {
        link_deleted: linkDeleteResponse.payload.link_deleted,
        from: linkDeleteResponse.payload.from,
        to: linkDeleteResponse.payload.to,
        edge: linkDeleteResponse.payload.edge
      });

    // ===== ONTOLOGY QUERY =====
    printSection('ONTOLOGY QUERY');

    // TEST 12: SPARQL
    console.log('⚡ TEST 12: SPARQL');
    const sparqlMsg = buildEdgeMessage('sparql', {
      query: 'SELECT ?kernel WHERE { ?kernel a ck:Kernel }',
      limit: 10
    });
    ws.send(JSON.stringify(sparqlMsg));
    const sparqlResponse = await waitForResponse(ws, sparqlMsg.txId);
    printResult('SPARQL Query',
      sparqlResponse.payload.query !== undefined,
      {
        query: sparqlResponse.payload.query,
        message: sparqlResponse.payload.message,
        results: sparqlResponse.payload.results
      });

    // ===== FORKING & TEMPLATES =====
    printSection('FORKING & TEMPLATES');

    // TEST 13: FORK_INFO (all templates)
    console.log('🍴 TEST 13: FORK_INFO (all templates)');
    const forkInfoAllMsg = buildEdgeMessage('fork_info', {});
    ws.send(JSON.stringify(forkInfoAllMsg));
    const forkInfoAllResponse = await waitForResponse(ws, forkInfoAllMsg.txId);
    printResult('Fork Info (All)',
      Array.isArray(forkInfoAllResponse.payload.templates),
      {
        count: forkInfoAllResponse.payload.count,
        templates: forkInfoAllResponse.payload.templates.map(t => t.name)
      });

    // TEST 14: FORK_INFO (specific template)
    if (forkInfoAllResponse.payload.templates.length > 0) {
      console.log('🍴 TEST 14: FORK_INFO (specific template)');
      const templateName = forkInfoAllResponse.payload.templates[0].name;
      const forkInfoSpecificMsg = buildEdgeMessage('fork_info', {
        template: templateName
      });
      ws.send(JSON.stringify(forkInfoSpecificMsg));
      const forkInfoSpecificResponse = await waitForResponse(ws, forkInfoSpecificMsg.txId);
      printResult('Fork Info (Specific)',
        forkInfoSpecificResponse.payload.template !== undefined,
        forkInfoSpecificResponse.payload.template);
    } else {
      console.log('⚠️  TEST 14: FORK_INFO (specific) - Skipped (no templates found)\n');
    }

    // ===== ERROR HANDLING =====
    printSection('ERROR HANDLING');

    // TEST 15: Invalid Action
    console.log('❌ TEST 15: Invalid Action');
    const invalidActionMsg = buildEdgeMessage('nonexistent_action', {});
    ws.send(JSON.stringify(invalidActionMsg));
    const invalidActionResponse = await waitForResponse(ws, invalidActionMsg.txId);
    printResult('Error Handling (Invalid Action)',
      invalidActionResponse.payload.error === true,
      {
        error: invalidActionResponse.payload.error,
        message: invalidActionResponse.payload.message,
        context: invalidActionResponse.payload.context
      });

    // TEST 16: Missing Required Field
    console.log('❌ TEST 16: Missing Required Field');
    const missingFieldMsg = buildEdgeMessage('storage_inspect', {
      kernel: 'System.Wss'
      // Missing 'item' field
    });
    ws.send(JSON.stringify(missingFieldMsg));
    const missingFieldResponse = await waitForResponse(ws, missingFieldMsg.txId);
    printResult('Error Handling (Missing Field)',
      missingFieldResponse.payload.error === true,
      {
        error: missingFieldResponse.payload.error,
        message: missingFieldResponse.payload.message
      });

    // ===== SUMMARY =====
    printSection('TEST SUMMARY');

    console.log('🎉 All admin API tests completed!\n');
    console.log('Test Coverage:');
    console.log('  ✅ Core Actions (status, capabilities, ping, ontology)');
    console.log('  ✅ Discovery (kernels)');
    console.log('  ✅ Storage Management (list, inspect)');
    console.log('  ✅ Configuration Management (config_get)');
    console.log('  ✅ Abilities & Actions (abilities_list)');
    console.log('  ✅ Edge Manipulation (link_create, link_delete)');
    console.log('  ✅ Ontology Query (sparql)');
    console.log('  ✅ Forking & Templates (fork_info)');
    console.log('  ✅ Error Handling (invalid action, missing fields)');
    console.log('');
    console.log('📚 See ADMIN-API-SPEC.md for full documentation');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    ws.close();
  }
}

// Run tests
runAdminTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
