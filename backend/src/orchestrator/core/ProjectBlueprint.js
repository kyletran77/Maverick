/**
 * Project Blueprint
 * 
 * Standardized structure for project definitions
 * Provides utilities for blueprint manipulation and validation
 */
class ProjectBlueprint {
  constructor(data = {}) {
    this.projectId = data.projectId;
    this.name = data.name || 'Untitled Project';
    this.description = data.description || '';
    this.domain = data.domain || 'General';
    this.complexity = data.complexity || 'medium';
    this.createdAt = data.createdAt || new Date().toISOString();
    
    // Core blueprint structure
    this.components = data.components || [];
    this.workflows = data.workflows || [];
    this.dataModels = data.dataModels || [];
    this.integrations = data.integrations || [];
    this.qualityGates = data.qualityGates || [];
    this.compliance = data.compliance || [];
    this.successCriteria = data.successCriteria || [];
    
    // Technical details
    this.architecture = data.architecture || {};
    
    // Metadata
    this.estimatedDuration = data.estimatedDuration || 0;
    this.priority = data.priority || 'medium';
    this.status = data.status || 'planning';
  }

  /**
   * Validate blueprint completeness
   */
  validate() {
    const issues = [];
    
    if (!this.projectId) issues.push('Missing project ID');
    if (!this.name) issues.push('Missing project name');
    if (this.components.length === 0) issues.push('No components defined');
    if (this.workflows.length === 0) issues.push('No workflows defined');
    if (this.successCriteria.length === 0) issues.push('No success criteria defined');
    
    return {
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Add a component to the blueprint
   */
  addComponent(component) {
    this.components.push({
      id: component.id || `comp_${Date.now()}`,
      name: component.name,
      type: component.type,
      technology: component.technology,
      dependencies: component.dependencies || [],
      ...component
    });
  }

  /**
   * Add a workflow to the blueprint
   */
  addWorkflow(workflow) {
    this.workflows.push({
      id: workflow.id || `workflow_${Date.now()}`,
      name: workflow.name,
      steps: workflow.steps || [],
      actors: workflow.actors || [],
      ...workflow
    });
  }

  /**
   * Add integration requirement
   */
  addIntegration(integration) {
    this.integrations.push({
      id: integration.id || `int_${Date.now()}`,
      name: integration.name,
      type: integration.type || 'external_system',
      method: integration.method || 'API',
      required: integration.required !== false,
      ...integration
    });
  }

  /**
   * Get components by type
   */
  getComponentsByType(type) {
    return this.components.filter(comp => comp.type === type);
  }

  /**
   * Get required integrations
   */
  getRequiredIntegrations() {
    return this.integrations.filter(int => int.required);
  }

  /**
   * Calculate estimated complexity
   */
  calculateComplexity() {
    let score = 0;
    
    // Component complexity
    score += this.components.length * 2;
    
    // Workflow complexity
    score += this.workflows.reduce((sum, wf) => sum + (wf.steps?.length || 1), 0);
    
    // Integration complexity
    score += this.integrations.length * 3;
    
    // Determine complexity level
    if (score >= 30) return 'high';
    if (score >= 15) return 'medium';
    return 'low';
  }

  /**
   * Export blueprint to JSON
   */
  toJSON() {
    return {
      projectId: this.projectId,
      name: this.name,
      description: this.description,
      domain: this.domain,
      complexity: this.complexity,
      createdAt: this.createdAt,
      components: this.components,
      workflows: this.workflows,
      dataModels: this.dataModels,
      integrations: this.integrations,
      qualityGates: this.qualityGates,
      compliance: this.compliance,
      successCriteria: this.successCriteria,
      architecture: this.architecture,
      estimatedDuration: this.estimatedDuration,
      priority: this.priority,
      status: this.status
    };
  }

  /**
   * Create blueprint from JSON
   */
  static fromJSON(data) {
    return new ProjectBlueprint(data);
  }

  /**
   * Create a summary of the blueprint
   */
  getSummary() {
    return {
      projectId: this.projectId,
      name: this.name,
      domain: this.domain,
      complexity: this.complexity,
      componentCount: this.components.length,
      workflowCount: this.workflows.length,
      integrationCount: this.integrations.length,
      estimatedDuration: this.estimatedDuration,
      status: this.status
    };
  }
}

module.exports = ProjectBlueprint;