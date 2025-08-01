#!/usr/bin/env node

/**
 * Test Script: Verify Broadcom Website Task Generation Fix
 * 
 * This script tests that the TaskOrchestrator no longer generates 
 * multi-agent system tasks for simple web development requests.
 */

const TaskOrchestrator = require('../backend/src/orchestrator/TaskOrchestrator');

// Mock dependencies
const mockIO = {
  emit: (event, data) => console.log(`📡 Event: ${event}`, data)
};

const mockJobStorage = {
  addJob: (job) => console.log('📋 Job added:', job.name)
};

async function testBroadcomWebsiteFix() {
  console.log('🧪 Testing Broadcom Website Task Generation Fix\n');
  
  const orchestrator = new TaskOrchestrator(mockIO, mockJobStorage);
  
  // Original problematic prompt
  const broadcomPrompt = `You are a senior full-stack engineer. Build the initial Broadcom corporate website using React.js (with Vite or CRA) for the frontend and Python (FastAPI) for the backend API.

Frontend Requirements (React.js):
– Professional, modern enterprise layout using Tailwind CSS
– Top Navbar: Home, Products, Solutions, Support, About, Contact
– Homepage should include:
    • Hero section with call-to-action
    • Summary of Broadcom's core solutions
    • "Trusted by" logos section
– Responsive and accessible design
– Footer with sitemap, terms, privacy, and language selector

Backend Requirements (Python – FastAPI):
– Setup basic API with route /api/contact to handle POST contact form submission
– Enable CORS for React frontend
– Use Pydantic schema validation for the contact form
– Include instructions or comments for connecting to an email service or database

Deliverables:

React file structure with components folder and routing using React Router

FastAPI app with organized folder structure (main.py, routes/, schemas/)

Instructions to run both frontend and backend locally

Begin by generating the file structure, then scaffold the code for homepage, navigation bar, and FastAPI contact route.`;
  
  try {
    console.log('🔍 Analyzing prompt for task generation...\n');
    
    const taskAnalysis = await orchestrator.analyzePromptForTasks(broadcomPrompt);
    
    console.log('📊 Task Analysis Results:');
    console.log(`- Project Type: ${taskAnalysis.projectType}`);
    console.log(`- Complexity: ${taskAnalysis.complexity}`);
    console.log(`- Total Tasks: ${taskAnalysis.tasks.length}`);
    console.log(`- Estimated Duration: ${taskAnalysis.estimatedDuration} hours\n`);
    
    console.log('📝 Generated Tasks:');
    const problematicTasks = [];
    
    taskAnalysis.tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} (${task.type})`);
      console.log(`   Description: ${task.description.substring(0, 100)}...`);
      console.log(`   Skills: ${task.skills.join(', ')}`);
      console.log();
      
      // Check for problematic multi-agent tasks
      if (task.title.includes('Multi-Agent') || 
          task.title.includes('Agent Communication') ||
          task.description.includes('multi-agent orchestration') ||
          task.description.includes('agent coordination')) {
        problematicTasks.push(task);
      }
    });
    
    // Test Results
    console.log('🎯 Test Results:');
    
    if (problematicTasks.length === 0) {
      console.log('✅ SUCCESS: No multi-agent system tasks generated');
      console.log('✅ SUCCESS: Task generation fix is working correctly');
    } else {
      console.log('❌ FAILURE: Multi-agent system tasks were still generated:');
      problematicTasks.forEach(task => {
        console.log(`   - ${task.title}`);
      });
    }
    
    // Check for expected tasks
    const hasReactTask = taskAnalysis.tasks.some(task => 
      task.type === 'frontend' && task.title.includes('Frontend'));
    const hasPythonTask = taskAnalysis.tasks.some(task => 
      task.type === 'backend' && task.title.includes('Backend'));
    
    if (hasReactTask) {
      console.log('✅ SUCCESS: Frontend task generated correctly');
    } else {
      console.log('❌ FAILURE: No frontend task generated');
    }
    
    if (hasPythonTask) {
      console.log('✅ SUCCESS: Backend task generated correctly');
    } else {
      console.log('❌ FAILURE: No backend task generated');
    }
    
    // Test agent assignment
    console.log('\n🎯 Testing Agent Assignment:');
    const taskGraph = await orchestrator.createTaskGraph(taskAnalysis, 'test-project');
    const assignments = await orchestrator.assignTasksToAgentsWithCheckpoints(taskGraph);
    
    console.log(`📋 Agent Assignments (${assignments.size} agents):`);
    assignments.forEach((assignment, agentId) => {
      console.log(`\n👤 ${assignment.agent.name} (${assignment.agent.type}):`);
      assignment.tasks.forEach(task => {
        const mismatch = (task.type === 'frontend' && assignment.agent.type.includes('backend')) ||
                        (task.type === 'backend' && assignment.agent.type.includes('frontend'));
        const indicator = mismatch ? '❌' : '✅';
        console.log(`   ${indicator} ${task.title} (${task.type})`);
      });
    });
    
    console.log('\n🏁 Test Complete');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Test additional prompts to ensure we didn't break valid multi-agent requests
async function testLegitimateAgentRequest() {
  console.log('\n🧪 Testing Legitimate Multi-Agent Request (should generate agent tasks)\n');
  
  const orchestrator = new TaskOrchestrator(mockIO, mockJobStorage);
  
  const agentPrompt = "Build a multi-agent system with task orchestration where autonomous agents collaborate to process data streams";
  
  try {
    const taskAnalysis = await orchestrator.analyzePromptForTasks(agentPrompt);
    
    const hasAgentTasks = taskAnalysis.tasks.some(task => 
      task.title.includes('Multi-Agent') || task.title.includes('Agent Communication'));
    
    if (hasAgentTasks) {
      console.log('✅ SUCCESS: Multi-agent tasks generated for legitimate agent request');
    } else {
      console.log('❌ FAILURE: No multi-agent tasks generated for legitimate request');
    }
    
  } catch (error) {
    console.error('❌ Legitimate agent test failed:', error);
  }
}

// Run tests
async function runAllTests() {
  await testBroadcomWebsiteFix();
  await testLegitimateAgentRequest();
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testBroadcomWebsiteFix, testLegitimateAgentRequest };