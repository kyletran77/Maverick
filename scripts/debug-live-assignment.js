#!/usr/bin/env node

/**
 * Debug Live Assignment Issue
 * 
 * This script simulates the exact orchestration process that happens in production
 * to debug why tasks are incorrectly assigned to Code Review Specialist
 */

const TaskOrchestrator = require('../backend/src/orchestrator/TaskOrchestrator');

class MockSocket {
  constructor() {
    this.events = [];
  }
  
  emit(event, data) {
    this.events.push({ event, data, timestamp: new Date() });
    if (event === 'task_assigned' || event === 'agent_assigned') {
      console.log(`📡 ${event}:`, data.taskTitle, '→', data.agentName);
    }
  }
}

class MockJobStorage {
  addJob(job) {}
}

async function debugLiveAssignment() {
  console.log('🔍 Debugging Live Assignment Issue...\n');
  
  // Create the exact same setup as production
  const mockIo = {
    emit: (event, data) => {}
  };
  const mockSocket = new MockSocket();
  const mockJobStorage = new MockJobStorage();
  
  const orchestrator = new TaskOrchestrator(mockIo, mockJobStorage);
  
  // Test with a prompt similar to what might cause the issue
  const testPrompt = 'Develop a comprehensive multi-agent AI development platform similar to Broadcom Maverick. Include frontend, backend, database, multi-agent system architecture, agent communication, testing, documentation, deployment, and security features.';
  
  console.log('🎯 Test Prompt:', testPrompt);
  console.log('');
  
  // Step 1: Analyze prompt (same as production)
  console.log('📊 Step 1: Analyzing prompt...');
  const taskAnalysis = await orchestrator.analyzePromptForTasks(testPrompt, {});
  
  console.log('📋 Generated Tasks:');
  taskAnalysis.tasks.forEach((task, index) => {
    console.log(`  ${index + 1}. ${task.title} (${task.type})`);
    console.log(`     Skills: [${task.skills.join(', ')}]`);
    console.log(`     Description: ${task.description.substring(0, 100)}...`);
    console.log('');
  });
  
  // Step 2: Create bulletproof stateful graph 
  console.log('🏗️ Step 2: Creating stateful graph...');
  const projectId = `debug-${Date.now()}`;
  const statefulGraph = await orchestrator.createStatefulGraph(taskAnalysis, projectId, mockSocket);
  
  console.log(`📊 Graph created with ${statefulGraph.graph.nodes.length} nodes:`);
  
  // Step 3: Separate tasks exactly like production does
  const standardTasks = [];
  const checkpointTasks = [];
  const finalReviewTasks = [];
  
  statefulGraph.graph.nodes.forEach(node => {
    const task = node.data;
    if (task.isFinalReview) {
      finalReviewTasks.push(task);
    } else if (task.isCheckpoint) {
      checkpointTasks.push(task);
    } else {
      standardTasks.push(task);
    }
  });
  
  console.log(`📊 Task distribution: ${standardTasks.length} standard, ${checkpointTasks.length} checkpoint, ${finalReviewTasks.length} final review\n`);
  
  // Step 4: Test assignment for each standard task
  console.log('🎯 Step 4: Testing standard task assignments...\n');
  
  standardTasks.forEach((task, index) => {
    console.log(`\n--- Task ${index + 1}: ${task.title} ---`);
    console.log(`Type: ${task.type || 'undefined'}`);
    console.log(`Skills: [${(task.skills || []).join(', ')}]`);
    console.log(`Is Checkpoint: ${task.isCheckpoint}`);
    console.log(`Is Final Review: ${task.isFinalReview}`);
    
    // Test both methods
    console.log('\n🔍 Testing agent selection:');
    
    // Old method
    try {
      const oldAgent = orchestrator.findBestAgentForTask(task);
      console.log(`  Old method: ${oldAgent?.name || 'None'} (${oldAgent?.id || 'N/A'})`);
    } catch (error) {
      console.log(`  Old method error: ${error.message}`);
    }
    
    // New method
    try {
      const newAgent = orchestrator.findBestDevelopmentAgentForTask(task);
      console.log(`  New method: ${newAgent?.name || 'None'} (${newAgent?.id || 'N/A'})`);
    } catch (error) {
      console.log(`  New method error: ${error.message}`);
    }
    
    // Manual agent registry check
    try {
      if (orchestrator.specializedAgents) {
        const selection = orchestrator.specializedAgents.findBestAgent(task);
        if (selection && selection.bestAgent) {
          console.log(`  Registry selection: ${selection.bestAgent.agent.name} (score: ${(selection.bestAgent.suitabilityScore * 100).toFixed(1)}%)`);
          
          // Show all candidates for debugging
          console.log('  All candidates:');
          selection.allCandidates.slice(0, 3).forEach((candidate, i) => {
            console.log(`    ${i + 1}. ${candidate.agent.name}: ${(candidate.suitabilityScore * 100).toFixed(1)}% (skill: ${candidate.skillMatch}%)`);
          });
        }
      }
    } catch (error) {
      console.log(`  Registry error: ${error.message}`);
    }
  });
  
  console.log('\n🏆 Debug Complete!');
  console.log('\nThis should show us exactly where the assignment logic goes wrong.');
}

// Run the debug
debugLiveAssignment().catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
}); 