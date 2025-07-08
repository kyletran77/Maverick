const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import the Goose integration
const { GooseIntegration, checkGooseInstallation, getGooseConfig } = require('./goose-integration');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Initialize Goose integration
const gooseIntegration = new GooseIntegration(io);

// Store active agents and their status
const agents = new Map();
const taskQueue = [];
const activeSessions = new Map();

// Simulated agent types for the MVP
const AGENT_TYPES = {
  ORCHESTRATOR: 'orchestrator',
  CODE_GENERATOR: 'code_generator',
  CODE_REVIEWER: 'code_reviewer',
  TESTER: 'tester',
  DOCUMENTATION: 'documentation',
  DEPLOYMENT: 'deployment'
};

// Agent status types
const AGENT_STATUS = {
  IDLE: 'idle',
  WORKING: 'working',
  COMPLETED: 'completed',
  ERROR: 'error'
};

class Agent {
  constructor(id, type, name, sessionId = null) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.status = AGENT_STATUS.IDLE;
    this.currentTask = null;
    this.progress = 0;
    this.logs = [];
    this.createdAt = new Date();
    this.sessionId = sessionId;
  }

  updateStatus(status, progress = 0, message = '') {
    this.status = status;
    this.progress = progress;
    if (message) {
      this.logs.push({
        timestamp: new Date(),
        message: message
      });
    }
  }
}

// Global agent limit to prevent infinite creation
const MAX_AGENTS = 100;

// Initialize orchestrator agent
const orchestrator = new Agent(uuidv4(), AGENT_TYPES.ORCHESTRATOR, 'Orchestrator');
agents.set(orchestrator.id, orchestrator);

// API endpoints for directory operations
app.get('/api/directories', (req, res) => {
  const startPath = req.query.path || os.homedir();
  
  try {
    const directories = getDirectories(startPath);
    res.json({
      currentPath: startPath,
      parent: path.dirname(startPath),
      directories: directories
    });
  } catch (error) {
    console.error('Directory access error:', error);
    // Try fallback to current working directory
    try {
      const fallbackPath = process.cwd();
      const directories = getDirectories(fallbackPath);
      res.json({
        currentPath: fallbackPath,
        parent: path.dirname(fallbackPath),
        directories: directories,
        warning: `Could not access ${startPath}, showing current directory instead`
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        error: `Cannot access directories: ${error.message}`,
        fallbackError: fallbackError.message
      });
    }
  }
});

app.post('/api/create-directory', (req, res) => {
  const { parentPath, dirName } = req.body;
  
  if (!parentPath || !dirName) {
    return res.status(400).json({ error: 'Parent path and directory name are required' });
  }
  
  try {
    const newDirPath = path.join(parentPath, dirName);
    
    // Validate directory name
    if (dirName.includes('/') || dirName.includes('\\') || dirName.includes('..')) {
      return res.status(400).json({ error: 'Invalid directory name' });
    }
    
    if (fs.existsSync(newDirPath)) {
      return res.status(400).json({ error: 'Directory already exists' });
    }
    
    fs.mkdirSync(newDirPath, { recursive: true });
    res.json({ 
      success: true, 
      path: newDirPath,
      message: `Directory '${dirName}' created successfully`
    });
  } catch (error) {
    console.error('Directory creation error:', error);
    res.status(500).json({ error: `Failed to create directory: ${error.message}` });
  }
});

app.get('/api/goose-status', async (req, res) => {
  try {
    await checkGooseInstallation();
    const config = await getGooseConfig();
    res.json({ 
      available: true, 
      config: config,
      message: 'Goose CLI is available and configured'
    });
  } catch (error) {
    console.error('Goose CLI check error:', error);
    res.json({ 
      available: false, 
      error: error.message,
      message: 'Goose CLI is not available'
    });
  }
});

function getDirectories(dirPath) {
  try {
    // Check if directory exists and is accessible
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }
    
    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }
    
    const items = fs.readdirSync(dirPath);
    const directories = [];
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory() && !item.startsWith('.')) {
          directories.push({
            name: item,
            path: fullPath,
            isDirectory: true
          });
        }
      } catch (err) {
        // Skip items we can't access (permission denied, etc.)
        console.warn(`Skipping inaccessible item: ${fullPath}`, err.message);
        continue;
      }
    }
    
    return directories.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    throw new Error(`Cannot access directory: ${error.message}`);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current agents state to new client
  socket.emit('agents_update', Array.from(agents.values()));

  // Handle new task submission with Multi-Agent Orchestration
  socket.on('submit_task', async (data) => {
    const { task, description, projectPath, useGoose = true } = data;
    
    console.log('New task received:', task);
    console.log('Project path:', projectPath);
    console.log('Use Goose:', useGoose);
    
    if (useGoose) {
      try {
        // Check if Goose is available
        await checkGooseInstallation();
        
        // Use multi-agent orchestration
        await multiAgentOrchestrator.orchestrateTask(task, description, projectPath, socket);
        
      } catch (error) {
        console.error('Goose CLI error:', error);
        socket.emit('task_error', { 
          error: `Goose CLI not available: ${error.message}. Falling back to simulation.`
        });
        
        // Fallback to simulation
        await simulateTaskExecution(task, description, socket);
      }
    } else {
      // Use simulation mode
      await simulateTaskExecution(task, description, socket);
    }
  });

  // Handle task cancellation
  socket.on('cancel_task', (data) => {
    const { sessionId, planId } = data;
    
    if (planId) {
      // Cancel entire plan
      const cancelledCount = gooseIntegration.cancelPlanTasks(planId);
      multiAgentOrchestrator.activePlans.delete(planId);
      
      // Update orchestrator status
      orchestrator.updateStatus(AGENT_STATUS.IDLE, 0, 'Task cancelled by user');
      io.emit('agents_update', Array.from(agents.values()));
      
      socket.emit('task_cancelled', { 
        message: `Plan cancelled successfully. Stopped ${cancelledCount} agent sessions.` 
      });
    } else if (sessionId) {
      // Cancel specific session
      const success = gooseIntegration.cancelTask(sessionId);
      if (success) {
        socket.emit('task_cancelled', { message: 'Task cancelled successfully' });
      } else {
        socket.emit('task_error', { error: 'Failed to cancel task' });
      }
    } else {
      socket.emit('task_error', { error: 'No valid session or plan ID provided' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Enhanced Goose integration methods
gooseIntegration.getAllAgents = function() {
  return Array.from(agents.values());
};

gooseIntegration.createAgentFromText = function(agentName, sessionId, socket) {
  // Check agent limit to prevent infinite creation
  if (agents.size >= MAX_AGENTS) {
    console.error(`Maximum agent limit (${MAX_AGENTS}) reached. Skipping agent creation.`);
    return;
  }
  
  const agent = new Agent(uuidv4(), AGENT_TYPES.CODE_GENERATOR, agentName, sessionId);
  agents.set(agent.id, agent);
  
  socket.emit('agent_created', agent);
  io.emit('agents_update', Array.from(agents.values()));
};

gooseIntegration.updateAgentProgress = function(progress, sessionId, socket) {
  // Find agents for this session and update their progress
  const sessionAgents = Array.from(agents.values()).filter(agent => agent.sessionId === sessionId);
  
  sessionAgents.forEach(agent => {
    agent.updateStatus(AGENT_STATUS.WORKING, progress, `Progress: ${progress}%`);
  });
  
  io.emit('agents_update', Array.from(agents.values()));
};

gooseIntegration.handleTaskCompletedFromText = function(line, sessionId, socket) {
  const session = activeSessions.get(sessionId);
  if (session) {
    socket.emit('task_completed', {
      message: 'Task completed successfully with Goose CLI!',
      summary: {
        task: session.task,
        projectPath: session.projectPath,
        duration: new Date() - session.startTime,
        status: 'Success'
      }
    });
    
    // Update all agents for this session to completed
    const sessionAgents = Array.from(agents.values()).filter(agent => agent.sessionId === sessionId);
    sessionAgents.forEach(agent => {
      agent.updateStatus(AGENT_STATUS.COMPLETED, 100, 'Task completed successfully');
    });
    
    orchestrator.updateStatus(AGENT_STATUS.COMPLETED, 100, 'Goose task completed successfully');
    io.emit('agents_update', Array.from(agents.values()));
    
    activeSessions.delete(sessionId);
  }
};

async function simulateTaskExecution(task, description, socket) {
  try {
    // Step 1: Orchestrator analyzes the task
    await delay(1000);
    orchestrator.updateStatus(AGENT_STATUS.WORKING, 25, 'Breaking down task into subtasks');
    io.emit('agents_update', Array.from(agents.values()));

    // Step 2: Create specialized agents based on task type
    const requiredAgents = determineRequiredAgents(task);
    
    for (const agentType of requiredAgents) {
      // Check agent limit to prevent infinite creation
      if (agents.size >= MAX_AGENTS) {
        throw new Error(`Maximum agent limit (${MAX_AGENTS}) reached. Possible infinite loop detected.`);
      }
      
      const agent = new Agent(uuidv4(), agentType, getAgentName(agentType));
      agents.set(agent.id, agent);
      
      await delay(500);
      agent.updateStatus(AGENT_STATUS.WORKING, 0, `Starting ${agentType} tasks`);
      io.emit('agents_update', Array.from(agents.values()));
    }

    // Step 3: Simulate agents working
    await simulateAgentWork(requiredAgents);

    // Step 4: Complete orchestration
    orchestrator.updateStatus(AGENT_STATUS.COMPLETED, 100, 'Task completed successfully');
    io.emit('agents_update', Array.from(agents.values()));

    // Send completion message
    socket.emit('task_completed', {
      message: 'Task completed successfully!',
      summary: generateTaskSummary(task, requiredAgents)
    });

  } catch (error) {
    orchestrator.updateStatus(AGENT_STATUS.ERROR, 0, `Error: ${error.message}`);
    io.emit('agents_update', Array.from(agents.values()));
    socket.emit('task_error', { error: error.message });
  }
}

function determineRequiredAgents(task) {
  const taskLower = task.toLowerCase();
  const requiredAgents = [];

  if (taskLower.includes('code') || taskLower.includes('develop') || taskLower.includes('build')) {
    requiredAgents.push(AGENT_TYPES.CODE_GENERATOR);
  }
  
  if (taskLower.includes('review') || taskLower.includes('quality')) {
    requiredAgents.push(AGENT_TYPES.CODE_REVIEWER);
  }
  
  if (taskLower.includes('test') || taskLower.includes('debug')) {
    requiredAgents.push(AGENT_TYPES.TESTER);
  }
  
  if (taskLower.includes('document') || taskLower.includes('readme')) {
    requiredAgents.push(AGENT_TYPES.DOCUMENTATION);
  }
  
  if (taskLower.includes('deploy') || taskLower.includes('publish')) {
    requiredAgents.push(AGENT_TYPES.DEPLOYMENT);
  }

  // Default agents if none specified
  if (requiredAgents.length === 0) {
    requiredAgents.push(AGENT_TYPES.CODE_GENERATOR, AGENT_TYPES.TESTER);
  }

  return requiredAgents;
}

function getAgentName(type) {
  const names = {
    [AGENT_TYPES.CODE_GENERATOR]: 'Code Generator',
    [AGENT_TYPES.CODE_REVIEWER]: 'Code Reviewer',
    [AGENT_TYPES.TESTER]: 'Tester',
    [AGENT_TYPES.DOCUMENTATION]: 'Documentation Writer',
    [AGENT_TYPES.DEPLOYMENT]: 'Deployment Manager'
  };
  return names[type] || 'Unknown Agent';
}

async function simulateAgentWork(agentTypes) {
  const workingAgents = Array.from(agents.values()).filter(agent => 
    agentTypes.includes(agent.type)
  );

  // Simulate parallel work
  const workPromises = workingAgents.map(async (agent) => {
    const steps = getAgentWorkSteps(agent.type);
    
    for (let i = 0; i < steps.length; i++) {
      await delay(1000 + Math.random() * 2000); // Random delay 1-3 seconds
      
      const progress = Math.round(((i + 1) / steps.length) * 100);
      agent.updateStatus(AGENT_STATUS.WORKING, progress, steps[i]);
      io.emit('agents_update', Array.from(agents.values()));
    }
    
    agent.updateStatus(AGENT_STATUS.COMPLETED, 100, `${agent.name} completed successfully`);
    io.emit('agents_update', Array.from(agents.values()));
  });

  await Promise.all(workPromises);
}

function getAgentWorkSteps(agentType) {
  const steps = {
    [AGENT_TYPES.CODE_GENERATOR]: [
      'Analyzing requirements',
      'Designing architecture',
      'Writing core logic',
      'Implementing features',
      'Optimizing code'
    ],
    [AGENT_TYPES.CODE_REVIEWER]: [
      'Reading code structure',
      'Checking coding standards',
      'Analyzing logic flow',
      'Reviewing security aspects',
      'Providing feedback'
    ],
    [AGENT_TYPES.TESTER]: [
      'Setting up test environment',
      'Writing unit tests',
      'Running integration tests',
      'Performance testing',
      'Generating test report'
    ],
    [AGENT_TYPES.DOCUMENTATION]: [
      'Analyzing code structure',
      'Writing API documentation',
      'Creating user guides',
      'Updating README',
      'Finalizing documentation'
    ],
    [AGENT_TYPES.DEPLOYMENT]: [
      'Preparing deployment environment',
      'Building application',
      'Running deployment checks',
      'Deploying to staging',
      'Deploying to production'
    ]
  };
  
  return steps[agentType] || ['Working on task'];
}

function generateTaskSummary(task, agentTypes) {
  return {
    task: task,
    agentsUsed: agentTypes.length,
    totalTime: '2-5 minutes (simulated)',
    status: 'Success'
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cleanup old agents periodically
setInterval(() => {
  const cutoffTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago
  let deletedCount = 0;
  
  for (const [id, agent] of agents.entries()) {
    if (agent.type !== AGENT_TYPES.ORCHESTRATOR && 
        agent.createdAt.getTime() < cutoffTime &&
        agent.status === AGENT_STATUS.COMPLETED) {
      agents.delete(id);
      deletedCount++;
    }
  }
  
  // If we're approaching the limit, be more aggressive
  if (agents.size > MAX_AGENTS * 0.8) {
    console.warn(`Agent count approaching limit (${agents.size}/${MAX_AGENTS}). Performing aggressive cleanup.`);
    
    // Remove all completed agents regardless of age
    for (const [id, agent] of agents.entries()) {
      if (agent.type !== AGENT_TYPES.ORCHESTRATOR && 
          (agent.status === AGENT_STATUS.COMPLETED || agent.status === AGENT_STATUS.ERROR)) {
        agents.delete(id);
        deletedCount++;
      }
    }
  }
  
  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} old agents. Current count: ${agents.size}`);
  }
}, 60000); // Check every minute

class MultiAgentOrchestrator {
  constructor(io, gooseIntegration) {
    this.io = io;
    this.gooseIntegration = gooseIntegration;
    this.activePlans = new Map();
    this.sessionDependencies = new Map();
  }

  async orchestrateTask(task, description, projectPath, socket) {
    const planId = uuidv4();
    
    try {
      // Step 1: Create execution plan
      const plan = await this.createExecutionPlan(task, description);
      this.activePlans.set(planId, {
        ...plan,
        projectPath,
        socket,
        startTime: new Date(),
        completedSubtasks: new Set(),
        failedSubtasks: new Set(),
        runningSubtasks: new Set()
      });

      // Update orchestrator status
      orchestrator.updateStatus(AGENT_STATUS.WORKING, 10, `Created execution plan with ${plan.subtasks.length} subtasks`);
      this.io.emit('agents_update', Array.from(agents.values()));

      // Emit execution plan to frontend
      socket.emit('execution_plan_created', plan);

      // Step 2: Execute subtasks based on dependencies
      await this.executeSubtasks(planId);

    } catch (error) {
      console.error('Orchestration error:', error);
      orchestrator.updateStatus(AGENT_STATUS.ERROR, 0, `Orchestration failed: ${error.message}`);
      this.io.emit('agents_update', Array.from(agents.values()));
      socket.emit('task_error', { error: error.message });
    }
  }

  async createExecutionPlan(task, description) {
    const taskLower = task.toLowerCase();
    const subtasks = [];

    // Analyze task and break it down into subtasks
    if (taskLower.includes('web app') || taskLower.includes('website')) {
      subtasks.push(
        {
          id: uuidv4(),
          name: 'Complete Frontend Application',
          description: 'Create a complete, working frontend with HTML, CSS, JavaScript, package.json, build scripts, and README. Include all dependencies and make it immediately runnable with npm install && npm start.',
          type: 'frontend',
          dependencies: [],
          estimatedTime: 15,
          priority: 'high'
        },
        {
          id: uuidv4(),
          name: 'Complete Backend API Server',
          description: 'Create a complete, working backend server with all API endpoints, middleware, error handling, package.json, and README. Include database connection, authentication, and make it immediately runnable.',
          type: 'backend',
          dependencies: [],
          estimatedTime: 20,
          priority: 'high'
        },
        {
          id: uuidv4(),
          name: 'Database Schema & Setup',
          description: 'Create complete database schema, migration scripts, seed data, and setup instructions. Include all necessary configuration files and connection logic.',
          type: 'database',
          dependencies: [],
          estimatedTime: 10,
          priority: 'medium'
        }
      );
    } else if (taskLower.includes('api') || taskLower.includes('service')) {
      subtasks.push(
        {
          id: uuidv4(),
          name: 'Complete API Service',
          description: 'Create a complete, production-ready REST API with all endpoints, middleware, error handling, input validation, authentication, database integration, package.json, tests, and comprehensive README. Make it immediately deployable.',
          type: 'backend',
          dependencies: [],
          estimatedTime: 15,
          priority: 'high'
        },
        {
          id: uuidv4(),
          name: 'API Documentation & Testing',
          description: 'Generate comprehensive API documentation with OpenAPI/Swagger, include Postman collection, example requests/responses, and integration tests. Create a complete testing suite.',
          type: 'documentation',
          dependencies: [],
          estimatedTime: 8,
          priority: 'medium'
        }
      );
    } else if (taskLower.includes('test') || taskLower.includes('debug')) {
      subtasks.push(
        {
          id: uuidv4(),
          name: 'Complete Testing Suite',
          description: 'Create a comprehensive testing framework with unit tests, integration tests, test data, mocking, coverage reporting, and CI/CD configuration. Include package.json with test scripts and make tests immediately runnable.',
          type: 'testing',
          dependencies: [],
          estimatedTime: 12,
          priority: 'high'
        },
        {
          id: uuidv4(),
          name: 'Integration & E2E Testing',
          description: 'Create end-to-end testing suite with real environment testing, API testing, UI testing (if applicable), performance tests, and automated test reporting.',
          type: 'testing',
          dependencies: [],
          estimatedTime: 10,
          priority: 'medium'
        }
      );
    } else {
      // Generic task breakdown
      subtasks.push(
        {
          id: uuidv4(),
          name: 'Complete Implementation',
          description: 'Create a complete, working implementation of the requested feature with all necessary files, dependencies, configuration, build scripts, README, and make it immediately runnable. Include proper error handling, input validation, and production-ready code.',
          type: 'development',
          dependencies: [],
          estimatedTime: 20,
          priority: 'high'
        },
        {
          id: uuidv4(),
          name: 'Testing & Documentation',
          description: 'Create comprehensive tests, documentation, usage examples, and deployment instructions. Ensure the implementation is fully validated and ready for production use.',
          type: 'testing',
          dependencies: [],
          estimatedTime: 10,
          priority: 'medium'
        }
      );
    }

    // Add integration subtask if multiple subtasks exist
    if (subtasks.length > 1) {
      const integrationTask = {
        id: uuidv4(),
        name: 'Integration, Testing & Deployment',
        description: 'Integrate all components, ensure they work together seamlessly, create docker-compose or deployment scripts, add comprehensive integration tests, and create final deployment documentation. Verify the entire system can be built and run with a single command.',
        type: 'integration',
        dependencies: subtasks.map(st => st.id),
        estimatedTime: 8,
        priority: 'low'
      };
      subtasks.push(integrationTask);
    }

    return {
      id: uuidv4(),
      originalTask: task,
      description: description,
      subtasks: subtasks,
      totalEstimatedTime: subtasks.reduce((sum, st) => sum + st.estimatedTime, 0)
    };
  }

  async executeSubtasks(planId, recursionDepth = 0) {
    const plan = this.activePlans.get(planId);
    if (!plan) return;

    // Prevent infinite recursion
    if (recursionDepth > 10) {
      console.error(`Maximum recursion depth reached for plan ${planId}`);
      this.handlePlanFailure(planId, 'Maximum recursion depth exceeded');
      return;
    }

    // Initialize recursion tracking if not exists
    if (!plan.recursionDepth) {
      plan.recursionDepth = 0;
    }
    plan.recursionDepth++;

    const { subtasks, socket, projectPath } = plan;
    
    // Find subtasks that can be executed (no pending dependencies)
    const readySubtasks = subtasks.filter(subtask => 
      !plan.completedSubtasks.has(subtask.id) && 
      !plan.failedSubtasks.has(subtask.id) &&
      !plan.runningSubtasks.has(subtask.id) &&
      subtask.dependencies.every(depId => plan.completedSubtasks.has(depId))
    );

    if (readySubtasks.length === 0) {
      // Check if we're done or stuck
      if (plan.completedSubtasks.size === subtasks.length) {
        await this.completePlan(planId);
      } else if (plan.completedSubtasks.size + plan.failedSubtasks.size === subtasks.length) {
        // Some tasks failed, but we're done
        await this.completePlan(planId);
      } else {
        // We're stuck - some dependencies failed or circular dependency
        console.warn(`Plan ${planId} appears stuck. Completed: ${plan.completedSubtasks.size}, Failed: ${plan.failedSubtasks.size}, Total: ${subtasks.length}`);
        this.handlePlanFailure(planId, 'Dependency deadlock or circular dependency detected');
      }
      return;
    }

    // Mark subtasks as running to prevent duplicate execution
    readySubtasks.forEach(subtask => {
      if (!plan.runningSubtasks) plan.runningSubtasks = new Set();
      plan.runningSubtasks.add(subtask.id);
    });

    // Execute ready subtasks in parallel
    const executionPromises = readySubtasks.map(subtask => 
      this.executeSubtask(planId, subtask)
    );

    // Wait for current batch to complete, then check for next batch
    await Promise.allSettled(executionPromises);
    
    // Remove from running set
    readySubtasks.forEach(subtask => {
      if (plan.runningSubtasks) {
        plan.runningSubtasks.delete(subtask.id);
      }
    });
    
    // Continue with next batch if plan is still active and we haven't hit recursion limit
    if (this.activePlans.has(planId) && recursionDepth < 10) {
      // Add a small delay to prevent rapid recursion
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.executeSubtasks(planId, recursionDepth + 1);
    }
  }

  async executeSubtask(planId, subtask) {
    const plan = this.activePlans.get(planId);
    if (!plan) return;

    const { socket, projectPath } = plan;
    const sessionId = `${planId}-${subtask.id}`;

    try {
      // Check agent limit to prevent infinite creation
      if (agents.size >= MAX_AGENTS) {
        throw new Error(`Maximum agent limit (${MAX_AGENTS}) reached. Possible infinite loop detected.`);
      }
      
      // Create specialized agent for this subtask
      const agent = new Agent(uuidv4(), this.getAgentTypeFromSubtask(subtask.type), subtask.name, sessionId);
      agents.set(agent.id, agent);
      
      agent.updateStatus(AGENT_STATUS.WORKING, 0, `Starting ${subtask.name}`);
      this.io.emit('agents_update', Array.from(agents.values()));

      // Emit subtask started event
      socket.emit('subtask_started', {
        subtaskId: subtask.id,
        subtaskName: subtask.name,
        agentId: agent.id,
        agentName: agent.name,
        sessionId: sessionId
      });

      // Create specialized task prompt for Goose
      const taskPrompt = this.createSubtaskPrompt(subtask, plan.originalTask);
      
      const startTime = new Date();
      
      // Execute with Goose CLI
      await this.gooseIntegration.executeGooseTask(
        taskPrompt,
        sessionId,
        socket,
        projectPath
      );

      // Calculate duration
      const duration = `${Math.round((new Date() - startTime) / 1000)}s`;

      // Mark as completed
      plan.completedSubtasks.add(subtask.id);
      agent.updateStatus(AGENT_STATUS.COMPLETED, 100, `Completed ${subtask.name}`);
      this.io.emit('agents_update', Array.from(agents.values()));

      // Emit subtask completed event
      socket.emit('subtask_completed', {
        subtaskId: subtask.id,
        subtaskName: subtask.name,
        agentId: agent.id,
        agentName: agent.name,
        duration: duration,
        sessionId: sessionId
      });

      // Update orchestrator progress
      const progressPercentage = Math.round((plan.completedSubtasks.size / plan.subtasks.length) * 100);
      orchestrator.updateStatus(AGENT_STATUS.WORKING, progressPercentage, 
        `Completed ${plan.completedSubtasks.size}/${plan.subtasks.length} subtasks`);
      this.io.emit('agents_update', Array.from(agents.values()));

    } catch (error) {
      console.error(`Subtask execution failed: ${subtask.name}`, error);
      plan.failedSubtasks.add(subtask.id);
      
      // Update agent status
      const agent = Array.from(agents.values()).find(a => a.sessionId === sessionId);
      if (agent) {
        agent.updateStatus(AGENT_STATUS.ERROR, 0, `Failed: ${error.message}`);
        this.io.emit('agents_update', Array.from(agents.values()));
      }

      // Emit subtask failed event
      socket.emit('subtask_failed', {
        subtaskId: subtask.id,
        subtaskName: subtask.name,
        agentId: agent ? agent.id : null,
        agentName: agent ? agent.name : subtask.name,
        error: error.message,
        sessionId: sessionId
      });
    }
  }

  createSubtaskPrompt(subtask, originalTask) {
    const contextPrompt = `You are working on a subtask as part of a larger project. Your goal is to create a COMPLETE, WORKING, BUILDABLE implementation.

Original Task: ${originalTask}

Your Specific Subtask: ${subtask.name}
Description: ${subtask.description}
Type: ${subtask.type}
Priority: ${subtask.priority}

CRITICAL REQUIREMENTS:
1. Create a COMPLETE working implementation that can be built and run immediately
2. Include ALL necessary files, dependencies, and configuration
3. Add proper package.json/requirements.txt with correct dependencies and versions
4. Include build scripts and clear instructions in README.md
5. Ensure the code is production-ready and follows best practices
6. Add proper error handling and validation
7. Include basic tests that verify functionality
8. Make sure all imports/dependencies are correctly specified

DELIVERABLES CHECKLIST:
- [ ] All source code files created
- [ ] Dependency management file (package.json, requirements.txt, etc.)
- [ ] Build/run scripts configured
- [ ] README.md with setup and usage instructions
- [ ] Basic tests included
- [ ] Error handling implemented
- [ ] Code is immediately runnable

Focus only on this specific subtask but ensure it's COMPLETE and BUILDABLE. Other agents are handling other parts of the project.
Create everything needed so someone can immediately clone and run your part of the project.`;

    return contextPrompt;
  }

  getAgentTypeFromSubtask(subtaskType) {
    const typeMapping = {
      'frontend': AGENT_TYPES.CODE_GENERATOR,
      'backend': AGENT_TYPES.CODE_GENERATOR,
      'database': AGENT_TYPES.CODE_GENERATOR,
      'testing': AGENT_TYPES.TESTER,
      'documentation': AGENT_TYPES.DOCUMENTATION,
      'integration': AGENT_TYPES.DEPLOYMENT,
      'development': AGENT_TYPES.CODE_GENERATOR
    };
    return typeMapping[subtaskType] || AGENT_TYPES.CODE_GENERATOR;
  }

  async completePlan(planId) {
    const plan = this.activePlans.get(planId);
    if (!plan) return;

    const { socket, originalTask, subtasks, startTime, projectPath } = plan;
    const duration = new Date() - startTime;

    // Perform build validation
    orchestrator.updateStatus(AGENT_STATUS.WORKING, 95, 'Validating project buildability...');
    this.io.emit('agents_update', Array.from(agents.values()));

    const validationResult = await this.validateProjectBuildability(projectPath, socket);

    orchestrator.updateStatus(AGENT_STATUS.COMPLETED, 100, 'Multi-agent orchestration completed successfully');
    this.io.emit('agents_update', Array.from(agents.values()));

    socket.emit('task_completed', {
      message: 'Multi-agent task completed successfully!',
      summary: {
        task: originalTask,
        subtasksCompleted: plan.completedSubtasks.size,
        totalSubtasks: subtasks.length,
        duration: `${Math.round(duration / 1000)} seconds`,
        status: 'Success',
        agentsUsed: subtasks.length,
        buildValidation: validationResult
      }
    });

    this.activePlans.delete(planId);
  }

  async validateProjectBuildability(projectPath, socket) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!projectPath || !fs.existsSync(projectPath)) {
        return { status: 'skipped', reason: 'No project path specified' };
      }

      const validationResults = {
        hasPackageJson: false,
        hasReadme: false,
        hasSourceFiles: false,
        buildable: false,
        instructions: []
      };

      // Check for package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        validationResults.hasPackageJson = true;
        validationResults.instructions.push('npm install && npm start');
      }

      // Check for requirements.txt (Python)
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        validationResults.instructions.push('pip install -r requirements.txt && python main.py');
      }

      // Check for README
      const readmeFiles = ['README.md', 'README.txt', 'readme.md'];
      for (const readme of readmeFiles) {
        if (fs.existsSync(path.join(projectPath, readme))) {
          validationResults.hasReadme = true;
          break;
        }
      }

      // Check for source files
      const files = fs.readdirSync(projectPath);
      const sourceExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php'];
      validationResults.hasSourceFiles = files.some(file => 
        sourceExtensions.some(ext => file.endsWith(ext))
      );

      validationResults.buildable = validationResults.hasPackageJson || validationResults.instructions.length > 0;

      socket.emit('build_validation', {
        projectPath: projectPath,
        validation: validationResults
      });

      return validationResults;

    } catch (error) {
      console.error('Build validation error:', error);
      return { status: 'error', error: error.message };
    }
  }

  handlePlanFailure(planId, reason) {
    const plan = this.activePlans.get(planId);
    if (!plan) return;

    orchestrator.updateStatus(AGENT_STATUS.ERROR, 0, `Plan failed: ${reason}`);
    this.io.emit('agents_update', Array.from(agents.values()));

    plan.socket.emit('task_error', { 
      error: `Multi-agent orchestration failed: ${reason}`,
      completedSubtasks: plan.completedSubtasks.size,
      totalSubtasks: plan.subtasks.length
    });

    this.activePlans.delete(planId);
  }
}

// Initialize the multi-agent orchestrator
const multiAgentOrchestrator = new MultiAgentOrchestrator(io, gooseIntegration);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the Goose Multi-Agent UI`);
}); 