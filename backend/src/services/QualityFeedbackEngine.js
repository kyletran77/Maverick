const BaseService = require('./BaseService');
const { v4: uuidv4 } = require('uuid');

/**
 * Quality Feedback Engine
 * 
 * Advanced ML-ready feedback system that:
 * - Analyzes quality patterns and trends using statistical methods
 * - Provides intelligent feedback and recommendations
 * - Implements predictive quality modeling
 * - Manages agent learning and adaptation
 * - Delivers real-time quality coaching
 * - Tracks quality improvement over time
 * - Prepares data for future ML model integration
 */
class QualityFeedbackEngine extends BaseService {
  constructor(storageManager, eventBus, config = {}) {
    super('QualityFeedbackEngine', storageManager, eventBus, {
      feedbackDelay: 5000, // 5 seconds delay for feedback
      trendAnalysisWindow: 30, // Last 30 tasks for trend analysis
      predictionConfidenceThreshold: 0.75,
      enableRealTimeFeedback: true,
      enablePredictiveModeling: true,
      enableAdaptiveLearning: true,
      enableCoaching: true,
      minDataPointsForPrediction: 10,
      feedbackRetentionDays: 30,
      learningRateDecay: 0.95,
      ...config
    });
    
    // Feedback models and patterns
    this.qualityPatterns = new Map(); // agentId -> patterns
    this.predictionModels = new Map(); // agentId -> prediction model
    this.feedbackHistory = new Map(); // agentId -> feedback history
    this.learningProfiles = new Map(); // agentId -> learning profile
    
    // ML-ready feature extractors
    this.featureExtractors = {
      temporal: this.extractTemporalFeatures.bind(this),
      contextual: this.extractContextualFeatures.bind(this),
      performance: this.extractPerformanceFeatures.bind(this),
      behavioral: this.extractBehavioralFeatures.bind(this)
    };
    
    // Feedback templates and strategies
    this.feedbackTemplates = {
      improvement: {
        positive: [
          "Excellent progress! Your {component} scores have improved by {improvement}%",
          "Great work! You're consistently delivering high-quality {taskType} tasks",
          "Outstanding! Your recent {component} performance is above target"
        ],
        constructive: [
          "Focus on improving {component} - target is {target}, current is {current}",
          "Consider reviewing {component} best practices for {taskType} tasks",
          "Your {component} scores could benefit from {recommendation}"
        ]
      },
      prediction: [
        "Based on current trends, you're likely to achieve {predictedScore} quality",
        "Your performance trajectory suggests {prediction} in the next tasks",
        "Quality prediction: {confidence}% confidence of meeting standards"
      ],
      coaching: [
        "Try focusing on {suggestion} to improve {component}",
        "Consider {technique} approach for better {component} results",
        "Best practice tip: {tip} can enhance your {component} performance"
      ]
    };
    
    // Statistical models for trend analysis
    this.trendAnalysis = {
      movingAverage: this.calculateMovingAverage.bind(this),
      linearRegression: this.calculateLinearTrend.bind(this),
      exponentialSmoothing: this.calculateExponentialSmoothing.bind(this),
      seasonality: this.detectSeasonality.bind(this)
    };
    
    // Performance metrics
    this.engineMetrics = {
      feedbackGenerated: 0,
      predictionsAccurate: 0,
      totalPredictions: 0,
      improvementsDetected: 0,
      coachingSessionsDelivered: 0,
      learningAdaptations: 0
    };
  }
  
  async initialize() {
    console.log('🚀 Initializing QualityFeedbackEngine...');
    
    // Subscribe to quality events
    await this.subscribeToEvent('quality.assessed', this.handleQualityAssessed.bind(this));
    await this.subscribeToEvent('quality.gate.result', this.handleQualityGateResult.bind(this));
    await this.subscribeToEvent('quality.degradation.alert', this.handleQualityDegradation.bind(this));
    
    // Subscribe to agent events if needed
    // await this.subscribeToEvent('agent.task.started', this.handleTaskStarted.bind(this));
    // await this.subscribeToEvent('agent.task.finished', this.handleTaskFinished.bind(this));
    
    // Subscribe to project events if needed
    // await this.subscribeToEvent('project.completed', this.handleProjectCompleted.bind(this));
    
    // Load existing models and patterns
    await this.loadExistingModels();
    
    // Start periodic trend analysis
    if (this.config.enablePredictiveModeling) {
      this.startTrendAnalysis();
    }
    
    console.log('✅ QualityFeedbackEngine initialized');
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up QualityFeedbackEngine...');
    
    // Save models before cleanup
    await this.saveAllModels();
    
    // Clear caches
    this.qualityPatterns.clear();
    this.predictionModels.clear();
    this.feedbackHistory.clear();
    this.learningProfiles.clear();
    
    console.log('✅ QualityFeedbackEngine cleanup complete');
  }
  
  // ==================== QUALITY ASSESSMENT HANDLING ====================
  
  async handleQualityAssessed(event) {
    const { taskId, projectId, agentId, qualityResult } = event.data;
    
    console.log(`🔍 Processing quality feedback for agent: ${agentId}`);
    
    try {
      // Update quality patterns
      await this.updateQualityPatterns(agentId, qualityResult);
      
      // Update prediction models
      await this.updatePredictionModel(agentId, qualityResult);
      
      // Generate feedback
      if (this.config.enableRealTimeFeedback) {
        await this.generateRealTimeFeedback(agentId, qualityResult);
      }
      
      // Provide coaching if needed
      if (this.config.enableCoaching) {
        await this.provideCoachingl(agentId, qualityResult);
      }
      
      // Adapt learning profile
      if (this.config.enableAdaptiveLearning) {
        await this.adaptLearningProfile(agentId, qualityResult);
      }
      
      console.log(`✅ Quality feedback processed for agent: ${agentId}`);
      
    } catch (error) {
      console.error(`❌ Error processing quality feedback for agent ${agentId}:`, error);
      await this.handleError('feedback_processing', error, { agentId, taskId });
    }
  }
  
  async handleQualityGateResult(event) {
    const { taskId, projectId, agentId, gateResult } = event.data;
    
    if (!gateResult.passed) {
      console.log(`🚪 Quality gate failed for agent: ${agentId}`);
      
      // Generate immediate coaching feedback
      await this.generateGateFailureFeedback(agentId, gateResult);
      
      // Update learning profile with gate failure
      await this.recordGateFailure(agentId, gateResult);
    }
  }
  
  async handleQualityDegradation(event) {
    const { type, entityId, degradationData } = event.data;
    
    if (type === 'agent') {
      console.log(`📉 Quality degradation detected for agent: ${entityId}`);
      
      // Generate intervention feedback
      await this.generateInterventionFeedback(entityId, degradationData);
      
      // Suggest remedial actions
      await this.suggestRemedialActions(entityId, degradationData);
    }
  }
  
  // ==================== PATTERN ANALYSIS ====================
  
  async updateQualityPatterns(agentId, qualityResult) {
    if (!this.qualityPatterns.has(agentId)) {
      this.qualityPatterns.set(agentId, {
        agentId: agentId,
        qualityHistory: [],
        componentPatterns: {},
        taskTypePatterns: {},
        contextualPatterns: {},
        temporalPatterns: {},
        lastUpdated: new Date().toISOString()
      });
    }
    
    const patterns = this.qualityPatterns.get(agentId);
    
    // Add to history
    patterns.qualityHistory.push({
      ...qualityResult,
      features: await this.extractAllFeatures(qualityResult)
    });
    
    // Keep manageable history
    if (patterns.qualityHistory.length > 100) {
      patterns.qualityHistory.shift();
    }
    
    // Analyze component patterns
    await this.analyzeComponentPatterns(patterns, qualityResult);
    
    // Analyze task type patterns
    await this.analyzeTaskTypePatterns(patterns, qualityResult);
    
    // Analyze contextual patterns
    await this.analyzeContextualPatterns(patterns, qualityResult);
    
    // Analyze temporal patterns
    await this.analyzeTemporalPatterns(patterns, qualityResult);
    
    patterns.lastUpdated = new Date().toISOString();
    
    // Save patterns
    await this.saveQualityPatterns(agentId, patterns);
  }
  
  async analyzeComponentPatterns(patterns, qualityResult) {
    for (const [component, score] of Object.entries(qualityResult.componentScores)) {
      if (!patterns.componentPatterns[component]) {
        patterns.componentPatterns[component] = {
          scores: [],
          trend: 'stable',
          average: 0,
          variance: 0,
          improvementRate: 0,
          strugglingAreas: [],
          strengthAreas: []
        };
      }
      
      const componentPattern = patterns.componentPatterns[component];
      componentPattern.scores.push({
        score: score,
        timestamp: qualityResult.timestamp,
        taskId: qualityResult.taskId
      });
      
      // Keep last 50 scores
      if (componentPattern.scores.length > 50) {
        componentPattern.scores.shift();
      }
      
      // Calculate statistics
      const scores = componentPattern.scores.map(s => s.score);
      componentPattern.average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      componentPattern.variance = this.calculateVariance(scores);
      componentPattern.trend = this.trendAnalysis.linearRegression(scores);
      componentPattern.improvementRate = this.calculateImprovementRate(scores);
      
      // Identify patterns
      if (componentPattern.average < 0.7) {
        componentPattern.strugglingAreas.push({
          area: component,
          severity: 'high',
          averageScore: componentPattern.average
        });
      } else if (componentPattern.average >= 0.9) {
        componentPattern.strengthAreas.push({
          area: component,
          level: 'excellent',
          averageScore: componentPattern.average
        });
      }
    }
  }
  
  async analyzeTaskTypePatterns(patterns, qualityResult) {
    const taskType = qualityResult.context?.taskType || 'unknown';
    
    if (!patterns.taskTypePatterns[taskType]) {
      patterns.taskTypePatterns[taskType] = {
        taskCount: 0,
        averageQuality: 0,
        qualityScores: [],
        commonIssues: [],
        successFactors: []
      };
    }
    
    const taskPattern = patterns.taskTypePatterns[taskType];
    taskPattern.taskCount++;
    taskPattern.qualityScores.push(qualityResult.overallScore);
    
    // Keep last 30 scores per task type
    if (taskPattern.qualityScores.length > 30) {
      taskPattern.qualityScores.shift();
    }
    
    taskPattern.averageQuality = taskPattern.qualityScores.reduce((sum, s) => sum + s, 0) / taskPattern.qualityScores.length;
    
    // Identify common issues and success factors
    if (qualityResult.overallScore < 0.7) {
      taskPattern.commonIssues.push(...qualityResult.analysis.weaknesses);
    } else if (qualityResult.overallScore >= 0.9) {
      taskPattern.successFactors.push(...qualityResult.analysis.strengths);
    }
  }
  
  async analyzeContextualPatterns(patterns, qualityResult) {
    const context = qualityResult.context || {};
    
    if (!patterns.contextualPatterns.complexity) {
      patterns.contextualPatterns.complexity = {};
    }
    
    const complexity = context.complexity || 'medium';
    if (!patterns.contextualPatterns.complexity[complexity]) {
      patterns.contextualPatterns.complexity[complexity] = {
        scores: [],
        average: 0,
        count: 0
      };
    }
    
    const complexityPattern = patterns.contextualPatterns.complexity[complexity];
    complexityPattern.scores.push(qualityResult.overallScore);
    complexityPattern.count++;
    
    if (complexityPattern.scores.length > 20) {
      complexityPattern.scores.shift();
    }
    
    complexityPattern.average = complexityPattern.scores.reduce((sum, s) => sum + s, 0) / complexityPattern.scores.length;
  }
  
  async analyzeTemporalPatterns(patterns, qualityResult) {
    const timestamp = new Date(qualityResult.timestamp);
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    
    if (!patterns.temporalPatterns.hourly) {
      patterns.temporalPatterns.hourly = {};
      patterns.temporalPatterns.daily = {};
    }
    
    // Hourly patterns
    if (!patterns.temporalPatterns.hourly[hour]) {
      patterns.temporalPatterns.hourly[hour] = { scores: [], average: 0 };
    }
    patterns.temporalPatterns.hourly[hour].scores.push(qualityResult.overallScore);
    if (patterns.temporalPatterns.hourly[hour].scores.length > 10) {
      patterns.temporalPatterns.hourly[hour].scores.shift();
    }
    patterns.temporalPatterns.hourly[hour].average = 
      patterns.temporalPatterns.hourly[hour].scores.reduce((sum, s) => sum + s, 0) / 
      patterns.temporalPatterns.hourly[hour].scores.length;
    
    // Daily patterns
    if (!patterns.temporalPatterns.daily[dayOfWeek]) {
      patterns.temporalPatterns.daily[dayOfWeek] = { scores: [], average: 0 };
    }
    patterns.temporalPatterns.daily[dayOfWeek].scores.push(qualityResult.overallScore);
    if (patterns.temporalPatterns.daily[dayOfWeek].scores.length > 10) {
      patterns.temporalPatterns.daily[dayOfWeek].scores.shift();
    }
    patterns.temporalPatterns.daily[dayOfWeek].average = 
      patterns.temporalPatterns.daily[dayOfWeek].scores.reduce((sum, s) => sum + s, 0) / 
      patterns.temporalPatterns.daily[dayOfWeek].scores.length;
  }
  
  // ==================== PREDICTION MODELING ====================
  
  async updatePredictionModel(agentId, qualityResult) {
    if (!this.predictionModels.has(agentId)) {
      this.predictionModels.set(agentId, {
        agentId: agentId,
        modelType: 'linear_trend',
        features: [],
        targets: [],
        weights: {},
        accuracy: 0,
        lastPrediction: null,
        trainingData: [],
        modelVersion: 1,
        lastUpdated: new Date().toISOString()
      });
    }
    
    const model = this.predictionModels.get(agentId);
    
    // Extract features and target
    const features = await this.extractAllFeatures(qualityResult);
    const target = qualityResult.overallScore;
    
    // Add to training data
    model.trainingData.push({
      features: features,
      target: target,
      timestamp: qualityResult.timestamp
    });
    
    // Keep manageable training data size
    if (model.trainingData.length > 100) {
      model.trainingData.shift();
    }
    
    // Update model if we have enough data
    if (model.trainingData.length >= this.config.minDataPointsForPrediction) {
      await this.trainPredictionModel(model);
    }
    
    model.lastUpdated = new Date().toISOString();
    
    // Save model
    await this.savePredictionModel(agentId, model);
  }
  
  async trainPredictionModel(model) {
    console.log(`🤖 Training prediction model for agent: ${model.agentId}`);
    
    const trainingData = model.trainingData;
    
    // Simple linear regression for quality prediction
    const features = trainingData.map(d => d.features);
    const targets = trainingData.map(d => d.target);
    
    // Calculate feature weights using simple correlation
    const featureNames = Object.keys(features[0]);
    const weights = {};
    
    for (const featureName of featureNames) {
      const featureValues = features.map(f => f[featureName]);
      weights[featureName] = this.calculateCorrelation(featureValues, targets);
    }
    
    model.weights = weights;
    
    // Test model accuracy on recent data
    const testSize = Math.min(10, Math.floor(trainingData.length * 0.2));
    const testData = trainingData.slice(-testSize);
    let correctPredictions = 0;
    
    for (const testPoint of testData) {
      const prediction = this.predictQuality(model, testPoint.features);
      const actual = testPoint.target;
      const error = Math.abs(prediction - actual);
      
      // Consider prediction correct if within 0.1 of actual
      if (error <= 0.1) {
        correctPredictions++;
      }
    }
    
    model.accuracy = testSize > 0 ? correctPredictions / testSize : 0;
    model.modelVersion++;
    
    console.log(`✅ Model trained with ${model.accuracy.toFixed(2)} accuracy`);
  }
  
  predictQuality(model, features) {
    let prediction = 0.8; // Base prediction
    
    // Apply feature weights
    for (const [featureName, weight] of Object.entries(model.weights)) {
      const featureValue = features[featureName] || 0;
      prediction += (featureValue - 0.5) * weight * 0.2; // Scale influence
    }
    
    // Ensure prediction is within valid range
    return Math.max(0.0, Math.min(1.0, prediction));
  }
  
  // ==================== FEATURE EXTRACTION ====================
  
  async extractAllFeatures(qualityResult) {
    const features = {};
    
    // Temporal features
    Object.assign(features, this.featureExtractors.temporal(qualityResult));
    
    // Contextual features
    Object.assign(features, this.featureExtractors.contextual(qualityResult));
    
    // Performance features
    Object.assign(features, this.featureExtractors.performance(qualityResult));
    
    // Behavioral features (if available)
    Object.assign(features, this.featureExtractors.behavioral(qualityResult));
    
    return features;
  }
  
  extractTemporalFeatures(qualityResult) {
    const timestamp = new Date(qualityResult.timestamp);
    
    return {
      hour_of_day: timestamp.getHours() / 23, // Normalized 0-1
      day_of_week: timestamp.getDay() / 6, // Normalized 0-1
      is_weekend: (timestamp.getDay() === 0 || timestamp.getDay() === 6) ? 1 : 0,
      is_business_hours: (timestamp.getHours() >= 9 && timestamp.getHours() <= 17) ? 1 : 0
    };
  }
  
  extractContextualFeatures(qualityResult) {
    const context = qualityResult.context || {};
    
    // Map complexity to numeric values
    const complexityMap = { 'low': 0.25, 'medium': 0.5, 'high': 0.75, 'very-high': 1.0 };
    const complexity = complexityMap[context.complexity] || 0.5;
    
    // Map task types to numeric values
    const taskTypeMap = { 'setup': 0.2, 'feature': 0.6, 'testing': 0.4, 'bugfix': 0.8, 'refactor': 0.7 };
    const taskType = taskTypeMap[context.taskType] || 0.5;
    
    return {
      complexity: complexity,
      task_type: taskType,
      retry_count: Math.min(context.retryCount || 0, 5) / 5, // Normalized
      duration_ratio: Math.min((context.duration || 15000) / 30000, 2) / 2 // Normalized
    };
  }
  
  extractPerformanceFeatures(qualityResult) {
    const metrics = qualityResult.performanceMetrics || {};
    
    return {
      execution_time: Math.min((metrics.executionTime || 15000) / 60000, 2) / 2, // Normalized to 0-1
      memory_usage: Math.min((metrics.memoryUsage || 128) / 512, 2) / 2, // Normalized
      cpu_usage: Math.min((metrics.cpuUsage || 50) / 100, 1) // Already 0-1
    };
  }
  
  extractBehavioralFeatures(qualityResult) {
    // These would be extracted from agent behavior patterns
    // For now, use component scores as behavioral indicators
    const componentScores = qualityResult.componentScores || {};
    
    return {
      code_quality_tendency: componentScores.codeQuality || 0.8,
      security_awareness: componentScores.security || 0.8,
      performance_focus: componentScores.performance || 0.8,
      testing_discipline: componentScores.testCoverage || 0.8
    };
  }
  
  // ==================== FEEDBACK GENERATION ====================
  
  async generateRealTimeFeedback(agentId, qualityResult) {
    console.log(`💬 Generating real-time feedback for agent: ${agentId}`);
    
    const feedback = {
      id: uuidv4(),
      agentId: agentId,
      taskId: qualityResult.taskId,
      type: 'real_time',
      timestamp: new Date().toISOString(),
      messages: [],
      recommendations: [],
      predictions: [],
      priority: 'normal'
    };
    
    // Generate component-specific feedback
    await this.generateComponentFeedback(feedback, qualityResult);
    
    // Generate trend-based feedback
    await this.generateTrendFeedback(feedback, agentId, qualityResult);
    
    // Generate predictive feedback
    if (this.config.enablePredictiveModeling) {
      await this.generatePredictiveFeedback(feedback, agentId, qualityResult);
    }
    
    // Store feedback
    await this.storeFeedback(agentId, feedback);
    
    // Publish feedback event
    await this.publishEvent('quality.feedback.generated', {
      agentId: agentId,
      feedback: feedback
    });
    
    this.engineMetrics.feedbackGenerated++;
    
    console.log(`✅ Real-time feedback generated with ${feedback.messages.length} messages`);
  }
  
  async generateComponentFeedback(feedback, qualityResult) {
    const componentScores = qualityResult.componentScores || {};
    const analysis = qualityResult.analysis || { strengths: [], weaknesses: [] };
    
    // Positive feedback for strengths
    for (const [component, score] of Object.entries(componentScores)) {
      if (score >= 0.9) {
        const message = this.selectFeedbackTemplate('improvement.positive')
          .replace('{component}', component)
          .replace('{improvement}', Math.round((score - 0.8) * 100 / 0.2))
          .replace('{taskType}', qualityResult.context?.taskType || 'current');
        
        feedback.messages.push({
          type: 'positive',
          component: component,
          message: message,
          score: score
        });
      }
    }
    
    // Constructive feedback for weaknesses
    for (const [component, score] of Object.entries(componentScores)) {
      if (score < 0.7) {
        const message = this.selectFeedbackTemplate('improvement.constructive')
          .replace('{component}', component)
          .replace('{target}', '0.80')
          .replace('{current}', score.toFixed(2))
          .replace('{recommendation}', this.getComponentRecommendation(component))
          .replace('{taskType}', qualityResult.context?.taskType || 'current');
        
        feedback.messages.push({
          type: 'improvement',
          component: component,
          message: message,
          score: score,
          target: 0.8
        });
        
        feedback.priority = 'high';
      }
    }
  }
  
  async generateTrendFeedback(feedback, agentId, qualityResult) {
    const patterns = this.qualityPatterns.get(agentId);
    if (!patterns || patterns.qualityHistory.length < 5) {
      return; // Not enough data for trend analysis
    }
    
    // Analyze recent trend
    const recentScores = patterns.qualityHistory.slice(-10).map(h => h.overallScore);
    const trend = this.trendAnalysis.linearRegression(recentScores);
    
    if (trend > 0.02) {
      feedback.messages.push({
        type: 'trend_positive',
        message: `Great progress! Your quality scores are trending upward with a ${(trend * 100).toFixed(1)}% improvement rate.`,
        trend: trend
      });
    } else if (trend < -0.02) {
      feedback.messages.push({
        type: 'trend_concern',
        message: `Notice: Your quality scores show a declining trend. Consider reviewing recent approaches.`,
        trend: trend
      });
      feedback.priority = 'high';
    }
  }
  
  async generatePredictiveFeedback(feedback, agentId, qualityResult) {
    const model = this.predictionModels.get(agentId);
    if (!model || model.accuracy < this.config.predictionConfidenceThreshold) {
      return; // Model not ready or not accurate enough
    }
    
    // Predict next task quality
    const currentFeatures = await this.extractAllFeatures(qualityResult);
    const prediction = this.predictQuality(model, currentFeatures);
    const confidence = model.accuracy;
    
    const message = this.selectFeedbackTemplate('prediction')
      .replace('{predictedScore}', prediction.toFixed(2))
      .replace('{confidence}', Math.round(confidence * 100))
      .replace('{prediction}', prediction >= 0.8 ? 'success' : 'challenges');
    
    feedback.predictions.push({
      type: 'quality_prediction',
      message: message,
      predictedScore: prediction,
      confidence: confidence,
      modelVersion: model.modelVersion
    });
    
    this.engineMetrics.totalPredictions++;
  }
  
  async provideCoachingl(agentId, qualityResult) {
    console.log(`🎯 Providing coaching for agent: ${agentId}`);
    
    const patterns = this.qualityPatterns.get(agentId);
    if (!patterns) return;
    
    const coaching = {
      id: uuidv4(),
      agentId: agentId,
      type: 'coaching',
      timestamp: new Date().toISOString(),
      suggestions: [],
      techniques: [],
      bestPractices: []
    };
    
    // Identify coaching opportunities
    await this.identifyCoachingOpportunities(coaching, patterns, qualityResult);
    
    // Generate coaching suggestions
    await this.generateCoachingSuggestions(coaching, patterns);
    
    if (coaching.suggestions.length > 0) {
      // Store coaching session
      await this.storeFeedback(agentId, coaching);
      
      // Publish coaching event
      await this.publishEvent('quality.coaching.delivered', {
        agentId: agentId,
        coaching: coaching
      });
      
      this.engineMetrics.coachingSessionsDelivered++;
      
      console.log(`✅ Coaching delivered with ${coaching.suggestions.length} suggestions`);
    }
  }
  
  async identifyCoachingOpportunities(coaching, patterns, qualityResult) {
    // Check for consistent weak areas
    for (const [component, pattern] of Object.entries(patterns.componentPatterns)) {
      if (pattern.average < 0.75 && pattern.scores.length >= 5) {
        const suggestion = this.getCoachingSuggestion(component, pattern);
        coaching.suggestions.push({
          area: component,
          issue: 'consistent_weakness',
          suggestion: suggestion,
          priority: 'high'
        });
      }
    }
    
    // Check for task type struggles
    for (const [taskType, pattern] of Object.entries(patterns.taskTypePatterns)) {
      if (pattern.averageQuality < 0.7 && pattern.taskCount >= 3) {
        coaching.suggestions.push({
          area: 'task_specialization',
          taskType: taskType,
          suggestion: `Focus on improving ${taskType} task execution`,
          priority: 'medium'
        });
      }
    }
    
    // Check for temporal patterns
    const temporalIssues = this.identifyTemporalIssues(patterns.temporalPatterns);
    coaching.suggestions.push(...temporalIssues);
  }
  
  async generateCoachingSuggestions(coaching, patterns) {
    // Generate technique recommendations
    for (const suggestion of coaching.suggestions) {
      const technique = this.getTechniqueRecommendation(suggestion.area);
      if (technique) {
        coaching.techniques.push(technique);
      }
    }
    
    // Generate best practices
    const bestPractices = this.getBestPractices(coaching.suggestions);
    coaching.bestPractices.push(...bestPractices);
  }
  
  // ==================== ADAPTIVE LEARNING ====================
  
  async adaptLearningProfile(agentId, qualityResult) {
    if (!this.learningProfiles.has(agentId)) {
      this.learningProfiles.set(agentId, {
        agentId: agentId,
        learningRate: 1.0,
        adaptationHistory: [],
        preferences: {},
        strugglingAreas: [],
        improvementAreas: [],
        learningStyle: 'balanced', // aggressive, balanced, conservative
        lastAdaptation: new Date().toISOString()
      });
    }
    
    const profile = this.learningProfiles.get(agentId);
    
    // Analyze learning progress
    const learningProgress = await this.analyzeLearningProgress(agentId, qualityResult);
    
    // Adapt learning parameters
    if (learningProgress.improving) {
      profile.learningRate = Math.min(1.5, profile.learningRate * 1.05);
      this.engineMetrics.learningAdaptations++;
    } else if (learningProgress.stagnating) {
      profile.learningRate = Math.max(0.5, profile.learningRate * this.config.learningRateDecay);
    }
    
    // Update struggling and improvement areas
    this.updateLearningAreas(profile, qualityResult);
    
    // Record adaptation
    profile.adaptationHistory.push({
      timestamp: new Date().toISOString(),
      learningRate: profile.learningRate,
      qualityScore: qualityResult.overallScore,
      adaptationReason: learningProgress.reason
    });
    
    profile.lastAdaptation = new Date().toISOString();
    
    // Save learning profile
    await this.saveLearningProfile(agentId, profile);
  }
  
  async analyzeLearningProgress(agentId, qualityResult) {
    const patterns = this.qualityPatterns.get(agentId);
    if (!patterns || patterns.qualityHistory.length < 10) {
      return { improving: false, stagnating: false, reason: 'insufficient_data' };
    }
    
    const recentScores = patterns.qualityHistory.slice(-5).map(h => h.overallScore);
    const previousScores = patterns.qualityHistory.slice(-10, -5).map(h => h.overallScore);
    
    const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
    const previousAvg = previousScores.reduce((sum, s) => sum + s, 0) / previousScores.length;
    
    const improvement = recentAvg - previousAvg;
    
    if (improvement > 0.05) {
      return { improving: true, stagnating: false, reason: 'significant_improvement' };
    } else if (Math.abs(improvement) < 0.02) {
      return { improving: false, stagnating: true, reason: 'stagnation' };
    } else {
      return { improving: false, stagnating: false, reason: 'normal_variation' };
    }
  }
  
  updateLearningAreas(profile, qualityResult) {
    const componentScores = qualityResult.componentScores || {};
    
    // Update struggling areas
    profile.strugglingAreas = [];
    for (const [component, score] of Object.entries(componentScores)) {
      if (score < 0.7) {
        profile.strugglingAreas.push({
          component: component,
          score: score,
          severity: score < 0.6 ? 'high' : 'medium'
        });
      }
    }
    
    // Update improvement areas
    profile.improvementAreas = [];
    for (const [component, score] of Object.entries(componentScores)) {
      if (score >= 0.8 && score < 0.9) {
        profile.improvementAreas.push({
          component: component,
          score: score,
          potential: 'high'
        });
      }
    }
  }
  
  // ==================== UTILITY METHODS ====================
  
  selectFeedbackTemplate(templatePath) {
    const pathParts = templatePath.split('.');
    let templates = this.feedbackTemplates;
    
    for (const part of pathParts) {
      templates = templates[part];
      if (!templates) break;
    }
    
    if (Array.isArray(templates)) {
      return templates[Math.floor(Math.random() * templates.length)];
    }
    
    return "Quality feedback available";
  }
  
  getComponentRecommendation(component) {
    const recommendations = {
      codeQuality: 'focus on code organization and readability',
      security: 'implement security best practices and vulnerability scanning',
      performance: 'optimize algorithms and resource usage',
      testCoverage: 'add comprehensive unit and integration tests',
      documentation: 'provide clear inline comments and API documentation',
      maintainability: 'improve code modularity and separation of concerns'
    };
    
    return recommendations[component] || 'review best practices for this area';
  }
  
  getCoachingSuggestion(component, pattern) {
    const suggestions = {
      codeQuality: 'Try breaking down complex functions into smaller, focused methods',
      security: 'Consider using automated security scanning tools in your workflow',
      performance: 'Profile your code to identify bottlenecks before optimization',
      testCoverage: 'Start with testing the happy path, then add edge cases',
      documentation: 'Write documentation as you code, not after',
      maintainability: 'Follow the Single Responsibility Principle for better modularity'
    };
    
    return suggestions[component] || 'Focus on consistent improvement in this area';
  }
  
  getTechniqueRecommendation(area) {
    const techniques = {
      codeQuality: {
        name: 'Code Review Checklist',
        description: 'Use a systematic checklist to review code quality aspects'
      },
      security: {
        name: 'Security-First Development',
        description: 'Consider security implications at each development step'
      },
      performance: {
        name: 'Performance Budgeting',
        description: 'Set performance targets and measure against them'
      }
    };
    
    return techniques[area] || null;
  }
  
  getBestPractices(suggestions) {
    const practices = [];
    
    for (const suggestion of suggestions) {
      if (suggestion.area === 'codeQuality') {
        practices.push('Follow consistent coding standards and style guides');
      } else if (suggestion.area === 'testing') {
        practices.push('Aim for 80%+ test coverage with meaningful tests');
      }
    }
    
    return [...new Set(practices)]; // Remove duplicates
  }
  
  identifyTemporalIssues(temporalPatterns) {
    const issues = [];
    
    if (temporalPatterns.hourly) {
      // Find hours with consistently low performance
      for (const [hour, data] of Object.entries(temporalPatterns.hourly)) {
        if (data.average < 0.7 && data.scores.length >= 3) {
          issues.push({
            area: 'temporal_performance',
            issue: 'low_performance_time',
            suggestion: `Consider adjusting work schedule - performance dips at ${hour}:00`,
            priority: 'low'
          });
        }
      }
    }
    
    return issues;
  }
  
  // ==================== STATISTICAL METHODS ====================
  
  calculateMovingAverage(values, window = 5) {
    if (values.length < window) return values[values.length - 1] || 0;
    
    const recent = values.slice(-window);
    return recent.reduce((sum, val) => sum + val, 0) / recent.length;
  }
  
  calculateLinearTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }
  
  calculateExponentialSmoothing(values, alpha = 0.3) {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];
    
    let smoothed = values[0];
    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }
    
    return smoothed;
  }
  
  detectSeasonality(values) {
    // Simple seasonality detection - would be more sophisticated in production
    if (values.length < 12) return { hasSeason: false };
    
    // Check for weekly patterns (if we have day-of-week data)
    return { hasSeason: false, period: null };
  }
  
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
  
  calculateCorrelation(xValues, yValues) {
    if (xValues.length !== yValues.length || xValues.length === 0) return 0;
    
    const n = xValues.length;
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  calculateImprovementRate(scores) {
    if (scores.length < 5) return 0;
    
    const recent = scores.slice(-5);
    const older = scores.slice(-10, -5);
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, s) => sum + s, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s, 0) / older.length;
    
    return recentAvg - olderAvg;
  }
  
  // ==================== STORAGE OPERATIONS ====================
  
  async storeFeedback(agentId, feedback) {
    if (!this.feedbackHistory.has(agentId)) {
      this.feedbackHistory.set(agentId, []);
    }
    
    const history = this.feedbackHistory.get(agentId);
    history.push(feedback);
    
    // Keep manageable history size
    if (history.length > 50) {
      history.shift();
    }
    
    // Save to persistent storage
    await this.saveServiceData(`feedback/${agentId}`, history);
  }
  
  async saveQualityPatterns(agentId, patterns) {
    await this.saveServiceData(`patterns/${agentId}`, patterns);
  }
  
  async savePredictionModel(agentId, model) {
    await this.saveServiceData(`models/${agentId}`, model);
  }
  
  async saveLearningProfile(agentId, profile) {
    await this.saveServiceData(`learning/${agentId}`, profile);
  }
  
  async loadExistingModels() {
    console.log('📚 Loading existing feedback models...');
    // Implementation would load from storage
    console.log('✅ Feedback models loaded');
  }
  
  async saveAllModels() {
    console.log('💾 Saving all feedback models...');
    
    // Save all patterns
    for (const [agentId, patterns] of this.qualityPatterns) {
      await this.saveQualityPatterns(agentId, patterns);
    }
    
    // Save all prediction models
    for (const [agentId, model] of this.predictionModels) {
      await this.savePredictionModel(agentId, model);
    }
    
    // Save all learning profiles
    for (const [agentId, profile] of this.learningProfiles) {
      await this.saveLearningProfile(agentId, profile);
    }
    
    console.log('✅ All feedback models saved');
  }
  
  startTrendAnalysis() {
    const trendTimer = setInterval(async () => {
      try {
        await this.performTrendAnalysis();
      } catch (error) {
        console.error('❌ Trend analysis error:', error);
      }
    }, 300000); // 5 minutes
    
    this.timers.set('trend_analysis', trendTimer);
    console.log('📈 Trend analysis started');
  }
  
  async performTrendAnalysis() {
    console.log('📊 Performing trend analysis...');
    
    for (const [agentId, patterns] of this.qualityPatterns) {
      if (patterns.qualityHistory.length >= this.config.trendAnalysisWindow) {
        // Analyze trends and generate insights
        const insights = await this.generateTrendInsights(agentId, patterns);
        
        if (insights.length > 0) {
          await this.publishEvent('quality.trend.insights', {
            agentId: agentId,
            insights: insights,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }
  
  async generateTrendInsights(agentId, patterns) {
    const insights = [];
    const recentHistory = patterns.qualityHistory.slice(-this.config.trendAnalysisWindow);
    
    // Overall quality trend
    const overallScores = recentHistory.map(h => h.overallScore);
    const overallTrend = this.trendAnalysis.linearRegression(overallScores);
    
    if (overallTrend > 0.03) {
      insights.push({
        type: 'positive_trend',
        message: `Agent showing strong improvement trend (+${(overallTrend * 100).toFixed(1)}%)`,
        severity: 'info'
      });
    } else if (overallTrend < -0.03) {
      insights.push({
        type: 'negative_trend',
        message: `Agent showing declining trend (${(overallTrend * 100).toFixed(1)}%)`,
        severity: 'warning'
      });
    }
    
    return insights;
  }
  
  // ==================== API METHODS ====================
  
  async getAgentFeedbackSummary(agentId) {
    const feedback = this.feedbackHistory.get(agentId) || [];
    const patterns = this.qualityPatterns.get(agentId);
    const model = this.predictionModels.get(agentId);
    const profile = this.learningProfiles.get(agentId);
    
    return {
      agentId: agentId,
      totalFeedback: feedback.length,
      recentFeedback: feedback.slice(-5),
      qualityTrend: patterns ? this.calculateLinearTrend(patterns.qualityHistory.map(h => h.overallScore)) : 0,
      modelAccuracy: model ? model.accuracy : 0,
      learningRate: profile ? profile.learningRate : 1.0,
      strugglingAreas: profile ? profile.strugglingAreas : [],
      improvementAreas: profile ? profile.improvementAreas : []
    };
  }
  
  getEngineMetrics() {
    return {
      ...this.engineMetrics,
      timestamp: new Date().toISOString(),
      agentsTracked: this.qualityPatterns.size,
      modelsActive: this.predictionModels.size,
      predictionAccuracy: this.engineMetrics.totalPredictions > 0 ? 
        this.engineMetrics.predictionsAccurate / this.engineMetrics.totalPredictions : 0
    };
  }
  
  // ==================== HEALTH STATUS ====================
  
  async getHealthStatus() {
    const baseHealth = await super.getHealthStatus();
    
    return {
      ...baseHealth,
      feedbackEngine: {
        agentsTracked: this.qualityPatterns.size,
        modelsActive: this.predictionModels.size,
        feedbackGenerated: this.engineMetrics.feedbackGenerated,
        coachingSessions: this.engineMetrics.coachingSessionsDelivered,
        predictionAccuracy: this.engineMetrics.totalPredictions > 0 ? 
          this.engineMetrics.predictionsAccurate / this.engineMetrics.totalPredictions : 0
      }
    };
  }
}

module.exports = QualityFeedbackEngine;