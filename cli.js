#!/usr/bin/env node
/**
 * ConceptKernel CLI - WebSocket Edition
 *
 * All commands execute over WebSocket using ck-client-js
 *
 * Usage:
 *   node cli.js concept describe <kernel>
 *   node cli.js package describe <package>
 *   node cli.js daemon list
 *   node cli.js daemon describe <daemon>
 *   node cli.js tx list
 *   node cli.js tx describe <txId>
 */

const ConceptKernel = require('./index.js');
const fetch = global.fetch || require('node-fetch');

const GATEWAY_URL = process.env.CK_GATEWAY_URL || 'http://localhost:56000';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];
  const subcommand = args[1];
  const param = args[2];

  try {
    // Connect to gateway via WebSocket
    console.log(`Connecting to ${GATEWAY_URL}...`);
    const ck = await ConceptKernel.connect(GATEWAY_URL, {
      autoConnect: true
    });
    console.log('✓ Connected via WebSocket\n');

    // Fetch full discovery data (includes kernels list)
    const discoveryUrl = `${GATEWAY_URL}/.well-known/ck-services`;
    const discoveryResponse = await fetch(discoveryUrl);
    const discoveryData = await discoveryResponse.json();
    ck.discoveryData = discoveryData;

    // Route commands
    switch (command) {
      case 'concept':
        await handleConceptCommand(ck, subcommand, param);
        break;
      case 'package':
        await handlePackageCommand(ck, subcommand, param);
        break;
      case 'daemon':
        await handleDaemonCommand(ck, subcommand, param);
        break;
      case 'tx':
        await handleTxCommand(ck, subcommand, param);
        break;
      case 'process':
        await handleProcessCommand(ck, subcommand, param);
        break;
      case 'kernel':
        await handleKernelCommand(ck, subcommand, param);
        break;
      case 'graph':
        await handleGraphCommand(ck, subcommand, param);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

    ck.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function handleConceptCommand(ck, subcommand, param) {
  if (subcommand === 'describe' && param) {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Concept: ${param}`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    // Use service discovery data (fetched via WebSocket on connect)
    const kernel = ck.discoveryData.kernels.find(k =>
      k.name === param || k.urn.includes(param)
    );

    if (kernel) {
      displayConcept(kernel);
    } else {
      console.log('Concept not found');
      console.log('\nAvailable concepts:');
      ck.discoveryData.kernels
        .filter(k => k.mode === 'ONLINE')
        .slice(0, 5)
        .forEach(k => console.log('  -', k.name));
    }
  } else {
    console.log('Usage: node cli.js concept describe <kernel>');
  }
}

async function handlePackageCommand(ck, subcommand, param) {
  if (subcommand === 'describe' && param) {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Package: ${param}`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    const query = {
      action: 'query',
      type: 'package_describe',
      package: param
    };

    const response = await ck.emit('System.Registry', query);

    if (response.payload && response.payload.package) {
      displayPackage(response.payload.package);
    } else {
      console.log('Package not found');
    }
  } else {
    console.log('Usage: node cli.js package describe <package>');
  }
}

async function handleDaemonCommand(ck, subcommand, param) {
  if (subcommand === 'list') {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Running Daemons`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    // Use service discovery data (fetched via WebSocket on connect)
    const daemons = ck.discoveryData.kernels
      .filter(k => k.mode === 'ONLINE' && k.status === 'ACTIVE')
      .map(k => ({
        name: k.name,
        port: k.port,
        type: k.type,
        urn: k.urn,
        status: k.status
      }));

    displayDaemonList(daemons);

  } else if (subcommand === 'describe' && param) {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Daemon: ${param}`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    // Use service discovery data (fetched via WebSocket on connect)
    const daemon = ck.discoveryData.kernels.find(k =>
      k.name === param && k.mode === 'ONLINE'
    );

    if (daemon) {
      displayDaemon(daemon);
    } else {
      console.log('Daemon not found or not running');
    }
  } else {
    console.log('Usage:');
    console.log('  node cli.js daemon list');
    console.log('  node cli.js daemon describe <daemon>');
  }
}

async function handleTxCommand(ck, subcommand, param) {
  if (subcommand === 'list') {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Recent Transactions`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    const query = {
      action: 'query',
      type: 'transaction_list',
      limit: 20
    };

    const response = await ck.emit('System.Registry', query);

    if (response.payload && response.payload.transactions) {
      displayTxList(response.payload.transactions);
    } else {
      console.log('No transactions found');
      console.log('\nNote: Transaction tracking requires System.Registry to be running');
      console.log('and configured to track transactions.');
    }

  } else if (subcommand === 'describe' && param) {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Transaction: ${param}`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    const query = {
      action: 'query',
      type: 'transaction_describe',
      txId: param
    };

    const response = await ck.emit('System.Registry', query);

    if (response.payload && response.payload.transaction) {
      displayTx(response.payload.transaction);
    } else {
      console.log('Transaction not found');
    }
  } else {
    console.log('Usage:');
    console.log('  node cli.js tx list');
    console.log('  node cli.js tx describe <txId>');
  }
}

// Display functions
function displayConcept(concept) {
  console.log('Concept Information:');
  console.log('  Name:        ', concept.name);
  console.log('  URN:         ', concept.urn);
  console.log('  Type:        ', concept.type);
  console.log('  Mode:        ', concept.mode);
  console.log('  Status:      ', concept.status);

  if (concept.port) {
    console.log('  Port:        ', concept.port);
  }

  if (concept.capabilities && concept.capabilities.length > 0) {
    console.log('  Capabilities:', concept.capabilities.join(', '));
  }

  console.log();
}

function displayPackage(pkg) {
  console.log('Package Information:');
  console.log('  Name:        ', pkg.name);
  console.log('  Version:     ', pkg.version || 'N/A');
  console.log('  Type:        ', pkg.type || 'N/A');
  console.log('  Description: ', pkg.description || 'N/A');
  console.log();
}

function displayDaemonList(daemons) {
  if (daemons.length === 0) {
    console.log('No daemons running');
    return;
  }

  console.log('NAME'.padEnd(40), 'PORT'.padEnd(8), 'TYPE'.padEnd(15), 'STATUS');
  console.log('─'.repeat(80));

  daemons.forEach(d => {
    console.log(
      (d.name || 'unknown').padEnd(40),
      (d.port ? d.port.toString() : '-').padEnd(8),
      (d.type || 'unknown').padEnd(15),
      d.status || 'unknown'
    );
  });

  console.log();
  console.log(`Total: ${daemons.length} daemon(s) running`);
  console.log();
}

function displayDaemon(daemon) {
  console.log('Daemon Information:');
  console.log('  Name:        ', daemon.name);
  console.log('  URN:         ', daemon.urn);
  console.log('  Type:        ', daemon.type);
  console.log('  Status:      ', daemon.status);
  console.log('  Mode:        ', daemon.mode);

  if (daemon.port) {
    console.log('  Port:        ', daemon.port);
  }

  if (daemon.capabilities && daemon.capabilities.length > 0) {
    console.log('  Capabilities:', daemon.capabilities.join(', '));
  }

  console.log();
}

function displayTxList(transactions) {
  if (transactions.length === 0) {
    console.log('No transactions found');
    return;
  }

  console.log('TX ID'.padEnd(30), 'KERNEL'.padEnd(30), 'TIMESTAMP');
  console.log('─'.repeat(80));

  transactions.forEach(tx => {
    console.log(
      (tx.txId || 'unknown').padEnd(30),
      (tx.kernel || 'unknown').padEnd(30),
      tx.timestamp || 'N/A'
    );
  });

  console.log();
  console.log(`Total: ${transactions.length} transaction(s)`);
  console.log();
}

function displayTx(tx) {
  console.log('Transaction Information:');
  console.log('  TX ID:       ', tx.txId);
  console.log('  Kernel:      ', tx.kernel || 'N/A');
  console.log('  Timestamp:   ', tx.timestamp || 'N/A');
  console.log('  From:        ', tx.from || 'N/A');
  console.log('  To:          ', tx.to || 'N/A');
  console.log('  Edge:        ', tx.edge || 'N/A');

  if (tx.payload) {
    console.log('  Payload:');
    console.log(JSON.stringify(tx.payload, null, 2).split('\n').map(line => '    ' + line).join('\n'));
  }

  console.log();
}

async function handleProcessCommand(ck, subcommand, param) {
  if (subcommand === 'list') {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Recent Processes (Occurrents)`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    const query = {
      action: 'query',
      type: 'process_list',
      limit: 20
    };

    try {
      const response = await ck.emit('System.Registry', query);

      if (response.payload && response.payload.processes) {
        displayProcessList(response.payload.processes);
      } else {
        console.log('No processes found');
        console.log('\nNote: Process tracking requires System.Registry to be running');
      }
    } catch (error) {
      console.log('Could not query processes:', error.message);
    }

  } else if (subcommand === 'describe' && param) {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Process: ${param}`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    const query = {
      action: 'query',
      type: 'process_describe',
      txId: param
    };

    try {
      const response = await ck.emit('System.Registry', query);

      if (response.payload && response.payload.process) {
        displayProcess(response.payload.process);
      } else {
        console.log('Process not found');
      }
    } catch (error) {
      console.log('Could not query process:', error.message);
    }
  } else {
    console.log('Usage:');
    console.log('  node cli.js process list');
    console.log('  node cli.js process describe <txId>');
  }
}

async function handleKernelCommand(ck, subcommand, param) {
  if (subcommand === 'describe' && param) {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Kernel (Continuant): ${param}`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    // Use service discovery data
    const kernel = ck.discoveryData.kernels.find(k =>
      k.name === param || k.urn.includes(param)
    );

    if (kernel) {
      displayKernelFull(kernel);
    } else {
      console.log('Kernel not found');
      console.log('\nAvailable kernels:');
      ck.discoveryData.kernels
        .slice(0, 10)
        .forEach(k => console.log('  -', k.name, `(${k.mode})`));
    }
  } else if (subcommand === 'list') {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`All Kernels (Continuants)`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    const kernels = ck.discoveryData.kernels.map(k => ({
      name: k.name,
      mode: k.mode,
      status: k.status,
      type: k.type,
      bfo_type: k.bfo_type || 'MaterialEntity'
    }));

    displayKernelList(kernels);
  } else {
    console.log('Usage:');
    console.log('  node cli.js kernel list');
    console.log('  node cli.js kernel describe <kernel>');
  }
}

async function handleGraphCommand(ck, subcommand, param) {
  if (subcommand === 'summary') {
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Graph Summary`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    // Calculate from discovery data
    const kernels = ck.discoveryData.kernels;
    const online = kernels.filter(k => k.mode === 'ONLINE').length;
    const offline = kernels.filter(k => k.mode === 'OFFLINE').length;
    const idle = kernels.filter(k => k.mode === 'IDLE').length;

    const hot = kernels.filter(k => k.type && k.type.includes('hot')).length;
    const cold = kernels.filter(k => k.type && k.type.includes('cold')).length;

    const rust = kernels.filter(k => k.type && k.type.includes('rust')).length;
    const node = kernels.filter(k => k.type && k.type.includes('node')).length;
    const python = kernels.filter(k => k.type && k.type.includes('python')).length;

    console.log('Continuants (Kernels):');
    console.log('  Total:          ', kernels.length);
    console.log('  Online:         ', online);
    console.log('  Offline:        ', offline);
    console.log('  Idle:           ', idle);
    console.log();
    console.log('Kernel Types:');
    console.log('  Hot (daemon):   ', hot);
    console.log('  Cold (on-demand):', cold);
    console.log();
    console.log('Implementation:');
    console.log('  Rust:           ', rust);
    console.log('  Node.js:        ', node);
    console.log('  Python:         ', python);
    console.log();

    // Try to get process count
    try {
      const query = {
        action: 'query',
        type: 'process_list',
        limit: 1000
      };
      const response = await ck.emit('System.Registry', query);

      if (response.payload && response.payload.processes) {
        console.log('Occurrents (Processes):');
        console.log('  Total Processes:', response.payload.processes.length);
        console.log();
      }
    } catch (error) {
      // Ignore if Registry not available
    }

    console.log('Services:');
    const services = Object.keys(ck.discoveryData.services);
    services.forEach(s => console.log('  -', s));
    console.log();

  } else {
    console.log('Usage:');
    console.log('  node cli.js graph summary');
  }
}

function displayProcessList(processes) {
  if (processes.length === 0) {
    console.log('No processes found');
    return;
  }

  console.log('TX ID'.padEnd(30), 'TYPE'.padEnd(15), 'STATUS'.padEnd(10), 'DURATION (ms)');
  console.log('─'.repeat(80));

  processes.forEach(p => {
    console.log(
      (p.txId || 'unknown').padEnd(30),
      (p.type || 'unknown').padEnd(15),
      (p.status || 'unknown').padEnd(10),
      p.temporalRegion && p.temporalRegion.duration ? p.temporalRegion.duration + 'ms' : 'N/A'
    );
  });

  console.log();
  console.log(`Total: ${processes.length} process(es)`);
  console.log();
}

function displayProcess(process) {
  console.log('Process Information (Occurrent):');
  console.log('  TX ID:       ', process.txId);
  console.log('  URN:         ', process.urn);
  console.log('  Type:        ', process.type);
  console.log('  Status:      ', process.status);
  console.log();

  if (process.temporalRegion) {
    console.log('Temporal Region:');
    console.log('  Start:       ', process.temporalRegion.start);
    console.log('  End:         ', process.temporalRegion.end);
    console.log('  Duration:    ', process.temporalRegion.duration, 'ms');
    console.log();
  }

  if (process.temporalParts && process.temporalParts.length > 0) {
    console.log('Temporal Parts (Phases):');
    process.temporalParts.forEach((part, idx) => {
      console.log(`  ${idx + 1}. ${part.phase} (${part.timestamp})`);
      if (part.data) {
        Object.keys(part.data).forEach(key => {
          console.log(`     ${key}: ${part.data[key]}`);
        });
      }
    });
    console.log();
  }

  if (process.participants) {
    console.log('Participants:');
    Object.keys(process.participants).forEach(key => {
      console.log(`  ${key}: ${process.participants[key]}`);
    });
    console.log();
  }

  if (process.metadata) {
    console.log('Metadata:');
    Object.keys(process.metadata).forEach(key => {
      console.log(`  ${key}: ${process.metadata[key]}`);
    });
    console.log();
  }
}

function displayKernelList(kernels) {
  if (kernels.length === 0) {
    console.log('No kernels found');
    return;
  }

  console.log('NAME'.padEnd(40), 'MODE'.padEnd(10), 'TYPE'.padEnd(15), 'BFO TYPE');
  console.log('─'.repeat(90));

  kernels.forEach(k => {
    console.log(
      (k.name || 'unknown').padEnd(40),
      (k.mode || 'unknown').padEnd(10),
      (k.type || 'unknown').padEnd(15),
      k.bfo_type || 'MaterialEntity'
    );
  });

  console.log();
  console.log(`Total: ${kernels.length} kernel(s)`);
  console.log();
}

function displayKernelFull(kernel) {
  console.log('Kernel Information (Continuant):');
  console.log('  Name:        ', kernel.name);
  console.log('  URN:         ', kernel.urn);
  console.log('  Type:        ', kernel.type);
  console.log('  Mode:        ', kernel.mode);
  console.log('  Status:      ', kernel.status);
  console.log('  BFO Type:    ', kernel.bfo_type || 'MaterialEntity');
  console.log();

  if (kernel.port) {
    console.log('Network:');
    console.log('  Port:        ', kernel.port);
    console.log();
  }

  if (kernel.capabilities && kernel.capabilities.length > 0) {
    console.log('Capabilities:', kernel.capabilities.join(', '));
    console.log();
  }

  if (kernel.roles && kernel.roles.length > 0) {
    console.log('Roles:', kernel.roles.join(', '));
    console.log();
  }

  if (kernel.functions && kernel.functions.length > 0) {
    console.log('Functions:', kernel.functions.join(', '));
    console.log();
  }

  if (kernel.metadata) {
    console.log('Metadata:');
    if (kernel.metadata.description) {
      console.log('  Description: ', kernel.metadata.description);
    }
    Object.keys(kernel.metadata).forEach(key => {
      if (key !== 'description') {
        console.log(`  ${key}: ${kernel.metadata[key]}`);
      }
    });
    console.log();
  }
}

function showHelp() {
  console.log(`
ConceptKernel CLI - WebSocket Edition

All commands execute over WebSocket using ck-client-js

USAGE:
  node cli.js <COMMAND> <SUBCOMMAND> [OPTIONS]

COMMANDS:
  concept describe <kernel>   Describe a concept/kernel
  package describe <package>  Describe a package
  daemon list                 List running daemons
  daemon describe <daemon>    Describe a daemon
  tx list                     List recent transactions
  tx describe <txId>          Describe a transaction
  process list                List recent processes (occurrents)
  process describe <txId>     Describe a specific process
  kernel list                 List all kernels (continuants)
  kernel describe <kernel>    Describe a kernel with full details
  graph summary               Show graph-wide statistics

EXAMPLES:
  node cli.js concept describe System.Wss
  node cli.js daemon list
  node cli.js daemon describe System.Gateway
  node cli.js tx list
  node cli.js process list
  node cli.js kernel list
  node cli.js kernel describe System.Wss
  node cli.js graph summary

ENVIRONMENT:
  CK_GATEWAY_URL  Gateway URL (default: http://localhost:56000)

NOTE:
  All queries are executed over WebSocket (wss://) using ck-client-js.
  No direct filesystem access is used.

BFO ONTOLOGY:
  Continuants: Material entities that persist through time (kernels)
  Occurrents: Temporal entities that happen (processes, events)
  Temporal Regions: Time intervals during which occurrents unfold
  Temporal Parts: Phases within an occurrent's temporal region
`);
}

// Run CLI
if (require.main === module) {
  main();
}

module.exports = { main };
