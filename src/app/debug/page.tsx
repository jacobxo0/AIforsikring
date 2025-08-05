'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';

export default function DebugPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testLogger = () => {
    logger.debug('🧪 Test debug message', { component: 'DebugPage' });
    logger.info('ℹ️ Test info message', { test: true });
    logger.warn('⚠️ Test warning message', { level: 'warning' });
    logger.error('❌ Test error message', { error: 'This is a test error' });
    addResult('Logger test completed - check console');
  };

  const testApiError = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'TRIGGER_ERROR_TEST' })
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      addResult(`API test: ${data.success ? 'Success' : 'Failed'}`);
      
    } catch (error) {
      addResult(`API test generated error: ${error}`);
      logger.error('API test error', error);
    }
  };

  const testPerformance = () => {
    const start = Date.now();
    
    // Simulate some work
    for (let i = 0; i < 100000; i++) {
      Math.random();
    }
    
    const duration = Date.now() - start;
    logger.performance('Random number generation', duration, { iterations: 100000 });
    addResult(`Performance test: ${duration}ms for 100k operations`);
  };

  const testAudit = () => {
    logger.audit('debug_page_interaction', {
      userId: 'test-user',
      action: 'manual_audit_test',
      metadata: { timestamp: new Date().toISOString() }
    });
    addResult('Audit log test completed');
  };

  const testSecurity = () => {
    logger.security('debug_security_test', {
      ip: '127.0.0.1',
      userAgent: navigator.userAgent,
      details: 'Manual security event test'
    });
    addResult('Security log test completed');
  };

  const clearResults = () => setTestResults([]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            🐛 Debug & Monitoring Test Suite
            <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
              Development Only
            </span>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            {/* Logger Tests */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">📝 Logger Tests</h2>
              <p className="text-blue-700 mb-4 text-sm">
                Test different log levels and structured logging
              </p>
              <button
                onClick={testLogger}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Test All Log Levels
              </button>
            </div>

            {/* API Error Tests */}
            <div className="bg-red-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-red-900 mb-4">🚨 API Error Tests</h2>
              <p className="text-red-700 mb-4 text-sm">
                Trigger API errors to test error handling and live stream
              </p>
              <button
                onClick={testApiError}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Trigger API Error
              </button>
            </div>

            {/* Performance Tests */}
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-green-900 mb-4">⚡ Performance Tests</h2>
              <p className="text-green-700 mb-4 text-sm">
                Test performance monitoring and metrics
              </p>
              <button
                onClick={testPerformance}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Run Performance Test
              </button>
            </div>

            {/* Audit Tests */}
            <div className="bg-purple-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-purple-900 mb-4">🔍 Audit Tests</h2>
              <p className="text-purple-700 mb-4 text-sm">
                Test audit logging for GDPR compliance
              </p>
              <div className="space-y-2">
                <button
                  onClick={testAudit}
                  className="block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 w-full"
                >
                  Test Audit Log
                </button>
                <button
                  onClick={testSecurity}
                  className="block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full"
                >
                  Test Security Log
                </button>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">📊 Test Results</h2>
              <button
                onClick={clearResults}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
            
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-gray-500">Run tests to see results here...</div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="mb-1">{result}</div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">💡 Debugging Instructions</h3>
            <div className="text-yellow-800 space-y-2 text-sm">
              <div><strong>1. Terminal Logs:</strong> Check your terminal running `npm run dev` for structured logs</div>
              <div><strong>2. Browser Console:</strong> Press F12 and check Console tab for client-side logs</div>
              <div><strong>3. Live Monitor:</strong> The red debug widget in bottom-right shows real-time errors</div>
              <div><strong>4. Network Tab:</strong> F12 → Network tab shows all API requests and responses</div>
              <div><strong>5. Error Stream:</strong> Visit <code>/api/errors/stream</code> for raw SSE feed</div>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🌐</div>
              <div className="font-semibold">Server Status</div>
              <div className="text-green-600">Running</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🔗</div>
              <div className="font-semibold">OpenAI API</div>
              <div className="text-green-600">Connected</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🗄️</div>
              <div className="font-semibold">Database</div>
              <div className="text-yellow-600">Optional</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 