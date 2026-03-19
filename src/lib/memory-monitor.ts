/**
 * Memory monitoring module
 * Tracks Node.js process memory usage and logs warnings when thresholds are exceeded
 */
import { logger } from "./logger";

/**
 * Memory thresholds in bytes
 */
const MEMORY_THRESHOLDS = {
  WARNING: 1024 * 1024 * 1024, // 1GB
  CRITICAL: 2 * 1024 * 1024 * 1024, // 2GB
} as const;

/**
 * Monitoring interval in milliseconds
 */
const MONITOR_INTERVAL = 30 * 1000; // 30 seconds

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

/**
 * Get current memory usage statistics
 */
function getMemoryStats() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss, // Resident Set Size - total memory allocated
    heapTotal: usage.heapTotal, // Total heap size
    heapUsed: usage.heapUsed, // Heap actually used
    external: usage.external, // C++ objects bound to JS
    arrayBuffers: usage.arrayBuffers, // ArrayBuffers and SharedArrayBuffers
  };
}

/**
 * Check memory thresholds and log warnings
 */
function checkMemoryThresholds(stats: ReturnType<typeof getMemoryStats>) {
  const rss = stats.rss;

  if (rss >= MEMORY_THRESHOLDS.CRITICAL) {
    logger.error({
      msg: "КРИТИЧЕСКОЕ: Использование памяти превысило 2GB",
      rss: formatBytes(rss),
      heapUsed: formatBytes(stats.heapUsed),
      heapTotal: formatBytes(stats.heapTotal),
      external: formatBytes(stats.external),
      threshold: "CRITICAL",
    });
    return "CRITICAL";
  }

  if (rss >= MEMORY_THRESHOLDS.WARNING) {
    logger.warn({
      msg: "ПРЕДУПРЕЖДЕНИЕ: Использование памяти превысило 1GB",
      rss: formatBytes(rss),
      heapUsed: formatBytes(stats.heapUsed),
      heapTotal: formatBytes(stats.heapTotal),
      external: formatBytes(stats.external),
      threshold: "WARNING",
    });
    return "WARNING";
  }

  return "OK";
}

/**
 * Log current memory usage
 */
function logMemoryUsage() {
  const stats = getMemoryStats();
  const threshold = checkMemoryThresholds(stats);

  // Логируем только если есть проблемы или в debug режиме
  if (threshold !== "OK" || logger.level === "debug") {
    logger.debug({
      msg: "Статистика памяти",
      rss: formatBytes(stats.rss),
      heapUsed: formatBytes(stats.heapUsed),
      heapTotal: formatBytes(stats.heapTotal),
      external: formatBytes(stats.external),
      arrayBuffers: formatBytes(stats.arrayBuffers),
    });
  }
}

/**
 * Memory monitor class
 */
class MemoryMonitor {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start memory monitoring
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("Memory monitor already running");
      return;
    }

    logger.info("Starting memory monitor (interval: 30s)");

    // Log initial state
    logMemoryUsage();

    // Start periodic monitoring
    this.interval = setInterval(() => {
      logMemoryUsage();
    }, MONITOR_INTERVAL);

    this.isRunning = true;
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (!this.isRunning || !this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = null;
    this.isRunning = false;

    logger.info("Memory monitor stopped");
  }

  /**
   * Get current memory stats (for manual checks)
   */
  getStats() {
    return getMemoryStats();
  }

  /**
   * Check if memory usage is critical
   */
  isCritical(): boolean {
    const stats = getMemoryStats();
    return stats.rss >= MEMORY_THRESHOLDS.CRITICAL;
  }
}

// Singleton instance
export const memoryMonitor = new MemoryMonitor();
