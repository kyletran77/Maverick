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
const JobStorage = require('./jobStorage');

// Import new LangGraph-inspired orchestration system
const TaskOrchestrator = require('./src/orchestrator/TaskOrchestrator');
const AgentManager = require('./src/orchestrator/AgentManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../client/public')));
app.use(express.json());

// Initialize systems
const gooseIntegration = new GooseIntegration(io);
const jobStorage = new JobStorage();
const agentManager = new AgentManager(io, gooseIntegration);
const taskOrchestrator = new TaskOrchestrator(io, jobStorage);

// Store active agents and their status (legacy support)
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

// New API endpoint to close all goose sessions
app.post('/api/close-all-sessions', (req, res) => {
  try {
    const { reason } = req.body;
    const closedCount = gooseIntegration.closeAllSessions(reason || 'Manual shutdown requested');
    
    res.json({
      success: true,
      message: `Closed ${closedCount} active goose sessions`,
      closedCount: closedCount
    });
  } catch (error) {
    console.error('Error closing all sessions:', error);
    res.status(500).json({
      success: false,
      error: `Failed to close sessions: ${error.message}`
    });
  }
});

// API endpoint to get active sessions info
app.get('/api/active-sessions', (req, res) => {
  try {
    const sessionsInfo = gooseIntegration.getActiveSessionsInfo();
    const healthCheck = gooseIntegration.performSessionHealthCheck();
    
    res.json({
      success: true,
      activeSessions: sessionsInfo,
      healthCheck: healthCheck
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      error: `Failed to get active sessions: ${error.message}`
    });
  }
});

// API endpoint for emergency cleanup
app.post('/api/emergency-cleanup', (req, res) => {
  try {
    const result = gooseIntegration.emergencyCleanup();
    
    res.json({
      success: true,
      message: 'Emergency cleanup initiated',
      result: result
    });
  } catch (error) {
    console.error('Error during emergency cleanup:', error);
    res.status(500).json({
      success: false,
      error: `Emergency cleanup failed: ${error.message}`
    });
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

app.post('/api/visit-project', (req, res) => {
  const { projectPath } = req.body;
  
  if (!projectPath) {
    return res.status(400).json({ error: 'Project path is required' });
  }
  
  try {
    // Check if path exists
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project directory not found' });
    }
    
    // Open the directory in the default file manager
    const { exec } = require('child_process');
    let command;
    
    switch (process.platform) {
      case 'darwin': // macOS
        command = `open "${projectPath}"`;
        break;
      case 'win32': // Windows
        command = `explorer "${projectPath}"`;
        break;
      default: // Linux and others
        command = `xdg-open "${projectPath}"`;
        break;
    }
    
    exec(command, (error) => {
      if (error) {
        console.error('Error opening project directory:', error);
        return res.status(500).json({ error: 'Failed to open project directory' });
      }
      
      res.json({ 
        success: true, 
        message: 'Project directory opened successfully' 
      });
    });
  } catch (error) {
    console.error('Error visiting project:', error);
    res.status(500).json({ error: `Failed to visit project: ${error.message}` });
  }
});

app.post('/api/open-ide', (req, res) => {
  const { projectPath } = req.body;
  
  if (!projectPath) {
    return res.status(400).json({ error: 'Project path is required' });
  }
  
  try {
    // Check if path exists
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project directory not found' });
    }
    
    const { exec } = require('child_process');
    let command;
    let ide = 'default IDE';
    
    // Try to detect and open with popular IDEs
    switch (process.platform) {
      case 'darwin': // macOS
        // Try VS Code first, then other IDEs
        command = `code "${projectPath}" 2>/dev/null || open -a "Visual Studio Code" "${projectPath}" 2>/dev/null || open -a "Cursor" "${projectPath}" 2>/dev/null || open -a "WebStorm" "${projectPath}" 2>/dev/null || open -a "IntelliJ IDEA" "${projectPath}" 2>/dev/null || open "${projectPath}"`;
        ide = 'VS Code or default IDE';
        break;
      case 'win32': // Windows
        command = `code "${projectPath}" 2>nul || start "" "${projectPath}"`;
        ide = 'VS Code or default IDE';
        break;
      default: // Linux and others
        command = `code "${projectPath}" 2>/dev/null || xdg-open "${projectPath}"`;
        ide = 'VS Code or default IDE';
        break;
    }
    
    exec(command, (error) => {
      if (error) {
        console.error('Error opening project in IDE:', error);
        return res.status(500).json({ error: 'Failed to open project in IDE' });
      }
      
      res.json({ 
        success: true, 
        ide: ide,
        message: 'Project opened in IDE successfully' 
      });
    });
  } catch (error) {
    console.error('Error opening project in IDE:', error);
    res.status(500).json({ error: `Failed to open project in IDE: ${error.message}` });
  }
});

// Test endpoint for kanban board
app.get('/api/test-kanban', (req, res) => {
  try {
    // Create a test project for demonstration
    const testProject = taskOrchestrator.createTestProject();
    res.json({
      success: true,
      project: testProject,
      message: 'Test kanban project created successfully'
    });
  } catch (error) {
    console.error('Error creating test kanban project:', error);
    res.status(500).json({ error: error.message });
  }
});

// QA Analytics endpoints
app.get('/api/qa/analytics', (req, res) => {
  try {
    const analytics = taskOrchestrator.qaEngineer.getQualityAnalytics();
    res.json({
      success: true,
      analytics: analytics
    });
  } catch (error) {
    console.error('Error getting QA analytics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get QA analytics' 
    });
  }
});

app.get('/api/qa/verifications', (req, res) => {
  try {
    const verifications = taskOrchestrator.qaEngineer.getActiveVerifications();
    res.json({
      success: true,
      verifications: verifications
    });
  } catch (error) {
    console.error('Error getting QA verifications:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get QA verifications' 
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
    const { task, description, projectPath, projectName, jobName } = data;
    
    console.log('New task received:', task);
    console.log('Project path:', projectPath);
    console.log('Project name:', projectName);
    console.log('Job name:', jobName);
    console.log('Task orchestration starting...');
    
    // Create project directory if projectName is provided
    let finalProjectPath = projectPath;
    if (projectName && projectPath) {
      try {
        const fullPath = path.join(projectPath, projectName);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          console.log('Created project directory:', fullPath);
        }
        finalProjectPath = fullPath;
      } catch (error) {
        console.error('Error creating project directory:', error);
        socket.emit('task_error', { 
          error: `Failed to create project directory: ${error.message}`
        });
        return;
      }
    }
    
    try {
      // Use enhanced multi-agent orchestration with quality checkpoints
      const prompt = `${task}${description ? ': ' + description : ''}`;
      await taskOrchestrator.orchestrateProject(prompt, finalProjectPath, socket, {
        jobName: jobName
      });
    } catch (error) {
      console.error('Task orchestration error:', error);
      socket.emit('task_error', { 
        error: `Task orchestration failed: ${error.message}`
      });
    }
  });

  // Job Management Events
  socket.on('pause_job', async (data) => {
    try {
      const { jobId } = data;
      const job = await taskOrchestrator.pauseJob(jobId);
      socket.emit('job_paused', { job: taskOrchestrator.sanitizeJobForTransmission(job) });
    } catch (error) {
      console.error('Error pausing job:', error);
      socket.emit('job_error', { error: error.message });
    }
  });

  socket.on('resume_job', async (data) => {
    try {
      const { jobId } = data;
      const job = await taskOrchestrator.resumeJob(jobId, socket);
      socket.emit('job_resumed', { job: taskOrchestrator.sanitizeJobForTransmission(job) });
    } catch (error) {
      console.error('Error resuming job:', error);
      socket.emit('job_error', { error: error.message });
    }
  });

  socket.on('stop_job', async (data) => {
    try {
      const { jobId } = data;
      const job = await taskOrchestrator.stopJob(jobId);
      socket.emit('job_stopped', { job: taskOrchestrator.sanitizeJobForTransmission(job) });
    } catch (error) {
      console.error('Error stopping job:', error);
      socket.emit('job_error', { error: error.message });
    }
  });

  socket.on('edit_job_goals', async (data) => {
    try {
      const { jobId, newGoals, newDescription } = data;
      const job = await taskOrchestrator.editJobGoals(jobId, newGoals, newDescription);
      socket.emit('job_goals_updated', { job: taskOrchestrator.sanitizeJobForTransmission(job) });
    } catch (error) {
      console.error('Error editing job goals:', error);
      socket.emit('job_error', { error: error.message });
    }
  });

  socket.on('restart_job', async (data) => {
    try {
      const { jobId } = data;
      const job = await taskOrchestrator.restartJobWithNewGoals(jobId, socket);
      socket.emit('job_restarted', { job: taskOrchestrator.sanitizeJobForTransmission(job) });
    } catch (error) {
      console.error('Error restarting job:', error);
      socket.emit('job_error', { error: error.message });
    }
  });

  socket.on('get_jobs', async (data) => {
    try {
      const { type = 'all', limit = 10 } = data;
      let jobs;
      
      switch (type) {
        case 'active':
          jobs = taskOrchestrator.getActiveJobs();
          break;
        case 'history':
          jobs = taskOrchestrator.getJobHistory(limit);
          break;
        default:
          jobs = taskOrchestrator.getAllJobs();
      }
      
      // Sanitize jobs before sending
      const sanitizedJobs = jobs.map(job => taskOrchestrator.sanitizeJobForTransmission(job));
      
      socket.emit('jobs_list', { jobs: sanitizedJobs, type });
    } catch (error) {
      console.error('Error getting jobs:', error);
      socket.emit('job_error', { error: error.message });
    }
  });

  socket.on('reconnect_job', async (data) => {
    try {
      const { jobId } = data;
      const success = taskOrchestrator.reconnectJobSocket(jobId, socket);
      if (success) {
        socket.emit('job_reconnected', { jobId, success: true });
      } else {
        socket.emit('job_error', { error: `Job ${jobId} not found or not active` });
      }
    } catch (error) {
      console.error('Error reconnecting to job:', error);
      socket.emit('job_error', { error: error.message });
    }
  });

  // Chat-based job control
  socket.on('job_chat_command', async (data) => {
    try {
      const { message, jobId } = data;
      const response = await processJobChatCommand(message, jobId, socket);
      socket.emit('job_chat_response', { response, originalMessage: message });
    } catch (error) {
      console.error('Error processing job chat command:', error);
      socket.emit('job_error', { error: error.message });
    }
  });

  // New LangGraph-inspired orchestrator endpoints
  socket.on('orchestrate_project', async (data) => {
    try {
      const { prompt, projectPath, options } = data;
      console.log('Orchestrating project:', prompt);
      
      const project = await taskOrchestrator.orchestrateProject(prompt, projectPath, socket, options);
      socket.emit('project_orchestrated', project);
    } catch (error) {
      console.error('Error orchestrating project:', error);
      socket.emit('orchestration_error', { error: error.message });
    }
  });

  socket.on('get_project_state', async (data) => {
    try {
      const { projectId } = data;
      const project = projectId ? 
        taskOrchestrator.getProject(projectId) : 
        taskOrchestrator.getActiveProject();
      
      if (project) {
        socket.emit('project_state', project);
      } else {
        socket.emit('project_state', null);
      }
    } catch (error) {
      console.error('Error getting project state:', error);
      socket.emit('orchestration_error', { error: error.message });
    }
  });

  socket.on('get_agent_states', async (data) => {
    try {
      const agentStates = agentManager.getAllAgentStates();
      socket.emit('agent_states', agentStates);
    } catch (error) {
      console.error('Error getting agent states:', error);
      socket.emit('orchestration_error', { error: error.message });
    }
  });

  // ============================================
  // PROJECT PERSISTENCE EVENTS
  // ============================================

  // List all available projects
  socket.on('list_projects', async (data) => {
    try {
      const projects = await taskOrchestrator.listAvailableProjects();
      socket.emit('projects_listed', { projects });
    } catch (error) {
      console.error('Error listing projects:', error);
      socket.emit('project_error', { error: error.message });
    }
  });

  // Get detailed project information
  socket.on('get_project_details', async (data) => {
    try {
      const { projectId } = data;
      const project = await taskOrchestrator.getProjectDetails(projectId);
      if (project) {
        socket.emit('project_details', { 
          projectId, 
          project: taskOrchestrator.sanitizeProjectForTransmission(project) 
        });
      } else {
        socket.emit('project_error', { error: `Project ${projectId} not found` });
      }
    } catch (error) {
      console.error('Error getting project details:', error);
      socket.emit('project_error', { error: error.message });
    }
  });

  // Get project progress
  socket.on('get_project_progress', async (data) => {
    try {
      const { projectId } = data;
      const progress = await taskOrchestrator.getProjectProgress(projectId);
      socket.emit('project_progress', { projectId, progress });
    } catch (error) {
      console.error('Error getting project progress:', error);
      socket.emit('project_error', { error: error.message });
    }
  });

  // Resume a project from saved state
  socket.on('resume_project', async (data) => {
    try {
      const { projectId } = data;
      console.log(`📂 Resuming project ${projectId}...`);
      
      const project = await taskOrchestrator.resumeProject(projectId, socket);
      
      socket.emit('project_resumed_success', { 
        projectId, 
        project: taskOrchestrator.sanitizeProjectForTransmission(project) 
      });
    } catch (error) {
      console.error('Error resuming project:', error);
      socket.emit('project_error', { 
        error: `Failed to resume project: ${error.message}` 
      });
    }
  });

  // Pause a project and save its state
  socket.on('pause_project', async (data) => {
    try {
      const { projectId } = data;
      await taskOrchestrator.pauseProject(projectId, socket);
      socket.emit('project_paused_success', { projectId });
    } catch (error) {
      console.error('Error pausing project:', error);
      socket.emit('project_error', { error: error.message });
    }
  });

  // Create a checkpoint for a project
  socket.on('create_project_checkpoint', async (data) => {
    try {
      const { projectId, checkpointName } = data;
      const checkpoint = await taskOrchestrator.createProjectCheckpoint(projectId, checkpointName);
      socket.emit('checkpoint_created', { projectId, checkpoint });
    } catch (error) {
      console.error('Error creating checkpoint:', error);
      socket.emit('project_error', { error: error.message });
    }
  });

  // Delete a project
  socket.on('delete_project', async (data) => {
    try {
      const { projectId } = data;
      const success = await taskOrchestrator.deleteProject(projectId);
      if (success) {
        socket.emit('project_deleted', { projectId });
        // Broadcast to all clients that project was deleted
        io.emit('project_deleted_broadcast', { projectId });
      } else {
        socket.emit('project_error', { error: `Failed to delete project ${projectId}` });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      socket.emit('project_error', { error: error.message });
    }
  });

  socket.on('start_task', async (data) => {
    try {
      const { agentId, taskId } = data;
      const result = await agentManager.startTask(agentId, taskId, socket);
      socket.emit('task_started', { agentId, taskId, result });
    } catch (error) {
      console.error('Error starting task:', error);
      socket.emit('task_error', { error: error.message });
    }
  });

  socket.on('complete_task', async (data) => {
    try {
      const { agentId, taskId, result } = data;
      await agentManager.completeTask(agentId, taskId, result);
      socket.emit('task_completed', { agentId, taskId, result });
    } catch (error) {
      console.error('Error completing task:', error);
      socket.emit('task_error', { error: error.message });
    }
  });

  socket.on('move_task', async (data) => {
    try {
      const { agentId, taskId, fromColumn, toColumn } = data;
      await agentManager.moveTaskInKanban(agentId, taskId, fromColumn, toColumn);
      socket.emit('kanban_updated', { agentId, taskId, from: fromColumn, to: toColumn });
    } catch (error) {
      console.error('Error moving task:', error);
      socket.emit('task_error', { error: error.message });
    }
  });

  // Handle task cancellation
  socket.on('cancel_task', (data) => {
    const { sessionId, planId } = data;
    
    if (planId) {
      // Cancel entire plan
      const cancelledCount = gooseIntegration.cancelPlanTasks(planId);
      taskOrchestrator.activePlans.delete(planId);
      
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

  // New socket handlers for session management
  socket.on('close_all_sessions', (data) => {
    try {
      const { reason } = data || {};
      const closedCount = gooseIntegration.closeAllSessions(reason || 'User requested session cleanup');
      
      socket.emit('all_sessions_closed', {
        success: true,
        message: `Closed ${closedCount} active goose sessions`,
        closedCount: closedCount
      });

      // Broadcast to all clients
      io.emit('sessions_cleared', {
        closedCount: closedCount,
        reason: reason || 'User requested session cleanup'
      });

    } catch (error) {
      console.error('Error closing all sessions:', error);
      socket.emit('session_error', {
        error: `Failed to close sessions: ${error.message}`
      });
    }
  });

  socket.on('get_active_sessions', () => {
    try {
      const sessionsInfo = gooseIntegration.getActiveSessionsInfo();
      const healthCheck = gooseIntegration.performSessionHealthCheck();
      
      socket.emit('active_sessions_info', {
        success: true,
        activeSessions: sessionsInfo,
        healthCheck: healthCheck
      });
    } catch (error) {
      console.error('Error getting active sessions:', error);
      socket.emit('session_error', {
        error: `Failed to get active sessions: ${error.message}`
      });
    }
  });

  socket.on('emergency_cleanup', () => {
    try {
      const result = gooseIntegration.emergencyCleanup();
      
      socket.emit('emergency_cleanup_result', {
        success: true,
        message: 'Emergency cleanup initiated',
        result: result
      });

      // Broadcast emergency cleanup to all clients
      io.emit('emergency_cleanup_completed', {
        result: result,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error during emergency cleanup:', error);
      socket.emit('session_error', {
        error: `Emergency cleanup failed: ${error.message}`
      });
    }
  });

  socket.on('cleanup_project_sessions', async (data) => {
    try {
      const { projectId, status } = data;
      
      if (!projectId) {
        socket.emit('session_error', { error: 'Project ID is required' });
        return;
      }

      const result = await gooseIntegration.cleanupProjectSessions(
        projectId, 
        status || 'completed', 
        socket
      );
      
      socket.emit('project_cleanup_result', {
        success: true,
        result: result
      });

    } catch (error) {
      console.error('Error cleaning up project sessions:', error);
      socket.emit('session_error', {
        error: `Project cleanup failed: ${error.message}`
      });
    }
  });

  // Handle open terminal request
  socket.on('open_terminal', (data) => {
    const { projectPath } = data;
    
    if (!projectPath) {
      socket.emit('terminal_error', { error: 'No project path provided' });
      return;
    }
    
    try {
      const { spawn } = require('child_process');
      const os = require('os');
      
      // Open terminal in the project directory based on OS
      let command, args;
      
      if (os.platform() === 'darwin') { // macOS
        command = 'open';
        args = ['-a', 'Terminal', projectPath];
      } else if (os.platform() === 'win32') { // Windows
        command = 'cmd';
        args = ['/c', 'start', 'cmd', '/k', `cd /d "${projectPath}"`];
      } else { // Linux
        command = 'gnome-terminal';
        args = ['--working-directory', projectPath];
      }
      
      const terminalProcess = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });
      
      terminalProcess.unref();
      
      socket.emit('terminal_opened', { 
        message: 'Terminal opened in project directory',
        projectPath: projectPath 
      });
      
    } catch (error) {
      console.error('Error opening terminal:', error);
      socket.emit('terminal_error', { 
        error: `Failed to open terminal: ${error.message}` 
      });
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

// Chat-based job control processor
async function processJobChatCommand(message, jobId, socket) {
  const lowerMessage = message.toLowerCase().trim();
  
  try {
    // Parse common job control commands
    if (lowerMessage.includes('stop') || lowerMessage.includes('halt') || lowerMessage.includes('cancel')) {
      if (jobId) {
        await taskOrchestrator.stopJob(jobId);
        return `Job ${jobId} has been stopped.`;
      } else {
        return "Please specify a job ID to stop.";
      }
    }
    
    if (lowerMessage.includes('pause')) {
      if (jobId) {
        await taskOrchestrator.pauseJob(jobId);
        return `Job ${jobId} has been paused.`;
      } else {
        return "Please specify a job ID to pause.";
      }
    }
    
    if (lowerMessage.includes('resume') || lowerMessage.includes('continue')) {
      if (jobId) {
        await taskOrchestrator.resumeJob(jobId, socket);
        return `Job ${jobId} has been resumed.`;
      } else {
        return "Please specify a job ID to resume.";
      }
    }
    
    if (lowerMessage.includes('edit') || lowerMessage.includes('modify') || lowerMessage.includes('change')) {
      if (jobId) {
        // Extract the new goals from the message
        const goalPatterns = [
          /change.*to (.+)/i,
          /modify.*to (.+)/i,
          /edit.*to (.+)/i,
          /update.*to (.+)/i,
          /make it (.+)/i
        ];
        
        let newGoals = null;
        for (const pattern of goalPatterns) {
          const match = message.match(pattern);
          if (match) {
            newGoals = { task: match[1].trim(), description: match[1].trim() };
            break;
          }
        }
        
        if (newGoals) {
          await taskOrchestrator.editJobGoals(jobId, newGoals, newGoals.description);
          return `Job ${jobId} goals have been updated to: "${newGoals.task}". Use "restart job" to apply changes.`;
        } else {
          return "Please specify what you want to change. For example: 'Change the React app to use Vue instead'";
        }
      } else {
        return "Please specify a job ID to edit.";
      }
    }
    
    if (lowerMessage.includes('restart') || lowerMessage.includes('rerun')) {
      if (jobId) {
        await taskOrchestrator.restartJobWithNewGoals(jobId, socket);
        return `Job ${jobId} has been restarted with updated goals.`;
      } else {
        return "Please specify a job ID to restart.";
      }
    }
    
    if (lowerMessage.includes('status') || lowerMessage.includes('info')) {
      if (jobId) {
        const job = jobStorage.getJob(jobId);
        if (job) {
          return `Job ${jobId} (${job.name}): Status: ${job.status}, Progress: ${job.progress}%, Created: ${new Date(job.createdAt).toLocaleString()}`;
        } else {
          return `Job ${jobId} not found.`;
        }
      } else {
        const activeJobs = taskOrchestrator.getActiveJobs();
        if (activeJobs.length === 0) {
          return "No active jobs found.";
        }
        return `Active jobs: ${activeJobs.map(job => `${job.id} (${job.name}) - ${job.status}`).join(', ')}`;
      }
    }
    
    if (lowerMessage.includes('list') || lowerMessage.includes('show')) {
      const jobs = taskOrchestrator.getAllJobs();
      if (jobs.length === 0) {
        return "No jobs found.";
      }
      return `All jobs:\n${jobs.map(job => `• ${job.id} (${job.name}) - ${job.status} - ${new Date(job.createdAt).toLocaleString()}`).join('\n')}`;
    }
    
    // Default response for unrecognized commands
    return `Available commands:
• "stop job" - Stop the current job
• "pause job" - Pause the current job
• "resume job" - Resume a paused job
• "edit job to [new description]" - Change job goals
• "restart job" - Restart job with new goals
• "status" - Show job status
• "list jobs" - Show all jobs

Example: "Change the React app to use Vue instead"`;
    
  } catch (error) {
    console.error('Error processing chat command:', error);
    return `Error processing command: ${error.message}`;
  }
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

// The MultiAgentOrchestrator class is now part of the TaskOrchestrator
// The AgentManager handles agent lifecycle and status updates
// The TaskOrchestrator handles the overall orchestration logic

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the Goose Multi-Agent UI`);
});

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close all active goose sessions
    const closedCount = gooseIntegration.closeAllSessions(`Server shutdown (${signal})`);
    console.log(`Closed ${closedCount} active goose sessions`);
    
    // Close server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    
    // Force exit after 10 seconds if graceful shutdown takes too long
    setTimeout(() => {
      console.log('Force shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle various shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR1', () => gracefulShutdown('SIGUSR1'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Periodic health check and cleanup of stuck sessions
setInterval(() => {
  try {
    const healthReport = gooseIntegration.performSessionHealthCheck();
    
    // Auto-cleanup orphaned sessions (older than 2 hours)
    if (healthReport.orphanedSessions > 0) {
      console.log(`Found ${healthReport.orphanedSessions} orphaned sessions. Running cleanup...`);
      
      for (const recommendation of healthReport.recommendations) {
        if (recommendation.issue === 'orphaned') {
          try {
            gooseIntegration.terminateSession(recommendation.sessionId, 'Auto-cleanup: orphaned session');
            console.log(`Auto-cleaned orphaned session: ${recommendation.sessionId}`);
          } catch (error) {
            console.error(`Failed to auto-cleanup session ${recommendation.sessionId}:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during periodic session health check:', error);
  }
}, 10 * 60 * 1000); // Run every 10 minutes 