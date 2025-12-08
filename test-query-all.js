#!/usr/bin/env node

/**
 * Test all System.Wss query capabilities
 * Queries the actual source of truth: ontology.ttl and conceptkernel.yaml
 */

const WebSocket = require('ws');

const WSS_URL = 'ws://localhost:56001';

class QueryTester {
    constructor() {
        this.ws = null;
        this.pendingRequests = new Map();
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(WSS_URL);

            this.ws.on('open', () => {
                console.log('✅ Connected to System.Wss\n');
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    this.handleMessage(msg);
                } catch (err) {
                    console.error('❌ Parse error:', err);
                }
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('Connection closed');
            });
        });
    }

    handleMessage(msg) {
        if (msg.type === 'connected') {
            return; // Welcome message
        }

        if (msg.txId && this.pendingRequests.has(msg.txId)) {
            const { resolve } = this.pendingRequests.get(msg.txId);
            this.pendingRequests.delete(msg.txId);
            resolve(msg);
        }
    }

    query(action, payload = {}) {
        return new Promise((resolve, reject) => {
            const txId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

            const message = {
                txId,
                edge: 'QUERIES',
                from: 'ckp://Agent.QueryTester',
                to: 'ckp://System.Wss:v0.1',
                payload: {
                    action,
                    ...payload
                }
            };

            this.pendingRequests.set(txId, { resolve, reject });

            this.ws.send(JSON.stringify(message));

            // Timeout after 5 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(txId)) {
                    this.pendingRequests.delete(txId);
                    reject(new Error('Query timeout'));
                }
            }, 5000);
        });
    }

    async runAllQueries() {
        console.log('═'.repeat(80));
        console.log('  CONCEPTKERNEL QUERY TEST SUITE');
        console.log('  Source of Truth: ontology.ttl + conceptkernel.yaml');
        console.log('═'.repeat(80));
        console.log();

        try {
            // 1. Capabilities
            await this.testCapabilities();

            // 2. Status
            await this.testStatus();

            // 3. Ping
            await this.testPing();

            // 4. Ontology
            await this.testOntology();

            // 5. Kernels List
            await this.testKernelsList();

            // 6. Abilities List
            await this.testAbilitiesList();

            // 7. Storage List
            await this.testStorageList();

            // 8. Storage Inspect
            await this.testStorageInspect();

            // 9. Config Get
            await this.testConfigGet();

            // 10. Fork Info
            await this.testForkInfo();

            // 11. SPARQL (placeholder)
            await this.testSPARQL();

            console.log('\n' + '═'.repeat(80));
            console.log('✅ ALL QUERIES COMPLETED');
            console.log('═'.repeat(80));

        } catch (error) {
            console.error('\n❌ Test failed:', error);
        } finally {
            this.ws.close();
        }
    }

    async testCapabilities() {
        console.log('━'.repeat(80));
        console.log('1️⃣  CAPABILITIES QUERY');
        console.log('━'.repeat(80));

        const response = await this.query('capabilities');
        console.log('Response:', JSON.stringify(response.payload, null, 2));
        console.log();
    }

    async testStatus() {
        console.log('━'.repeat(80));
        console.log('2️⃣  STATUS QUERY');
        console.log('━'.repeat(80));

        const response = await this.query('status');
        console.log('Response:', JSON.stringify(response.payload, null, 2));
        console.log();
    }

    async testPing() {
        console.log('━'.repeat(80));
        console.log('3️⃣  PING QUERY');
        console.log('━'.repeat(80));

        const response = await this.query('ping');
        console.log('Response:', JSON.stringify(response.payload, null, 2));
        console.log();
    }

    async testOntology() {
        console.log('━'.repeat(80));
        console.log('4️⃣  ONTOLOGY QUERY (System.Wss BFO Ontology)');
        console.log('━'.repeat(80));

        const response = await this.query('ontology');
        console.log('Response:', JSON.stringify(response.payload, null, 2));
        console.log();
    }

    async testKernelsList() {
        console.log('━'.repeat(80));
        console.log('5️⃣  KERNELS LIST (All Continuants)');
        console.log('━'.repeat(80));

        const response = await this.query('kernels');
        const kernels = response.payload.kernels || [];

        console.log(`Found ${kernels.length} kernels:\n`);
        kernels.slice(0, 10).forEach((kernel, idx) => {
            console.log(`  ${idx + 1}. ${kernel.name}`);
            console.log(`     URN: ${kernel.urn}`);
            console.log(`     Path: ${kernel.path}`);
            console.log(`     Has Config: ${kernel.has_config}`);
            console.log();
        });

        if (kernels.length > 10) {
            console.log(`  ... and ${kernels.length - 10} more kernels`);
        }

        console.log(`Total: ${response.payload.count} kernels`);
        console.log(`Timestamp: ${response.payload.timestamp}`);
        console.log();
    }

    async testAbilitiesList() {
        console.log('━'.repeat(80));
        console.log('6️⃣  ABILITIES LIST');
        console.log('━'.repeat(80));

        const response = await this.query('abilities_list');
        const abilities = response.payload.abilities || [];

        console.log(`System.Wss Abilities:\n`);
        abilities.forEach((ability, idx) => {
            console.log(`  ${idx + 1}. ${ability.name}`);
            console.log(`     Description: ${ability.description}`);
            console.log(`     Edge: ${ability.edge}`);
            console.log(`     Requires: ${ability.requires.join(', ')}`);
            console.log();
        });

        console.log(`Total: ${response.payload.count} abilities`);
        console.log();
    }

    async testStorageList() {
        console.log('━'.repeat(80));
        console.log('7️⃣  STORAGE LIST (Occurrent Instances)');
        console.log('━'.repeat(80));

        // List Fabric storage
        const response = await this.query('storage_list', {
            kernel: 'ConceptKernel.LLM.Fabric',
            limit: 10
        });

        const items = response.payload.storage_items || [];

        console.log(`ConceptKernel.LLM.Fabric Storage Instances:\n`);
        items.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.name}`);
            console.log(`     Type: ${item.type}`);
            console.log(`     Has Payload: ${item.has_payload}`);
            console.log();
        });

        console.log(`Total: ${response.payload.count} storage instances`);
        console.log(`Timestamp: ${response.payload.timestamp}`);
        console.log();
    }

    async testStorageInspect() {
        console.log('━'.repeat(80));
        console.log('8️⃣  STORAGE INSPECT (Specific Occurrent)');
        console.log('━'.repeat(80));

        // First get the list
        const listResponse = await this.query('storage_list', {
            kernel: 'ConceptKernel.LLM.Fabric',
            limit: 1
        });

        const items = listResponse.payload.storage_items || [];

        if (items.length > 0) {
            const itemName = items[0].name;
            console.log(`Inspecting: ${itemName}\n`);

            const response = await this.query('storage_inspect', {
                kernel: 'ConceptKernel.LLM.Fabric',
                item: itemName
            });

            console.log('Kernel:', response.payload.kernel);
            console.log('Item:', response.payload.item);
            console.log('Path:', response.payload.path);
            console.log('\nPayload:');

            const payload = response.payload.payload;
            if (payload) {
                console.log('  Process URN:', payload.processUrn || 'N/A');
                console.log('  TxId:', payload.txId || 'N/A');
                console.log('  Pattern:', payload.pattern || 'N/A');
                console.log('  Duration:', payload.duration_ms || 'N/A', 'ms');
                console.log('  Exit Code:', payload.exitCode || 'N/A');
                console.log('  Timestamp:', payload.timestamp || 'N/A');

                if (payload.response) {
                    const preview = payload.response.substring(0, 200);
                    console.log('  Response Preview:', preview + '...');
                }
            } else {
                console.log('  (No payload data)');
            }
        } else {
            console.log('No storage instances found for ConceptKernel.LLM.Fabric');
        }

        console.log();
    }

    async testConfigGet() {
        console.log('━'.repeat(80));
        console.log('9️⃣  CONFIG GET (conceptkernel.yaml)');
        console.log('━'.repeat(80));

        const response = await this.query('config_get', {
            kernel: 'ConceptKernel.LLM.Fabric'
        });

        console.log('Kernel:', response.payload.kernel);
        console.log('Config File:', response.payload.path);
        console.log('Exists:', response.payload.exists);

        if (response.payload.config) {
            const lines = response.payload.config.split('\n').slice(0, 20);
            console.log('\nConfig (first 20 lines):');
            console.log('─'.repeat(60));
            lines.forEach(line => console.log(line));
            console.log('─'.repeat(60));
        } else {
            console.log('\n(No config found)');
        }

        console.log();
    }

    async testForkInfo() {
        console.log('━'.repeat(80));
        console.log('🔟 FORK INFO (Template Kernels)');
        console.log('━'.repeat(80));

        const response = await this.query('fork_info');
        const templates = response.payload.templates || [];

        console.log(`Found ${templates.length} template kernels:\n`);
        templates.forEach((template, idx) => {
            console.log(`  ${idx + 1}. ${template.name}`);
            console.log(`     URN: ${template.urn}`);
            console.log(`     Forkable: ${template.forkable}`);
            console.log();
        });

        console.log(`Total: ${response.payload.count || 0} templates`);
        console.log();
    }

    async testSPARQL() {
        console.log('━'.repeat(80));
        console.log('1️⃣1️⃣  SPARQL QUERY (Placeholder)');
        console.log('━'.repeat(80));

        const response = await this.query('sparql', {
            query: 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10'
        });

        console.log('Query:', response.payload.query);
        console.log('Results:', JSON.stringify(response.payload.results, null, 2));
        console.log('Message:', response.payload.message);
        console.log();
    }
}

// Run tests
(async () => {
    const tester = new QueryTester();

    try {
        await tester.connect();
        await tester.runAllQueries();
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
})();
