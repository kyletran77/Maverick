const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');

/**
 * Intelligent Agent Matcher
 * 
 * Advanced agent-task matching system that uses Goose CLI for intelligent analysis
 * and multi-dimensional scoring to optimize agent assignments
 */
class IntelligentAgentMatcher {
  constructor(config, agentRegistry, gooseIntegration) {
    this.config = config;
    this.agentRegistry = agentRegistry;
    this.goose = gooseIntegration;
    
    // Initialize caching for performance
    this.cache = new NodeCache({
      stdTTL: config.cache?.ttl || 1800, // 30 minutes
      checkperiod: config.cache?.checkInterval || 300, // 5 minutes
      maxKeys: config.cache?.maxKeys || 1000
    });
    
    // Scoring weights from configuration
    this.scoringWeights = config.agentMatching?.scoringWeights || {
      skillMatch: 0.4,
      performance: 0.3,
      workload: 0.2,
      specialization: 0.1
    };
    
    // Performance tracking
    this.performanceTracker = new AgentPerformanceTracker();
    
    // Learning system
    this.learningEngine = new CapabilityLearningEngine();
    
    console.log('🎯 IntelligentAgentMatcher initialized with enhanced scoring');
  }

  /**
   * Find the best agent for a given task with intelligent analysis
   */
  async findBestAgent(task, availableAgents, context = {}) {
    try {
      console.log(`🔍 Finding best agent for task: ${task.title}`);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(task, availableAgents);
      if (this.config.cache?.enableForAgentAnalysis) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          console.log('📦 Using cached agent assignment result');
          return cached;
        }
      }
      
      // Step 1: Filter agents by basic compatibility
      const compatibleAgents = this.filterCompatibleAgents(task, availableAgents);
      
      if (compatibleAgents.length === 0) {
        throw new Error(`No compatible agents found for task: ${task.title}`);
      }
      
      console.log(`📋 Found ${compatibleAgents.length} compatible agents`);
      
      // Step 2: Perform intelligent analysis using Goose CLI
      let agentAnalysis;
      try {
        agentAnalysis = await this.analyzeAgentSuitabilityWithGoose(task, compatibleAgents, context);
      } catch (error) {
        console.warn('⚠️ Goose agent analysis failed, using fallback scoring:', error.message);
        agentAnalysis = await this.analyzeAgentSuitabilityFallback(task, compatibleAgents);
      }
      
      // Step 3: Calculate comprehensive scores
      const scoredAgents = await Promise.all(
        compatibleAgents.map(agent => this.calculateComprehensiveScore(agent, task, agentAnalysis, context))
      );
      
      // Step 4: Select optimal agent
      const bestAgent = this.selectOptimalAgent(scoredAgents);
      
      // Step 5: Validate selection and provide reasoning
      const validation = await this.validateSelection(bestAgent, task, context);
      
      const result = {
        selectedAgent: bestAgent.agent,
        confidence: bestAgent.confidence,
        reasoning: validation.reasoning,
        alternativeAgents: scoredAgents.slice(1, 3), // Top 2 alternatives
        riskFactors: validation.riskFactors,
        analysisMethod: agentAnalysis.method || 'fallback',
        scores: bestAgent.scores
      };
      
      // Cache the result
      if (this.config.cache?.enableForAgentAnalysis) {
        this.cache.set(cacheKey, result);
      }
      
      console.log(`✅ Selected agent: ${bestAgent.agent.name} (confidence: ${bestAgent.confidence.toFixed(2)})`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Agent matching failed:', error);
      throw new Error(`Agent selection failed: ${error.message}`);
    }
  }

  /**
   * Analyze agent suitability using Goose CLI
   */
  async analyzeAgentSuitabilityWithGoose(task, agents, context) {
    const analysisPrompt = this.buildAgentAnalysisPrompt(task, agents, context);
    const sessionId = `agent-analysis-${Date.now()}`;
    
    try {
      console.log('🤖 Requesting agent analysis from Goose CLI...');
      
      const gooseResult = await this.goose.executeGooseTask(
        analysisPrompt,
        sessionId,
        null, // No socket for internal processing
        context.projectPath
      );
      
      const parsedAnalysis = await this.parseAgentAnalysisFromGoose(gooseResult, agents);
      parsedAnalysis.method = 'goose';
      
      return parsedAnalysis;
      
    } catch (error) {
      console.error('🔧 Goose agent analysis error:', error);
      throw error;
    }
  }

  /**
   * Build prompt for Goose CLI agent analysis
   */
  buildAgentAnalysisPrompt(task, agents, context) {
    const agentSummaries = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      specialization: agent.specialization,
      capabilities: Object.keys(agent.capabilities || {}),
      efficiency: agent.efficiency || 0.8,
      currentWorkload: agent.currentTasks?.length || 0,
      maxTasks: agent.configuration?.maxConcurrentTasks || 3
    }));

    return `
Analyze the suitability of these agents for the given development task:

TASK DETAILS:
Title: ${task.title}
Description: ${task.description}
Type: ${task.type || 'development'}
Skill Requirements: ${JSON.stringify(task.skillRequirements || {})}
Estimated Complexity: ${task.estimatedComplexity || 5}/10
Quality Criteria: ${JSON.stringify(task.qualityCriteria || [])}
Priority: ${task.priority || 'medium'}

AVAILABLE AGENTS:
${agentSummaries.map(agent => `
Agent: ${agent.name} (${agent.id})
- Specialization: ${agent.specialization}
- Capabilities: ${agent.capabilities.join(', ')}
- Efficiency Rating: ${agent.efficiency}
- Current Workload: ${agent.currentWorkload}/${agent.maxTasks} tasks
`).join('\n')}

Please analyze each agent and provide:

1. SKILL MATCH ASSESSMENT (0-100%)
   - How well does the agent's capabilities match the task requirements?
   - Consider both primary and secondary skills needed

2. CAPABILITY GAP ANALYSIS
   - What capabilities does the agent have that match the task?
   - What capabilities are missing or weak?
   - How significant are any gaps?

3. WORKLOAD IMPACT ANALYSIS
   - How would this task affect the agent's current workload?
   - Is the agent at optimal utilization?
   - Risk of overload or underutilization?

4. SPECIALIZATION ALIGNMENT
   - How well does this task align with the agent's specialization?
   - Would this task leverage the agent's strengths?

5. RISK ASSESSMENT
   - What risks exist with assigning this task to this agent?
   - Technical risks, timeline risks, quality risks
   - Mitigation strategies

6. OVERALL RECOMMENDATION
   - Rank agents from best to worst fit
   - Provide confidence score (0-1) for each assignment
   - Suggest any task modifications if needed

Format your response with clear sections for each agent. Be specific about strengths, weaknesses, and recommendations. Focus on practical considerations for successful task completion.
`;
  }

  /**
   * Parse agent analysis from Goose CLI output
   */
  async parseAgentAnalysisFromGoose(gooseOutput, agents) {
    try {
      const output = gooseOutput.output || gooseOutput.result || gooseOutput.toString();
      const analysis = [];
      
      for (const agent of agents) {
        // Extract analysis for each agent from the output
        const agentAnalysis = this.extractAgentAnalysisFromText(output, agent);
        analysis.push(agentAnalysis);
      }
      
      return {
        analysis: analysis,
        timestamp: new Date(),
        method: 'goose'
      };
      
    } catch (error) {
      console.error('Failed to parse Goose agent analysis:', error);
      throw new Error('Agent analysis parsing failed');
    }
  }

  /**
   * Extract individual agent analysis from text output
   */
  extractAgentAnalysisFromText(output, agent) {
    const agentSection = this.findAgentSection(output, agent.name);
    
    return {
      agentId: agent.id,
      skillMatchPercentage: this.extractSkillMatch(agentSection),
      capabilityGaps: this.extractCapabilityGaps(agentSection),
      workloadImpact: this.extractWorkloadImpact(agentSection),
      specializationAlignment: this.extractSpecializationAlignment(agentSection),
      riskFactors: this.extractRiskFactors(agentSection),
      confidence: this.extractConfidence(agentSection),
      recommendation: this.extractRecommendation(agentSection)
    };
  }

  /**
   * Fallback agent analysis when Goose CLI is unavailable
   */
  async analyzeAgentSuitabilityFallback(task, agents) {
    console.log('🔄 Using fallback agent analysis...');
    
    const analysis = agents.map(agent => ({
      agentId: agent.id,
      skillMatchPercentage: this.calculateBasicSkillMatch(agent, task),
      capabilityGaps: this.identifyBasicGaps(agent, task),
      workloadImpact: this.assessBasicWorkload(agent),
      specializationAlignment: this.assessBasicSpecialization(agent, task),
      riskFactors: this.identifyBasicRisks(agent, task),
      confidence: 0.6, // Lower confidence for fallback
      recommendation: 'Basic compatibility assessment'
    }));
    
    return {
      analysis: analysis,
      timestamp: new Date(),
      method: 'fallback'
    };
  }

  /**
   * Calculate comprehensive score for an agent
   */
  async calculateComprehensiveScore(agent, task, agentAnalysisResult, context) {
    // Find agent-specific analysis
    const agentAnalysis = agentAnalysisResult.analysis.find(a => a.agentId === agent.id) || {};
    
    // Calculate individual score components
    const skillScore = this.calculateSkillMatchScore(agent, task, agentAnalysis);
    const performanceScore = await this.calculatePerformanceScore(agent, task);
    const workloadScore = this.calculateWorkloadScore(agent);
    const specializationScore = this.calculateSpecializationScore(agent, task, agentAnalysis);
    
    // Calculate weighted total score
    const totalScore = (
      skillScore * this.scoringWeights.skillMatch +
      performanceScore * this.scoringWeights.performance +
      workloadScore * this.scoringWeights.workload +
      specializationScore * this.scoringWeights.specialization
    );
    
    // Calculate confidence based on various factors
    const confidence = this.calculateAssignmentConfidence(
      skillScore, performanceScore, workloadScore, specializationScore, agentAnalysis
    );
    
    // Predict task success probability
    const successPrediction = await this.predictTaskSuccess(agent, task);
    
    return {
      agent,
      scores: {
        skill: skillScore,
        performance: performanceScore,
        workload: workloadScore,
        specialization: specializationScore,
        total: totalScore
      },
      confidence,
      analysis: agentAnalysis,
      predictedSuccess: successPrediction,
      recommendations: this.generateAgentRecommendations(agent, task, agentAnalysis)
    };
  }

  /**
   * Calculate skill match score
   */
  calculateSkillMatchScore(agent, task, analysis) {
    // Use Goose analysis if available
    if (analysis.skillMatchPercentage !== undefined) {
      return analysis.skillMatchPercentage / 100;
    }
    
    // Fallback to basic skill matching
    return this.calculateBasicSkillMatch(agent, task) / 100;
  }

  calculateBasicSkillMatch(agent, task) {
    const taskSkills = task.skillRequirements?.primary || [];
    const agentCapabilities = Object.keys(agent.capabilities || {});
    
    if (taskSkills.length === 0) return 70; // Default score
    
    const matches = taskSkills.filter(skill => 
      agentCapabilities.some(cap => 
        cap.toLowerCase().includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(cap.toLowerCase())
      )
    ).length;
    
    return Math.min(100, (matches / taskSkills.length) * 100);
  }

  /**
   * Calculate performance score based on historical data
   */
  async calculatePerformanceScore(agent, task) {
    const performance = await this.performanceTracker.getAgentPerformance(agent.id);
    
    if (!performance) {
      return 0.7; // Neutral score for new agents
    }
    
    // Task-type specific performance
    const taskTypePerformance = performance.byTaskType?.[task.type] || performance.overall;
    
    // Complexity-adjusted performance
    const complexityFactor = this.getComplexitySuccessFactor(
      task.estimatedComplexity || 5, 
      performance.averageComplexity || 5
    );
    
    return taskTypePerformance.successRate * complexityFactor;
  }

  /**
   * Calculate workload score
   */
  calculateWorkloadScore(agent) {
    const maxTasks = agent.configuration?.maxConcurrentTasks || 3;
    const currentTasks = agent.currentTasks?.length || 0;
    const utilization = currentTasks / maxTasks;
    
    // Optimal utilization is around 70-80%
    if (utilization < 0.7) {
      return 1 - (0.7 - utilization) * 0.5; // Light penalty for underutilization
    } else if (utilization <= 0.8) {
      return 1; // Optimal range
    } else {
      return Math.max(0.2, 1 - (utilization - 0.8) * 2.5); // Heavy penalty for overutilization
    }
  }

  /**
   * Calculate specialization score
   */
  calculateSpecializationScore(agent, task, analysis) {
    // Use Goose analysis if available
    if (analysis.specializationAlignment !== undefined) {
      return analysis.specializationAlignment;
    }
    
    // Fallback to basic specialization matching
    return this.assessBasicSpecialization(agent, task);
  }

  assessBasicSpecialization(agent, task) {
    const specialization = agent.specialization?.toLowerCase() || '';
    const taskType = task.type?.toLowerCase() || '';
    const taskDesc = task.description?.toLowerCase() || '';
    
    // Direct specialization match
    if (specialization.includes(taskType) || taskType.includes(specialization)) {
      return 0.9;
    }
    
    // Check for related specializations
    const specializationMap = {
      'frontend': ['ui', 'interface', 'react', 'vue', 'angular'],
      'backend': ['api', 'server', 'database', 'node', 'python'],
      'fullstack': ['web', 'application', 'system'],
      'qa': ['test', 'quality', 'validation', 'verification']
    };
    
    for (const [spec, keywords] of Object.entries(specializationMap)) {
      if (specialization.includes(spec)) {
        for (const keyword of keywords) {
          if (taskDesc.includes(keyword) || taskType.includes(keyword)) {
            return 0.7;
          }
        }
      }
    }
    
    return 0.5; // Neutral score
  }

  /**
   * Predict task success probability
   */
  async predictTaskSuccess(agent, task) {
    const performance = await this.performanceTracker.getAgentPerformance(agent.id);
    
    if (!performance) {
      return { probability: 0.7, confidence: 0.3 }; // Conservative estimate for new agents
    }
    
    // Base success rate
    const baseSuccessRate = performance.overall?.successRate || 0.7;
    
    // Factors affecting success
    const complexityFactor = this.getComplexitySuccessFactor(
      task.estimatedComplexity || 5, 
      performance.averageComplexity || 5
    );
    const workloadFactor = this.getWorkloadSuccessFactor(
      agent.currentTasks?.length || 0, 
      agent.configuration?.maxConcurrentTasks || 3
    );
    const skillFactor = this.getSkillSuccessFactor(task.skillRequirements, agent.capabilities);
    
    const probability = baseSuccessRate * complexityFactor * workloadFactor * skillFactor;
    const confidence = this.calculatePredictionConfidence(
      performance.sampleSize || 10, 
      performance.variance || 0.1
    );
    
    return { probability: Math.min(1, probability), confidence };
  }

  /**
   * Helper methods for success prediction
   */
  getComplexitySuccessFactor(taskComplexity, agentAverageComplexity) {
    const complexityDiff = Math.abs(taskComplexity - agentAverageComplexity);
    return Math.max(0.3, 1 - (complexityDiff / 10));
  }

  getWorkloadSuccessFactor(currentTasks, maxTasks) {
    const utilization = currentTasks / maxTasks;
    if (utilization <= 0.8) return 1;
    return Math.max(0.5, 1 - (utilization - 0.8) * 2);
  }

  getSkillSuccessFactor(taskSkills, agentCapabilities) {
    if (!taskSkills?.primary || taskSkills.primary.length === 0) return 1;
    
    const capabilities = Object.keys(agentCapabilities || {});
    const matches = taskSkills.primary.filter(skill => 
      capabilities.some(cap => 
        cap.toLowerCase().includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(cap.toLowerCase())
      )
    ).length;
    
    return Math.max(0.3, matches / taskSkills.primary.length);
  }

  calculatePredictionConfidence(sampleSize, variance) {
    // Higher sample size and lower variance = higher confidence
    const sampleConfidence = Math.min(1, sampleSize / 50); // Max confidence at 50 samples
    const varianceConfidence = Math.max(0.1, 1 - variance);
    return (sampleConfidence + varianceConfidence) / 2;
  }

  /**
   * Filter agents by basic compatibility
   */
  filterCompatibleAgents(task, availableAgents) {
    return availableAgents.filter(agent => {
      // Check if agent is active and available
      if (agent.status !== 'active') return false;
      
      // Check workload capacity
      const currentTasks = agent.currentTasks?.length || 0;
      const maxTasks = agent.configuration?.maxConcurrentTasks || 3;
      if (currentTasks >= maxTasks) return false;
      
      // Basic skill compatibility check
      const hasBasicCompatibility = this.checkBasicCompatibility(agent, task);
      
      return hasBasicCompatibility;
    });
  }

  checkBasicCompatibility(agent, task) {
    // If no specific skill requirements, any agent is compatible
    if (!task.skillRequirements?.primary || task.skillRequirements.primary.length === 0) {
      return true;
    }
    
    const agentCapabilities = Object.keys(agent.capabilities || {});
    const requiredSkills = task.skillRequirements.primary;
    
    // Agent must have at least one required skill
    return requiredSkills.some(skill => 
      agentCapabilities.some(cap => 
        cap.toLowerCase().includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(cap.toLowerCase())
      )
    );
  }

  /**
   * Select optimal agent from scored candidates
   */
  selectOptimalAgent(scoredAgents) {
    // Sort by total score (descending)
    const sortedAgents = scoredAgents.sort((a, b) => b.scores.total - a.scores.total);
    
    // Return the best agent
    return sortedAgents[0];
  }

  /**
   * Validate agent selection and provide reasoning
   */
  async validateSelection(bestAgent, task, context) {
    const reasoning = [];
    const riskFactors = [];
    
    // Analyze the selection
    if (bestAgent.scores.skill > 0.8) {
      reasoning.push(`Excellent skill match (${(bestAgent.scores.skill * 100).toFixed(0)}%)`);
    } else if (bestAgent.scores.skill < 0.6) {
      reasoning.push(`Moderate skill match (${(bestAgent.scores.skill * 100).toFixed(0)}%)`);
      riskFactors.push({
        type: 'skill_gap',
        severity: 'medium',
        description: 'Agent may need additional support for some technical aspects'
      });
    }
    
    if (bestAgent.scores.workload > 0.8) {
      reasoning.push('Optimal workload utilization');
    } else if (bestAgent.scores.workload < 0.5) {
      reasoning.push('High workload detected');
      riskFactors.push({
        type: 'workload_risk',
        severity: 'high',
        description: 'Agent may be overloaded, consider timeline impact'
      });
    }
    
    if (bestAgent.predictedSuccess.probability > 0.8) {
      reasoning.push(`High success probability (${(bestAgent.predictedSuccess.probability * 100).toFixed(0)}%)`);
    } else if (bestAgent.predictedSuccess.probability < 0.6) {
      riskFactors.push({
        type: 'success_risk',
        severity: 'medium',
        description: 'Lower predicted success rate, consider additional oversight'
      });
    }
    
    return {
      reasoning: reasoning.join(', '),
      riskFactors,
      isRecommended: riskFactors.filter(r => r.severity === 'high').length === 0
    };
  }

  // Text parsing helper methods for Goose output...
  
  findAgentSection(output, agentName) {
    const lines = output.split('\n');
    let inAgentSection = false;
    let agentSection = [];
    
    for (const line of lines) {
      if (line.toLowerCase().includes(agentName.toLowerCase())) {
        inAgentSection = true;
      } else if (inAgentSection && line.match(/^Agent:|^[A-Z][a-z]+ Agent/)) {
        break; // Start of next agent section
      }
      
      if (inAgentSection) {
        agentSection.push(line);
      }
    }
    
    return agentSection.join('\n');
  }

  extractSkillMatch(text) {
    const match = text.match(/skill.*?(\d+)%/i);
    return match ? parseInt(match[1]) : 70;
  }

  extractCapabilityGaps(text) {
    const gaps = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('gap') || line.toLowerCase().includes('missing')) {
        gaps.push(line.trim());
      }
    }
    
    return gaps;
  }

  extractWorkloadImpact(text) {
    if (text.toLowerCase().includes('overload') || text.toLowerCase().includes('high workload')) {
      return 0.3;
    } else if (text.toLowerCase().includes('optimal') || text.toLowerCase().includes('good')) {
      return 0.9;
    }
    return 0.7;
  }

  extractSpecializationAlignment(text) {
    if (text.toLowerCase().includes('excellent') || text.toLowerCase().includes('perfect')) {
      return 0.9;
    } else if (text.toLowerCase().includes('good') || text.toLowerCase().includes('strong')) {
      return 0.8;
    } else if (text.toLowerCase().includes('moderate') || text.toLowerCase().includes('fair')) {
      return 0.6;
    }
    return 0.5;
  }

  extractRiskFactors(text) {
    const risks = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('risk') || line.toLowerCase().includes('concern')) {
        risks.push({
          type: 'extracted',
          description: line.trim(),
          severity: line.toLowerCase().includes('high') ? 'high' : 'medium'
        });
      }
    }
    
    return risks;
  }

  extractConfidence(text) {
    const match = text.match(/confidence.*?(\d+(?:\.\d+)?)%?/i);
    if (match) {
      const value = parseFloat(match[1]);
      return value > 1 ? value / 100 : value;
    }
    return 0.7;
  }

  extractRecommendation(text) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('recommend') || line.toLowerCase().includes('suggest')) {
        return line.trim();
      }
    }
    return 'Standard assignment recommended';
  }

  // Additional helper methods...
  
  identifyBasicGaps(agent, task) {
    const gaps = [];
    const requiredSkills = task.skillRequirements?.primary || [];
    const agentCapabilities = Object.keys(agent.capabilities || {});
    
    for (const skill of requiredSkills) {
      const hasSkill = agentCapabilities.some(cap => 
        cap.toLowerCase().includes(skill.toLowerCase())
      );
      
      if (!hasSkill) {
        gaps.push(`Missing ${skill} capability`);
      }
    }
    
    return gaps;
  }

  assessBasicWorkload(agent) {
    const currentTasks = agent.currentTasks?.length || 0;
    const maxTasks = agent.configuration?.maxConcurrentTasks || 3;
    const utilization = currentTasks / maxTasks;
    
    if (utilization <= 0.7) return 0.9;
    if (utilization <= 0.8) return 0.8;
    return 0.4;
  }

  identifyBasicRisks(agent, task) {
    const risks = [];
    
    const utilization = (agent.currentTasks?.length || 0) / (agent.configuration?.maxConcurrentTasks || 3);
    if (utilization > 0.8) {
      risks.push({
        type: 'workload',
        severity: 'high',
        description: 'Agent approaching capacity limits'
      });
    }
    
    if (task.estimatedComplexity > 7) {
      risks.push({
        type: 'complexity',
        severity: 'medium',
        description: 'High complexity task may require additional oversight'
      });
    }
    
    return risks;
  }

  calculateAssignmentConfidence(skillScore, performanceScore, workloadScore, specializationScore, analysis) {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on scores
    const avgScore = (skillScore + performanceScore + workloadScore + specializationScore) / 4;
    confidence += avgScore * 0.4;
    
    // Boost confidence if we have good analysis
    if (analysis.confidence !== undefined) {
      confidence = (confidence + analysis.confidence) / 2;
    }
    
    // Penalty for low skill match
    if (skillScore < 0.6) {
      confidence -= 0.2;
    }
    
    // Penalty for workload issues
    if (workloadScore < 0.5) {
      confidence -= 0.15;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  generateAgentRecommendations(agent, task, analysis) {
    const recommendations = [];
    
    if (analysis.capabilityGaps && analysis.capabilityGaps.length > 0) {
      recommendations.push('Consider providing additional technical resources or mentoring');
    }
    
    if (analysis.workloadImpact < 0.5) {
      recommendations.push('Monitor agent workload and consider timeline adjustments');
    }
    
    if (task.estimatedComplexity > 7) {
      recommendations.push('Implement regular check-ins due to task complexity');
    }
    
    return recommendations;
  }

  generateCacheKey(task, agents) {
    const taskHash = Buffer.from(JSON.stringify({
      title: task.title,
      type: task.type,
      skills: task.skillRequirements,
      complexity: task.estimatedComplexity
    })).toString('base64').substring(0, 16);
    
    const agentHash = Buffer.from(JSON.stringify(
      agents.map(a => ({ id: a.id, workload: a.currentTasks?.length || 0 }))
    )).toString('base64').substring(0, 16);
    
    return `agent-match:${taskHash}-${agentHash}`;
  }

  /**
   * Update agent capabilities based on task performance
   */
  async updateAgentCapabilities(agentId, taskResult) {
    await this.learningEngine.updateCapabilities(agentId, taskResult);
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(agentId) {
    return await this.performanceTracker.getAgentPerformance(agentId);
  }
}

/**
 * Agent Performance Tracker
 * Tracks agent performance metrics and learning
 */
class AgentPerformanceTracker {
  constructor() {
    this.performanceData = new Map();
  }

  async getAgentPerformance(agentId) {
    return this.performanceData.get(agentId) || null;
  }

  async updatePerformance(agentId, taskResult) {
    const current = this.performanceData.get(agentId) || {
      overall: { successRate: 0.7, averageTime: 1.0, qualityScore: 0.8 },
      byTaskType: {},
      sampleSize: 0,
      variance: 0.1,
      averageComplexity: 5
    };

    // Update performance metrics based on task result
    current.sampleSize += 1;
    
    // Update success rate
    const wasSuccessful = taskResult.success ? 1 : 0;
    current.overall.successRate = (current.overall.successRate * (current.sampleSize - 1) + wasSuccessful) / current.sampleSize;
    
    // Update by task type
    if (!current.byTaskType[taskResult.taskType]) {
      current.byTaskType[taskResult.taskType] = { successRate: 0.7 };
    }
    
    this.performanceData.set(agentId, current);
  }
}

/**
 * Capability Learning Engine
 * Learns and updates agent capabilities over time
 */
class CapabilityLearningEngine {
  constructor() {
    this.capabilityUpdates = new Map();
  }

  async updateCapabilities(agentId, taskResult) {
    // Learn from task performance and update agent capabilities
    const updates = this.capabilityUpdates.get(agentId) || {};
    
    // Track skill usage and success
    if (taskResult.skillsUsed) {
      for (const skill of taskResult.skillsUsed) {
        if (!updates[skill]) {
          updates[skill] = { usage: 0, success: 0 };
        }
        updates[skill].usage += 1;
        if (taskResult.success) {
          updates[skill].success += 1;
        }
      }
    }
    
    this.capabilityUpdates.set(agentId, updates);
  }

  getCapabilityUpdates(agentId) {
    return this.capabilityUpdates.get(agentId) || {};
  }
}

module.exports = IntelligentAgentMatcher;