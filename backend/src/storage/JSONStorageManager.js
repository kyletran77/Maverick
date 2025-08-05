const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * JSON Storage Manager
 * 
 * High-performance JSON-based storage system with:
 * - Atomic file writes (temp file + rename)
 * - File locking to prevent race conditions
 * - Automatic directory creation
 * - Error handling and recovery
 * - Query utilities for complex operations
 */
class JSONStorageManager {
  constructor(basePath = './data/storage') {
    this.basePath = path.resolve(basePath);
    this.locks = new Map(); // Simple in-memory file locks
    this.writeQueue = new Map(); // Queue for pending writes
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) return;
    
    await this.ensureDirectories();
    console.log(`📁 JSONStorageManager initialized at: ${this.basePath}`);
    this.initialized = true;
  }
  
  async ensureDirectories() {
    const dirs = [
      'projects',
      'agents', 
      'system',
      'temp/locks',
      'backups'
    ];
    
    for (const dir of dirs) {
      await fs.ensureDir(path.join(this.basePath, dir));
    }
  }
  
  // ==================== PROJECT MANAGEMENT ====================
  
  async saveProject(project) {
    const projectsFile = path.join(this.basePath, 'projects', 'projects.json');
    const projectDir = path.join(this.basePath, 'projects', project.id);
    
    await fs.ensureDir(projectDir);
    
    // Save to registry with metadata updates
    const registry = await this.loadJSON(projectsFile, { 
      projects: {}, 
      metadata: { 
        totalProjects: 0, 
        activeProjects: 0,
        lastUpdated: new Date().toISOString()
      } 
    });
    
    const wasNew = !registry.projects[project.id];
    registry.projects[project.id] = {
      ...project,
      updatedAt: new Date().toISOString()
    };
    
    // Update metadata
    registry.metadata.totalProjects = Object.keys(registry.projects).length;
    registry.metadata.activeProjects = Object.values(registry.projects)
      .filter(p => p.status === 'active').length;
    registry.metadata.lastUpdated = new Date().toISOString();
    
    await this.saveJSON(projectsFile, registry);
    
    // Save individual project file
    const projectFile = path.join(projectDir, 'project.json');
    await this.saveJSON(projectFile, registry.projects[project.id]);
    
    console.log(`${wasNew ? '✨ Created' : '📝 Updated'} project: ${project.name} (${project.id})`);
    return registry.projects[project.id];
  }
  
  async loadProject(projectId) {
    const projectFile = path.join(this.basePath, 'projects', projectId, 'project.json');
    const project = await this.loadJSON(projectFile);
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    return project;
  }
  
  async loadAllProjects() {
    const projectsFile = path.join(this.basePath, 'projects', 'projects.json');
    const registry = await this.loadJSON(projectsFile, { projects: {}, metadata: {} });
    return registry.projects;
  }
  
  async deleteProject(projectId) {
    const projectDir = path.join(this.basePath, 'projects', projectId);
    const projectsFile = path.join(this.basePath, 'projects', 'projects.json');
    
    // Remove from registry
    const registry = await this.loadJSON(projectsFile, { projects: {}, metadata: {} });
    delete registry.projects[projectId];
    
    registry.metadata.totalProjects = Object.keys(registry.projects).length;
    registry.metadata.activeProjects = Object.values(registry.projects)
      .filter(p => p.status === 'active').length;
    registry.metadata.lastUpdated = new Date().toISOString();
    
    await this.saveJSON(projectsFile, registry);
    
    // Remove project directory
    if (await fs.pathExists(projectDir)) {
      await fs.remove(projectDir);
    }
    
    console.log(`🗑️ Deleted project: ${projectId}`);
  }
  
  // ==================== TASK GRAPH MANAGEMENT ====================
  
  async saveTaskGraph(projectId, taskGraph) {
    const graphFile = path.join(this.basePath, 'projects', projectId, 'task-graph.json');
    
    const graphData = {
      ...taskGraph,
      version: taskGraph.version || 1,
      lastUpdated: new Date().toISOString()
    };
    
    await this.saveJSON(graphFile, graphData);
    console.log(`📊 Saved task graph for project: ${projectId} (v${graphData.version})`);
    return graphData;
  }
  
  async loadTaskGraph(projectId) {
    const graphFile = path.join(this.basePath, 'projects', projectId, 'task-graph.json');
    return await this.loadJSON(graphFile);
  }
  
  async saveTaskExecution(projectId, execution) {
    const executionsFile = path.join(this.basePath, 'projects', projectId, 'task-executions.json');
    const executions = await this.loadJSON(executionsFile, { 
      executions: {}, 
      metadata: { 
        totalExecutions: 0, 
        successfulExecutions: 0,
        lastUpdated: new Date().toISOString()
      } 
    });
    
    executions.executions[execution.id] = {
      ...execution,
      updatedAt: new Date().toISOString()
    };
    
    executions.metadata.totalExecutions = Object.keys(executions.executions).length;
    executions.metadata.successfulExecutions = Object.values(executions.executions)
      .filter(e => e.status === 'completed').length;
    executions.metadata.lastUpdated = new Date().toISOString();
    
    await this.saveJSON(executionsFile, executions);
    console.log(`⚡ Saved task execution: ${execution.id} (${execution.status})`);
    return execution;
  }
  
  async loadTaskExecutions(projectId) {
    const executionsFile = path.join(this.basePath, 'projects', projectId, 'task-executions.json');
    const data = await this.loadJSON(executionsFile, { executions: {}, metadata: {} });
    return data.executions;
  }
  
  // ==================== AGENT MANAGEMENT ====================
  
  async saveAgent(agent) {
    const registryFile = path.join(this.basePath, 'agents', 'registry.json');
    const registry = await this.loadJSON(registryFile, { 
      agents: {}, 
      metadata: { 
        totalAgents: 0, 
        availableAgents: 0,
        lastUpdated: new Date().toISOString()
      } 
    });
    
    const wasNew = !registry.agents[agent.id];
    registry.agents[agent.id] = {
      ...agent,
      updatedAt: new Date().toISOString()
    };
    
    registry.metadata.totalAgents = Object.keys(registry.agents).length;
    registry.metadata.availableAgents = Object.values(registry.agents)
      .filter(a => a.status === 'available').length;
    registry.metadata.lastUpdated = new Date().toISOString();
    
    await this.saveJSON(registryFile, registry);
    console.log(`${wasNew ? '🤖 Registered' : '🔄 Updated'} agent: ${agent.name} (${agent.id})`);
    return registry.agents[agent.id];
  }
  
  async loadAgents() {
    const registryFile = path.join(this.basePath, 'agents', 'registry.json');
    const registry = await this.loadJSON(registryFile, { agents: {}, metadata: {} });
    return registry.agents;
  }
  
  async loadAgent(agentId) {
    const agents = await this.loadAgents();
    return agents[agentId] || null;
  }
  
  async saveAgentInstance(instanceData) {
    const instancesFile = path.join(this.basePath, 'agents', 'instances.json');
    const instances = await this.loadJSON(instancesFile, { 
      instances: {}, 
      metadata: { 
        totalInstances: 0, 
        activeInstances: 0,
        lastUpdated: new Date().toISOString()
      } 
    });
    
    instances.instances[instanceData.id] = {
      ...instanceData,
      updatedAt: new Date().toISOString()
    };
    
    instances.metadata.totalInstances = Object.keys(instances.instances).length;
    instances.metadata.activeInstances = Object.values(instances.instances)
      .filter(i => i.status === 'busy').length;
    instances.metadata.lastUpdated = new Date().toISOString();
    
    await this.saveJSON(instancesFile, instances);
    return instanceData;
  }
  
  async loadAgentInstances() {
    const instancesFile = path.join(this.basePath, 'agents', 'instances.json');
    const data = await this.loadJSON(instancesFile, { instances: {}, metadata: {} });
    return data.instances;
  }
  
  // ==================== QUALITY METRICS ====================
  
  async saveQualityMetrics(projectId, metrics) {
    const metricsFile = path.join(this.basePath, 'projects', projectId, 'quality-metrics.json');
    const data = await this.loadJSON(metricsFile, { 
      metrics: [], 
      summary: {
        totalMetrics: 0,
        averageQuality: 0,
        lastUpdated: new Date().toISOString()
      } 
    });
    
    const metricEntry = {
      ...metrics,
      id: metrics.id || uuidv4(),
      timestamp: new Date().toISOString()
    };
    
    data.metrics.push(metricEntry);
    
    // Update summary
    data.summary = this.calculateQualitySummary(data.metrics);
    
    await this.saveJSON(metricsFile, data);
    console.log(`📈 Saved quality metrics for ${projectId}: ${metricEntry.overallScore}`);
    return metricEntry;
  }
  
  async loadQualityMetrics(projectId) {
    const metricsFile = path.join(this.basePath, 'projects', projectId, 'quality-metrics.json');
    const data = await this.loadJSON(metricsFile, { metrics: [], summary: {} });
    return data;
  }
  
  calculateQualitySummary(metrics) {
    if (metrics.length === 0) {
      return {
        totalMetrics: 0,
        averageQuality: 0,
        minQuality: 0,
        maxQuality: 0,
        lastUpdated: new Date().toISOString()
      };
    }
    
    const scores = metrics.map(m => m.overallScore).filter(s => s != null);
    
    return {
      totalMetrics: metrics.length,
      averageQuality: scores.reduce((a, b) => a + b, 0) / scores.length,
      minQuality: Math.min(...scores),
      maxQuality: Math.max(...scores),
      lastUpdated: new Date().toISOString()
    };
  }
  
  // ==================== SYSTEM MANAGEMENT ====================
  
  async saveSystemHealth(healthData) {
    const healthFile = path.join(this.basePath, 'system', 'health.json');
    const health = {
      ...healthData,
      timestamp: new Date().toISOString()
    };
    
    await this.saveJSON(healthFile, health);
    return health;
  }
  
  async loadSystemHealth() {
    const healthFile = path.join(this.basePath, 'system', 'health.json');
    return await this.loadJSON(healthFile, {
      status: 'unknown',
      services: {},
      timestamp: new Date().toISOString()
    });
  }
  
  async saveSystemConfig(config) {
    const configFile = path.join(this.basePath, 'system', 'config.json');
    const configData = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    
    await this.saveJSON(configFile, configData);
    return configData;
  }
  
  async loadSystemConfig() {
    const configFile = path.join(this.basePath, 'system', 'config.json');
    return await this.loadJSON(configFile, {
      version: '1.0.0',
      environment: 'development',
      features: {},
      lastUpdated: new Date().toISOString()
    });
  }
  
  // ==================== GENERIC JSON OPERATIONS ====================
  
  async loadJSON(filePath, defaultValue = null) {
    const lockKey = filePath;
    
    // Wait for any existing locks
    await this.waitForLock(lockKey);
    
    try {
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
      } else {
        return defaultValue;
      }
    } catch (error) {
      console.error(`❌ Error loading JSON from ${filePath}:`, error.message);
      return defaultValue;
    }
  }
  
  async saveJSON(filePath, data) {
    const lockKey = filePath;
    
    // Acquire lock
    await this.acquireLock(lockKey);
    
    try {
      await fs.ensureDir(path.dirname(filePath));
      
      // Write to temp file first, then rename (atomic operation)
      const tempFile = `${filePath}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tempFile, filePath);
      
    } finally {
      // Release lock
      this.releaseLock(lockKey);
    }
  }
  
  async acquireLock(lockKey) {
    while (this.locks.has(lockKey)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.locks.set(lockKey, true);
  }
  
  async waitForLock(lockKey) {
    while (this.locks.has(lockKey)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  releaseLock(lockKey) {
    this.locks.delete(lockKey);
  }
  
  // ==================== UTILITY METHODS ====================
  
  async findReadyTasks(projectId) {
    const taskGraph = await this.loadTaskGraph(projectId);
    if (!taskGraph || !taskGraph.graphDefinition || !taskGraph.graphDefinition.nodes) {
      return [];
    }
    
    const readyTasks = [];
    let graphUpdated = false;
    
    for (const [nodeId, node] of Object.entries(taskGraph.graphDefinition.nodes)) {
      if (node.status === 'ready') {
        readyTasks.push(node);
      } else if (node.status === 'pending' && this.areDependenciesMet(node, taskGraph)) {
        // Update status to ready
        node.status = 'ready';
        node.readyAt = new Date().toISOString();
        readyTasks.push(node);
        graphUpdated = true;
      }
    }
    
    // Save updated graph if any tasks became ready
    if (graphUpdated) {
      await this.saveTaskGraph(projectId, taskGraph);
      console.log(`✅ Found ${readyTasks.length} ready tasks for project ${projectId}`);
    }
    
    return readyTasks;
  }
  
  areDependenciesMet(node, taskGraph) {
    if (!node.dependencies || node.dependencies.length === 0) {
      return true;
    }
    
    for (const dep of node.dependencies) {
      const depNode = taskGraph.graphDefinition.nodes[dep.nodeId];
      if (!depNode || depNode.status !== 'completed') {
        return false;
      }
      
      // Check quality condition if specified
      if (dep.condition && dep.condition.quality) {
        if (!this.meetsQualityCondition(depNode, dep.condition.quality)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  meetsQualityCondition(node, condition) {
    // For now, assume quality is stored in node metadata
    const qualityScore = node.qualityScore || 0.7; // Default score
    
    // Parse conditions like ">= 0.7", "< 0.5", "== 0.9"
    const match = condition.match(/([><=]+)\s*([0-9.]+)/);
    if (!match) return false;
    
    const operator = match[1];
    const threshold = parseFloat(match[2]);
    
    switch (operator) {
      case '>=': return qualityScore >= threshold;
      case '<=': return qualityScore <= threshold;
      case '>': return qualityScore > threshold;
      case '<': return qualityScore < threshold;
      case '==': return qualityScore === threshold;
      default: return false;
    }
  }
  
  // ==================== BACKUP AND RECOVERY ====================
  
  async createBackup(backupName = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.basePath, 'backups', backupName || `backup-${timestamp}`);
    
    // Copy entire storage directory
    await fs.copy(this.basePath, backupDir, {
      filter: (src) => !src.includes('/backups/') && !src.includes('.tmp')
    });
    
    console.log(`💾 Created backup: ${backupDir}`);
    return backupDir;
  }
  
  async restoreBackup(backupName) {
    const backupDir = path.join(this.basePath, 'backups', backupName);
    
    if (!await fs.pathExists(backupDir)) {
      throw new Error(`Backup ${backupName} not found`);
    }
    
    // Create current backup before restore
    await this.createBackup(`pre-restore-${Date.now()}`);
    
    // Clear current data (except backups)
    const entries = await fs.readdir(this.basePath);
    for (const entry of entries) {
      if (entry !== 'backups') {
        await fs.remove(path.join(this.basePath, entry));
      }
    }
    
    // Restore from backup
    await fs.copy(backupDir, this.basePath, {
      filter: (src) => !src.includes('/backups/')
    });
    
    console.log(`🔄 Restored from backup: ${backupName}`);
  }
  
  // ==================== STATISTICS AND ANALYTICS ====================
  
  async getStorageStats() {
    const stats = {
      projects: 0,
      agents: 0,
      taskExecutions: 0,
      qualityMetrics: 0,
      totalFiles: 0,
      totalSize: 0,
      generatedAt: new Date().toISOString()
    };
    
    try {
      // Count projects
      const projectsRegistry = await this.loadJSON(
        path.join(this.basePath, 'projects', 'projects.json'), 
        { projects: {} }
      );
      stats.projects = Object.keys(projectsRegistry.projects).length;
      
      // Count agents
      const agentsRegistry = await this.loadJSON(
        path.join(this.basePath, 'agents', 'registry.json'), 
        { agents: {} }
      );
      stats.agents = Object.keys(agentsRegistry.agents).length;
      
      // Calculate storage size
      const calculateSize = async (dir) => {
        let size = 0;
        let files = 0;
        
        if (await fs.pathExists(dir)) {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              const subStats = await calculateSize(fullPath);
              size += subStats.size;
              files += subStats.files;
            } else {
              const stat = await fs.stat(fullPath);
              size += stat.size;
              files++;
            }
          }
        }
        
        return { size, files };
      };
      
      const sizeStats = await calculateSize(this.basePath);
      stats.totalFiles = sizeStats.files;
      stats.totalSize = sizeStats.size;
      
    } catch (error) {
      console.error('Error calculating storage stats:', error);
    }
    
    return stats;
  }
}

module.exports = JSONStorageManager;