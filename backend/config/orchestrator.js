/**
 * Enhanced Orchestrator Configuration
 * 
 * Configuration for the intelligent task orchestration and agent assignment system
 */

module.exports = {
  // Goose CLI Integration Settings
  goose: {
    timeout: 30000,
    retryAttempts: 3,
    sessionTimeout: 16 * 60 * 1000, // 16 minutes
    maxInactivity: 5 * 60 * 1000, // 5 minutes
    heartbeatInterval: 60 * 1000 // 60 seconds
  },
  
  // Requirements Processing Settings
  requirements: {
    trdTemplatesPath: './templates/trd',
    domainModelsPath: './models/domains',
    validationRulesPath: './rules/validation',
    maxPromptLength: 10000,
    minRequirementQuality: 0.8,
    cacheTimeout: 30 * 60 * 1000, // 30 minutes
    fallbackMode: true
  },
  
  // Agent Matching Configuration
  agentMatching: {
    scoringWeights: {
      skillMatch: 0.4,
      performance: 0.3,
      workload: 0.2,
      specialization: 0.1
    },
    minConfidenceThreshold: 0.7,
    learningRate: 0.1,
    maxAnalysisTime: 15000, // 15 seconds
    cacheResults: true
  },
  
  // Quality Framework Settings
  quality: {
    validationLevels: ['trd', 'assignment', 'execution'],
    qualityThresholds: {
      trd: 0.85,
      assignment: 0.8,
      execution: 0.9
    },
    interventionTriggers: {
      lowConfidence: 0.6,
      highRisk: 0.7,
      performanceDegradation: 0.15
    },
    enablePredictiveAssessment: true
  },
  
  // Performance and Monitoring
  performance: {
    enableMetrics: true,
    metricsPort: 9090,
    logLevel: process.env.LOG_LEVEL || 'info',
    enableTracing: process.env.ENABLE_TRACING === 'true',
    maxConcurrentProjects: 50,
    maxTasksPerAgent: 5
  },
  
  // Feature Flags for Gradual Rollout
  features: {
    enhancedOrchestration: process.env.ENHANCED_ORCHESTRATION === 'true',
    intelligentAgentMatching: process.env.INTELLIGENT_AGENT_MATCHING === 'true',
    trdGeneration: process.env.TRD_GENERATION === 'true',
    qualityPrediction: process.env.QUALITY_PREDICTION === 'true',
    legacyFallback: true
  },
  
  // Domain-Specific Templates
  domains: {
    'web_development': {
      templatePath: './templates/trd/web-development.json',
      requiredSections: ['frontend', 'backend', 'database', 'deployment'],
      qualityGates: ['code_review', 'testing', 'security_scan'],
      estimatedComplexity: 0.7
    },
    'mobile_development': {
      templatePath: './templates/trd/mobile-development.json',
      requiredSections: ['platform', 'ui_ux', 'backend_integration', 'deployment'],
      qualityGates: ['ui_testing', 'performance_testing', 'device_testing'],
      estimatedComplexity: 0.8
    },
    'data_processing': {
      templatePath: './templates/trd/data-processing.json',
      requiredSections: ['data_sources', 'processing_pipeline', 'storage', 'analytics'],
      qualityGates: ['data_validation', 'performance_testing', 'accuracy_testing'],
      estimatedComplexity: 0.9
    },
    'ai_ml': {
      templatePath: './templates/trd/ai-ml.json',
      requiredSections: ['model_architecture', 'training_data', 'evaluation', 'deployment'],
      qualityGates: ['model_validation', 'performance_testing', 'bias_testing'],
      estimatedComplexity: 1.0
    }
  },
  
  // Cache Configuration
  cache: {
    ttl: 30 * 60, // 30 minutes in seconds
    checkInterval: 5 * 60, // 5 minutes in seconds
    maxKeys: 1000,
    enableForTRD: true,
    enableForAgentAnalysis: true
  }
};