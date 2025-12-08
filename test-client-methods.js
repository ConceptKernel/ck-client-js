#!/usr/bin/env node

/**
 * Test all new client methods for CKP Explorer
 */

const ConceptKernel = require('./index.js');

async function testAllMethods() {
    console.log('🧪 Testing CK Client Methods\n');
    console.log('═'.repeat(80));

    try {
        // Connect
        console.log('Connecting to System.Wss...');
        const ck = await ConceptKernel.connect('http://localhost:56000');
        console.log('✅ Connected\n');

        // 1. List Kernels
        console.log('━'.repeat(80));
        console.log('1️⃣  Testing listKernels()');
        console.log('━'.repeat(80));
        const kernels = await ck.listKernels();
        console.log(`✅ Found ${kernels.count} kernels`);
        console.log(`   First 5: ${kernels.kernels.slice(0, 5).join(', ')}\n`);

        // 2. Get Capabilities
        console.log('━'.repeat(80));
        console.log('2️⃣  Testing getCapabilities()');
        console.log('━'.repeat(80));
        const caps = await ck.getCapabilities();
        console.log(`✅ Capabilities:`, caps.capabilities);
        console.log(`   Version: ${caps.version}\n`);

        // 3. Get Ontology
        console.log('━'.repeat(80));
        console.log('3️⃣  Testing getOntology()');
        console.log('━'.repeat(80));
        const ont = await ck.getOntology();
        console.log(`✅ Ontology actions:`, ont.ontology.actions);
        console.log(`   Predicates: ${ont.ontology.predicates.join(', ')}\n`);

        // 4. Query Storage
        console.log('━'.repeat(80));
        console.log('4️⃣  Testing queryStorage()');
        console.log('━'.repeat(80));
        const storage = await ck.queryStorage('ConceptKernel.LLM.Fabric', { limit: 5 });
        console.log(`✅ Storage items: ${storage.count}`);
        console.log(`   Items:`, storage.storage_items || []);
        console.log();

        // 5. Inspect Storage (if items exist)
        if (storage.storage_items && storage.storage_items.length > 0) {
            console.log('━'.repeat(80));
            console.log('5️⃣  Testing inspectStorage()');
            console.log('━'.repeat(80));
            const itemObj = storage.storage_items[0];
            const itemName = itemObj.name || itemObj; // Extract name if object, else use as-is
            const inspection = await ck.inspectStorage('ConceptKernel.LLM.Fabric', itemName);
            console.log(`✅ Inspected: ${itemName}`);
            console.log(`   Process URN: ${inspection.payload?.processUrn || 'N/A'}`);
            console.log(`   Duration: ${inspection.payload?.duration_ms || 'N/A'}ms\n`);
        }

        // 6. Get Config
        console.log('━'.repeat(80));
        console.log('6️⃣  Testing getConfig()');
        console.log('━'.repeat(80));
        const config = await ck.getConfig('ConceptKernel.LLM.Fabric');
        console.log(`✅ Config exists: ${config.exists}`);
        if (config.exists && config.config) {
            const parsed = JSON.parse(config.config);
            console.log(`   Kernel: ${parsed.metadata?.name}`);
            console.log(`   Type: ${parsed.metadata?.type}`);
            console.log(`   Version: ${parsed.metadata?.version}\n`);
        }

        // 7. Introspect
        console.log('━'.repeat(80));
        console.log('7️⃣  Testing introspect()');
        console.log('━'.repeat(80));
        const intro = await ck.introspect('ConceptKernel.LLM.Fabric');
        console.log(`✅ Introspection complete`);
        console.log(`   API Version: ${intro.apiVersion}`);
        console.log(`   Kind: ${intro.kind}\n`);

        console.log('═'.repeat(80));
        console.log('✅ ALL TESTS PASSED!');
        console.log('═'.repeat(80));

        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testAllMethods();
