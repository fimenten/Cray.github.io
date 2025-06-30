interface IPerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface ITimingData {
  start: number;
  end?: number;
  duration?: number;
}

export class PerformanceMonitor {
  private metrics: IPerformanceMetric[] = [];
  private timings = new Map<string, ITimingData>();
  private memoryBaseline: number = 0;
  private isEnabled = true;
  private maxMetricsHistory = 1000;

  constructor() {
    this.captureMemoryBaseline();
    this.setupPerformanceObserver();
  }

  // Timing measurements
  startTiming(label: string): void {
    if (!this.isEnabled) return;
    
    this.timings.set(label, {
      start: performance.now()
    });
  }

  endTiming(label: string): number | null {
    if (!this.isEnabled) return null;
    
    const timing = this.timings.get(label);
    if (!timing) return null;

    const end = performance.now();
    const duration = end - timing.start;
    
    timing.end = end;
    timing.duration = duration;

    this.recordMetric(`timing.${label}`, duration, { type: "timing" });
    this.timings.delete(label);

    return duration;
  }

  // Measure function execution time
  measureFunction<T>(label: string, fn: () => T): T {
    if (!this.isEnabled) return fn();
    
    this.startTiming(label);
    try {
      return fn();
    } finally {
      this.endTiming(label);
    }
  }

  // Measure async function execution time
  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return fn();
    
    this.startTiming(label);
    try {
      return await fn();
    } finally {
      this.endTiming(label);
    }
  }

  // Memory monitoring
  measureMemoryUsage(label: string): void {
    if (!this.isEnabled || !(performance as any).memory) return;

    const memory = (performance as any).memory;
    const usage = memory.usedJSHeapSize - this.memoryBaseline;
    
    this.recordMetric(`memory.${label}`, usage, { 
      type: "memory",
      total: memory.totalJSHeapSize.toString(),
      limit: memory.jsHeapSizeLimit.toString()
    });
  }

  // DOM performance
  measureDOMOperations(operation: string, count: number): void {
    if (!this.isEnabled) return;
    
    this.recordMetric(`dom.${operation}`, count, { type: "dom" });
  }

  // Tray-specific metrics
  measureTrayOperation(operation: string, trayCount: number, duration?: number): void {
    if (!this.isEnabled) return;
    
    this.recordMetric(`tray.${operation}.count`, trayCount, { 
      type: "tray", 
      operation 
    });
    
    if (duration !== undefined) {
      this.recordMetric(`tray.${operation}.duration`, duration, { 
        type: "tray", 
        operation 
      });
    }
  }

  // Render performance
  measureRenderCycle(phase: string, duration: number): void {
    if (!this.isEnabled) return;
    
    this.recordMetric(`render.${phase}`, duration, { 
      type: "render", 
      phase 
    });
  }

  // Event handling performance
  measureEventHandling(eventType: string, duration: number): void {
    if (!this.isEnabled) return;
    
    this.recordMetric(`event.${eventType}`, duration, { 
      type: "event", 
      eventType 
    });
  }

  // Network performance
  measureNetworkRequest(operation: string, duration: number, size?: number): void {
    if (!this.isEnabled) return;
    
    this.recordMetric(`network.${operation}.duration`, duration, { 
      type: "network", 
      operation 
    });
    
    if (size !== undefined) {
      this.recordMetric(`network.${operation}.size`, size, { 
        type: "network", 
        operation 
      });
    }
  }

  // Generic metric recording
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.isEnabled) return;
    
    const metric: IPerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);

    // Maintain history size
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Log significant performance issues
    this.checkPerformanceThresholds(metric);
  }

  // Data retrieval and analysis
  getMetrics(filter?: {
    name?: string;
    type?: string;
    since?: number;
  }): IPerformanceMetric[] {
    let filtered = this.metrics;

    if (filter) {
      filtered = this.metrics.filter(metric => {
        if (filter.name && !metric.name.includes(filter.name)) return false;
        if (filter.type && metric.tags?.type !== filter.type) return false;
        if (filter.since && metric.timestamp < filter.since) return false;
        return true;
      });
    }

    return [...filtered];
  }

  getAverageMetric(name: string, timeWindow?: number): number | null {
    const since = timeWindow ? Date.now() - timeWindow : 0;
    const metrics = this.getMetrics({ name, since });
    
    if (metrics.length === 0) return null;
    
    const sum = metrics.reduce((total, metric) => total + metric.value, 0);
    return sum / metrics.length;
  }

  getPercentile(name: string, percentile: number, timeWindow?: number): number | null {
    const since = timeWindow ? Date.now() - timeWindow : 0;
    const metrics = this.getMetrics({ name, since });
    
    if (metrics.length === 0) return null;
    
    const sorted = metrics.map(m => m.value).sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[index];
  }

  // Performance summary
  getSummary(timeWindow: number = 60000): {
    totalMetrics: number;
    averageRenderTime: number | null;
    memoryUsage: number | null;
    slowOperations: Array<{ name: string; duration: number }>;
    recommendations: string[];
  } {
    const since = Date.now() - timeWindow;
    const recentMetrics = this.getMetrics({ since });
    
    const averageRenderTime = this.getAverageMetric("render", timeWindow);
    const memoryUsage = this.getAverageMetric("memory", timeWindow);
    
    // Find slow operations (> 100ms)
    const slowOperations = recentMetrics
      .filter(m => m.name.includes("timing") && m.value > 100)
      .map(m => ({ name: m.name, duration: m.value }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const recommendations = this.generateRecommendations(recentMetrics);

    return {
      totalMetrics: recentMetrics.length,
      averageRenderTime,
      memoryUsage,
      slowOperations,
      recommendations
    };
  }

  // Performance optimization recommendations
  private generateRecommendations(metrics: IPerformanceMetric[]): string[] {
    const recommendations: string[] = [];
    
    // Check render performance
    const renderMetrics = metrics.filter(m => m.tags?.type === "render");
    const avgRenderTime = renderMetrics.length > 0 
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length 
      : 0;
    
    if (avgRenderTime > 16) {
      recommendations.push("Consider implementing virtual scrolling for better render performance");
    }

    // Check memory usage
    const memoryMetrics = metrics.filter(m => m.tags?.type === "memory");
    if (memoryMetrics.some(m => m.value > 50 * 1024 * 1024)) { // 50MB
      recommendations.push("High memory usage detected - consider implementing data cleanup");
    }

    // Check DOM operations
    const domMetrics = metrics.filter(m => m.tags?.type === "dom");
    if (domMetrics.some(m => m.value > 100)) {
      recommendations.push("Large number of DOM operations - consider batching updates");
    }

    return recommendations;
  }

  // Performance monitoring setup
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === "undefined") return;

    try {
      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric("longtask", entry.duration, { 
            type: "longtask",
            name: entry.name 
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ["longtask"] });

      // Monitor navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;
          this.recordMetric("navigation.domContentLoaded", 
            navEntry.domContentLoadedEventEnd - (navEntry as any).navigationStart);
          this.recordMetric("navigation.load", 
            navEntry.loadEventEnd - (navEntry as any).navigationStart);
        }
      });
      navigationObserver.observe({ entryTypes: ["navigation"] });

    } catch (error) {
      console.warn("Performance Observer not fully supported:", error);
    }
  }

  private captureMemoryBaseline(): void {
    if ((performance as any).memory) {
      this.memoryBaseline = (performance as any).memory.usedJSHeapSize;
    }
  }

  private checkPerformanceThresholds(metric: IPerformanceMetric): void {
    const thresholds: Record<string, number> = {
      "timing": 100, // 100ms
      "render": 16,  // 16ms (60fps)
      "memory": 10 * 1024 * 1024, // 10MB
      "network": 1000 // 1s
    };

    const type = metric.tags?.type;
    if (type && thresholds[type] && metric.value > thresholds[type]) {
      console.warn(`Performance threshold exceeded: ${metric.name} = ${metric.value}`);
    }
  }

  // Control methods
  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  clear(): void {
    this.metrics = [];
    this.timings.clear();
  }

  // Export data for analysis
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });
  }

  // Import metrics from external source
  importMetrics(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.metrics && Array.isArray(parsed.metrics)) {
        this.metrics = [...this.metrics, ...parsed.metrics];
        
        // Maintain history size
        if (this.metrics.length > this.maxMetricsHistory) {
          this.metrics = this.metrics.slice(-this.maxMetricsHistory);
        }
      }
    } catch (error) {
      console.error("Failed to import metrics:", error);
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Decorator for automatic timing
export function measurePerformance(label?: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodLabel = label || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function(...args: any[]) {
      return performanceMonitor.measureFunction(methodLabel, () => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}