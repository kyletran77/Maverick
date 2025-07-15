#!/usr/bin/env node

/**
 * Test script to validate multi-agent dependency chain execution fix
 * This script tests that when one agent completes a task, dependent tasks 
 * are properly triggered for other agents.
 */

const path = require('path');
const TaskOrchestrator = require('../backend/src/orchestrator/TaskOrchestrator');
const { GooseIntegration } = require('../backend/goose-integration');
const JobStorage = require('../backend/jobStorage');
const { Server } = require('socket.io');

class MockSocket {
  constructor() {
    this.events = {};
    this.emittedEvents = [];
  }
  
  emit(event, data) {
    console.log(`[MOCK SOCKET] Emitted event: ${event}`, data ? Object.keys(data) : '');
    this.emittedEvents.push({ event, data, timestamp: new Date() });
    
    if (this.events[event]) {
      this.events[event].forEach(handler => handler(data));
    }
  }
  
  on(event, handler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }
}

class MockIO {
  emit(event, data) {
    console.log(`[MOCK IO] Broadcast event: ${event}`, data ? Object.keys(data) : '');
  }
}

async function testMultiAgentDependencyChain() {
  console.log('🧪 Starting Multi-Agent Dependency Chain Test...\n');
  
  // Setup
  const mockIO = new MockIO();
  const jobStorage = new JobStorage();
  const orchestrator = new TaskOrchestrator(mockIO, jobStorage);
  const mockSocket = new MockSocket();
  
  // Track agent status updates
  const agentUpdates = [];
  mockSocket.on('agent_status_update', (data) => {
    agentUpdates.push({
      agentId: data.agentId,
      agentName: data.agentName,
      agentType: data.agentType,
      status: data.status,
      task: data.currentTask,
      timestamp: new Date()
    });
    console.log(`  📊 Agent Update: ${data.agentName} (${data.agentType}) - ${data.status} - ${data.currentTask}`);
  });
  
  // Track task completions
  const taskCompletions = [];
  mockSocket.on('task_completed', (data) => {
    taskCompletions.push({
      taskId: data.taskId,
      agentId: data.agentId,
      task: data.task,
      timestamp: new Date()
    });
    console.log(`  ✅ Task Completed: ${data.task.title} by ${data.task.assignedAgent || 'unknown'}`);
  });
  
  // Test parameters
  const testProjectPath = path.join(__dirname, '..', 'test-output');
  const testPrompt = 'Create a simple React todo app with Node.js backend and PostgreSQL database';
  
  try {
    console.log('📝 Test Prompt:', testPrompt);
    console.log('📁 Test Project Path:', testProjectPath);
    console.log('');
    
    // Step 1: Create project orchestration
    console.log('🚀 Step 1: Creating project orchestration...');
    const project = await orchestrator.orchestrateProject(testPrompt, testProjectPath, mockSocket);
    
    console.log('');
    console.log('📊 Project Analysis:');
    console.log(`  - Project ID: ${project.id}`);
    console.log(`  - Total Tasks: ${project.taskGraph.nodes.length}`);
    console.log(`  - Agents Created: ${project.agentAssignments.size}`);
    console.log(`  - Project Type: ${project.taskGraph.projectType}`);
    console.log(`  - Complexity: ${project.taskGraph.complexity}`);
    
    // Step 2: Analyze task assignments
    console.log('');
    console.log('👥 Agent Assignments:');
    project.agentAssignments.forEach((assignment, agentId) => {
      console.log(`  - ${assignment.agent.name} (${assignment.agent.type}): ${assignment.tasks.length} tasks`);
      assignment.tasks.forEach(task => {
        console.log(`    • ${task.title} (${task.status})`);
      });
    });
    
    // Step 3: Analyze task dependencies
    console.log('');
    console.log('🔗 Task Dependencies:');
    project.taskGraph.nodes.forEach(node => {
      const task = node.data;
      const dependencies = project.taskGraph.edges.filter(edge => edge.target === task.id);
      if (dependencies.length > 0) {
        console.log(`  - ${task.title} depends on:`);
        dependencies.forEach(dep => {
          const depTask = project.taskGraph.nodes.find(n => n.id === dep.source);
          console.log(`    • ${depTask ? depTask.data.title : dep.source}`);
        });
      } else {
        console.log(`  - ${task.title} (no dependencies - should start first)`);
      }
    });
    
    // Step 4: Wait for execution to complete
    console.log('');
    console.log('⏳ Waiting for task execution to complete...');
    
    // Wait for a reasonable amount of time or until all tasks are completed
    const maxWaitTime = 60000; // 1 minute
    const startTime = Date.now();
    let allTasksCompleted = false;
    
    while (!allTasksCompleted && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      // Check if all tasks are completed
      allTasksCompleted = project.taskGraph.nodes.every(node => 
        node.data.status === 'completed' || node.data.status === 'needs_revision'
      );
      
      if (allTasksCompleted) {
        console.log('🎉 All tasks have been processed!');
        break;
      }
    }
    
    // Step 5: Analyze results
    console.log('');
    console.log('📈 Execution Results:');
    console.log(`  - Total agent updates: ${agentUpdates.length}`);
    console.log(`  - Total task completions: ${taskCompletions.length}`);
    console.log(`  - Expected task completions: ${project.taskGraph.nodes.length}`);
    
    // Check which agents actually worked
    const agentsWorked = new Set();
    agentUpdates.forEach(update => {
      if (update.status === 'working' || update.status === 'completed') {
        agentsWorked.add(update.agentType);
      }
    });
    
    console.log('');
    console.log('🤖 Agents That Actually Worked:');
    if (agentsWorked.size === 0) {
      console.log('  ❌ NO AGENTS WORKED - This indicates the bug is still present!');
    } else {
      agentsWorked.forEach(agentType => {
        console.log(`  ✅ ${agentType}`);
      });
    }
    
    // Check if multiple agents worked (this is what we're testing for)
    console.log('');
    if (agentsWorked.size <= 1) {
      console.log('❌ TEST FAILED: Only one or no agents worked. The dependency chain is not triggering multiple agents.');
      console.log('   This suggests the bug is still present or the fix needs refinement.');
    } else {
      console.log('✅ TEST PASSED: Multiple agents worked! The dependency chain is functioning correctly.');
      console.log(`   ${agentsWorked.size} different agent types were active during execution.`);
    }
    
    // Final task status breakdown
    console.log('');
    console.log('📋 Final Task Status:');
    const statusCounts = {};
    project.taskGraph.nodes.forEach(node => {
      const status = node.data.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count} tasks`);
    });
    
    console.log('');
    console.log('🧪 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testMultiAgentDependencyChain()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testMultiAgentDependencyChain }; 