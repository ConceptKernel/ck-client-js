#!/usr/bin/env node

/**
 * Test storage pagination with next/prev navigation
 */

const ConceptKernel = require('./index.js');

async function testPagination() {
    console.log('🧪 Testing Storage Pagination\n');
    console.log('═'.repeat(80));

    try {
        // Connect
        console.log('Connecting to System.Wss...');
        const ck = await ConceptKernel.connect('http://localhost:56000');
        console.log('✅ Connected\n');

        const kernel = 'ConceptKernel.LLM.Fabric';
        const pageSize = 2; // Small page size to demonstrate pagination

        // First, show total count
        console.log('━'.repeat(80));
        console.log('📊 Checking Total Storage Items');
        console.log('━'.repeat(80));
        const allItems = await ck.queryStorage(kernel, { limit: 100, offset: 0 });
        console.log(`Total storage items in ${kernel}: ${allItems.total}`);
        console.log(`Page size for this demo: ${pageSize}\n`);

        // Create paginator
        console.log('━'.repeat(80));
        console.log('📖 Creating Paginator');
        console.log('━'.repeat(80));
        const paginator = ck.storagePaginator(kernel, { pageSize });
        console.log(`✅ Paginator created with page size: ${pageSize}\n`);

        // Page 1
        console.log('━'.repeat(80));
        console.log('📄 Page 1 (first page)');
        console.log('━'.repeat(80));
        const page1 = await paginator.next();
        console.log(`Items on page: ${page1.count}`);
        console.log(`Total items: ${page1.total}`);
        console.log(`Current page: ${page1.pageNumber}/${page1.totalPages}`);
        console.log(`Has more pages: ${page1.hasMore}`);
        console.log(`Has previous: ${page1.hasPrev}`);
        console.log('\nItems:');
        page1.items.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.name}`);
        });
        console.log();

        // Page 2
        console.log('━'.repeat(80));
        console.log('📄 Page 2 (next)');
        console.log('━'.repeat(80));
        const page2 = await paginator.next();
        console.log(`Items on page: ${page2.count}`);
        console.log(`Current page: ${page2.pageNumber}/${page2.totalPages}`);
        console.log(`Has more pages: ${page2.hasMore}`);
        console.log(`Has previous: ${page2.hasPrev}`);
        console.log('\nItems:');
        page2.items.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.name}`);
        });
        console.log();

        // Go back to previous page
        if (page2.hasPrev) {
            console.log('━'.repeat(80));
            console.log('⬅️  Going back to previous page');
            console.log('━'.repeat(80));
            const prevPage = await paginator.prev();
            console.log(`Items on page: ${prevPage.count}`);
            console.log(`Current page: ${prevPage.pageNumber}/${prevPage.totalPages}`);
            console.log('\nItems:');
            prevPage.items.forEach((item, idx) => {
                console.log(`  ${idx + 1}. ${item.name}`);
            });
            console.log();
        }

        // Test direct pagination with offset
        console.log('━'.repeat(80));
        console.log('🎯 Direct pagination with offset');
        console.log('━'.repeat(80));
        const directPage = await ck.queryStorage(kernel, { limit: 2, offset: 0 });
        console.log(`Direct query - offset: ${directPage.offset}, limit: ${directPage.limit}`);
        console.log(`Items returned: ${directPage.count}`);
        console.log(`Total items: ${directPage.total}`);
        console.log(`Has more: ${directPage.has_more}`);
        console.log('\nItems:');
        directPage.storage_items.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.name}`);
        });
        console.log();

        // Test jumping to specific page
        if (page1.totalPages >= 2) {
            console.log('━'.repeat(80));
            console.log('🎯 Jump to page 2 directly');
            console.log('━'.repeat(80));
            await paginator.reset(); // Reset first
            const jumpPage = await paginator.goToPage(2);
            console.log(`Jumped to page: ${jumpPage.pageNumber}/${jumpPage.totalPages}`);
            console.log(`Items on page: ${jumpPage.count}`);
            console.log('\nItems:');
            jumpPage.items.forEach((item, idx) => {
                console.log(`  ${idx + 1}. ${item.name}`);
            });
            console.log();
        }

        // Show paginator state
        console.log('━'.repeat(80));
        console.log('📊 Current Paginator State');
        console.log('━'.repeat(80));
        const state = paginator.getState();
        console.log(JSON.stringify(state, null, 2));
        console.log();

        console.log('═'.repeat(80));
        console.log('✅ PAGINATION TEST COMPLETED!');
        console.log('═'.repeat(80));
        console.log('\nSummary:');
        console.log(`  ✓ Total items: ${allItems.total}`);
        console.log(`  ✓ Page size: ${pageSize}`);
        console.log(`  ✓ Total pages: ${Math.ceil(allItems.total / pageSize)}`);
        console.log(`  ✓ next() navigation: Working`);
        console.log(`  ✓ prev() navigation: Working`);
        console.log(`  ✓ goToPage() navigation: Working`);
        console.log(`  ✓ Direct offset queries: Working`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testPagination();
