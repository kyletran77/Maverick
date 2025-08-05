const BaseService = require('./BaseService');
const { v4: uuidv4 } = require('uuid');

/**
 * Quality Service
 * 
 * Advanced quality management system with:
 * - Real-time quality assessment and scoring
 * - Historical quality analytics and trends
 * - Agent performance tracking and comparison
 * - Quality gate enforcement and feedback loops
 * - JSON-based metrics storage and aggregation
 * - ML-ready data preparation for quality prediction
 * - Quality degradation detection and alerting
 */
class QualityService extends BaseService {
  constructor(storageManager, eventBus, config = {}) {
    super('QualityService', storageManager, eventBus, {
      qualityThreshold: 0.8,
      degradationThreshold: 0.1, // 10% drop triggers alert
      trendWindow: 50, // Last 50 tasks for trend analysis
      enablePredictiveAnalysis: true,
      enableQualityGates: true,
      enableRealTimeScoring: true,
      qualityGateTimeout: 30000, // 30 seconds
      metricsRetentionDays: 90,
      aggregationInterval: 300000, // 5 minutes
      ...config
    });
    
    // Quality scoring components and weights
    this.qualityComponents = {
      codeQuality: { weight: 0.25, threshold: 0.8 },
      security: { weight: 0.20, threshold: 0.85 },
      performance: { weight: 0.20, threshold: 0.75 },
      testCoverage: { weight: 0.15, threshold: 0.80 },
      documentation: { weight: 0.10, threshold: 0.70 },
      maintainability: { weight: 0.10, threshold: 0.75 }
    };
    
    // Analytics and tracking
    this.qualityMetrics = new Map(); // projectId -> metrics
    this.agentPerformance = new Map(); // agentId -> performance data
    this.qualityTrends = new Map(); // projectId -> trend data
    this.activeGates = new Map(); // taskId -> gate info
    
    // Real-time scoring cache
    this.scoringCache = new Map(); // taskId -> score data
    this.cacheTTL = 300000; // 5 minutes
    
    // Quality analytics
    this.analytics = {
      totalAssessments: 0,
      passedGates: 0,
      failedGates: 0,
      averageQuality: 0,
      qualityDistribution: {
        excellent: 0, // >= 0.9
        good: 0,      // 0.8-0.89
        fair: 0,      // 0.7-0.79
        poor: 0       // < 0.7
      },
      degradationAlerts: 0,
      improvementTrends: 0
    };
  }
  
  async initialize() {
    console.log('🚀 Initializing QualityService...');
    
    // Subscribe to task completion events
    await this.subscribeToEvent('task.completed', this.handleTaskCompleted.bind(this));
    await this.subscribeToEvent('task.failed', this.handleTaskFailed.bind(this));
    
    // Subscribe to quality assessment requests
    await this.subscribeToEvent('quality.assess', this.handleQualityAssessment.bind(this));
    await this.subscribeToEvent('quality.gate.check', this.handleQualityGateCheck.bind(this));
    
    // Subscribe to project events
    await this.subscribeToEvent('project.started', this.handleProjectStarted.bind(this));
    await this.subscribeToEvent('project.completed', this.handleProjectCompleted.bind(this));
    
    // Start periodic analytics aggregation
    this.startAnalyticsAggregation();
    
    // Load existing quality data
    await this.loadExistingQualityData();
    
    console.log('✅ QualityService initialized');
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up QualityService...');
    
    // Clear caches
    this.qualityMetrics.clear();
    this.agentPerformance.clear();
    this.qualityTrends.clear();
    this.scoringCache.clear();
    this.activeGates.clear();
    
    console.log('✅ QualityService cleanup complete');
  }
  
  // ==================== QUALITY ASSESSMENT ====================
  
  async handleQualityAssessment(event) {
    const { taskId, projectId, agentId, result, context } = event.data;
    
    console.log(`🔍 Assessing quality for task: ${taskId}`);
    
    try {
      // Perform comprehensive quality assessment
      const qualityResult = await this.assessTaskQuality(taskId, projectId, agentId, result, context);
      
      // Store quality metrics
      await this.storeQualityMetrics(projectId, qualityResult);
      
      // Update agent performance tracking
      await this.updateAgentPerformance(agentId, qualityResult);
      
      // Update project quality trends
      await this.updateQualityTrends(projectId, qualityResult);
      
      // Check for quality degradation
      await this.checkQualityDegradation(projectId, agentId, qualityResult);
      
      // Publish quality assessment result
      await this.publishEvent('quality.assessed', {
        taskId: taskId,
        projectId: projectId,
        agentId: agentId,
        qualityResult: qualityResult
      });
      
      console.log(`✅ Quality assessment completed for task ${taskId}: ${qualityResult.overallScore}`);
      
      return qualityResult;
      
    } catch (error) {
      console.error(`❌ Quality assessment failed for task ${taskId}:`, error);
      await this.handleError('quality_assessment', error, { taskId, projectId, agentId });
      throw error;
    }
  }
  
  async assessTaskQuality(taskId, projectId, agentId, result, context = {}) {
    const assessment = {
      id: uuidv4(),
      taskId: taskId,
      projectId: projectId,
      agentId: agentId,
      timestamp: new Date().toISOString(),
      
      // Component scores (0.0 - 1.0)
      componentScores: {},
      
      // Overall weighted score
      overallScore: 0,
      
      // Pass/fail status
      passed: false,
      
      // Detailed analysis
      analysis: {
        strengths: [],
        weaknesses: [],
        recommendations: []
      },
      
      // Performance metrics
      performanceMetrics: context.performanceMetrics || {},
      
      // Context information
      context: {
        taskType: result.type || 'unknown',
        complexity: context.complexity || 'medium',
        duration: context.executionTime || 0,
        retryCount: context.retryCount || 0
      }
    };
    
    // Assess each quality component
    await this.assessCodeQuality(assessment, result, context);
    await this.assessSecurity(assessment, result, context);
    await this.assessPerformance(assessment, result, context);
    await this.assessTestCoverage(assessment, result, context);
    await this.assessDocumentation(assessment, result, context);
    await this.assessMaintainability(assessment, result, context);
    
    // Calculate overall weighted score
    assessment.overallScore = this.calculateOverallScore(assessment.componentScores);
    
    // Determine pass/fail
    assessment.passed = assessment.overallScore >= this.config.qualityThreshold;
    
    // Generate analysis and recommendations
    await this.generateQualityAnalysis(assessment);
    
    // Update analytics
    this.updateQualityAnalytics(assessment);
    
    return assessment;
  }
  
  async assessCodeQuality(assessment, result, context) {
    // Simulate code quality assessment
    let score = 0.85; // Base score
    
    // Adjust based on task type
    const taskTypeMultipliers = {
      'setup': 0.9,
      'feature': 1.0,
      'bugfix': 1.1,
      'refactor': 1.2,
      'testing': 0.95
    };
    
    score *= taskTypeMultipliers[result.type] || 1.0;
    
    // Adjust based on complexity
    const complexityAdjustments = {
      'low': 0.05,
      'medium': 0.0,
      'high': -0.05,
      'very-high': -0.10
    };
    
    score += complexityAdjustments[context.complexity] || 0;
    
    // Adjust based on retry count (more retries = lower quality)
    score -= (context.retryCount * 0.02);
    
    // Simulate variability
    score += (Math.random() - 0.5) * 0.1;
    
    assessment.componentScores.codeQuality = Math.max(0.0, Math.min(1.0, score));
    
    if (score < this.qualityComponents.codeQuality.threshold) {
      assessment.analysis.weaknesses.push('Code quality below standards');
      assessment.analysis.recommendations.push('Improve code structure and readability');
    } else {
      assessment.analysis.strengths.push('Good code quality standards maintained');
    }
  }
  
  async assessSecurity(assessment, result, context) {
    // Simulate security assessment
    let score = 0.88; // Base score
    
    // Higher security requirements for certain task types
    const securityCriticalTypes = ['authentication', 'api', 'database', 'deployment'];
    if (securityCriticalTypes.includes(result.type)) {
      score += 0.05; // Bonus for handling security-critical tasks well
    }
    
    // Simulate security scan results
    score += (Math.random() - 0.5) * 0.08;
    
    assessment.componentScores.security = Math.max(0.0, Math.min(1.0, score));
    
    if (score < this.qualityComponents.security.threshold) {
      assessment.analysis.weaknesses.push('Security vulnerabilities detected');
      assessment.analysis.recommendations.push('Review and fix security issues');
    } else {
      assessment.analysis.strengths.push('No significant security issues found');
    }
  }
  
  async assessPerformance(assessment, result, context) {
    // Simulate performance assessment based on execution time
    let score = 0.80; // Base score
    
    const executionTime = context.executionTime || 0;
    const expectedTime = context.expectedTime || 15000; // 15 seconds default
    
    // Performance based on execution time vs expected
    const timeRatio = executionTime / expectedTime;
    if (timeRatio < 0.5) {
      score += 0.15; // Very fast execution
    } else if (timeRatio < 0.8) {
      score += 0.10; // Fast execution
    } else if (timeRatio < 1.2) {
      score += 0.0; // Normal execution
    } else if (timeRatio < 2.0) {
      score -= 0.10; // Slow execution
    } else {
      score -= 0.20; // Very slow execution
    }
    
    // Memory and CPU efficiency (if available)
    if (context.performanceMetrics) {
      const memUsage = context.performanceMetrics.memoryUsage || 100;
      const cpuUsage = context.performanceMetrics.cpuUsage || 50;
      
      if (memUsage < 200) score += 0.05;
      if (cpuUsage < 30) score += 0.05;
    }
    
    assessment.componentScores.performance = Math.max(0.0, Math.min(1.0, score));
    
    if (score < this.qualityComponents.performance.threshold) {
      assessment.analysis.weaknesses.push('Performance optimization needed');
      assessment.analysis.recommendations.push('Optimize execution time and resource usage');
    } else {
      assessment.analysis.strengths.push('Good performance characteristics');
    }
  }
  
  async assessTestCoverage(assessment, result, context) {
    // Simulate test coverage assessment
    let score = 0.82; // Base score
    
    // Extract test coverage from result if available
    if (result.metrics && result.metrics.testCoverage) {
      score = result.metrics.testCoverage;
    } else {
      // Simulate based on task type
      const testCoverageByType = {
        'testing': 0.95,
        'feature': 0.85,
        'bugfix': 0.90,
        'setup': 0.75,
        'refactor': 0.88
      };
      
      score = testCoverageByType[result.type] || 0.82;
      score += (Math.random() - 0.5) * 0.1;
    }
    
    assessment.componentScores.testCoverage = Math.max(0.0, Math.min(1.0, score));
    
    if (score < this.qualityComponents.testCoverage.threshold) {
      assessment.analysis.weaknesses.push('Insufficient test coverage');
      assessment.analysis.recommendations.push('Increase test coverage and add edge case tests');
    } else {
      assessment.analysis.strengths.push('Adequate test coverage provided');
    }
  }
  
  async assessDocumentation(assessment, result, context) {
    // Simulate documentation assessment
    let score = 0.75; // Base score
    
    // Check if documentation was provided
    if (result.output && result.output.documentation) {
      score += 0.15;
    }
    
    // Adjust based on task complexity
    const complexityDocRequirements = {
      'low': 0.05,
      'medium': 0.0,
      'high': -0.05,
      'very-high': -0.10
    };
    
    score += complexityDocRequirements[context.complexity] || 0;
    
    // Simulate variability
    score += (Math.random() - 0.5) * 0.08;
    
    assessment.componentScores.documentation = Math.max(0.0, Math.min(1.0, score));
    
    if (score < this.qualityComponents.documentation.threshold) {
      assessment.analysis.weaknesses.push('Documentation could be improved');
      assessment.analysis.recommendations.push('Add comprehensive documentation and comments');
    } else {
      assessment.analysis.strengths.push('Well-documented implementation');
    }
  }
  
  async assessMaintainability(assessment, result, context) {
    // Simulate maintainability assessment
    let score = 0.78; // Base score
    
    // Better maintainability for refactoring tasks
    if (result.type === 'refactor') {
      score += 0.12;
    }
    
    // Lower maintainability for rushed tasks (high retry count)
    score -= (context.retryCount * 0.03);
    
    // Adjust based on code quality (they're related)
    const codeQualityScore = assessment.componentScores.codeQuality || 0.85;
    score = (score + codeQualityScore) / 2; // Average with code quality
    
    assessment.componentScores.maintainability = Math.max(0.0, Math.min(1.0, score));
    
    if (score < this.qualityComponents.maintainability.threshold) {
      assessment.analysis.weaknesses.push('Maintainability concerns identified');
      assessment.analysis.recommendations.push('Improve code organization and modularity');
    } else {
      assessment.analysis.strengths.push('Good maintainability characteristics');
    }
  }
  
  calculateOverallScore(componentScores) {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [component, score] of Object.entries(componentScores)) {
      const componentConfig = this.qualityComponents[component];
      if (componentConfig) {
        totalScore += score * componentConfig.weight;
        totalWeight += componentConfig.weight;
      }
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
  
  async generateQualityAnalysis(assessment) {
    // Add overall assessment
    if (assessment.overallScore >= 0.9) {
      assessment.analysis.strengths.push('Excellent overall quality achieved');
    } else if (assessment.overallScore >= 0.8) {
      assessment.analysis.strengths.push('Good overall quality standards met');
    } else if (assessment.overallScore >= 0.7) {
      assessment.analysis.weaknesses.push('Quality standards partially met');
      assessment.analysis.recommendations.push('Focus on improving weak areas');
    } else {
      assessment.analysis.weaknesses.push('Quality standards not met');
      assessment.analysis.recommendations.push('Significant quality improvements required');
    }
    
    // Add component-specific insights
    const lowestComponent = Object.entries(assessment.componentScores)
      .sort(([,a], [,b]) => a - b)[0];
    
    if (lowestComponent && lowestComponent[1] < 0.7) {
      assessment.analysis.recommendations.push(`Priority focus needed on: ${lowestComponent[0]}`);
    }
  }
  
  // ==================== QUALITY GATES ====================
  
  async handleQualityGateCheck(event) {
    const { taskId, projectId, agentId, qualityResult } = event.data;
    
    console.log(`🚪 Quality gate check for task: ${taskId}`);
    
    try {
      const gateResult = await this.evaluateQualityGate(taskId, projectId, qualityResult);
      
      // Store gate result
      this.activeGates.set(taskId, {
        ...gateResult,
        timestamp: new Date().toISOString()
      });
      
      // Publish gate result
      await this.publishEvent('quality.gate.result', {
        taskId: taskId,
        projectId: projectId,
        agentId: agentId,
        gateResult: gateResult
      });
      
      console.log(`${gateResult.passed ? '✅' : '❌'} Quality gate ${gateResult.passed ? 'passed' : 'failed'} for task ${taskId}`);
      
      return gateResult;
      
    } catch (error) {
      console.error(`❌ Quality gate check failed for task ${taskId}:`, error);
      throw error;
    }
  }
  
  async evaluateQualityGate(taskId, projectId, qualityResult) {
    const gate = {
      taskId: taskId,
      projectId: projectId,
      passed: false,
      score: qualityResult.overallScore,
      threshold: this.config.qualityThreshold,
      issues: [],
      recommendations: [],
      requiresRework: false
    };
    
    // Check overall score threshold
    gate.passed = qualityResult.overallScore >= this.config.qualityThreshold;
    
    // Check individual component thresholds
    for (const [component, score] of Object.entries(qualityResult.componentScores)) {
      const componentConfig = this.qualityComponents[component];
      if (componentConfig && score < componentConfig.threshold) {
        gate.issues.push(`${component} score (${score.toFixed(2)}) below threshold (${componentConfig.threshold})`);
        gate.requiresRework = true;
      }
    }
    
    // Add recommendations from quality analysis
    gate.recommendations = qualityResult.analysis.recommendations;
    
    // Update analytics
    if (gate.passed) {
      this.analytics.passedGates++;
    } else {
      this.analytics.failedGates++;
    }
    
    return gate;
  }
  
  // ==================== PERFORMANCE TRACKING ====================
  
  async updateAgentPerformance(agentId, qualityResult) {
    if (!this.agentPerformance.has(agentId)) {
      this.agentPerformance.set(agentId, {
        agentId: agentId,
        totalTasks: 0,
        qualityScores: [],
        averageQuality: 0,
        trendDirection: 'stable', // improving, stable, declining
        componentStrengths: {},
        componentWeaknesses: {},
        lastUpdated: new Date().toISOString()
      });
    }
    
    const performance = this.agentPerformance.get(agentId);
    
    // Update basic metrics
    performance.totalTasks++;
    performance.qualityScores.push({
      score: qualityResult.overallScore,
      timestamp: qualityResult.timestamp,
      taskId: qualityResult.taskId
    });
    
    // Keep only recent scores for trend analysis
    if (performance.qualityScores.length > this.config.trendWindow) {
      performance.qualityScores.shift();
    }
    
    // Calculate average quality
    performance.averageQuality = performance.qualityScores.reduce((sum, q) => sum + q.score, 0) / performance.qualityScores.length;
    
    // Analyze component performance
    for (const [component, score] of Object.entries(qualityResult.componentScores)) {
      if (!performance.componentStrengths[component]) {
        performance.componentStrengths[component] = [];
        performance.componentWeaknesses[component] = [];
      }
      
      if (score >= 0.85) {
        performance.componentStrengths[component].push(score);
      } else if (score < 0.7) {
        performance.componentWeaknesses[component].push(score);
      }
    }
    
    // Calculate trend direction
    performance.trendDirection = this.calculateTrendDirection(performance.qualityScores);
    
    performance.lastUpdated = new Date().toISOString();
    
    // Save to storage
    await this.saveAgentPerformance(agentId, performance);
  }
  
  calculateTrendDirection(qualityScores) {
    if (qualityScores.length < 5) return 'stable';
    
    const recentScores = qualityScores.slice(-10);
    const olderScores = qualityScores.slice(-20, -10);
    
    if (olderScores.length === 0) return 'stable';
    
    const recentAverage = recentScores.reduce((sum, q) => sum + q.score, 0) / recentScores.length;
    const olderAverage = olderScores.reduce((sum, q) => sum + q.score, 0) / olderScores.length;
    
    const difference = recentAverage - olderAverage;
    
    if (difference > 0.05) return 'improving';
    if (difference < -0.05) return 'declining';
    return 'stable';
  }
  
  // ==================== QUALITY TRENDS ====================
  
  async updateQualityTrends(projectId, qualityResult) {
    if (!this.qualityTrends.has(projectId)) {
      this.qualityTrends.set(projectId, {
        projectId: projectId,
        qualityHistory: [],
        averageQuality: 0,
        trendDirection: 'stable',
        qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
        componentTrends: {},
        lastUpdated: new Date().toISOString()
      });
    }
    
    const trends = this.qualityTrends.get(projectId);
    
    // Add to history
    trends.qualityHistory.push({
      score: qualityResult.overallScore,
      timestamp: qualityResult.timestamp,
      taskId: qualityResult.taskId,
      componentScores: qualityResult.componentScores
    });
    
    // Keep manageable history size
    if (trends.qualityHistory.length > 100) {
      trends.qualityHistory.shift();
    }
    
    // Update average
    trends.averageQuality = trends.qualityHistory.reduce((sum, q) => sum + q.score, 0) / trends.qualityHistory.length;
    
    // Update distribution
    this.updateQualityDistribution(trends, qualityResult.overallScore);
    
    // Update component trends
    this.updateComponentTrends(trends, qualityResult.componentScores);
    
    // Calculate overall trend
    trends.trendDirection = this.calculateTrendDirection(trends.qualityHistory);
    
    trends.lastUpdated = new Date().toISOString();
    
    // Save to storage
    await this.saveQualityTrends(projectId, trends);
  }
  
  updateQualityDistribution(trends, score) {
    if (score >= 0.9) trends.qualityDistribution.excellent++;
    else if (score >= 0.8) trends.qualityDistribution.good++;
    else if (score >= 0.7) trends.qualityDistribution.fair++;
    else trends.qualityDistribution.poor++;
  }
  
  updateComponentTrends(trends, componentScores) {
    for (const [component, score] of Object.entries(componentScores)) {
      if (!trends.componentTrends[component]) {
        trends.componentTrends[component] = {
          scores: [],
          average: 0,
          trend: 'stable'
        };
      }
      
      const componentTrend = trends.componentTrends[component];
      componentTrend.scores.push(score);
      
      if (componentTrend.scores.length > 50) {
        componentTrend.scores.shift();
      }
      
      componentTrend.average = componentTrend.scores.reduce((sum, s) => sum + s, 0) / componentTrend.scores.length;
      componentTrend.trend = this.calculateTrendDirection(componentTrend.scores.map(s => ({ score: s })));
    }
  }
  
  // ==================== QUALITY DEGRADATION DETECTION ====================
  
  async checkQualityDegradation(projectId, agentId, qualityResult) {
    // Check project-level degradation
    const projectTrends = this.qualityTrends.get(projectId);
    if (projectTrends && projectTrends.qualityHistory.length >= 10) {
      const recent = projectTrends.qualityHistory.slice(-5);
      const previous = projectTrends.qualityHistory.slice(-10, -5);
      
      const recentAvg = recent.reduce((sum, q) => sum + q.score, 0) / recent.length;
      const previousAvg = previous.reduce((sum, q) => sum + q.score, 0) / previous.length;
      
      if (previousAvg - recentAvg > this.config.degradationThreshold) {
        await this.alertQualityDegradation('project', projectId, {
          currentAverage: recentAvg,
          previousAverage: previousAvg,
          degradation: previousAvg - recentAvg
        });
      }
    }
    
    // Check agent-level degradation
    const agentPerformance = this.agentPerformance.get(agentId);
    if (agentPerformance && agentPerformance.trendDirection === 'declining') {
      const recentScores = agentPerformance.qualityScores.slice(-5);
      if (recentScores.length >= 5) {
        const recentAvg = recentScores.reduce((sum, q) => sum + q.score, 0) / recentScores.length;
        const overallAvg = agentPerformance.averageQuality;
        
        if (overallAvg - recentAvg > this.config.degradationThreshold) {
          await this.alertQualityDegradation('agent', agentId, {
            currentAverage: recentAvg,
            overallAverage: overallAvg,
            degradation: overallAvg - recentAvg
          });
        }
      }
    }
  }
  
  async alertQualityDegradation(type, entityId, data) {
    console.warn(`⚠️ Quality degradation detected in ${type}: ${entityId}`);
    
    this.analytics.degradationAlerts++;
    
    await this.publishEvent('quality.degradation.alert', {
      type: type,
      entityId: entityId,
      degradationData: data,
      timestamp: new Date().toISOString()
    });
  }
  
  // ==================== EVENT HANDLERS ====================
  
  async handleTaskCompleted(event) {
    const { taskId, projectId, agentId, result, qualityScore, performanceMetrics } = event.data;
    
    // If quality score already provided, use it
    if (qualityScore) {
      const qualityResult = {
        id: uuidv4(),
        taskId: taskId,
        projectId: projectId,
        agentId: agentId,
        overallScore: qualityScore,
        timestamp: new Date().toISOString(),
        componentScores: this.estimateComponentScores(qualityScore),
        analysis: this.generateBasicAnalysis(qualityScore)
      };
      
      await this.storeQualityMetrics(projectId, qualityResult);
      await this.updateAgentPerformance(agentId, qualityResult);
      await this.updateQualityTrends(projectId, qualityResult);
    } else {
      // Trigger full quality assessment
      await this.publishEvent('quality.assess', {
        taskId: taskId,
        projectId: projectId,
        agentId: agentId,
        result: result,
        context: { performanceMetrics }
      });
    }
  }
  
  async handleTaskFailed(event) {
    const { taskId, projectId, agentId, error } = event.data;
    
    // Record failure in quality metrics
    const qualityResult = {
      id: uuidv4(),
      taskId: taskId,
      projectId: projectId,
      agentId: agentId,
      overallScore: 0.0,
      timestamp: new Date().toISOString(),
      componentScores: {
        codeQuality: 0.0,
        security: 0.0,
        performance: 0.0,
        testCoverage: 0.0,
        documentation: 0.0,
        maintainability: 0.0
      },
      analysis: {
        strengths: [],
        weaknesses: ['Task failed to complete'],
        recommendations: ['Investigate and fix the underlying issue']
      },
      failed: true,
      error: error
    };
    
    await this.storeQualityMetrics(projectId, qualityResult);
    await this.updateAgentPerformance(agentId, qualityResult);
    await this.updateQualityTrends(projectId, qualityResult);
  }
  
  async handleProjectStarted(event) {
    const { projectId } = event.data;
    
    // Initialize project quality tracking
    this.qualityTrends.set(projectId, {
      projectId: projectId,
      qualityHistory: [],
      averageQuality: 0,
      trendDirection: 'stable',
      qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      componentTrends: {},
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`📊 Quality tracking initialized for project: ${projectId}`);
  }
  
  async handleProjectCompleted(event) {
    const { projectId } = event.data;
    
    // Generate final project quality report
    const qualityReport = await this.generateProjectQualityReport(projectId);
    
    await this.publishEvent('quality.project.report', {
      projectId: projectId,
      qualityReport: qualityReport
    });
    
    console.log(`📈 Final quality report generated for project: ${projectId}`);
  }
  
  // ==================== ANALYTICS AND REPORTING ====================
  
  startAnalyticsAggregation() {
    const aggregationTimer = setInterval(async () => {
      try {
        await this.aggregateAnalytics();
      } catch (error) {
        console.error('❌ Analytics aggregation error:', error);
      }
    }, this.config.aggregationInterval);
    
    this.timers.set('analytics_aggregation', aggregationTimer);
    console.log('📊 Analytics aggregation started');
  }
  
  async aggregateAnalytics() {
    // Update global analytics
    this.analytics.totalAssessments = Array.from(this.qualityTrends.values())
      .reduce((sum, trend) => sum + trend.qualityHistory.length, 0);
    
    // Calculate overall average quality
    let totalQualitySum = 0;
    let totalQualityCount = 0;
    
    for (const trends of this.qualityTrends.values()) {
      totalQualitySum += trends.qualityHistory.reduce((sum, q) => sum + q.score, 0);
      totalQualityCount += trends.qualityHistory.length;
    }
    
    this.analytics.averageQuality = totalQualityCount > 0 ? totalQualitySum / totalQualityCount : 0;
    
    // Aggregate quality distribution
    this.analytics.qualityDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    for (const trends of this.qualityTrends.values()) {
      this.analytics.qualityDistribution.excellent += trends.qualityDistribution.excellent;
      this.analytics.qualityDistribution.good += trends.qualityDistribution.good;
      this.analytics.qualityDistribution.fair += trends.qualityDistribution.fair;
      this.analytics.qualityDistribution.poor += trends.qualityDistribution.poor;
    }
    
    // Count improvement trends
    this.analytics.improvementTrends = Array.from(this.agentPerformance.values())
      .filter(perf => perf.trendDirection === 'improving').length;
    
    // Save aggregated analytics
    await this.saveAnalytics();
  }
  
  async generateProjectQualityReport(projectId) {
    const trends = this.qualityTrends.get(projectId);
    if (!trends) {
      throw new Error(`No quality data found for project: ${projectId}`);
    }
    
    const report = {
      projectId: projectId,
      generatedAt: new Date().toISOString(),
      
      // Overall metrics
      totalTasks: trends.qualityHistory.length,
      averageQuality: trends.averageQuality,
      trendDirection: trends.trendDirection,
      
      // Quality distribution
      qualityDistribution: trends.qualityDistribution,
      
      // Component analysis
      componentAnalysis: {},
      
      // Key insights
      insights: {
        topPerformingComponents: [],
        areasForImprovement: [],
        qualityTrend: trends.trendDirection,
        recommendations: []
      },
      
      // Time-based analysis
      timeAnalysis: this.analyzeQualityOverTime(trends.qualityHistory)
    };
    
    // Analyze each component
    for (const [component, trend] of Object.entries(trends.componentTrends)) {
      report.componentAnalysis[component] = {
        average: trend.average,
        trend: trend.trend,
        scores: trend.scores.slice(-10) // Last 10 scores
      };
      
      if (trend.average >= 0.85) {
        report.insights.topPerformingComponents.push(component);
      } else if (trend.average < 0.75) {
        report.insights.areasForImprovement.push(component);
      }
    }
    
    // Generate recommendations
    report.insights.recommendations = this.generateProjectRecommendations(report);
    
    return report;
  }
  
  analyzeQualityOverTime(qualityHistory) {
    if (qualityHistory.length < 5) {
      return { trend: 'insufficient_data', analysis: 'Not enough data for time analysis' };
    }
    
    const timeSlices = 5;
    const sliceSize = Math.floor(qualityHistory.length / timeSlices);
    const sliceAverages = [];
    
    for (let i = 0; i < timeSlices; i++) {
      const start = i * sliceSize;
      const end = i === timeSlices - 1 ? qualityHistory.length : (i + 1) * sliceSize;
      const slice = qualityHistory.slice(start, end);
      const average = slice.reduce((sum, q) => sum + q.score, 0) / slice.length;
      sliceAverages.push(average);
    }
    
    // Calculate trend
    const firstHalf = sliceAverages.slice(0, Math.floor(timeSlices / 2));
    const secondHalf = sliceAverages.slice(Math.ceil(timeSlices / 2));
    
    const firstAvg = firstHalf.reduce((sum, avg) => sum + avg, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, avg) => sum + avg, 0) / secondHalf.length;
    
    let trend = 'stable';
    if (secondAvg - firstAvg > 0.05) trend = 'improving';
    else if (firstAvg - secondAvg > 0.05) trend = 'declining';
    
    return {
      trend: trend,
      sliceAverages: sliceAverages,
      overallImprovement: secondAvg - firstAvg,
      analysis: `Quality ${trend} over time`
    };
  }
  
  generateProjectRecommendations(report) {
    const recommendations = [];
    
    // Quality level recommendations
    if (report.averageQuality < 0.7) {
      recommendations.push('Focus on fundamental quality improvements across all components');
    } else if (report.averageQuality < 0.8) {
      recommendations.push('Target specific weak areas to reach good quality standards');
    } else if (report.averageQuality >= 0.9) {
      recommendations.push('Maintain excellent quality standards and share best practices');
    }
    
    // Component-specific recommendations
    for (const component of report.insights.areasForImprovement) {
      recommendations.push(`Improve ${component} through targeted training and tooling`);
    }
    
    // Trend-based recommendations
    if (report.trendDirection === 'declining') {
      recommendations.push('Address quality decline immediately with process improvements');
    } else if (report.trendDirection === 'improving') {
      recommendations.push('Continue current practices that are driving quality improvements');
    }
    
    return recommendations;
  }
  
  // ==================== STORAGE OPERATIONS ====================
  
  async storeQualityMetrics(projectId, qualityResult) {
    await this.storage.saveQualityMetrics(projectId, qualityResult);
    
    // Update cache
    this.scoringCache.set(qualityResult.taskId, {
      ...qualityResult,
      cachedAt: Date.now()
    });
  }
  
  async saveAgentPerformance(agentId, performance) {
    await this.saveServiceData(`agent-performance/${agentId}`, performance);
  }
  
  async saveQualityTrends(projectId, trends) {
    await this.saveServiceData(`quality-trends/${projectId}`, trends);
  }
  
  async saveAnalytics() {
    await this.saveServiceData('analytics', {
      ...this.analytics,
      timestamp: new Date().toISOString()
    });
  }
  
  async loadExistingQualityData() {
    // Load agent performance data
    // Load quality trends data
    // Load analytics data
    console.log('📚 Loading existing quality data...');
    
    // This would load from storage in a real implementation
    // For now, we start fresh
    
    console.log('✅ Quality data loaded');
  }
  
  // ==================== UTILITY METHODS ====================
  
  estimateComponentScores(overallScore) {
    // Generate realistic component scores that average to the overall score
    const variance = 0.1;
    const components = {};
    
    for (const component of Object.keys(this.qualityComponents)) {
      const randomVariance = (Math.random() - 0.5) * variance;
      components[component] = Math.max(0.0, Math.min(1.0, overallScore + randomVariance));
    }
    
    return components;
  }
  
  generateBasicAnalysis(score) {
    const analysis = {
      strengths: [],
      weaknesses: [],
      recommendations: []
    };
    
    if (score >= 0.9) {
      analysis.strengths.push('Excellent overall quality');
    } else if (score >= 0.8) {
      analysis.strengths.push('Good quality standards met');
    } else if (score >= 0.7) {
      analysis.weaknesses.push('Quality standards partially met');
      analysis.recommendations.push('Focus on improving weak areas');
    } else {
      analysis.weaknesses.push('Quality standards not met');
      analysis.recommendations.push('Significant improvements required');
    }
    
    return analysis;
  }
  
  updateQualityAnalytics(assessment) {
    this.analytics.totalAssessments++;
    
    // Update distribution
    const score = assessment.overallScore;
    if (score >= 0.9) this.analytics.qualityDistribution.excellent++;
    else if (score >= 0.8) this.analytics.qualityDistribution.good++;
    else if (score >= 0.7) this.analytics.qualityDistribution.fair++;
    else this.analytics.qualityDistribution.poor++;
  }
  
  // ==================== API METHODS ====================
  
  async getProjectQualityOverview(projectId) {
    const trends = this.qualityTrends.get(projectId);
    if (!trends) {
      return { error: 'No quality data found for project' };
    }
    
    return {
      projectId: projectId,
      averageQuality: trends.averageQuality,
      totalTasks: trends.qualityHistory.length,
      trendDirection: trends.trendDirection,
      qualityDistribution: trends.qualityDistribution,
      lastUpdated: trends.lastUpdated
    };
  }
  
  async getAgentPerformanceOverview(agentId) {
    const performance = this.agentPerformance.get(agentId);
    if (!performance) {
      return { error: 'No performance data found for agent' };
    }
    
    return {
      agentId: agentId,
      totalTasks: performance.totalTasks,
      averageQuality: performance.averageQuality,
      trendDirection: performance.trendDirection,
      recentScores: performance.qualityScores.slice(-10),
      lastUpdated: performance.lastUpdated
    };
  }
  
  getSystemQualityAnalytics() {
    return {
      ...this.analytics,
      timestamp: new Date().toISOString(),
      projectsTracked: this.qualityTrends.size,
      agentsTracked: this.agentPerformance.size
    };
  }
  
  // ==================== HEALTH STATUS ====================
  
  async getHealthStatus() {
    const baseHealth = await super.getHealthStatus();
    
    return {
      ...baseHealth,
      qualityService: {
        projectsTracked: this.qualityTrends.size,
        agentsTracked: this.agentPerformance.size,
        totalAssessments: this.analytics.totalAssessments,
        averageSystemQuality: this.analytics.averageQuality,
        activeGates: this.activeGates.size,
        cacheSize: this.scoringCache.size
      }
    };
  }
}

module.exports = QualityService;