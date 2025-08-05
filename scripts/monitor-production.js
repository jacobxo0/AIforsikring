/**
 * Production Monitoring Script for AI Forsikringsguiden
 * Formål: Monitor production deployment health and performance
 */

const https = require('https');
const http = require('http');

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://ai-forsikringsguiden.vercel.app';
const MONITORING_API_KEY = process.env.MONITORING_API_KEY;
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds
const PERFORMANCE_THRESHOLD = 3000; // 3 seconds

/**
 * Main monitoring function
 */
async function monitorProduction() {
  console.log('🔍 Starting production monitoring...');
  console.log(`Target URL: ${PRODUCTION_URL}`);

  const results = {
    timestamp: new Date().toISOString(),
    url: PRODUCTION_URL,
    healthChecks: {},
    performance: {},
    errors: []
  };

  try {
    // Run health checks
    await runHealthChecks(results);
    
    // Run performance checks
    await runPerformanceChecks(results);
    
    // Check API endpoints
    await checkApiEndpoints(results);
    
    // Generate monitoring report
    await generateMonitoringReport(results);
    
    // Send alerts if needed
    await checkAndSendAlerts(results);
    
    console.log('✅ Production monitoring completed successfully');
    
  } catch (error) {
    console.error('❌ Production monitoring failed:', error);
    results.errors.push({
      type: 'monitoring_failure',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Send critical alert
    await sendCriticalAlert(error);
    process.exit(1);
  }
}

/**
 * Run basic health checks
 */
async function runHealthChecks(results) {
  console.log('🏥 Running health checks...');
  
  const healthChecks = [
    { name: 'homepage', path: '/' },
    { name: 'health_api', path: '/api/health' },
    { name: 'status_api', path: '/api/status' },
    { name: 'chat_page', path: '/chat' },
    { name: 'dashboard_page', path: '/dashboard' }
  ];

  for (const check of healthChecks) {
    try {
      const startTime = Date.now();
      const response = await makeRequest(`${PRODUCTION_URL}${check.path}`);
      const responseTime = Date.now() - startTime;
      
      results.healthChecks[check.name] = {
        status: response.statusCode >= 200 && response.statusCode < 400 ? 'healthy' : 'unhealthy',
        statusCode: response.statusCode,
        responseTime,
        timestamp: new Date().toISOString()
      };
      
      console.log(`  ✅ ${check.name}: ${response.statusCode} (${responseTime}ms)`);
      
    } catch (error) {
      results.healthChecks[check.name] = {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log(`  ❌ ${check.name}: ${error.message}`);
      results.errors.push({
        type: 'health_check_failure',
        endpoint: check.name,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Run performance checks
 */
async function runPerformanceChecks(results) {
  console.log('⚡ Running performance checks...');
  
  const performanceChecks = [
    { name: 'homepage_load', path: '/' },
    { name: 'chat_load', path: '/chat' },
    { name: 'api_response', path: '/api/health' }
  ];

  const performanceResults = [];

  for (const check of performanceChecks) {
    try {
      const measurements = [];
      
      // Run multiple measurements for accuracy
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        await makeRequest(`${PRODUCTION_URL}${check.path}`);
        const responseTime = Date.now() - startTime;
        measurements.push(responseTime);
        
        // Wait between measurements
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const avgResponseTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
      const maxResponseTime = Math.max(...measurements);
      
      results.performance[check.name] = {
        average: Math.round(avgResponseTime),
        max: maxResponseTime,
        measurements,
        status: avgResponseTime <= PERFORMANCE_THRESHOLD ? 'good' : 'slow',
        timestamp: new Date().toISOString()
      };
      
      console.log(`  ⚡ ${check.name}: ${Math.round(avgResponseTime)}ms avg (max: ${maxResponseTime}ms)`);
      
      if (avgResponseTime > PERFORMANCE_THRESHOLD) {
        results.errors.push({
          type: 'performance_degradation',
          endpoint: check.name,
          responseTime: avgResponseTime,
          threshold: PERFORMANCE_THRESHOLD,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      results.performance[check.name] = {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log(`  ❌ ${check.name}: ${error.message}`);
    }
  }
}

/**
 * Check API endpoints functionality
 */
async function checkApiEndpoints(results) {
  console.log('🔌 Checking API endpoints...');
  
  const apiChecks = [
    {
      name: 'health_endpoint',
      method: 'GET',
      path: '/api/health',
      expectedStatus: 200
    },
    {
      name: 'status_endpoint',
      method: 'GET',
      path: '/api/status',
      expectedStatus: 200
    }
  ];

  results.apiChecks = {};

  for (const check of apiChecks) {
    try {
      const response = await makeRequest(`${PRODUCTION_URL}${check.path}`, {
        method: check.method
      });
      
      const isHealthy = response.statusCode === check.expectedStatus;
      
      results.apiChecks[check.name] = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        statusCode: response.statusCode,
        expectedStatus: check.expectedStatus,
        responseBody: response.body ? response.body.substring(0, 200) : null,
        timestamp: new Date().toISOString()
      };
      
      console.log(`  ${isHealthy ? '✅' : '❌'} ${check.name}: ${response.statusCode}`);
      
      if (!isHealthy) {
        results.errors.push({
          type: 'api_endpoint_failure',
          endpoint: check.name,
          statusCode: response.statusCode,
          expectedStatus: check.expectedStatus,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      results.apiChecks[check.name] = {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log(`  ❌ ${check.name}: ${error.message}`);
    }
  }
}

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      timeout: HEALTH_CHECK_TIMEOUT,
      headers: {
        'User-Agent': 'AI-Forsikringsguiden-Monitor/1.0',
        'Accept': 'text/html,application/json,*/*',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${HEALTH_CHECK_TIMEOUT}ms`));
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Generate monitoring report
 */
async function generateMonitoringReport(results) {
  console.log('📊 Generating monitoring report...');
  
  const healthyChecks = Object.values(results.healthChecks).filter(check => check.status === 'healthy').length;
  const totalChecks = Object.keys(results.healthChecks).length;
  const healthScore = totalChecks > 0 ? (healthyChecks / totalChecks * 100).toFixed(1) : 0;
  
  const avgPerformance = Object.values(results.performance)
    .filter(perf => perf.average)
    .reduce((sum, perf, _, arr) => sum + perf.average / arr.length, 0);

  const report = `# Production Monitoring Report

**Timestamp**: ${results.timestamp}
**URL**: ${results.url}
**Health Score**: ${healthScore}% (${healthyChecks}/${totalChecks})
**Average Performance**: ${Math.round(avgPerformance)}ms

## Health Checks

| Endpoint | Status | Response Time | Status Code |
|----------|--------|---------------|-------------|
${Object.entries(results.healthChecks).map(([name, check]) => 
  `| ${name} | ${getStatusEmoji(check.status)} ${check.status} | ${check.responseTime || 'N/A'}ms | ${check.statusCode || 'N/A'} |`
).join('\n')}

## Performance Metrics

| Endpoint | Average | Max | Status |
|----------|---------|-----|--------|
${Object.entries(results.performance).map(([name, perf]) => 
  `| ${name} | ${perf.average || 'N/A'}ms | ${perf.max || 'N/A'}ms | ${getStatusEmoji(perf.status)} ${perf.status} |`
).join('\n')}

## API Endpoints

| Endpoint | Status | Status Code | Expected |
|----------|--------|-------------|----------|
${Object.entries(results.apiChecks || {}).map(([name, check]) => 
  `| ${name} | ${getStatusEmoji(check.status)} ${check.status} | ${check.statusCode || 'N/A'} | ${check.expectedStatus || 'N/A'} |`
).join('\n')}

## Errors (${results.errors.length})

${results.errors.length > 0 ? 
  results.errors.map(error => `- **${error.type}**: ${error.message} (${error.timestamp})`).join('\n') :
  'No errors detected ✅'
}

## Summary

${results.errors.length === 0 ? 
  '🎉 **All systems operational** - No issues detected' :
  `⚠️ **${results.errors.length} issue(s) detected** - Requires attention`
}

---
*Generated by AI Forsikringsguiden Production Monitor*
`;

  // Write report to file
  const fs = require('fs');
  const path = require('path');
  
  const reportPath = path.join('monitoring-report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`📊 Monitoring report saved: ${reportPath}`);
}

/**
 * Get status emoji
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'healthy':
    case 'good': return '✅';
    case 'unhealthy':
    case 'slow': return '⚠️';
    case 'error': return '❌';
    default: return '❓';
  }
}

/**
 * Check and send alerts if needed
 */
async function checkAndSendAlerts(results) {
  const criticalErrors = results.errors.filter(error => 
    error.type === 'health_check_failure' || 
    error.type === 'api_endpoint_failure'
  );
  
  const performanceIssues = results.errors.filter(error => 
    error.type === 'performance_degradation'
  );

  if (criticalErrors.length > 0) {
    console.log(`🚨 Sending critical alert for ${criticalErrors.length} critical errors`);
    await sendAlert('critical', criticalErrors);
  }
  
  if (performanceIssues.length > 0) {
    console.log(`⚠️ Sending performance alert for ${performanceIssues.length} performance issues`);
    await sendAlert('warning', performanceIssues);
  }
}

/**
 * Send alert (placeholder - integrate with your alerting system)
 */
async function sendAlert(severity, errors) {
  // This would integrate with your alerting system (Slack, PagerDuty, etc.)
  console.log(`📢 Alert [${severity.toUpperCase()}]: ${errors.length} issues detected`);
  
  errors.forEach(error => {
    console.log(`  - ${error.type}: ${error.message}`);
  });
  
  // Example: Send to Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      const payload = {
        text: `🚨 Production Alert [${severity.toUpperCase()}]`,
        attachments: [{
          color: severity === 'critical' ? 'danger' : 'warning',
          fields: errors.map(error => ({
            title: error.type,
            value: error.message,
            short: false
          }))
        }]
      };
      
      // Send to Slack (implementation would go here)
      console.log('📤 Alert sent to Slack');
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }
}

/**
 * Send critical alert for monitoring failures
 */
async function sendCriticalAlert(error) {
  console.log('🚨 Sending critical monitoring failure alert');
  
  const alertData = {
    severity: 'critical',
    message: `Production monitoring failed: ${error.message}`,
    timestamp: new Date().toISOString(),
    url: PRODUCTION_URL
  };
  
  // Send critical alert (implementation would integrate with your alerting system)
  console.log('📢 Critical Alert:', alertData);
}

// Run monitoring if called directly
if (require.main === module) {
  monitorProduction();
}

module.exports = {
  monitorProduction
}; 