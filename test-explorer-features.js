#!/usr/bin/env node

/**
 * Test new CKP Explorer features:
 * - Queue inspection
 * - Edges/Predicates listing
 * - Process URN tracking
 */

const ConceptKernel = require('./index.js');

async function testExplorerFeatures() {
    console.log('🧪 Testing CKP Explorer Features\n');
    console.log('═'.repeat(80));

    try {
        // Connect
        console.log('Connecting to System.Wss...');
        const ck = await ConceptKernel.connect('http://localhost:56000');
        console.log('✅ Connected\n');

        const kernel = 'ConceptKernel.LLM.Fabric';

        // 1. List Queue Items
        console.log('━'.repeat(80));
        console.log('1️⃣  Testing listQueue() - Show pending work');
        console.log('━'.repeat(80));
        const queue = await ck.listQueue(kernel);
        console.log(`Kernel: ${queue.kernel}`);
        console.log(`Pending queue items: ${queue.count}`);

        if (queue.queue_items && queue.queue_items.length > 0) {
            console.log('\nQueue Items:');
            queue.queue_items.forEach((item, idx) => {
                console.log(`  ${idx + 1}. ${item.name}`);
                console.log(`     Path: ${item.path}`);
                console.log(`     Size: ${item.size} bytes`);
                console.log(`     Has payload: ${item.has_payload}`);
            });
        } else {
            console.log('   (No pending queue items)');
        }
        console.log();

        // 2. List Edges/Predicates
        console.log('━'.repeat(80));
        console.log('2️⃣  Testing listEdges() - Show connections');
        console.log('━'.repeat(80));
        const edges = await ck.listEdges(kernel);
        console.log(`Kernel: ${edges.kernel}`);
        console.log(`Total incoming edges: ${edges.total_incoming}`);
        console.log(`Total outgoing edges: ${edges.total_outgoing}`);

        if (edges.incoming_edges && edges.incoming_edges.length > 0) {
            console.log('\nIncoming Edges (who sends to this kernel):');
            edges.incoming_edges.forEach((edge, idx) => {
                console.log(`  ${idx + 1}. ${edge.name}`);
                console.log(`     Inbox: ${edge.inbox_count} items`);
                console.log(`     Outbox: ${edge.outbox_count} items`);
            });
        } else {
            console.log('   (No incoming edges found)');
        }

        if (edges.outgoing_edges && edges.outgoing_edges.length > 0) {
            console.log('\nOutgoing Edges (where this kernel sends):');
            edges.outgoing_edges.forEach((edge, idx) => {
                console.log(`  ${idx + 1}. ${edge.name}`);
                console.log(`     Inbox: ${edge.inbox_count} items`);
                console.log(`     Outbox: ${edge.outbox_count} items`);
            });
        } else {
            console.log('   (No outgoing edges found)');
        }
        console.log();

        // 3. List Recent Processes (Process URNs)
        console.log('━'.repeat(80));
        console.log('3️⃣  Testing listProcesses() - Show Process URNs');
        console.log('━'.repeat(80));
        const processes = await ck.listProcesses(kernel, { limit: 10 });
        console.log(`Kernel: ${processes.kernel}`);
        console.log(`Recent processes: ${processes.count}`);

        if (processes.processes && processes.processes.length > 0) {
            console.log('\nRecent Process URNs:');
            processes.processes.forEach((proc, idx) => {
                console.log(`  ${idx + 1}. ${proc.process_urn}`);
                console.log(`     Instance: ${proc.instance}`);
                console.log(`     TxId: ${proc.tx_id || 'N/A'}`);
                console.log(`     Duration: ${proc.duration_ms || 'N/A'}ms`);
                console.log(`     Exit Code: ${proc.exit_code !== undefined ? proc.exit_code : 'N/A'}`);
                console.log(`     Timestamp: ${proc.timestamp || 'N/A'}`);
                console.log();
            });
        } else {
            console.log('   (No recent processes found)');
        }

        // Test with another kernel
        console.log('━'.repeat(80));
        console.log('4️⃣  Testing with System.Wss itself');
        console.log('━'.repeat(80));

        const wssQueue = await ck.listQueue('System.Wss');
        console.log(`System.Wss queue items: ${wssQueue.count}`);

        const wssEdges = await ck.listEdges('System.Wss');
        console.log(`System.Wss incoming edges: ${wssEdges.total_incoming}`);
        console.log(`System.Wss outgoing edges: ${wssEdges.total_outgoing}`);
        console.log();

        console.log('═'.repeat(80));
        console.log('✅ ALL EXPLORER FEATURES TESTED!');
        console.log('═'.repeat(80));
        console.log('\nSummary:');
        console.log(`  ✓ listQueue() - Working`);
        console.log(`  ✓ listEdges() - Working`);
        console.log(`  ✓ listProcesses() - Working`);
        console.log('\nThese features enable the CKP Explorer to show:');
        console.log('  • Pending work in queue/inbox/');
        console.log('  • Edge connections (predicates)');
        console.log('  • Process URN history');
        console.log('  • Transaction tracking');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testExplorerFeatures();
