/**
 * Metrics Collector Helper
 *
 * Collects and formats performance metrics for Playwright tests.
 * Used for Stage 4 performance testing (10,000 message burst).
 *
 * Version: v1.3.18
 * Date: 2025-12-04
 */

class MetricsCollector {
  constructor() {
    this.metrics = {
      startTime: null,
      endTime: null,
      duration: null,
      messagesSent: 0,
      messagesReceived: 0,
      errors: [],
      latencies: [],
      memorySnapshots: [],
      connectionEvents: []
    };
  }

  start() {
    this.metrics.startTime = Date.now();
    console.log(`📊 Metrics collection started at ${new Date(this.metrics.startTime).toISOString()}`);
  }

  end() {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    console.log(`📊 Metrics collection ended at ${new Date(this.metrics.endTime).toISOString()}`);
    console.log(`   Total Duration: ${this.metrics.duration}ms`);
  }

  recordMessageSent(txId) {
    this.metrics.messagesSent++;
    return Date.now();
  }

  recordMessageReceived(txId, sendTime) {
    this.metrics.messagesReceived++;
    const latency = Date.now() - sendTime;
    this.metrics.latencies.push(latency);
    return latency;
  }

  recordError(error) {
    this.metrics.errors.push({
      timestamp: Date.now(),
      message: error.message || error.toString(),
      stack: error.stack
    });
  }

  recordMemorySnapshot(heapSize, usedHeapSize) {
    this.metrics.memorySnapshots.push({
      timestamp: Date.now(),
      heapSize,
      usedHeapSize
    });
  }

  recordConnectionEvent(eventType) {
    this.metrics.connectionEvents.push({
      timestamp: Date.now(),
      type: eventType
    });
  }

  calculateStats() {
    if (this.metrics.latencies.length === 0) {
      return null;
    }

    const sorted = [...this.metrics.latencies].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      min: sorted[0],
      max: sorted[len - 1],
      mean: sorted.reduce((sum, val) => sum + val, 0) / len,
      median: sorted[Math.floor(len / 2)],
      p50: sorted[Math.floor(len * 0.50)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
  }

  getReport() {
    const stats = this.calculateStats();

    const report = {
      summary: {
        duration_ms: this.metrics.duration,
        duration_seconds: this.metrics.duration ? (this.metrics.duration / 1000).toFixed(2) : null,
        messages_sent: this.metrics.messagesSent,
        messages_received: this.metrics.messagesReceived,
        message_loss_count: this.metrics.messagesSent - this.metrics.messagesReceived,
        throughput_msg_per_sec: this.metrics.duration
          ? ((this.metrics.messagesSent / this.metrics.duration) * 1000).toFixed(2)
          : null,
        success_rate: this.metrics.messagesSent
          ? ((this.metrics.messagesReceived / this.metrics.messagesSent) * 100).toFixed(2) + '%'
          : null
      },
      latency: stats ? {
        min_ms: stats.min,
        max_ms: stats.max,
        mean_ms: stats.mean.toFixed(2),
        median_ms: stats.median,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99
      } : null,
      memory: this.metrics.memorySnapshots.length > 0 ? {
        snapshots_count: this.metrics.memorySnapshots.length,
        peak_heap_mb: Math.max(...this.metrics.memorySnapshots.map(s => s.heapSize)) / (1024 * 1024),
        peak_used_mb: Math.max(...this.metrics.memorySnapshots.map(s => s.usedHeapSize)) / (1024 * 1024),
        initial_heap_mb: this.metrics.memorySnapshots[0].heapSize / (1024 * 1024),
        final_heap_mb: this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 1].heapSize / (1024 * 1024)
      } : null,
      errors: {
        count: this.metrics.errors.length,
        details: this.metrics.errors
      },
      connection: {
        events_count: this.metrics.connectionEvents.length,
        events: this.metrics.connectionEvents
      }
    };

    return report;
  }

  printReport() {
    const report = this.getReport();

    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE METRICS REPORT');
    console.log('='.repeat(60));

    console.log('\n📈 SUMMARY:');
    Object.entries(report.summary).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    if (report.latency) {
      console.log('\n⏱️  LATENCY:');
      Object.entries(report.latency).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }

    if (report.memory) {
      console.log('\n💾 MEMORY:');
      Object.entries(report.memory).forEach(([key, value]) => {
        console.log(`  ${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`);
      });
    }

    console.log(`\n❌ ERRORS: ${report.errors.count}`);
    if (report.errors.count > 0) {
      report.errors.details.slice(0, 5).forEach((error, idx) => {
        console.log(`  ${idx + 1}. ${error.message}`);
      });
      if (report.errors.count > 5) {
        console.log(`  ... and ${report.errors.count - 5} more`);
      }
    }

    console.log(`\n🔌 CONNECTION EVENTS: ${report.connection.events_count}`);

    console.log('\n' + '='.repeat(60));

    return report;
  }

  saveReport(filepath) {
    const fs = require('fs');
    const path = require('path');
    const report = this.getReport();

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write report
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${filepath}`);

    return filepath;
  }
}

module.exports = MetricsCollector;
