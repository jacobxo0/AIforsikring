/**
 * Performance Analysis Script for AI Forsikringsguiden
 * Formål: Analyze performance test results and enforce quality gates
 */

const fs = require('fs');
const path = require('path');

// Performance thresholds
const THRESHOLDS = {
  lcp: {
    good: 2500,
    needsImprovement: 4000,
    poor: 4000
  },
  fid: {
    good: 100,
    needsImprovement: 300,
    poor: 300
  },
  cls: {
    good: 0.1,
    needsImprovement: 0.25,
    poor: 0.25
  },
  pageLoad: {
    good: 3000,
    needsImprovement: 5000,
    poor: 5000
  },
  apiResponse: {
    good: 1000,
    needsImprovement: 3000,
    poor: 3000
  }
};

/**
 * Analyze performance test results
 */
async function analyzePerformance() {
  console.log('🔍 Analyzing performance test results...');

  try {
    // Read performance test results
    const resultsPath = path.join('test-results', 'performance');
    
    if (!fs.existsSync(resultsPath)) {
      console.warn('⚠️ No performance test results found');
      return;
    }

    const results = await loadPerformanceResults(resultsPath);
    const analysis = performAnalysis(results);
    
    // Generate report
    await generatePerformanceReport(analysis);
    
    // Check quality gates
    const qualityGatesPassed = checkQualityGates(analysis);
    
    if (qualityGatesPassed) {
      console.log('✅ All performance quality gates passed');
      process.exit(0);
    } else {
      console.error('❌ Performance quality gates failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Performance analysis failed:', error);
    process.exit(1);
  }
}

/**
 * Load performance test results from files
 */
async function loadPerformanceResults(resultsPath) {
  const results = {
    coreWebVitals: {},
    pageLoadTimes: [],
    apiResponseTimes: [],
    memoryUsage: [],
    errors: []
  };

  try {
    // Load Playwright test results
    const playwrightResults = path.join(resultsPath, 'playwright-results.json');
    if (fs.existsSync(playwrightResults)) {
      const data = JSON.parse(fs.readFileSync(playwrightResults, 'utf8'));
      
      // Extract performance metrics from test results
      data.suites?.forEach(suite => {
        suite.specs?.forEach(spec => {
          spec.tests?.forEach(test => {
            if (test.results?.[0]?.attachments) {
              test.results[0].attachments.forEach(attachment => {
                if (attachment.name === 'performance-metrics') {
                  try {
                    const metrics = JSON.parse(attachment.body);
                    Object.assign(results.coreWebVitals, metrics);
                  } catch (e) {
                    console.warn('Failed to parse performance metrics:', e);
                  }
                }
              });
            }
          });
        });
      });
    }

    // Load custom performance data
    const customMetricsPath = path.join(resultsPath, 'custom-metrics.json');
    if (fs.existsSync(customMetricsPath)) {
      const customMetrics = JSON.parse(fs.readFileSync(customMetricsPath, 'utf8'));
      Object.assign(results, customMetrics);
    }

  } catch (error) {
    console.warn('Warning loading performance results:', error);
  }

  return results;
}

/**
 * Perform performance analysis
 */
function performAnalysis(results) {
  const analysis = {
    coreWebVitals: analyzeCoreWebVitals(results.coreWebVitals),
    pageLoad: analyzePageLoadTimes(results.pageLoadTimes),
    apiPerformance: analyzeApiPerformance(results.apiResponseTimes),
    memoryUsage: analyzeMemoryUsage(results.memoryUsage),
    overall: 'unknown'
  };

  // Calculate overall score
  const scores = [
    analysis.coreWebVitals.score,
    analysis.pageLoad.score,
    analysis.apiPerformance.score,
    analysis.memoryUsage.score
  ].filter(score => score !== 'unknown');

  if (scores.length === 0) {
    analysis.overall = 'unknown';
  } else {
    const goodCount = scores.filter(s => s === 'good').length;
    const needsImprovementCount = scores.filter(s => s === 'needs-improvement').length;
    
    if (goodCount === scores.length) {
      analysis.overall = 'good';
    } else if (goodCount >= scores.length / 2) {
      analysis.overall = 'needs-improvement';
    } else {
      analysis.overall = 'poor';
    }
  }

  return analysis;
}

/**
 * Analyze Core Web Vitals
 */
function analyzeCoreWebVitals(vitals) {
  const analysis = {
    lcp: analyzeMetric(vitals.lcp, THRESHOLDS.lcp),
    fid: analyzeMetric(vitals.fid, THRESHOLDS.fid),
    cls: analyzeMetric(vitals.cls, THRESHOLDS.cls),
    score: 'unknown'
  };

  const scores = [analysis.lcp.score, analysis.fid.score, analysis.cls.score]
    .filter(score => score !== 'unknown');

  if (scores.length === 0) {
    analysis.score = 'unknown';
  } else {
    const goodCount = scores.filter(s => s === 'good').length;
    analysis.score = goodCount >= 2 ? 'good' : 
                    goodCount >= 1 ? 'needs-improvement' : 'poor';
  }

  return analysis;
}

/**
 * Analyze page load times
 */
function analyzePageLoadTimes(loadTimes) {
  if (!loadTimes || loadTimes.length === 0) {
    return { score: 'unknown', average: 0, p95: 0 };
  }

  const average = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
  const sorted = loadTimes.sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return {
    score: analyzeMetric(p95, THRESHOLDS.pageLoad).score,
    average,
    p95,
    count: loadTimes.length
  };
}

/**
 * Analyze API performance
 */
function analyzeApiPerformance(responseTimes) {
  if (!responseTimes || responseTimes.length === 0) {
    return { score: 'unknown', average: 0, p95: 0 };
  }

  const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const sorted = responseTimes.sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return {
    score: analyzeMetric(p95, THRESHOLDS.apiResponse).score,
    average,
    p95,
    count: responseTimes.length
  };
}

/**
 * Analyze memory usage
 */
function analyzeMemoryUsage(memoryData) {
  if (!memoryData || memoryData.length === 0) {
    return { score: 'unknown', peak: 0, average: 0 };
  }

  const peak = Math.max(...memoryData);
  const average = memoryData.reduce((sum, mem) => sum + mem, 0) / memoryData.length;
  
  // Memory thresholds (in MB)
  const memoryThresholds = {
    good: 100 * 1024 * 1024,      // 100MB
    needsImprovement: 200 * 1024 * 1024, // 200MB
    poor: 200 * 1024 * 1024       // 200MB+
  };

  return {
    score: analyzeMetric(peak, memoryThresholds).score,
    peak: peak / (1024 * 1024), // Convert to MB
    average: average / (1024 * 1024)
  };
}

/**
 * Analyze individual metric against thresholds
 */
function analyzeMetric(value, thresholds) {
  if (value === undefined || value === null) {
    return { score: 'unknown', value, status: 'No data' };
  }

  let score, status;
  
  if (value <= thresholds.good) {
    score = 'good';
    status = 'Good';
  } else if (value <= thresholds.needsImprovement) {
    score = 'needs-improvement';
    status = 'Needs Improvement';
  } else {
    score = 'poor';
    status = 'Poor';
  }

  return { score, value, status };
}

/**
 * Generate performance report
 */
async function generatePerformanceReport(analysis) {
  const report = `# Performance Analysis Report

Generated: ${new Date().toISOString()}

## Overall Score: ${getScoreEmoji(analysis.overall)} ${analysis.overall.toUpperCase()}

## Core Web Vitals

| Metric | Value | Status | Threshold |
|--------|-------|--------|-----------|
| LCP | ${analysis.coreWebVitals.lcp.value || 'N/A'}ms | ${getScoreEmoji(analysis.coreWebVitals.lcp.score)} ${analysis.coreWebVitals.lcp.status} | ≤ ${THRESHOLDS.lcp.good}ms |
| FID | ${analysis.coreWebVitals.fid.value || 'N/A'}ms | ${getScoreEmoji(analysis.coreWebVitals.fid.score)} ${analysis.coreWebVitals.fid.status} | ≤ ${THRESHOLDS.fid.good}ms |
| CLS | ${analysis.coreWebVitals.cls.value || 'N/A'} | ${getScoreEmoji(analysis.coreWebVitals.cls.score)} ${analysis.coreWebVitals.cls.status} | ≤ ${THRESHOLDS.cls.good} |

## Page Load Performance

- **Average Load Time**: ${Math.round(analysis.pageLoad.average || 0)}ms
- **95th Percentile**: ${Math.round(analysis.pageLoad.p95 || 0)}ms
- **Status**: ${getScoreEmoji(analysis.pageLoad.score)} ${analysis.pageLoad.score}
- **Tests Run**: ${analysis.pageLoad.count || 0}

## API Performance

- **Average Response Time**: ${Math.round(analysis.apiPerformance.average || 0)}ms
- **95th Percentile**: ${Math.round(analysis.apiPerformance.p95 || 0)}ms
- **Status**: ${getScoreEmoji(analysis.apiPerformance.score)} ${analysis.apiPerformance.score}
- **API Calls**: ${analysis.apiPerformance.count || 0}

## Memory Usage

- **Peak Memory**: ${Math.round(analysis.memoryUsage.peak || 0)}MB
- **Average Memory**: ${Math.round(analysis.memoryUsage.average || 0)}MB
- **Status**: ${getScoreEmoji(analysis.memoryUsage.score)} ${analysis.memoryUsage.score}

## Recommendations

${generateRecommendations(analysis)}

---
*Generated by AI Forsikringsguiden Performance Analysis*
`;

  // Write report to file
  const reportPath = path.join('test-results', 'performance-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);

  console.log(`📊 Performance report generated: ${reportPath}`);
}

/**
 * Get emoji for score
 */
function getScoreEmoji(score) {
  switch (score) {
    case 'good': return '✅';
    case 'needs-improvement': return '⚠️';
    case 'poor': return '❌';
    default: return '❓';
  }
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(analysis) {
  const recommendations = [];

  if (analysis.coreWebVitals.lcp.score === 'poor') {
    recommendations.push('- 🔧 **Improve LCP**: Optimize largest contentful paint by reducing server response times and optimizing critical resources');
  }

  if (analysis.coreWebVitals.fid.score === 'poor') {
    recommendations.push('- 🔧 **Improve FID**: Reduce JavaScript execution time and break up long tasks');
  }

  if (analysis.coreWebVitals.cls.score === 'poor') {
    recommendations.push('- 🔧 **Improve CLS**: Set explicit dimensions for images and avoid inserting content above existing content');
  }

  if (analysis.pageLoad.score === 'poor') {
    recommendations.push('- 🔧 **Improve Page Load**: Implement code splitting, optimize bundle size, and use CDN');
  }

  if (analysis.apiPerformance.score === 'poor') {
    recommendations.push('- 🔧 **Improve API Performance**: Implement caching, optimize database queries, and use connection pooling');
  }

  if (analysis.memoryUsage.score === 'poor') {
    recommendations.push('- 🔧 **Optimize Memory Usage**: Fix memory leaks, optimize component lifecycle, and implement proper cleanup');
  }

  if (recommendations.length === 0) {
    recommendations.push('- 🎉 **Great job!** All performance metrics are within acceptable ranges');
  }

  return recommendations.join('\n');
}

/**
 * Check quality gates
 */
function checkQualityGates(analysis) {
  const criticalMetrics = [
    analysis.coreWebVitals.lcp.score,
    analysis.pageLoad.score
  ];

  // Fail if any critical metric is poor
  const hasPoorCriticalMetrics = criticalMetrics.some(score => score === 'poor');
  
  if (hasPoorCriticalMetrics) {
    console.error('❌ Critical performance metrics are poor');
    return false;
  }

  // Warn if overall score needs improvement
  if (analysis.overall === 'needs-improvement') {
    console.warn('⚠️ Performance needs improvement but quality gates passed');
  }

  return true;
}

// Run analysis if called directly
if (require.main === module) {
  analyzePerformance();
}

module.exports = {
  analyzePerformance,
  THRESHOLDS
}; 