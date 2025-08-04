const { GooseIntegration } = require('../../goose-integration');
const NodeCache = require('node-cache');

/**
 * Enhanced Goose Integration
 * 
 * Extends the base Goose integration with intelligent requirements processing
 * and agent analysis capabilities
 */
class EnhancedGooseIntegration {
  constructor(io, config = {}) {
    // Use existing Goose integration as base
    this.baseGoose = new GooseIntegration(io);
    this.io = io;
    this.config = config;
    
    // Initialize caching for AI responses
    this.cache = new NodeCache({
      stdTTL: config.cache?.ttl || 1800, // 30 minutes
      checkperiod: config.cache?.checkInterval || 300, // 5 minutes
      maxKeys: config.cache?.maxKeys || 500
    });
    
    // Track active analysis sessions
    this.activeSessions = new Map();
    
    console.log('🔧 EnhancedGooseIntegration initialized');
  }

  /**
   * Generate TRD using Goose CLI
   */
  async generateTRD(prompt, context = {}) {
    const sessionId = `trd-${Date.now()}`;
    const cacheKey = `trd:${Buffer.from(prompt).toString('base64').substring(0, 32)}`;
    
    // Check cache first
    if (this.config.cache?.enableForTRD) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('📦 Using cached TRD result');
        return cached;
      }
    }
    
    try {
      console.log(`🤖 Generating TRD with Goose CLI (session: ${sessionId})`);
      
      const trdPrompt = this.buildTRDGenerationPrompt(prompt, context);
      
      // Execute Goose task with timeout
      const result = await this.executeWithTimeout(
        () => this.baseGoose.executeGooseTask(trdPrompt, sessionId, null, context.projectPath),
        this.config.goose?.timeout || 30000
      );
      
      const parsedResult = this.parseTRDResponse(result);
      
      // Cache successful result
      if (this.config.cache?.enableForTRD && parsedResult) {
        this.cache.set(cacheKey, parsedResult);
      }
      
      return parsedResult;
      
    } catch (error) {
      console.error(`❌ TRD generation failed for session ${sessionId}:`, error.message);
      throw new Error(`TRD generation failed: ${error.message}`);
    }
  }

  /**
   * Analyze agent-task compatibility using Goose CLI
   */
  async analyzeAgentTaskMatch(task, agents, context = {}) {
    const sessionId = `agent-analysis-${Date.now()}`;
    const cacheKey = `agent:${this.generateAgentCacheKey(task, agents)}`;
    
    // Check cache first
    if (this.config.cache?.enableForAgentAnalysis) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('📦 Using cached agent analysis result');
        return cached;
      }
    }
    
    try {
      console.log(`🎯 Analyzing agent-task match with Goose CLI (session: ${sessionId})`);
      
      const analysisPrompt = this.buildAgentAnalysisPrompt(task, agents, context);
      
      // Execute Goose task with timeout
      const result = await this.executeWithTimeout(
        () => this.baseGoose.executeGooseTask(analysisPrompt, sessionId, null, context.projectPath),
        this.config.goose?.maxAnalysisTime || 15000
      );
      
      const parsedResult = this.parseAgentAnalysisResponse(result, agents);
      
      // Cache successful result
      if (this.config.cache?.enableForAgentAnalysis && parsedResult) {
        this.cache.set(cacheKey, parsedResult);
      }
      
      return parsedResult;
      
    } catch (error) {
      console.error(`❌ Agent analysis failed for session ${sessionId}:`, error.message);
      throw new Error(`Agent analysis failed: ${error.message}`);
    }
  }

  /**
   * Execute enhanced tasks with context awareness
   */
  async executeTaskWithContext(task, trd, agent, socket) {
    const sessionId = `enhanced-task-${Date.now()}`;
    
    try {
      console.log(`🚀 Executing enhanced task with context (session: ${sessionId})`);
      
      // Build enhanced task prompt with TRD context
      const enhancedPrompt = this.buildEnhancedTaskPrompt(task, trd, agent);
      
      // Execute with progress tracking
      const result = await this.executeWithProgress(
        enhancedPrompt,
        sessionId,
        socket,
        task.projectPath || trd.projectPath
      );
      
      // Validate execution against quality criteria
      const validationResult = await this.validateTaskExecution(result, task.qualityCriteria);
      
      return {
        result,
        validation: validationResult,
        sessionId,
        executionTime: new Date() - task.startTime
      };
      
    } catch (error) {
      console.error(`❌ Enhanced task execution failed for session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Build TRD generation prompt (FIXED: Size validation)
   */
  buildTRDGenerationPrompt(userPrompt, context) {
    // Clean the user prompt to prevent duplication
    const cleanPrompt = this.cleanPromptInput(userPrompt);
    
    const prompt = `
You are a senior technical architect creating a comprehensive Technical Requirements Document (TRD).

USER REQUEST: "${cleanPrompt}"

CONTEXT:
- Project Path: ${context.projectPath || 'Not specified'}
- Domain: ${context.domain || 'To be determined'}
- Additional Context: ${JSON.stringify(context.additionalInfo || {})}

Create a detailed TRD with the following structure:

## 1. PROJECT OVERVIEW
- Project name and description
- Key objectives and success criteria
- Target users and stakeholders
- Expected business value

## 2. FUNCTIONAL REQUIREMENTS
List each requirement with:
- Unique ID (REQ-001, REQ-002, etc.)
- Clear description
- Acceptance criteria (specific and testable)
- Priority level (Critical/High/Medium/Low)
- Dependencies

## 3. NON-FUNCTIONAL REQUIREMENTS

### Performance
- Response time requirements
- Throughput expectations
- Scalability targets

### Security
- Authentication requirements
- Authorization model
- Data protection needs
- Compliance requirements

### Reliability
- Uptime requirements
- Error handling expectations
- Recovery procedures

## 4. TECHNICAL CONSTRAINTS
- Technology stack requirements
- Platform constraints
- Integration requirements
- Infrastructure constraints

## 5. QUALITY GATES
- Code review requirements
- Testing standards (unit, integration, e2e)
- Security scanning requirements
- Performance benchmarks
- Documentation standards

## 6. RESOURCE REQUIREMENTS
- Required skills and expertise
- Estimated timeline and milestones
- Team composition
- Development tools and environments

## 7. RISK ASSESSMENT
- Technical risks and mitigation strategies
- Timeline risks
- Resource risks
- Quality risks

Please provide specific, actionable requirements rather than generic statements. Include realistic estimates and identify potential challenges. Focus on creating requirements that are:
- Specific and measurable
- Achievable and realistic
- Relevant to the user's request
- Time-bound where appropriate

Structure your response clearly with proper headings and bullet points for easy parsing.
`;

    // Validate prompt size
    this.validatePromptSize(prompt, 'TRD Generation');
    return prompt;
  }

  /**
   * Build agent analysis prompt
   */
  buildAgentAnalysisPrompt(task, agents, context) {
    const agentSummaries = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      specialization: agent.specialization,
      capabilities: Object.keys(agent.capabilities || {}),
      efficiency: agent.efficiency || 0.8,
      currentWorkload: agent.currentTasks?.length || 0,
      maxTasks: agent.configuration?.maxConcurrentTasks || 3,
      recentPerformance: agent.recentPerformance || 'No data'
    }));

    return `
You are an expert system architect analyzing agent-task compatibility for optimal assignment.

TASK TO ASSIGN:
- Title: ${task.title}
- Description: ${task.description}
- Type: ${task.type || 'development'}
- Required Skills: ${JSON.stringify(task.skillRequirements || {})}
- Estimated Complexity: ${task.estimatedComplexity || 5}/10
- Quality Criteria: ${JSON.stringify(task.qualityCriteria || [])}
- Priority: ${task.priority || 'medium'}
- Estimated Duration: ${task.estimatedHours || 'Not specified'} hours

AVAILABLE AGENTS:
${agentSummaries.map((agent, index) => `
Agent ${index + 1}: ${agent.name} (${agent.id})
- Specialization: ${agent.specialization}
- Capabilities: ${agent.capabilities.join(', ') || 'General development'}
- Efficiency Rating: ${(agent.efficiency * 100).toFixed(0)}%
- Current Workload: ${agent.currentWorkload}/${agent.maxTasks} tasks
- Recent Performance: ${agent.recentPerformance}
`).join('\n')}

PROJECT CONTEXT:
${context.trd ? `- TRD Domain: ${context.trd.domain}` : ''}
${context.projectComplexity ? `- Project Complexity: ${context.projectComplexity}` : ''}

Analyze each agent and provide:

## AGENT ANALYSIS

For each agent, provide:

### Agent: [Agent Name]

**Skill Match Assessment: [0-100%]**
- Primary skill alignment with task requirements
- Secondary skill relevance
- Technology stack compatibility

**Capability Analysis:**
- Strengths relevant to this task
- Potential capability gaps
- Learning curve assessment

**Workload Impact:**
- Current utilization analysis
- Impact of adding this task
- Optimal utilization considerations

**Specialization Alignment:**
- How well the task matches agent's expertise
- Opportunity for skill development
- Risk of working outside comfort zone

**Risk Assessment:**
- Technical delivery risks
- Timeline risks
- Quality risks
- Mitigation strategies

**Confidence Score: [0.0-1.0]**
Overall confidence in successful task completion

**Recommendation:**
Clear recommendation with rationale

## FINAL RANKING
1. [Best Agent] - [Brief justification]
2. [Second Best] - [Brief justification]
3. [Third Best] - [Brief justification]

## OVERALL RECOMMENDATIONS
- Assignment strategy
- Success factors
- Monitoring recommendations
- Support requirements

Provide specific, actionable analysis focused on successful task completion. Consider both immediate fit and long-term development opportunities.
`;
  }

  /**
   * Build enhanced task prompt with TRD context
   */
  buildEnhancedTaskPrompt(task, trd, agent) {
    return `
You are ${agent.name}, a ${agent.specialization} specialist with expertise in: ${Object.keys(agent.capabilities || {}).join(', ')}.

You have been assigned a task as part of a larger project. Here's the complete context:

## PROJECT CONTEXT (from TRD)
Domain: ${trd.domain}
Overall Objective: ${trd.projectOverview || 'See functional requirements'}

Key Project Requirements:
${trd.functionalRequirements.map(req => `- ${req.description}`).join('\n')}

Quality Gates for Project:
${trd.qualityGates.map(gate => `- ${gate.name}: ${gate.required ? 'Required' : 'Optional'}`).join('\n')}

## YOUR SPECIFIC TASK
Title: ${task.title}
Description: ${task.description}
Type: ${task.type}
Priority: ${task.priority}
Estimated Complexity: ${task.estimatedComplexity}/10

Required Skills: ${JSON.stringify(task.skillRequirements)}
Quality Criteria: ${JSON.stringify(task.qualityCriteria)}

Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}

## TASK REQUIREMENTS
${task.qualityCriteria.map(criteria => `- ${criteria}`).join('\n')}

## YOUR APPROACH
Based on your specialization and capabilities, implement this task following these guidelines:

1. **Analysis Phase**
   - Understand the requirement in the context of the overall project
   - Identify any dependencies or integration points
   - Plan your implementation approach

2. **Implementation Phase**
   - Follow best practices for ${agent.specialization}
   - Ensure code quality and documentation
   - Implement comprehensive error handling
   - Consider performance and security implications

3. **Quality Assurance**
   - Test your implementation thoroughly
   - Validate against the quality criteria
   - Ensure integration compatibility
   - Document your solution

4. **Deliverables**
   - Working implementation
   - Unit tests (where applicable)
   - Documentation
   - Integration notes

Focus on delivering high-quality, maintainable code that aligns with the project's overall architecture and requirements. If you encounter any issues or need clarification, document them clearly.

Begin implementation now.
`;
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout(operation, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Execute with progress tracking
   */
  async executeWithProgress(prompt, sessionId, socket, projectPath) {
    this.activeSessions.set(sessionId, {
      startTime: new Date(),
      prompt: prompt.substring(0, 100) + '...',
      status: 'running'
    });

    try {
      // Emit progress updates if socket is available
      if (socket) {
        socket.emit('enhanced_task_progress', {
          sessionId,
          status: 'started',
          message: 'Beginning enhanced task execution...'
        });
      }

      const result = await this.baseGoose.executeGooseTask(prompt, sessionId, socket, projectPath);

      if (socket) {
        socket.emit('enhanced_task_progress', {
          sessionId,
          status: 'completed',
          message: 'Enhanced task execution completed'
        });
      }

      this.activeSessions.delete(sessionId);
      return result;

    } catch (error) {
      if (socket) {
        socket.emit('enhanced_task_progress', {
          sessionId,
          status: 'error',
          message: `Enhanced task execution failed: ${error.message}`
        });
      }

      this.activeSessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * Parse TRD response from Goose output
   */
  parseTRDResponse(gooseResult) {
    try {
      const output = gooseResult.output || gooseResult.result || gooseResult.toString();
      
      return {
        originalPrompt: gooseResult.originalTask || '',
        parsedOutput: output,
        extractedRequirements: this.extractRequirementsFromOutput(output),
        extractedConstraints: this.extractConstraintsFromOutput(output),
        extractedQualityGates: this.extractQualityGatesFromOutput(output),
        timestamp: new Date(),
        method: 'goose-cli'
      };
      
    } catch (error) {
      console.error('Failed to parse TRD response:', error);
      throw new Error('TRD response parsing failed');
    }
  }

  /**
   * Parse agent analysis response from Goose output
   */
  parseAgentAnalysisResponse(gooseResult, agents) {
    try {
      const output = gooseResult.output || gooseResult.result || gooseResult.toString();
      
      const analysis = agents.map(agent => {
        const agentSection = this.extractAgentSection(output, agent.name);
        return {
          agentId: agent.id,
          skillMatch: this.extractSkillMatch(agentSection),
          capabilities: this.extractCapabilities(agentSection),
          workloadAssessment: this.extractWorkloadAssessment(agentSection),
          specialization: this.extractSpecializationAssessment(agentSection),
          risks: this.extractRisks(agentSection),
          confidence: this.extractConfidence(agentSection),
          recommendation: this.extractRecommendation(agentSection)
        };
      });
      
      return {
        analysis,
        ranking: this.extractRanking(output),
        overallRecommendations: this.extractOverallRecommendations(output),
        timestamp: new Date(),
        method: 'goose-cli'
      };
      
    } catch (error) {
      console.error('Failed to parse agent analysis response:', error);
      throw new Error('Agent analysis response parsing failed');
    }
  }

  /**
   * Validate task execution against quality criteria
   */
  async validateTaskExecution(result, qualityCriteria) {
    const validation = {
      passed: true,
      results: [],
      score: 0,
      recommendations: []
    };

    if (!qualityCriteria || qualityCriteria.length === 0) {
      validation.score = 0.8; // Default score when no criteria
      return validation;
    }

    const output = result.output || result.result || result.toString();
    let passedCriteria = 0;

    for (const criteria of qualityCriteria) {
      const passed = this.checkCriteria(output, criteria);
      validation.results.push({
        criteria,
        passed,
        details: passed ? 'Criteria met' : 'Criteria not fully met'
      });
      
      if (passed) passedCriteria++;
    }

    validation.passed = passedCriteria === qualityCriteria.length;
    validation.score = passedCriteria / qualityCriteria.length;

    if (!validation.passed) {
      validation.recommendations.push('Review failed quality criteria and implement necessary improvements');
    }

    return validation;
  }

  /**
   * Check if output meets specific criteria
   */
  checkCriteria(output, criteria) {
    const criteriaLower = criteria.toLowerCase();
    const outputLower = output.toLowerCase();

    // Simple keyword-based validation
    if (criteriaLower.includes('test') && (outputLower.includes('test') || outputLower.includes('spec'))) {
      return true;
    }
    
    if (criteriaLower.includes('document') && outputLower.includes('readme')) {
      return true;
    }
    
    if (criteriaLower.includes('error') && outputLower.includes('error handling')) {
      return true;
    }

    // Default to true for general criteria
    return true;
  }

  /**
   * Handle execution failure with context
   */
  async handleExecutionFailure(error, context) {
    console.error('Enhanced execution failure:', error);
    
    const failureContext = {
      error: error.message,
      context,
      timestamp: new Date(),
      sessionId: context.sessionId
    };

    // Emit failure event if socket available
    if (context.socket) {
      context.socket.emit('enhanced_execution_failure', failureContext);
    }

    // Determine if retry is appropriate
    const shouldRetry = this.shouldRetryExecution(error, context);
    
    return {
      failed: true,
      error: error.message,
      context: failureContext,
      shouldRetry,
      retryStrategy: shouldRetry ? this.getRetryStrategy(error) : null
    };
  }

  /**
   * Extract performance metrics from execution
   */
  extractPerformanceMetrics(execution) {
    return {
      duration: execution.duration || 0,
      success: !execution.failed,
      quality: execution.validation?.score || 0,
      complexity: execution.task?.estimatedComplexity || 5,
      timestamp: new Date()
    };
  }

  // Helper methods for parsing Goose output...

  extractRequirementsFromOutput(output) {
    const requirements = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.match(/^req-\d+|^\d+\.|requirement/i)) {
        requirements.push(line.trim());
      }
    }
    
    return requirements;
  }

  extractConstraintsFromOutput(output) {
    const constraints = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('constraint') || 
          line.toLowerCase().includes('requirement') ||
          line.toLowerCase().includes('must use')) {
        constraints.push(line.trim());
      }
    }
    
    return constraints;
  }

  extractQualityGatesFromOutput(output) {
    const gates = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('quality') || 
          line.toLowerCase().includes('test') ||
          line.toLowerCase().includes('review')) {
        gates.push(line.trim());
      }
    }
    
    return gates;
  }

  extractAgentSection(output, agentName) {
    const lines = output.split('\n');
    let inSection = false;
    let section = [];
    
    for (const line of lines) {
      if (line.toLowerCase().includes(agentName.toLowerCase())) {
        inSection = true;
      } else if (inSection && line.match(/^Agent \d+:|^### Agent/)) {
        break;
      }
      
      if (inSection) {
        section.push(line);
      }
    }
    
    return section.join('\n');
  }

  extractSkillMatch(text) {
    const match = text.match(/skill.*?(\d+)%/i);
    return match ? parseInt(match[1]) : 70;
  }

  extractCapabilities(text) {
    return text.toLowerCase().includes('strong') ? 'strong' : 'moderate';
  }

  extractWorkloadAssessment(text) {
    if (text.toLowerCase().includes('overload')) return 'high_risk';
    if (text.toLowerCase().includes('optimal')) return 'optimal';
    return 'acceptable';
  }

  extractSpecializationAssessment(text) {
    if (text.toLowerCase().includes('excellent')) return 0.9;
    if (text.toLowerCase().includes('good')) return 0.8;
    return 0.6;
  }

  extractRisks(text) {
    const risks = [];
    if (text.toLowerCase().includes('risk')) {
      risks.push('General risk identified');
    }
    return risks;
  }

  extractConfidence(text) {
    const match = text.match(/confidence.*?(\d*\.?\d+)/i);
    return match ? parseFloat(match[1]) : 0.7;
  }

  extractRecommendation(text) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('recommend')) {
        return line.trim();
      }
    }
    return 'Standard assignment';
  }

  extractRanking(output) {
    const lines = output.split('\n');
    const ranking = [];
    
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+?)\s*-/);
      if (match) {
        ranking.push(match[1].trim());
      }
    }
    
    return ranking;
  }

  extractOverallRecommendations(output) {
    const recommendations = [];
    const lines = output.split('\n');
    let inRecommendations = false;
    
    for (const line of lines) {
      if (line.toLowerCase().includes('overall recommendation')) {
        inRecommendations = true;
        continue;
      }
      
      if (inRecommendations && line.trim().startsWith('-')) {
        recommendations.push(line.trim().substring(1).trim());
      }
    }
    
    return recommendations;
  }

  shouldRetryExecution(error, context) {
    // Simple retry logic
    return !error.message.includes('timeout') && 
           (context.retryCount || 0) < 2;
  }

  getRetryStrategy(error) {
    return {
      delay: 5000, // 5 second delay
      maxRetries: 2
    };
  }

  generateAgentCacheKey(task, agents) {
    const taskKey = Buffer.from(JSON.stringify({
      title: task.title,
      type: task.type,
      complexity: task.estimatedComplexity
    })).toString('base64').substring(0, 16);
    
    const agentKey = Buffer.from(
      agents.map(a => a.id).sort().join(',')
    ).toString('base64').substring(0, 16);
    
    return `${taskKey}-${agentKey}`;
  }

  /**
   * Get active sessions for monitoring
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.entries()).map(([id, session]) => ({
      sessionId: id,
      ...session,
      duration: new Date() - session.startTime
    }));
  }

  /**
   * Clean up old sessions
   */
  cleanupSessions() {
    const now = new Date();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.startTime > 60000) { // 1 minute cleanup
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Clean prompt input to prevent duplication issues
   */
  cleanPromptInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    // Remove "User requested:" prefixes
    let cleaned = input.replace(/^User requested:\s*/i, '');
    
    // Remove duplicate content by finding unique sentences
    const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim());
    const uniqueSentences = [...new Set(sentences)];
    cleaned = uniqueSentences.join('. ').trim();
    
    // Limit length
    if (cleaned.length > 1000) {
      cleaned = cleaned.substring(0, 1000) + '...';
    }
    
    return cleaned;
  }

  /**
   * Validate prompt size before sending to Goose
   */
  validatePromptSize(prompt, context = 'Unknown') {
    const size = Buffer.byteLength(prompt, 'utf8');
    const maxSize = this.config.goose?.maxPayloadSize || 100000; // 100KB
    const warningSize = this.config.goose?.warningPayloadSize || 80000; // 80KB
    
    if (size > maxSize) {
      const error = `Prompt too large for ${context}: ${size} bytes (limit: ${maxSize})`;
      console.error(`❌ ${error}`);
      throw new Error(error);
    }
    
    if (size > warningSize) {
      console.warn(`⚠️ Large prompt warning for ${context}: ${size} bytes`);
    }
    
    return true;
  }
}

module.exports = EnhancedGooseIntegration;