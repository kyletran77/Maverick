const ReactFrontendSpecialist = require('./ReactFrontendSpecialist');
const PythonBackendSpecialist = require('./PythonBackendSpecialist');
const CodeReviewSpecialist = require('./CodeReviewSpecialist');
const QATestingSpecialist = require('./QATestingSpecialist');

/**
 * Agent Registry
 * 
 * Central registry for managing all specialized agents
 * Provides agent discovery, selection, and orchestration capabilities
 */
class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.version = '1.0.0';
    this.lastUpdated = new Date();
    
    // Initialize all specialized agents
    this.initializeAgents();
  }

  /**
   * Initialize all specialized agents
   */
  initializeAgents() {
    try {
      // Frontend Specialists
      this.registerAgent(new ReactFrontendSpecialist());
      
      // Backend Specialists
      this.registerAgent(new PythonBackendSpecialist());
      
      // Quality Assurance Specialists
      this.registerAgent(new CodeReviewSpecialist());
      this.registerAgent(new QATestingSpecialist());
      
      console.log(`AgentRegistry initialized with ${this.agents.size} agents`);
      this.validateAllAgents();
      
    } catch (error) {
      console.error('Failed to initialize agents:', error);
      throw error;
    }
  }

  /**
   * Register a new agent in the registry
   */
  registerAgent(agent) {
    if (!agent.id || !agent.name || !agent.specialization) {
      throw new Error('Agent must have id, name, and specialization properties');
    }
    
    // Validate agent before registration
    agent.validate();
    
    this.agents.set(agent.id, agent);
    console.log(`Registered agent: ${agent.name} (${agent.id})`);
    
    return agent;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Find the best agent for a given task
   */
  findBestAgent(task, options = {}) {
    const candidates = this.getAllAgents();
    const scoredCandidates = [];
    
    for (const agent of candidates) {
      const skillMatch = agent.calculateSkillMatch(task);
      const estimate = agent.estimateTask(task);
      
      // Calculate overall suitability score
      const suitabilityScore = this.calculateSuitabilityScore(agent, task, skillMatch, estimate, options);
      
      scoredCandidates.push({
        agent,
        skillMatch,
        estimate,
        suitabilityScore,
        reason: this.generateSelectionReason(agent, skillMatch, estimate)
      });
    }
    
    // Sort by suitability score (descending)
    scoredCandidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
    
    return {
      bestAgent: scoredCandidates[0],
      allCandidates: scoredCandidates,
      selectionMetadata: {
        task: task,
        timestamp: new Date(),
        criteria: options
      }
    };
  }

  /**
   * Calculate suitability score for an agent
   */
  calculateSuitabilityScore(agent, task, skillMatch, estimate, options = {}) {
    let score = 0;
    
    // Skill match weight (40%)
    score += (skillMatch / 100) * 0.4;
    
    // Confidence weight (25%)
    score += estimate.confidence * 0.25;
    
    // Efficiency weight based on agent capabilities (20%)
    const avgEfficiency = this.calculateAverageEfficiency(agent, task);
    score += avgEfficiency * 0.2;
    
    // Workload consideration (10%)
    const workloadFactor = this.calculateWorkloadFactor(agent, options);
    score += workloadFactor * 0.1;
    
    // Priority alignment (5%)
    const priorityAlignment = this.calculatePriorityAlignment(agent, task);
    score += priorityAlignment * 0.05;
    
    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Calculate average efficiency for relevant capabilities
   */
  calculateAverageEfficiency(agent, task) {
    const taskSkills = task.skills || [];
    const taskText = `${task.title} ${task.description}`.toLowerCase();
    
    let totalEfficiency = 0;
    let matchCount = 0;
    
    // Check direct skill matches
    taskSkills.forEach(skill => {
      const capability = agent.capabilities[skill.toLowerCase()];
      if (capability) {
        totalEfficiency += capability.efficiency;
        matchCount++;
      }
    });
    
    // Check technology keywords in task
    Object.keys(agent.capabilities).forEach(tech => {
      if (taskText.includes(tech.replace('_', ' '))) {
        totalEfficiency += agent.capabilities[tech].efficiency;
        matchCount++;
      }
    });
    
    return matchCount > 0 ? totalEfficiency / matchCount : 0.5; // Default to 0.5 if no matches
  }

  /**
   * Calculate workload factor (simplified - in real implementation would check actual workload)
   */
  calculateWorkloadFactor(agent, options) {
    // For now, return a baseline score
    // In actual implementation, this would check current agent workload
    const maxTasks = agent.configuration?.maxConcurrentTasks || 3;
    const currentTasks = options.currentWorkload?.[agent.id] || 0;
    
    return Math.max(0, (maxTasks - currentTasks) / maxTasks);
  }

  /**
   * Calculate priority alignment
   */
  calculatePriorityAlignment(agent, task) {
    const taskPriority = task.priority?.toLowerCase() || 'medium';
    
    // Check if agent has task patterns that match this priority
    if (agent.taskPatterns) {
      const matchingPatterns = agent.taskPatterns.filter(pattern => 
        pattern.pattern.test(task.description) || pattern.pattern.test(task.title)
      );
      
      if (matchingPatterns.length > 0) {
        const avgPriorityScore = matchingPatterns.reduce((sum, pattern) => {
          const priorityScores = { low: 0.3, medium: 0.6, high: 0.8, critical: 1.0 };
          return sum + (priorityScores[pattern.priority] || 0.6);
        }, 0) / matchingPatterns.length;
        
        return avgPriorityScore;
      }
    }
    
    return 0.6; // Default medium priority alignment
  }

  /**
   * Generate human-readable selection reason
   */
  generateSelectionReason(agent, skillMatch, estimate) {
    const reasons = [];
    
    if (skillMatch >= 90) {
      reasons.push('Excellent skill match');
    } else if (skillMatch >= 75) {
      reasons.push('Strong skill match');
    } else if (skillMatch >= 60) {
      reasons.push('Good skill match');
    } else {
      reasons.push('Moderate skill match');
    }
    
    if (estimate.confidence >= 0.9) {
      reasons.push('high confidence');
    } else if (estimate.confidence >= 0.7) {
      reasons.push('good confidence');
    }
    
    if (estimate.complexity === 'simple') {
      reasons.push('straightforward task');
    } else if (estimate.complexity === 'complex') {
      reasons.push('complex task requiring expertise');
    }
    
    return reasons.join(', ');
  }

  /**
   * Get agents by specialization
   */
  getAgentsBySpecialization(specialization) {
    return this.getAllAgents().filter(agent => 
      agent.specialization.toLowerCase().includes(specialization.toLowerCase())
    );
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability) {
    return this.getAllAgents().filter(agent => 
      agent.capabilities.hasOwnProperty(capability.toLowerCase())
    );
  }

  /**
   * Get agent statistics
   */
  getRegistryStats() {
    const agents = this.getAllAgents();
    const specializations = new Set();
    const capabilities = new Set();
    
    agents.forEach(agent => {
      specializations.add(agent.specialization);
      Object.keys(agent.capabilities).forEach(cap => capabilities.add(cap));
    });
    
    return {
      totalAgents: agents.length,
      specializations: Array.from(specializations),
      totalCapabilities: capabilities.size,
      capabilities: Array.from(capabilities).sort(),
      agentSummary: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        specialization: agent.specialization,
        capabilityCount: Object.keys(agent.capabilities).length,
        version: agent.version
      }))
    };
  }

  /**
   * Generate task assignment recommendations
   */
  generateTaskRecommendations(task, count = 3) {
    const selection = this.findBestAgent(task);
    const topCandidates = selection.allCandidates.slice(0, count);
    
    return {
      task: task,
      recommendations: topCandidates.map((candidate, index) => ({
        rank: index + 1,
        agent: {
          id: candidate.agent.id,
          name: candidate.agent.name,
          specialization: candidate.agent.specialization
        },
        scores: {
          skillMatch: candidate.skillMatch.toFixed(1),
          suitability: (candidate.suitabilityScore * 100).toFixed(1),
          confidence: (candidate.estimate.confidence * 100).toFixed(1)
        },
        estimate: candidate.estimate,
        reason: candidate.reason,
        recommended: index === 0
      })),
      selectionCriteria: {
        primaryFactors: ['Skill Match', 'Confidence', 'Efficiency', 'Workload'],
        weights: {
          skillMatch: '40%',
          confidence: '25%',
          efficiency: '20%',
          workload: '10%',
          priority: '5%'
        }
      }
    };
  }

  /**
   * Validate all registered agents
   */
  validateAllAgents() {
    const issues = [];
    
    this.agents.forEach((agent, id) => {
      try {
        agent.validate();
      } catch (error) {
        issues.push({
          agentId: id,
          agentName: agent.name,
          error: error.message
        });
      }
    });
    
    if (issues.length > 0) {
      console.warn('Agent validation issues found:', issues);
      return { valid: false, issues };
    }
    
    console.log('All agents validated successfully');
    return { valid: true, issues: [] };
  }

  /**
   * Get registry metadata
   */
  getMetadata() {
    return {
      version: this.version,
      lastUpdated: this.lastUpdated,
      agentCount: this.agents.size,
      availableAgents: Array.from(this.agents.keys()),
      stats: this.getRegistryStats()
    };
  }

  /**
   * Export agent configurations (useful for debugging/monitoring)
   */
  exportConfigurations() {
    const configs = {};
    
    this.agents.forEach((agent, id) => {
      configs[id] = agent.getMetadata();
    });
    
    return {
      registry: this.getMetadata(),
      agents: configs,
      exportTimestamp: new Date()
    };
  }

  /**
   * Check agent availability and health
   */
  healthCheck() {
    const results = {
      overall: 'healthy',
      timestamp: new Date(),
      agents: {}
    };
    
    this.agents.forEach((agent, id) => {
      try {
        const validation = agent.validate();
        results.agents[id] = {
          status: 'healthy',
          name: agent.name,
          specialization: agent.specialization,
          capabilities: Object.keys(agent.capabilities).length
        };
      } catch (error) {
        results.agents[id] = {
          status: 'unhealthy',
          error: error.message
        };
        results.overall = 'degraded';
      }
    });
    
    return results;
  }
}

module.exports = AgentRegistry; 