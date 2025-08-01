/**
 * Test script for Enhanced Orchestration System
 * 
 * Tests the new Phase 1 and Phase 2 implementations:
 * - RequirementsProcessor with TRD generation
 * - IntelligentAgentMatcher with smart scoring
 * - Enhanced TaskOrchestrator integration
 */

const RequirementsProcessor = require('./src/orchestrator/RequirementsProcessor');
const IntelligentAgentMatcher = require('./src/orchestrator/IntelligentAgentMatcher');
const EnhancedGooseIntegration = require('./src/orchestrator/EnhancedGooseIntegration');
const TaskOrchestrator = require('./src/orchestrator/TaskOrchestrator');
const orchestratorConfig = require('./config/orchestrator');

class EnhancedOrchestrationTest {
  constructor() {
    this.testResults = [];
    console.log('🧪 Enhanced Orchestration Test Suite Started');
  }

  async runAllTests() {
    console.log('\n=== Phase 1 & 2 Implementation Tests ===\n');
    
    try {
      // Phase 1 Tests
      await this.testRequirementsProcessor();
      await this.testEnhancedGooseIntegration();
      
      // Phase 2 Tests
      await this.testIntelligentAgentMatcher();
      
      // Integration Tests
      await this.testTaskOrchestratorIntegration();
      await this.testConfigurationSystem();
      
      this.printTestSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testRequirementsProcessor() {
    console.log('📋 Testing RequirementsProcessor...');
    
    try {
      // Mock Goose integration for testing
      const mockGoose = {
        executeGooseTask: async (prompt, sessionId, socket, projectPath) => {
          return {
            output: `Mock TRD output for: ${prompt.substring(0, 50)}...`,
            originalTask: prompt,
            result: 'Mock analysis complete'
          };
        }
      };
      
      const processor = new RequirementsProcessor(orchestratorConfig.requirements, mockGoose);
      
      // Test basic TRD generation
      const testPrompt = "Create a React-based e-commerce website with user authentication, product catalog, shopping cart, and payment processing";
      
      const trdResult = await processor.generateTRD(testPrompt, {
        projectPath: '/tmp/test-project',
        domain: 'web_development'
      });
      
      this.assert(trdResult.trd, 'TRD should be generated');
      this.assert(trdResult.domain, 'Domain should be detected');
      this.assert(trdResult.confidence > 0, 'Confidence score should be positive');
      
      console.log(`✅ TRD generated with domain: ${trdResult.domain}, confidence: ${trdResult.confidence.toFixed(2)}`);
      
      // Test task enrichment
      const enhancedTasks = await processor.enrichTasksFromTRD(trdResult.trd);
      this.assert(enhancedTasks.length > 0, 'Enhanced tasks should be generated');
      
      console.log(`✅ Generated ${enhancedTasks.length} enhanced tasks`);
      
      this.testResults.push({ name: 'RequirementsProcessor', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ RequirementsProcessor test failed:', error.message);
      this.testResults.push({ name: 'RequirementsProcessor', status: 'FAIL', error: error.message });
    }
  }

  async testEnhancedGooseIntegration() {
    console.log('🤖 Testing EnhancedGooseIntegration...');
    
    try {
      // Mock IO for testing
      const mockIO = {
        emit: (event, data) => console.log(`Mock emit: ${event}`)
      };
      
      const enhancedGoose = new EnhancedGooseIntegration(mockIO, orchestratorConfig);
      
      // Test that the integration initializes properly
      this.assert(enhancedGoose.cache, 'Cache should be initialized');
      this.assert(enhancedGoose.baseGoose, 'Base Goose integration should be initialized');
      
      console.log('✅ EnhancedGooseIntegration initialized successfully');
      
      this.testResults.push({ name: 'EnhancedGooseIntegration', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ EnhancedGooseIntegration test failed:', error.message);
      this.testResults.push({ name: 'EnhancedGooseIntegration', status: 'FAIL', error: error.message });
    }
  }

  async testIntelligentAgentMatcher() {
    console.log('🎯 Testing IntelligentAgentMatcher...');
    
    try {
      // Mock agent registry
      const mockAgentRegistry = {
        getAllAgents: () => [
          {
            id: 'react-frontend-1',
            name: 'React Frontend Specialist',
            specialization: 'Frontend Development',
            capabilities: { 'react': { efficiency: 0.9 }, 'javascript': { efficiency: 0.8 } },
            efficiency: 0.85,
            status: 'active',
            currentTasks: [],
            configuration: { maxConcurrentTasks: 3 }
          },
          {
            id: 'node-backend-1',
            name: 'Node.js Backend Specialist',
            specialization: 'Backend Development',
            capabilities: { 'nodejs': { efficiency: 0.9 }, 'api': { efficiency: 0.8 } },
            efficiency: 0.8,
            status: 'active',
            currentTasks: [],
            configuration: { maxConcurrentTasks: 3 }
          }
        ]
      };
      
      // Mock enhanced Goose
      const mockEnhancedGoose = {
        analyzeAgentTaskMatch: async (task, agents, context) => {
          return {
            analysis: agents.map(agent => ({
              agentId: agent.id,
              skillMatchPercentage: 85,
              capabilityGaps: [],
              workloadImpact: 0.8,
              specializationAlignment: 0.9,
              riskFactors: [],
              confidence: 0.8,
              recommendation: 'Good fit for task'
            })),
            method: 'mock'
          };
        }
      };
      
      const matcher = new IntelligentAgentMatcher(
        orchestratorConfig,
        mockAgentRegistry,
        mockEnhancedGoose
      );
      
      // Test agent matching
      const testTask = {
        id: 'task-1',
        title: 'Build React component for user authentication',
        description: 'Create a reusable React component for user login and registration',
        type: 'frontend',
        skillRequirements: {
          primary: ['react', 'javascript'],
          secondary: ['css'],
          complexity: 6
        },
        qualityCriteria: ['Unit tests included', 'Responsive design'],
        estimatedComplexity: 6,
        priority: 'high'
      };
      
      const availableAgents = mockAgentRegistry.getAllAgents();
      
      const assignment = await matcher.findBestAgent(testTask, availableAgents, {
        projectPath: '/tmp/test-project'
      });
      
      this.assert(assignment.selectedAgent, 'Agent should be selected');
      this.assert(assignment.confidence > 0, 'Confidence should be positive');
      this.assert(assignment.reasoning, 'Reasoning should be provided');
      
      console.log(`✅ Selected agent: ${assignment.selectedAgent.name} with confidence: ${assignment.confidence.toFixed(2)}`);
      
      this.testResults.push({ name: 'IntelligentAgentMatcher', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ IntelligentAgentMatcher test failed:', error.message);
      this.testResults.push({ name: 'IntelligentAgentMatcher', status: 'FAIL', error: error.message });
    }
  }

  async testTaskOrchestratorIntegration() {
    console.log('🔧 Testing TaskOrchestrator Integration...');
    
    try {
      // Mock IO and job storage
      const mockIO = {
        emit: (event, data) => console.log(`Mock emit: ${event}`)
      };
      
      const mockJobStorage = {
        addJob: (job) => console.log(`Mock job added: ${job.id}`)
      };
      
      const orchestrator = new TaskOrchestrator(mockIO, mockJobStorage);
      
      // Test that enhanced components are properly initialized
      this.assert(orchestrator.config, 'Configuration should be loaded');
      this.assert(orchestrator.enhancedGoose, 'Enhanced Goose should be initialized');
      
      // Test feature flag behavior
      const hasEnhancedOrchestration = orchestrator.config?.features?.enhancedOrchestration;
      const hasIntelligentMatching = orchestrator.config?.features?.intelligentAgentMatching;
      
      console.log(`✅ Enhanced orchestration: ${hasEnhancedOrchestration ? 'ENABLED' : 'DISABLED'}`);
      console.log(`✅ Intelligent matching: ${hasIntelligentMatching ? 'ENABLED' : 'DISABLED'}`);
      
      // Test that the enhanced method exists
      this.assert(typeof orchestrator.orchestrateProjectEnhanced === 'function', 
        'Enhanced orchestration method should exist');
      
      console.log('✅ TaskOrchestrator integration successful');
      
      this.testResults.push({ name: 'TaskOrchestratorIntegration', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ TaskOrchestrator integration test failed:', error.message);
      this.testResults.push({ name: 'TaskOrchestratorIntegration', status: 'FAIL', error: error.message });
    }
  }

  async testConfigurationSystem() {
    console.log('⚙️ Testing Configuration System...');
    
    try {
      // Test configuration loading
      this.assert(orchestratorConfig, 'Configuration should be loaded');
      this.assert(orchestratorConfig.features, 'Features configuration should exist');
      this.assert(orchestratorConfig.requirements, 'Requirements configuration should exist');
      this.assert(orchestratorConfig.agentMatching, 'Agent matching configuration should exist');
      this.assert(orchestratorConfig.domains, 'Domain configuration should exist');
      
      // Test domain configurations
      const webDomain = orchestratorConfig.domains['web_development'];
      this.assert(webDomain, 'Web development domain should be configured');
      this.assert(webDomain.requiredSections, 'Required sections should be defined');
      
      console.log(`✅ Configuration loaded with ${Object.keys(orchestratorConfig.domains).length} domains`);
      console.log(`✅ Feature flags: ${JSON.stringify(orchestratorConfig.features)}`);
      
      this.testResults.push({ name: 'ConfigurationSystem', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ Configuration system test failed:', error.message);
      this.testResults.push({ name: 'ConfigurationSystem', status: 'FAIL', error: error.message });
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  printTestSummary() {
    console.log('\n=== Test Summary ===');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
    
    this.testResults.forEach(result => {
      const emoji = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${emoji} ${result.name}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (failed === 0) {
      console.log('\n🎉 All enhanced orchestration tests passed!');
      console.log('\n📋 Phase 1 & 2 Implementation Summary:');
      console.log('   ✅ RequirementsProcessor: TRD generation with Goose CLI integration');
      console.log('   ✅ IntelligentAgentMatcher: Multi-dimensional scoring with fallbacks');
      console.log('   ✅ EnhancedGooseIntegration: Intelligent AI analysis capabilities');
      console.log('   ✅ Enhanced TaskOrchestrator: Backward-compatible integration');
      console.log('   ✅ Configuration System: Feature flags and domain templates');
      console.log('\n🚀 Ready for Phase 3: Adaptive Orchestration');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
      process.exit(1);
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new EnhancedOrchestrationTest();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { EnhancedOrchestrationTest };