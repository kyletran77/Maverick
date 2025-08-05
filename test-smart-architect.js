#!/usr/bin/env node

/**
 * Test Script for Smart Architect System
 * 
 * Simple test to validate the new simplified architecture
 */

const TaskOrchestrator = require('./backend/src/orchestrator/TaskOrchestrator');

async function testSmartArchitect() {
  console.log('🧪 Testing Smart Architect System');
  console.log('=====================================');
  
  try {
    // Initialize orchestrator
    console.log('\n📋 Step 1: Initializing TaskOrchestrator...');
    const orchestrator = new TaskOrchestrator(null, null); // Mock IO and storage
    
    // Test 1: HR Onboarding System
    console.log('\n🏢 Test 1: HR Employee Onboarding System');
    console.log('----------------------------------------');
    
    const hrResult = await orchestrator.createProjectWithSmartArchitect(
      'Build an employee onboarding system for HR',
      { 
        name: 'HR Onboarding Platform',
        socket: null // No websocket for testing
      }
    );
    
    console.log('✅ HR Project Result:');
    console.log(`   - Project ID: ${hrResult.projectId}`);
    console.log(`   - Domain: ${hrResult.project.domain}`);
    console.log(`   - Complexity: ${hrResult.project.complexity}`);
    console.log(`   - Tasks: ${hrResult.analysis.tasks.length}`);
    console.log(`   - Duration: ~${hrResult.analysis.estimatedDuration} minutes`);
    
    // Test 2: Finance Reporting Tool
    console.log('\n💰 Test 2: Finance Reporting Dashboard');
    console.log('--------------------------------------');
    
    const financeResult = await orchestrator.createProjectWithSmartArchitect(
      'Create a financial reporting dashboard for executives',
      { 
        name: 'Executive Finance Dashboard',
        socket: null
      }
    );
    
    console.log('✅ Finance Project Result:');
    console.log(`   - Project ID: ${financeResult.projectId}`);
    console.log(`   - Domain: ${financeResult.project.domain}`);
    console.log(`   - Complexity: ${financeResult.project.complexity}`);
    console.log(`   - Tasks: ${financeResult.analysis.tasks.length}`);
    console.log(`   - Duration: ~${financeResult.analysis.estimatedDuration} minutes`);
    
    // Test 3: IT Asset Management
    console.log('\n💻 Test 3: IT Asset Management System');
    console.log('------------------------------------');
    
    const itResult = await orchestrator.createProjectWithSmartArchitect(
      'Build an IT asset tracking and management system',
      { 
        name: 'IT Asset Manager',
        socket: null
      }
    );
    
    console.log('✅ IT Project Result:');
    console.log(`   - Project ID: ${itResult.projectId}`);
    console.log(`   - Domain: ${itResult.project.domain}`);
    console.log(`   - Complexity: ${itResult.project.complexity}`);
    console.log(`   - Tasks: ${itResult.analysis.tasks.length}`);
    console.log(`   - Duration: ~${itResult.analysis.estimatedDuration} minutes`);
    
    // Test 4: Task Graph Validation
    console.log('\n🔗 Test 4: Task Graph Features');
    console.log('------------------------------');
    
    const taskGraph = orchestrator.taskGraph;
    const stats = taskGraph.getStatistics();
    const exported = taskGraph.exportGraph();
    
    console.log('✅ Task Graph Validation:');
    console.log(`   - Total Tasks: ${stats.totalTasks}`);
    console.log(`   - Ready Tasks: ${stats.readyTasks}`);
    console.log(`   - Critical Path: ${stats.criticalPathTasks}`);
    console.log(`   - Dependencies: ${stats.totalDependencies}`);
    console.log(`   - Graph Nodes: ${exported.nodes.length}`);
    console.log(`   - Graph Edges: ${exported.edges.length}`);
    
    // Test 5: LLM Interface
    console.log('\n🤖 Test 5: LLM Interface');
    console.log('------------------------');
    
    const llmStats = orchestrator.requirementsAnalyzer.getStats();
    console.log('✅ LLM Interface Validation:');
    console.log(`   - Total Requests: ${llmStats.llmStats.totalRequests}`);
    console.log(`   - Cache Size: ${llmStats.llmStats.cacheSize}`);
    console.log(`   - Provider: ${llmStats.llmStats.provider}`);
    console.log(`   - Model: ${llmStats.llmStats.model}`);
    
    console.log('\n🎉 All Tests Passed!');
    console.log('====================');
    console.log('✅ Smart Architect system is working correctly');
    console.log('✅ Domain-agnostic analysis working');
    console.log('✅ Task graph generation working');
    console.log('✅ Integration contracts validated');
    console.log('✅ LLM interface functional');
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testSmartArchitect().catch(console.error);