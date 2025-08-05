#!/usr/bin/env node

/**
 * Integration Test Suite
 * 
 * Tests the integration between all major components of the Maverick system
 */

const ModularOrchestrator = require('./src/orchestrator/ModularOrchestrator');
const fs = require('fs-extra');
const path = require('path');

class IntegrationTester {
  constructor() {
    this.orchestrator = null;
    this.testResults = [];
    this.startTime = Date.now();
  }
  
  async runAllTests() {
    console.log('🧪 Starting Maverick Integration Tests');
    console.log('====================================');
    
    try {
      await this.setupTestEnvironment();
      await this.testSystemInitialization();
      await this.testServiceCoordination();
      await this.testEventDrivenArchitecture();
      await this.testStorageOperations();
      await this.testQualitySystem();
      await this.testPerformanceTracking();
      await this.testAdaptiveBehavior();
      await this.cleanup();
      
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Integration tests failed:', error);
      process.exit(1);
    }
  }
  
  async setupTestEnvironment() {
    console.log('\n🏗️ Setting up test environment...');
    
    // Clean up any existing test data
    const testDataPath = './test-data';
    if (await fs.pathExists(testDataPath)) {
      await fs.remove(testDataPath);
    }
    
    this.orchestrator = new ModularOrchestrator({
      storagePath: testDataPath + '/storage',
      maxConcurrentProjects: 2,
      maxConcurrentTasks: 5,
      enableDetailedLogging: false,
      enableMetricsCollection: true
    });
    
    console.log('✅ Test environment set up');
  }
  
  async testSystemInitialization() {
    console.log('\n🚀 Testing System Initialization...');
    
    try {
      // Test initialization
      const initResult = await this.orchestrator.initialize();
      
      this.assert(initResult.status === 'initialized', 'System should initialize successfully');
      this.assert(initResult.services.length > 0, 'Should register services');
      this.assert(initResult.storageManager !== null, 'Should initialize storage manager');
      this.assert(initResult.eventBus !== null, 'Should initialize event bus');
      
      // Test startup
      await this.orchestrator.start();
      
      const status = this.orchestrator.getSystemStatus();
      this.assert(status.status === 'running', 'System should be running');
      
      // Check that all services are healthy
      const healthyServices = Object.values(status.services).filter(s => s.health === 'healthy');
      this.assert(healthyServices.length === Object.keys(status.services).length, 'All services should be healthy');
      
      this.recordTest('System Initialization', true);
      
    } catch (error) {
      this.recordTest('System Initialization', false, error.message);
      throw error;
    }
  }
  
  async testServiceCoordination() {
    console.log('\n🔗 Testing Service Coordination...');
    
    try {
      const status = this.orchestrator.getSystemStatus();
      
      // Test that all expected services are running
      const expectedServices = [
        'TaskGraphService',
        'AgentPoolManager', 
        'QualityService',
        'QualityFeedbackEngine',
        'AgentPerformanceTracker'
      ];
      
      for (const serviceName of expectedServices) {
        this.assert(status.services[serviceName] !== undefined, `${serviceName} should be registered`);
        this.assert(status.services[serviceName].status === 'running', `${serviceName} should be running`);
        this.assert(status.services[serviceName].health === 'healthy', `${serviceName} should be healthy`);
      }
      
      this.recordTest('Service Coordination', true);
      
    } catch (error) {
      this.recordTest('Service Coordination', false, error.message);
      throw error;
    }
  }
  
  async testEventDrivenArchitecture() {
    console.log('\n📡 Testing Event-Driven Architecture...');
    
    try {
      // Test event publishing and subscription
      let eventReceived = false;
      let eventData = null;
      
      // Subscribe to a test event
      await this.orchestrator.eventBus.subscribe('test.event', (event) => {
        eventReceived = true;
        eventData = event.data;
      });
      
      // Publish test event
      await this.orchestrator.eventBus.publish('test.event', {
        message: 'Test message',
        timestamp: Date.now()
      });
      
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.assert(eventReceived === true, 'Event should be received by subscriber');
      this.assert(eventData.message === 'Test message', 'Event data should be preserved');
      
      // Test event bus health
      const eventBusHealth = await this.orchestrator.eventBus.healthCheck();
      this.assert(eventBusHealth.status === 'healthy', 'Event bus should be healthy');
      
      this.recordTest('Event-Driven Architecture', true);
      
    } catch (error) {
      this.recordTest('Event-Driven Architecture', false, error.message);
      throw error;
    }
  }
  
  async testStorageOperations() {
    console.log('\n💾 Testing Storage Operations...');
    
    try {
      const storage = this.orchestrator.storageManager;
      
      // Test basic storage operations
      const testData = {
        id: 'test-123',
        name: 'Integration Test Data',
        timestamp: Date.now(),
        nested: {
          value: 42,
          array: [1, 2, 3]
        }
      };
      
      // Test save and load
      const testPath = path.join(storage.basePath, 'test', 'integration-test.json');
      await storage.saveJSON(testPath, testData);
      
      this.assert(await fs.pathExists(testPath), 'Test file should be created');
      
      const loadedData = await storage.loadJSON(testPath);
      this.assert(loadedData.id === testData.id, 'Loaded data should match saved data');
      this.assert(loadedData.nested.value === testData.nested.value, 'Nested data should be preserved');
      
      // Test directory structure
      const expectedDirs = ['projects', 'agents', 'system'];
      for (const dir of expectedDirs) {
        const dirPath = path.join(storage.basePath, dir);
        this.assert(await fs.pathExists(dirPath), `${dir} directory should exist`);
      }
      
      this.recordTest('Storage Operations', true);
      
    } catch (error) {
      this.recordTest('Storage Operations', false, error.message);
      throw error;
    }
  }
  
  async testQualitySystem() {
    console.log('\n🔍 Testing Quality System...');
    
    try {
      // Create a mock project to test quality assessment
      const projectId = await this.orchestrator.createProject({
        name: 'Test Quality Project',
        description: 'Testing quality assessment system'
      }, {
        originalPrompt: 'Test project for quality assessment',
        parsedRequirements: ['Test requirement 1', 'Test requirement 2']
      });
      
      this.assert(projectId !== null, 'Project should be created successfully');
      
      // Give the system time to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const activeProjects = this.orchestrator.getActiveProjects();
      this.assert(activeProjects.length > 0, 'Should have active projects');
      
      const testProject = activeProjects.find(p => p.id === projectId);
      this.assert(testProject !== undefined, 'Test project should be in active projects');
      
      this.recordTest('Quality System', true);
      
    } catch (error) {
      this.recordTest('Quality System', false, error.message);
      throw error;
    }
  }
  
  async testPerformanceTracking() {
    console.log('\n⚡ Testing Performance Tracking...');
    
    try {
      const status = this.orchestrator.getSystemStatus();
      
      // Performance metrics should be available
      this.assert(status.performance !== undefined, 'Performance metrics should be available');
      this.assert(typeof status.performance.totalTasksExecuted === 'number', 'Task execution count should be tracked');
      this.assert(typeof status.performance.eventThroughput === 'number', 'Event throughput should be tracked');
      
      // System intelligence should be available
      const intelligence = this.orchestrator.getSystemIntelligence();
      this.assert(intelligence !== null, 'System intelligence should be available');
      this.assert(typeof intelligence.loadBalancing === 'object', 'Load balancing data should be available');
      
      this.recordTest('Performance Tracking', true);
      
    } catch (error) {
      this.recordTest('Performance Tracking', false, error.message);
      throw error;
    }
  }
  
  async testAdaptiveBehavior() {
    console.log('\n🧠 Testing Adaptive Behavior...');
    
    try {
      const intelligence = this.orchestrator.getSystemIntelligence();
      
      // Adaptive behaviors structure should exist
      this.assert(intelligence.adaptiveBehaviors !== undefined, 'Adaptive behaviors should be tracked');
      this.assert(intelligence.performancePatterns !== undefined, 'Performance patterns should be tracked');
      this.assert(Array.isArray(intelligence.optimizationHistory), 'Optimization history should be an array');
      
      // System should be capable of monitoring and adaptation
      const status = this.orchestrator.getSystemStatus();
      this.assert(status.systemAlerts !== undefined, 'System alerts should be tracked');
      
      this.recordTest('Adaptive Behavior', true);
      
    } catch (error) {
      this.recordTest('Adaptive Behavior', false, error.message);
      throw error;
    }
  }
  
  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      if (this.orchestrator) {
        await this.orchestrator.stop();
      }
      
      // Clean up test data
      const testDataPath = './test-data';
      if (await fs.pathExists(testDataPath)) {
        await fs.remove(testDataPath);
      }
      
      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
  
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
  
  recordTest(testName, passed, error = null) {
    this.testResults.push({
      name: testName,
      passed: passed,
      error: error,
      timestamp: Date.now()
    });
    
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
    
    if (!passed && error) {
      console.log(`   Error: ${error}`);
    }
  }
  
  displayResults() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const duration = Date.now() - this.startTime;
    
    console.log('\n📊 Integration Test Results');
    console.log('===========================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      for (const test of this.testResults.filter(t => !t.passed)) {
        console.log(`   • ${test.name}: ${test.error}`);
      }
    }
    
    console.log('\n🎯 Integration Test Summary:');
    if (failedTests === 0) {
      console.log('🎉 All integration tests passed! The Maverick system is working correctly.');
      console.log('✅ System is ready for production use with all components integrated.');
    } else {
      console.log(`⚠️ ${failedTests} test(s) failed. Please review and fix issues before deployment.`);
    }
    
    // Exit with appropriate code
    process.exit(failedTests === 0 ? 0 : 1);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = IntegrationTester;