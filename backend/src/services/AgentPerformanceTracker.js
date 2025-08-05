const BaseService = require('./BaseService');
const { v4: uuidv4 } = require('uuid');

/**
 * Agent Performance Tracker
 * 
 * Comprehensive performance tracking and weight calculation system:
 * - Real-time performance metrics collection and analysis
 * - Dynamic agent weight calculation based on multiple factors
 * - Performance trend analysis and prediction
 * - Load balancing weight optimization
 * - Agent ranking and recommendation system
 * - Performance degradation detection and remediation
 * - JSON-based performance data persistence
 */
class AgentPerformanceTracker extends BaseService {
  constructor(storageManager, eventBus, config = {}) {
    super('AgentPerformanceTracker', storageManager, eventBus, {
      weightUpdateInterval: 60000, // 1 minute
      performanceWindow: 100, // Last 100 tasks for performance calculation
      weightDecayFactor: 0.95, // Historical weight decay
      qualityWeight: 0.4, // Quality impact on weight
      speedWeight: 0.3, // Speed impact on weight
      reliabilityWeight: 0.2, // Reliability impact on weight
      utilizationWeight: 0.1, // Utilization impact on weight
      minWeight: 0.1, // Minimum weight for any agent
      maxWeight: 3.0, // Maximum weight for any agent
      performanceThreshold: 0.7, // Minimum acceptable performance
      trendAnalysisWindow: 50, // Window for trend analysis
      enablePredictiveWeighting: true,
      enableAdaptiveWeighting: true,
      ...config
    });
    
    // Performance tracking data structures
    this.agentPerformance = new Map(); // agentId -> performance data
    this.agentWeights = new Map(); // agentId -> current weight
    this.performanceHistory = new Map(); // agentId -> historical performance
    this.weightHistory = new Map(); // agentId -> weight changes over time
    
    // Real-time metrics
    this.activeTaskMetrics = new Map(); // taskId -> metrics during execution
    this.agentUtilization = new Map(); // agentId -> current utilization
    this.loadBalancingMetrics = new Map(); // agentId -> load balancing stats
    
    // Performance analytics
    this.globalMetrics = {
      totalTasks: 0,
      averageQuality: 0,
      averageSpeed: 0,
      averageReliability: 0,
      topPerformers: [],
      underperformers: [],
      weightDistribution: {},
      lastCalculated: null
    };
    
    // Weight calculation components
    this.weightCalculators = {
      quality: this.calculateQualityWeight.bind(this),
      speed: this.calculateSpeedWeight.bind(this),
      reliability: this.calculateReliabilityWeight.bind(this),
      utilization: this.calculateUtilizationWeight.bind(this)
    };
    
    // Performance predictors
    this.performancePredictors = {
      linear: this.linearPerformancePredictor.bind(this),
      exponential: this.exponentialPerformancePredictor.bind(this),
      adaptive: this.adaptivePerformancePredictor.bind(this)
    };
  }
  
  async initialize() {
    console.log('🚀 Initializing AgentPerformanceTracker...');
    
    // Subscribe to task events
    await this.subscribeToEvent('agent.task.started', this.handleTaskStarted.bind(this));
    await this.subscribeToEvent('agent.task.completed', this.handleTaskCompleted.bind(this));
    await this.subscribeToEvent('agent.task.failed', this.handleTaskFailed.bind(this));
    await this.subscribeToEvent('agent.task.progress', this.handleTaskProgress.bind(this));
    
    // Subscribe to quality events
    await this.subscribeToEvent('quality.assessed', this.handleQualityAssessed.bind(this));
    
    // Subscribe to agent events
    await this.subscribeToEvent('agent.registered', this.handleAgentRegistered.bind(this));
    await this.subscribeToEvent('agent.unregistered', this.handleAgentUnregistered.bind(this));
    
    // Subscribe to system events
    await this.subscribeToEvent('system.load.changed', this.handleSystemLoadChanged.bind(this));
    
    // Load existing performance data
    await this.loadExistingPerformanceData();
    
    // Start periodic weight updates
    this.startWeightUpdates();
    
    // Start performance analysis
    this.startPerformanceAnalysis();
    
    console.log('✅ AgentPerformanceTracker initialized');
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up AgentPerformanceTracker...');
    
    // Save all performance data
    await this.saveAllPerformanceData();
    
    // Clear data structures
    this.agentPerformance.clear();
    this.agentWeights.clear();
    this.performanceHistory.clear();
    this.weightHistory.clear();
    this.activeTaskMetrics.clear();
    this.agentUtilization.clear();
    this.loadBalancingMetrics.clear();
    
    console.log('✅ AgentPerformanceTracker cleanup complete');
  }
  
  // ==================== TASK EVENT HANDLING ====================
  
  async handleTaskStarted(event) {
    const { taskId, agentId, projectId, timestamp } = event.data;
    
    console.log(`⏱️ Tracking task start: ${taskId} by ${agentId}`);
    
    // Initialize task metrics tracking
    this.activeTaskMetrics.set(taskId, {
      taskId: taskId,
      agentId: agentId,
      projectId: projectId,
      startTime: new Date(timestamp).getTime(),
      lastProgress: new Date(timestamp).getTime(),
      progressUpdates: 0,
      estimatedDuration: null,
      complexity: null
    });
    
    // Update agent utilization
    await this.updateAgentUtilization(agentId, 'task_started', taskId);
    
    // Initialize performance tracking if needed
    await this.initializeAgentPerformance(agentId);
  }
  
  async handleTaskCompleted(event) {
    const { taskId, agentId, projectId, result, executionTime, qualityScore } = event.data;
    
    console.log(`✅ Tracking task completion: ${taskId} by ${agentId}`);
    
    const taskMetrics = this.activeTaskMetrics.get(taskId);
    if (!taskMetrics) {
      console.warn(`⚠️ No metrics found for completed task: ${taskId}`);
      return;
    }
    
    // Calculate final metrics
    const completionTime = Date.now();
    const actualDuration = completionTime - taskMetrics.startTime;
    
    const completionMetrics = {
      taskId: taskId,
      agentId: agentId,
      projectId: projectId,
      status: 'completed',
      startTime: taskMetrics.startTime,
      completionTime: completionTime,
      actualDuration: actualDuration,
      executionTime: executionTime || actualDuration,
      qualityScore: qualityScore || 0.8,
      progressUpdates: taskMetrics.progressUpdates,
      result: result
    };
    
    // Update agent performance
    await this.updateAgentPerformance(agentId, completionMetrics);
    
    // Update utilization
    await this.updateAgentUtilization(agentId, 'task_completed', taskId);
    
    // Remove from active tracking
    this.activeTaskMetrics.delete(taskId);
    
    // Trigger weight recalculation
    await this.scheduleWeightUpdate(agentId);
  }
  
  async handleTaskFailed(event) {
    const { taskId, agentId, projectId, error, executionTime } = event.data;
    
    console.log(`❌ Tracking task failure: ${taskId} by ${agentId}`);
    
    const taskMetrics = this.activeTaskMetrics.get(taskId);
    if (!taskMetrics) {
      console.warn(`⚠️ No metrics found for failed task: ${taskId}`);
      return;
    }
    
    // Calculate failure metrics
    const failureTime = Date.now();
    const actualDuration = failureTime - taskMetrics.startTime;
    
    const failureMetrics = {
      taskId: taskId,
      agentId: agentId,
      projectId: projectId,
      status: 'failed',
      startTime: taskMetrics.startTime,
      failureTime: failureTime,
      actualDuration: actualDuration,
      executionTime: executionTime || actualDuration,
      qualityScore: 0.0,
      progressUpdates: taskMetrics.progressUpdates,
      error: error
    };
    
    // Update agent performance
    await this.updateAgentPerformance(agentId, failureMetrics);
    
    // Update utilization
    await this.updateAgentUtilization(agentId, 'task_failed', taskId);
    
    // Remove from active tracking
    this.activeTaskMetrics.delete(taskId);
    
    // Trigger weight recalculation (failure impacts weight significantly)
    await this.scheduleWeightUpdate(agentId, true);
  }
  
  async handleTaskProgress(event) {
    const { taskId, agentId, progress, timestamp } = event.data;
    
    const taskMetrics = this.activeTaskMetrics.get(taskId);
    if (taskMetrics) {
      taskMetrics.lastProgress = new Date(timestamp).getTime();
      taskMetrics.progressUpdates++;
      
      // Update progress-based metrics
      if (progress && progress.percentage) {
        taskMetrics.currentProgress = progress.percentage;
        
        // Estimate completion time based on progress
        const elapsed = taskMetrics.lastProgress - taskMetrics.startTime;
        if (progress.percentage > 0.1) {
          taskMetrics.estimatedDuration = (elapsed / progress.percentage) * 100;
        }
      }
    }
  }
  
  async handleQualityAssessed(event) {
    const { taskId, agentId, qualityResult } = event.data;
    
    // Update quality metrics if we have active tracking
    const taskMetrics = this.activeTaskMetrics.get(taskId);
    if (taskMetrics) {
      taskMetrics.qualityScore = qualityResult.overallScore;
      taskMetrics.qualityBreakdown = qualityResult.componentScores;
    }
    
    // Update agent quality performance
    await this.updateAgentQualityMetrics(agentId, qualityResult);
  }
  
  // ==================== PERFORMANCE TRACKING ====================
  
  async initializeAgentPerformance(agentId) {
    if (this.agentPerformance.has(agentId)) {
      return; // Already initialized
    }
    
    const initialPerformance = {
      agentId: agentId,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      
      // Quality metrics
      qualityMetrics: {
        averageQuality: 0.8,
        qualityTrend: 'stable',
        qualityHistory: [],
        componentAverages: {}
      },
      
      // Speed metrics
      speedMetrics: {
        averageExecutionTime: 0,
        speedTrend: 'stable',
        executionHistory: [],
        speedRanking: 0.5
      },
      
      // Reliability metrics
      reliabilityMetrics: {
        successRate: 0.0,
        failureRate: 0.0,
        retryRate: 0.0,
        reliabilityTrend: 'stable',
        mtbf: 0 // Mean Time Between Failures
      },
      
      // Utilization metrics
      utilizationMetrics: {
        currentLoad: 0,
        averageLoad: 0,
        peakLoad: 0,
        idleTime: 0,
        busyTime: 0
      },
      
      // Historical data
      taskHistory: [],
      performanceTrend: 'stable',
      lastUpdated: new Date().toISOString(),
      
      // Predictive metrics
      predictedPerformance: {
        nextTaskQuality: 0.8,
        nextTaskSpeed: 1.0,
        confidence: 0.5
      }
    };
    
    this.agentPerformance.set(agentId, initialPerformance);
    this.agentWeights.set(agentId, 1.0); // Default weight
    
    console.log(`📊 Initialized performance tracking for agent: ${agentId}`);
  }
  
  async updateAgentPerformance(agentId, taskMetrics) {
    const performance = this.agentPerformance.get(agentId);
    if (!performance) {
      await this.initializeAgentPerformance(agentId);
      return this.updateAgentPerformance(agentId, taskMetrics);
    }
    
    // Update basic counters
    performance.totalTasks++;
    if (taskMetrics.status === 'completed') {
      performance.completedTasks++;
    } else if (taskMetrics.status === 'failed') {
      performance.failedTasks++;
    }
    
    // Update quality metrics
    await this.updateQualityMetrics(performance, taskMetrics);
    
    // Update speed metrics
    await this.updateSpeedMetrics(performance, taskMetrics);
    
    // Update reliability metrics
    await this.updateReliabilityMetrics(performance, taskMetrics);
    
    // Add to task history
    performance.taskHistory.push({
      taskId: taskMetrics.taskId,
      projectId: taskMetrics.projectId,
      status: taskMetrics.status,
      executionTime: taskMetrics.executionTime,
      qualityScore: taskMetrics.qualityScore,
      timestamp: new Date().toISOString()
    });
    
    // Keep history manageable
    if (performance.taskHistory.length > this.config.performanceWindow) {
      performance.taskHistory.shift();
    }
    
    // Update trends
    await this.updatePerformanceTrends(performance);
    
    // Update predictions
    if (this.config.enablePredictiveWeighting) {
      await this.updatePerformancePredictions(performance);
    }
    
    performance.lastUpdated = new Date().toISOString();
    
    // Save performance data
    await this.saveAgentPerformance(agentId, performance);
    
    console.log(`📈 Updated performance for agent ${agentId}: ${performance.completedTasks}/${performance.totalTasks} tasks`);
  }
  
  async updateQualityMetrics(performance, taskMetrics) {
    const qualityMetrics = performance.qualityMetrics;
    
    // Add to quality history
    qualityMetrics.qualityHistory.push({
      score: taskMetrics.qualityScore,
      timestamp: new Date().toISOString(),
      taskId: taskMetrics.taskId
    });
    
    // Keep manageable history
    if (qualityMetrics.qualityHistory.length > 100) {
      qualityMetrics.qualityHistory.shift();
    }
    
    // Calculate average quality
    const scores = qualityMetrics.qualityHistory.map(h => h.score);
    qualityMetrics.averageQuality = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Update quality trend
    qualityMetrics.qualityTrend = this.calculateTrend(scores.slice(-20));
    
    // Update component averages if available
    if (taskMetrics.qualityBreakdown) {
      for (const [component, score] of Object.entries(taskMetrics.qualityBreakdown)) {
        if (!qualityMetrics.componentAverages[component]) {
          qualityMetrics.componentAverages[component] = [];
        }
        qualityMetrics.componentAverages[component].push(score);
        
        // Keep last 50 scores per component
        if (qualityMetrics.componentAverages[component].length > 50) {
          qualityMetrics.componentAverages[component].shift();
        }
      }
    }
  }
  
  async updateSpeedMetrics(performance, taskMetrics) {
    const speedMetrics = performance.speedMetrics;
    
    // Add to execution history
    speedMetrics.executionHistory.push({
      time: taskMetrics.executionTime,
      timestamp: new Date().toISOString(),
      taskId: taskMetrics.taskId
    });
    
    // Keep manageable history
    if (speedMetrics.executionHistory.length > 100) {
      speedMetrics.executionHistory.shift();
    }
    
    // Calculate average execution time
    const times = speedMetrics.executionHistory.map(h => h.time);
    speedMetrics.averageExecutionTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    
    // Update speed trend
    speedMetrics.speedTrend = this.calculateTrend(times.slice(-20).map(t => 1 / (t / 60000))); // Convert to tasks per minute
    
    // Calculate speed ranking (relative to global average)
    const globalAverage = this.globalMetrics.averageSpeed || speedMetrics.averageExecutionTime;
    speedMetrics.speedRanking = Math.max(0.1, Math.min(2.0, globalAverage / speedMetrics.averageExecutionTime));
  }
  
  async updateReliabilityMetrics(performance, taskMetrics) {
    const reliabilityMetrics = performance.reliabilityMetrics;
    
    // Calculate success and failure rates
    reliabilityMetrics.successRate = performance.totalTasks > 0 ? 
      performance.completedTasks / performance.totalTasks : 0;
    reliabilityMetrics.failureRate = performance.totalTasks > 0 ? 
      performance.failedTasks / performance.totalTasks : 0;
    
    // Calculate MTBF (Mean Time Between Failures)
    const failures = performance.taskHistory.filter(t => t.status === 'failed');
    if (failures.length > 1) {
      const failureTimes = failures.map(f => new Date(f.timestamp).getTime());
      const intervals = [];
      for (let i = 1; i < failureTimes.length; i++) {
        intervals.push(failureTimes[i] - failureTimes[i - 1]);
      }
      reliabilityMetrics.mtbf = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }
    
    // Update reliability trend
    const recentSuccess = performance.taskHistory.slice(-20);
    const recentSuccessRate = recentSuccess.length > 0 ? 
      recentSuccess.filter(t => t.status === 'completed').length / recentSuccess.length : 0;
    
    const historicalSuccessRate = reliabilityMetrics.successRate;
    if (recentSuccessRate > historicalSuccessRate + 0.1) {
      reliabilityMetrics.reliabilityTrend = 'improving';
    } else if (recentSuccessRate < historicalSuccessRate - 0.1) {
      reliabilityMetrics.reliabilityTrend = 'declining';
    } else {
      reliabilityMetrics.reliabilityTrend = 'stable';
    }
  }
  
  async updatePerformanceTrends(performance) {
    // Comprehensive performance trend analysis
    const recentTasks = performance.taskHistory.slice(-30);
    if (recentTasks.length < 10) {
      performance.performanceTrend = 'insufficient_data';
      return;
    }
    
    // Analyze multiple dimensions
    const qualityTrend = this.calculateTrend(recentTasks.map(t => t.qualityScore));
    const speedTrend = this.calculateTrend(recentTasks.map(t => 1 / (t.executionTime / 60000)));
    const reliabilityTrend = this.calculateTrend(recentTasks.map((_, i) => {
      const subset = recentTasks.slice(0, i + 1);
      return subset.filter(t => t.status === 'completed').length / subset.length;
    }));
    
    // Weighted overall trend
    const trendWeights = { quality: 0.4, speed: 0.3, reliability: 0.3 };
    const overallTrend = 
      (qualityTrend * trendWeights.quality) +
      (speedTrend * trendWeights.speed) +
      (reliabilityTrend * trendWeights.reliability);
    
    if (overallTrend > 0.05) {
      performance.performanceTrend = 'improving';
    } else if (overallTrend < -0.05) {
      performance.performanceTrend = 'declining';
    } else {
      performance.performanceTrend = 'stable';
    }
  }
  
  async updatePerformancePredictions(performance) {
    // Use different predictors based on data availability
    const history = performance.taskHistory;
    if (history.length < 10) return;
    
    const predictor = this.config.enableAdaptiveWeighting ? 
      this.performancePredictors.adaptive :
      this.performancePredictors.linear;
    
    const predictions = await predictor(performance);
    performance.predictedPerformance = predictions;
  }
  
  // ==================== WEIGHT CALCULATION ====================
  
  startWeightUpdates() {
    const weightTimer = setInterval(async () => {
      try {
        await this.updateAllAgentWeights();
      } catch (error) {
        console.error('❌ Weight update error:', error);
      }
    }, this.config.weightUpdateInterval);
    
    this.timers.set('weight_updates', weightTimer);
    console.log('⚖️ Agent weight updates started');
  }
  
  async updateAllAgentWeights() {
    console.log('⚖️ Updating all agent weights...');
    
    let updatedWeights = 0;
    
    for (const [agentId, performance] of this.agentPerformance) {
      const newWeight = await this.calculateAgentWeight(agentId, performance);
      const currentWeight = this.agentWeights.get(agentId) || 1.0;
      
      if (Math.abs(newWeight - currentWeight) > 0.05) {
        this.agentWeights.set(agentId, newWeight);
        
        // Record weight change
        await this.recordWeightChange(agentId, currentWeight, newWeight);
        
        // Publish weight update event
        await this.publishEvent('agent.weight.updated', {
          agentId: agentId,
          oldWeight: currentWeight,
          newWeight: newWeight,
          performance: this.getAgentPerformanceSummary(agentId)
        });
        
        updatedWeights++;
      }
    }
    
    console.log(`⚖️ Updated weights for ${updatedWeights} agents`);
    
    // Update global metrics
    await this.updateGlobalMetrics();
  }
  
  async calculateAgentWeight(agentId, performance) {
    // Multi-factor weight calculation
    const qualityWeight = this.weightCalculators.quality(performance);
    const speedWeight = this.weightCalculators.speed(performance);
    const reliabilityWeight = this.weightCalculators.reliability(performance);
    const utilizationWeight = this.weightCalculators.utilization(agentId);
    
    // Weighted combination
    const combinedWeight = 
      (qualityWeight * this.config.qualityWeight) +
      (speedWeight * this.config.speedWeight) +
      (reliabilityWeight * this.config.reliabilityWeight) +
      (utilizationWeight * this.config.utilizationWeight);
    
    // Apply trend adjustments
    const trendAdjustment = this.calculateTrendAdjustment(performance);
    const adjustedWeight = combinedWeight * trendAdjustment;
    
    // Apply historical decay
    const currentWeight = this.agentWeights.get(agentId) || 1.0;
    const decayedWeight = (adjustedWeight * (1 - this.config.weightDecayFactor)) + 
                         (currentWeight * this.config.weightDecayFactor);
    
    // Ensure within bounds
    const finalWeight = Math.max(this.config.minWeight, 
                        Math.min(this.config.maxWeight, decayedWeight));
    
    return Math.round(finalWeight * 1000) / 1000; // Round to 3 decimal places
  }
  
  calculateQualityWeight(performance) {
    const averageQuality = performance.qualityMetrics.averageQuality;
    const qualityTrend = performance.qualityMetrics.qualityTrend;
    
    let weight = averageQuality / 0.8; // Normalize to 0.8 baseline
    
    // Trend adjustments
    if (qualityTrend === 'improving') weight *= 1.1;
    else if (qualityTrend === 'declining') weight *= 0.9;
    
    return Math.max(0.1, Math.min(2.0, weight));
  }
  
  calculateSpeedWeight(performance) {
    const speedRanking = performance.speedMetrics.speedRanking;
    const speedTrend = performance.speedMetrics.speedTrend;
    
    let weight = speedRanking; // Already normalized
    
    // Trend adjustments
    if (speedTrend === 'improving') weight *= 1.1;
    else if (speedTrend === 'declining') weight *= 0.9;
    
    return Math.max(0.1, Math.min(2.0, weight));
  }
  
  calculateReliabilityWeight(performance) {
    const successRate = performance.reliabilityMetrics.successRate;
    const reliabilityTrend = performance.reliabilityMetrics.reliabilityTrend;
    
    let weight = successRate / 0.8; // Normalize to 0.8 baseline
    
    // Heavy penalty for low reliability
    if (successRate < 0.5) weight *= 0.5;
    else if (successRate < 0.7) weight *= 0.8;
    
    // Trend adjustments
    if (reliabilityTrend === 'improving') weight *= 1.2;
    else if (reliabilityTrend === 'declining') weight *= 0.7;
    
    return Math.max(0.1, Math.min(2.0, weight));
  }
  
  calculateUtilizationWeight(agentId) {
    const utilization = this.agentUtilization.get(agentId);
    if (!utilization) return 1.0;
    
    const currentLoad = utilization.currentLoad || 0;
    const averageLoad = utilization.averageLoad || 0;
    
    // Optimal utilization is around 70%
    const optimalLoad = 0.7;
    const loadDifference = Math.abs(currentLoad - optimalLoad);
    
    let weight = 1.0 - (loadDifference * 0.5);
    
    // Bonus for consistent utilization
    if (Math.abs(currentLoad - averageLoad) < 0.1) {
      weight *= 1.1;
    }
    
    return Math.max(0.5, Math.min(1.5, weight));
  }
  
  calculateTrendAdjustment(performance) {
    const trend = performance.performanceTrend;
    
    switch (trend) {
      case 'improving': return 1.15;
      case 'declining': return 0.85;
      case 'stable': return 1.0;
      default: return 1.0;
    }
  }
  
  // ==================== UTILIZATION TRACKING ====================
  
  async updateAgentUtilization(agentId, eventType, taskId) {
    if (!this.agentUtilization.has(agentId)) {
      this.agentUtilization.set(agentId, {
        agentId: agentId,
        currentLoad: 0,
        averageLoad: 0,
        peakLoad: 0,
        activeTasks: new Set(),
        utilizationHistory: [],
        lastUpdated: new Date().toISOString()
      });
    }
    
    const utilization = this.agentUtilization.get(agentId);
    
    // Update active tasks
    if (eventType === 'task_started') {
      utilization.activeTasks.add(taskId);
    } else if (eventType === 'task_completed' || eventType === 'task_failed') {
      utilization.activeTasks.delete(taskId);
    }
    
    // Calculate current load (assuming max 10 concurrent tasks)
    utilization.currentLoad = Math.min(1.0, utilization.activeTasks.size / 10);
    
    // Update peak load
    utilization.peakLoad = Math.max(utilization.peakLoad, utilization.currentLoad);
    
    // Add to history
    utilization.utilizationHistory.push({
      load: utilization.currentLoad,
      activeTasks: utilization.activeTasks.size,
      timestamp: new Date().toISOString()
    });
    
    // Keep manageable history
    if (utilization.utilizationHistory.length > 100) {
      utilization.utilizationHistory.shift();
    }
    
    // Calculate average load
    const loads = utilization.utilizationHistory.map(h => h.load);
    utilization.averageLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
    
    utilization.lastUpdated = new Date().toISOString();
  }
  
  // ==================== PERFORMANCE PREDICTORS ====================
  
  async linearPerformancePredictor(performance) {
    const qualityHistory = performance.qualityMetrics.qualityHistory.slice(-20);
    const speedHistory = performance.speedMetrics.executionHistory.slice(-20);
    
    if (qualityHistory.length < 5) {
      return {
        nextTaskQuality: performance.qualityMetrics.averageQuality,
        nextTaskSpeed: 1.0,
        confidence: 0.3
      };
    }
    
    // Simple linear regression for quality prediction
    const qualityScores = qualityHistory.map(h => h.score);
    const qualityTrend = this.calculateTrend(qualityScores);
    const nextQuality = Math.max(0.0, Math.min(1.0, 
      qualityScores[qualityScores.length - 1] + qualityTrend));
    
    // Speed prediction
    const speedTimes = speedHistory.map(h => h.time);
    const speedTrend = this.calculateTrend(speedTimes);
    const nextSpeed = Math.max(0.1, Math.min(3.0, 
      1.0 / ((speedTimes[speedTimes.length - 1] + speedTrend) / performance.speedMetrics.averageExecutionTime)));
    
    return {
      nextTaskQuality: nextQuality,
      nextTaskSpeed: nextSpeed,
      confidence: Math.min(0.8, qualityHistory.length / 20)
    };
  }
  
  async exponentialPerformancePredictor(performance) {
    // Exponential smoothing predictor
    const alpha = 0.3;
    const qualityHistory = performance.qualityMetrics.qualityHistory;
    const speedHistory = performance.speedMetrics.executionHistory;
    
    if (qualityHistory.length === 0) {
      return {
        nextTaskQuality: 0.8,
        nextTaskSpeed: 1.0,
        confidence: 0.1
      };
    }
    
    // Exponential smoothing for quality
    let qualitySmoothed = qualityHistory[0].score;
    for (let i = 1; i < qualityHistory.length; i++) {
      qualitySmoothed = alpha * qualityHistory[i].score + (1 - alpha) * qualitySmoothed;
    }
    
    // Exponential smoothing for speed
    let speedSmoothed = speedHistory.length > 0 ? speedHistory[0].time : 15000;
    for (let i = 1; i < speedHistory.length; i++) {
      speedSmoothed = alpha * speedHistory[i].time + (1 - alpha) * speedSmoothed;
    }
    
    const nextSpeed = performance.speedMetrics.averageExecutionTime > 0 ? 
      speedSmoothed / performance.speedMetrics.averageExecutionTime : 1.0;
    
    return {
      nextTaskQuality: qualitySmoothed,
      nextTaskSpeed: Math.max(0.1, Math.min(3.0, nextSpeed)),
      confidence: Math.min(0.9, qualityHistory.length / 30)
    };
  }
  
  async adaptivePerformancePredictor(performance) {
    // Adaptive predictor that adjusts based on recent performance trends
    const recentWindow = 10;
    const qualityHistory = performance.qualityMetrics.qualityHistory.slice(-recentWindow);
    const speedHistory = performance.speedMetrics.executionHistory.slice(-recentWindow);
    
    if (qualityHistory.length < 3) {
      return this.linearPerformancePredictor(performance);
    }
    
    // Analyze recent volatility
    const qualityScores = qualityHistory.map(h => h.score);
    const qualityVariance = this.calculateVariance(qualityScores);
    
    // Choose prediction method based on volatility
    if (qualityVariance < 0.01) {
      // Low volatility - use exponential smoothing
      return this.exponentialPerformancePredictor(performance);
    } else {
      // High volatility - use linear trend
      return this.linearPerformancePredictor(performance);
    }
  }
  
  // ==================== UTILITY METHODS ====================
  
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
    
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return 0;
    
    return (n * sumXY - sumX * sumY) / denominator;
  }
  
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
  
  async scheduleWeightUpdate(agentId, immediate = false) {
    if (immediate) {
      // Immediate update for critical events (failures, etc.)
      const performance = this.agentPerformance.get(agentId);
      if (performance) {
        const newWeight = await this.calculateAgentWeight(agentId, performance);
        const currentWeight = this.agentWeights.get(agentId) || 1.0;
        
        this.agentWeights.set(agentId, newWeight);
        
        await this.recordWeightChange(agentId, currentWeight, newWeight);
        
        await this.publishEvent('agent.weight.updated', {
          agentId: agentId,
          oldWeight: currentWeight,
          newWeight: newWeight,
          immediate: true,
          reason: 'critical_event'
        });
      }
    }
    // Regular updates happen via the scheduled timer
  }
  
  async recordWeightChange(agentId, oldWeight, newWeight) {
    if (!this.weightHistory.has(agentId)) {
      this.weightHistory.set(agentId, []);
    }
    
    const history = this.weightHistory.get(agentId);
    history.push({
      timestamp: new Date().toISOString(),
      oldWeight: oldWeight,
      newWeight: newWeight,
      change: newWeight - oldWeight,
      reason: 'performance_update'
    });
    
    // Keep manageable history
    if (history.length > 100) {
      history.shift();
    }
    
    // Save weight history
    await this.saveServiceData(`weight-history/${agentId}`, history);
  }
  
  async updateGlobalMetrics() {
    const allPerformance = Array.from(this.agentPerformance.values());
    
    this.globalMetrics.totalTasks = allPerformance.reduce((sum, p) => sum + p.totalTasks, 0);
    
    if (allPerformance.length > 0) {
      this.globalMetrics.averageQuality = allPerformance.reduce((sum, p) => 
        sum + p.qualityMetrics.averageQuality, 0) / allPerformance.length;
      
      this.globalMetrics.averageSpeed = allPerformance.reduce((sum, p) => 
        sum + p.speedMetrics.averageExecutionTime, 0) / allPerformance.length;
      
      this.globalMetrics.averageReliability = allPerformance.reduce((sum, p) => 
        sum + p.reliabilityMetrics.successRate, 0) / allPerformance.length;
    }
    
    // Update top performers and underperformers
    const sortedByWeight = Array.from(this.agentWeights.entries())
      .sort(([,a], [,b]) => b - a);
    
    this.globalMetrics.topPerformers = sortedByWeight.slice(0, 5).map(([agentId, weight]) => ({
      agentId, weight, performance: this.getAgentPerformanceSummary(agentId)
    }));
    
    this.globalMetrics.underperformers = sortedByWeight.slice(-5).map(([agentId, weight]) => ({
      agentId, weight, performance: this.getAgentPerformanceSummary(agentId)
    }));
    
    // Calculate weight distribution
    const weights = Array.from(this.agentWeights.values());
    this.globalMetrics.weightDistribution = {
      min: Math.min(...weights),
      max: Math.max(...weights),
      average: weights.reduce((sum, w) => sum + w, 0) / weights.length,
      median: this.calculateMedian(weights)
    };
    
    this.globalMetrics.lastCalculated = new Date().toISOString();
    
    // Save global metrics
    await this.saveServiceData('global-metrics', this.globalMetrics);
  }
  
  calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }
  
  // ==================== EVENT HANDLERS ====================
  
  async handleAgentRegistered(event) {
    const { agentId } = event.data;
    await this.initializeAgentPerformance(agentId);
    console.log(`📊 Performance tracking started for new agent: ${agentId}`);
  }
  
  async handleAgentUnregistered(event) {
    const { agentId } = event.data;
    
    // Save final performance data
    const performance = this.agentPerformance.get(agentId);
    if (performance) {
      await this.saveAgentPerformance(agentId, performance);
    }
    
    // Clean up tracking data
    this.agentPerformance.delete(agentId);
    this.agentWeights.delete(agentId);
    this.agentUtilization.delete(agentId);
    
    console.log(`📊 Performance tracking stopped for agent: ${agentId}`);
  }
  
  async handleSystemLoadChanged(event) {
    const { systemLoad } = event.data;
    
    // Adjust weight calculations based on system load
    if (systemLoad > 0.8) {
      // High system load - prefer more reliable agents
      this.config.reliabilityWeight = 0.4;
      this.config.qualityWeight = 0.3;
      this.config.speedWeight = 0.2;
      this.config.utilizationWeight = 0.1;
    } else if (systemLoad < 0.3) {
      // Low system load - can prioritize quality
      this.config.qualityWeight = 0.5;
      this.config.speedWeight = 0.3;
      this.config.reliabilityWeight = 0.15;
      this.config.utilizationWeight = 0.05;
    } else {
      // Normal load - balanced approach
      this.config.qualityWeight = 0.4;
      this.config.speedWeight = 0.3;
      this.config.reliabilityWeight = 0.2;
      this.config.utilizationWeight = 0.1;
    }
  }
  
  // ==================== API METHODS ====================
  
  getAgentWeight(agentId) {
    return this.agentWeights.get(agentId) || 1.0;
  }
  
  getAgentPerformanceSummary(agentId) {
    const performance = this.agentPerformance.get(agentId);
    if (!performance) return null;
    
    return {
      agentId: agentId,
      totalTasks: performance.totalTasks,
      successRate: performance.reliabilityMetrics.successRate,
      averageQuality: performance.qualityMetrics.averageQuality,
      averageSpeed: performance.speedMetrics.averageExecutionTime,
      performanceTrend: performance.performanceTrend,
      currentWeight: this.getAgentWeight(agentId)
    };
  }
  
  getTopPerformers(limit = 10) {
    return Array.from(this.agentWeights.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([agentId, weight]) => ({
        agentId,
        weight,
        performance: this.getAgentPerformanceSummary(agentId)
      }));
  }
  
  getAllAgentWeights() {
    return Object.fromEntries(this.agentWeights);
  }
  
  getGlobalMetrics() {
    return {
      ...this.globalMetrics,
      totalAgents: this.agentPerformance.size,
      activeAgents: Array.from(this.agentUtilization.values())
        .filter(u => u.currentLoad > 0).length
    };
  }
  
  // ==================== PERFORMANCE ANALYSIS ====================
  
  startPerformanceAnalysis() {
    const analysisTimer = setInterval(async () => {
      try {
        await this.performPerformanceAnalysis();
      } catch (error) {
        console.error('❌ Performance analysis error:', error);
      }
    }, 300000); // 5 minutes
    
    this.timers.set('performance_analysis', analysisTimer);
    console.log('📊 Performance analysis started');
  }
  
  async performPerformanceAnalysis() {
    console.log('📊 Performing performance analysis...');
    
    // Identify performance anomalies
    const anomalies = await this.detectPerformanceAnomalies();
    
    // Generate performance insights
    const insights = await this.generatePerformanceInsights();
    
    // Publish analysis results
    if (anomalies.length > 0 || insights.length > 0) {
      await this.publishEvent('performance.analysis.complete', {
        anomalies: anomalies,
        insights: insights,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  async detectPerformanceAnomalies() {
    const anomalies = [];
    
    for (const [agentId, performance] of this.agentPerformance) {
      // Check for sudden performance drops
      if (performance.performanceTrend === 'declining') {
        const recentQuality = performance.qualityMetrics.qualityHistory.slice(-5);
        if (recentQuality.length >= 5) {
          const avgRecent = recentQuality.reduce((sum, q) => sum + q.score, 0) / recentQuality.length;
          if (avgRecent < performance.qualityMetrics.averageQuality - 0.2) {
            anomalies.push({
              type: 'quality_drop',
              agentId: agentId,
              severity: 'high',
              description: `Agent ${agentId} showing significant quality decline`
            });
          }
        }
      }
      
      // Check for reliability issues
      if (performance.reliabilityMetrics.successRate < 0.7 && performance.totalTasks > 10) {
        anomalies.push({
          type: 'low_reliability',
          agentId: agentId,
          severity: 'medium',
          description: `Agent ${agentId} has low success rate: ${(performance.reliabilityMetrics.successRate * 100).toFixed(1)}%`
        });
      }
    }
    
    return anomalies;
  }
  
  async generatePerformanceInsights() {
    const insights = [];
    
    // System-wide insights
    const weights = Array.from(this.agentWeights.values());
    const weightVariance = this.calculateVariance(weights);
    
    if (weightVariance > 0.5) {
      insights.push({
        type: 'high_variance',
        description: 'High variance in agent weights indicates uneven performance distribution',
        recommendation: 'Consider load balancing or agent training'
      });
    }
    
    // Top performer insights
    const topPerformers = this.getTopPerformers(3);
    if (topPerformers.length > 0) {
      const topWeight = topPerformers[0].weight;
      if (topWeight > 2.0) {
        insights.push({
          type: 'dominant_performer',
          description: `Agent ${topPerformers[0].agentId} significantly outperforming others`,
          recommendation: 'Consider scaling successful agent patterns'
        });
      }
    }
    
    return insights;
  }
  
  // ==================== STORAGE OPERATIONS ====================
  
  async saveAgentPerformance(agentId, performance) {
    await this.saveServiceData(`performance/${agentId}`, performance);
  }
  
  async loadExistingPerformanceData() {
    console.log('📚 Loading existing performance data...');
    // Implementation would load from storage
    console.log('✅ Performance data loaded');
  }
  
  async saveAllPerformanceData() {
    console.log('💾 Saving all performance data...');
    
    // Save all agent performance data
    for (const [agentId, performance] of this.agentPerformance) {
      await this.saveAgentPerformance(agentId, performance);
    }
    
    // Save agent weights
    await this.saveServiceData('agent-weights', Object.fromEntries(this.agentWeights));
    
    // Save utilization data
    const utilizationData = Object.fromEntries(this.agentUtilization);
    await this.saveServiceData('agent-utilization', utilizationData);
    
    console.log('✅ All performance data saved');
  }
  
  // ==================== HEALTH STATUS ====================
  
  async getHealthStatus() {
    const baseHealth = await super.getHealthStatus();
    
    return {
      ...baseHealth,
      performanceTracker: {
        agentsTracked: this.agentPerformance.size,
        totalTasks: this.globalMetrics.totalTasks,
        averageWeight: this.globalMetrics.weightDistribution.average || 1.0,
        topPerformerWeight: this.globalMetrics.topPerformers[0]?.weight || 1.0,
        systemPerformance: {
          quality: this.globalMetrics.averageQuality,
          reliability: this.globalMetrics.averageReliability,
          speed: this.globalMetrics.averageSpeed
        }
      }
    };
  }
}

module.exports = AgentPerformanceTracker;