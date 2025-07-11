const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class JobStorage {
  constructor() {
    this.jobsFilePath = path.join(__dirname, 'data', 'jobs.json');
    this.agentsFilePath = path.join(__dirname, 'data', 'agents.json');
    this.checkpointsFilePath = path.join(__dirname, 'data', 'checkpoints.json');
    this.ensureDataDirectory();
    this.loadData();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.jobsFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadData() {
    try {
      // Load jobs
      if (fs.existsSync(this.jobsFilePath)) {
        const jobsData = fs.readFileSync(this.jobsFilePath, 'utf8');
        this.jobs = JSON.parse(jobsData);
      } else {
        this.jobs = {};
      }

      // Load agents
      if (fs.existsSync(this.agentsFilePath)) {
        const agentsData = fs.readFileSync(this.agentsFilePath, 'utf8');
        this.agents = JSON.parse(agentsData);
      } else {
        this.agents = {};
      }

      // Load checkpoints
      if (fs.existsSync(this.checkpointsFilePath)) {
        const checkpointsData = fs.readFileSync(this.checkpointsFilePath, 'utf8');
        this.checkpoints = JSON.parse(checkpointsData);
      } else {
        this.checkpoints = {};
      }
    } catch (error) {
      console.error('Error loading job data:', error);
      this.jobs = {};
      this.agents = {};
      this.checkpoints = {};
    }
  }

  saveData() {
    try {
      // Save jobs
      fs.writeFileSync(this.jobsFilePath, JSON.stringify(this.jobs, null, 2));
      
      // Save agents
      fs.writeFileSync(this.agentsFilePath, JSON.stringify(this.agents, null, 2));
      
      // Save checkpoints
      fs.writeFileSync(this.checkpointsFilePath, JSON.stringify(this.checkpoints, null, 2));
    } catch (error) {
      console.error('Error saving job data:', error);
    }
  }

  // Job management methods
  createJob(name, description, goals, projectPath) {
    const jobId = uuidv4();
    const job = {
      id: jobId,
      name: name,
      description: description,
      goals: goals,
      projectPath: projectPath,
      status: 'created',
      progress: 0,
      agents: [],
      subtasks: [],
      executionPlan: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: [],
      checkpointId: null
    };
    
    this.jobs[jobId] = job;
    this.saveData();
    return job;
  }

  addJob(job) {
    // Add a job object directly (used by TaskOrchestrator)
    if (!job.id) {
      job.id = uuidv4();
    }
    
    // Ensure required fields are present
    const jobData = {
      id: job.id,
      name: job.name || 'Untitled Job',
      description: job.description || '',
      task: job.task || '',
      projectPath: job.projectPath || '',
      status: job.status || 'created',
      progress: job.progress || 0,
      agents: job.agents || [],
      subtasks: job.subtasks || [],
      executionPlan: job.executionPlan || null,
      createdAt: job.createdAt || new Date().toISOString(),
      updatedAt: job.updatedAt || new Date().toISOString(),
      logs: job.logs || [],
      checkpointId: job.checkpointId || null,
      socket: job.socket // Don't serialize socket
    };
    
    // Remove socket before saving (it's not serializable)
    const { socket, ...serializableJob } = jobData;
    this.jobs[job.id] = serializableJob;
    this.saveData();
    return job;
  }

  updateJob(jobId, updates) {
    if (!this.jobs[jobId]) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    this.jobs[jobId] = {
      ...this.jobs[jobId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData();
    return this.jobs[jobId];
  }

  getJob(jobId) {
    return this.jobs[jobId];
  }

  getAllJobs() {
    return Object.values(this.jobs);
  }

  getJobsByStatus(status) {
    return Object.values(this.jobs).filter(job => job.status === status);
  }

  deleteJob(jobId) {
    if (this.jobs[jobId]) {
      // Also delete associated checkpoint
      const job = this.jobs[jobId];
      if (job.checkpointId) {
        delete this.checkpoints[job.checkpointId];
      }
      delete this.jobs[jobId];
      this.saveData();
      return true;
    }
    return false;
  }

  addJobLog(jobId, message, level = 'info') {
    if (!this.jobs[jobId]) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      message: message,
      level: level
    };
    
    this.jobs[jobId].logs.push(logEntry);
    this.jobs[jobId].updatedAt = new Date().toISOString();
    this.saveData();
    
    return logEntry;
  }

  // Checkpoint management methods
  createCheckpoint(jobId, planId, executionState) {
    const checkpointId = uuidv4();
    const checkpoint = {
      id: checkpointId,
      jobId: jobId,
      planId: planId,
      executionState: executionState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.checkpoints[checkpointId] = checkpoint;
    
    // Update job with checkpoint reference
    if (this.jobs[jobId]) {
      this.jobs[jobId].checkpointId = checkpointId;
      this.jobs[jobId].updatedAt = new Date().toISOString();
    }
    
    this.saveData();
    return checkpoint;
  }

  updateCheckpoint(checkpointId, executionState) {
    if (!this.checkpoints[checkpointId]) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }
    
    this.checkpoints[checkpointId].executionState = executionState;
    this.checkpoints[checkpointId].updatedAt = new Date().toISOString();
    
    this.saveData();
    return this.checkpoints[checkpointId];
  }

  getCheckpoint(checkpointId) {
    return this.checkpoints[checkpointId];
  }

  getJobCheckpoint(jobId) {
    const job = this.jobs[jobId];
    if (!job || !job.checkpointId) {
      return null;
    }
    return this.checkpoints[job.checkpointId];
  }

  deleteCheckpoint(checkpointId) {
    if (this.checkpoints[checkpointId]) {
      delete this.checkpoints[checkpointId];
      this.saveData();
      return true;
    }
    return false;
  }

  // Agent management methods
  saveAgent(agent) {
    this.agents[agent.id] = {
      ...agent,
      updatedAt: new Date().toISOString()
    };
    this.saveData();
  }

  getAgent(agentId) {
    return this.agents[agentId];
  }

  getAllAgents() {
    return Object.values(this.agents);
  }

  deleteAgent(agentId) {
    if (this.agents[agentId]) {
      delete this.agents[agentId];
      this.saveData();
      return true;
    }
    return false;
  }

  // Utility methods
  getJobHistory(limit = 10) {
    return Object.values(this.jobs)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, limit);
  }

  getActiveJobs() {
    return Object.values(this.jobs).filter(job => 
      ['running', 'paused', 'editing'].includes(job.status)
    );
  }

  getResumableJobs() {
    return Object.values(this.jobs).filter(job => 
      job.status === 'paused' && job.checkpointId && this.checkpoints[job.checkpointId]
    );
  }

  cleanup() {
    // Clean up old completed jobs (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let cleaned = 0;
    Object.keys(this.jobs).forEach(jobId => {
      const job = this.jobs[jobId];
      if (job.status === 'completed' && new Date(job.updatedAt) < thirtyDaysAgo) {
        // Clean up associated checkpoint
        if (job.checkpointId) {
          delete this.checkpoints[job.checkpointId];
        }
        delete this.jobs[jobId];
        cleaned++;
      }
    });
    
    // Clean up orphaned checkpoints
    Object.keys(this.checkpoints).forEach(checkpointId => {
      const checkpoint = this.checkpoints[checkpointId];
      if (!this.jobs[checkpoint.jobId]) {
        delete this.checkpoints[checkpointId];
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      this.saveData();
      console.log(`Cleaned up ${cleaned} old jobs and checkpoints`);
    }
    
    return cleaned;
  }
}

module.exports = JobStorage; 