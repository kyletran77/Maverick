/**
 * Goose CLI Integration Example
 * 
 * This file demonstrates how to integrate the visualizer with the actual Goose CLI.
 * Replace the simulated task execution in server.js with these functions.
 */

const { spawn } = require('child_process');
const path = require('path');

class GooseIntegration {
    constructor(io) {
        this.io = io;
        this.activeProcesses = new Map();
        this.sessionTimeouts = new Map();
        this.sessionLastActivity = new Map();
        
        // Configurable timeout settings - Made less aggressive
        this.timeoutSettings = {
            default: 15 * 60 * 1000, // 15 minutes default (increased from 10)
            extended: 30 * 60 * 1000, // 30 minutes for complex tasks (increased from 20)
            maxInactivity: 5 * 60 * 1000, // 5 minutes of inactivity (increased from 3)
            heartbeatInterval: 60 * 1000 // 60 seconds (increased from 30)
        };
    }

    /**
     * Execute a task using the real Goose CLI
     * @param {string} task - The task description
     * @param {string} sessionId - Unique session identifier
     * @param {Object} socket - Socket.IO socket for real-time updates
     * @param {string} projectPath - Directory where the project should be created
     */
    async executeGooseTask(task, sessionId, socket, projectPath) {
        return new Promise((resolve, reject) => {
            try {
                // Ensure the project directory exists
                if (projectPath && !require('fs').existsSync(projectPath)) {
                    require('fs').mkdirSync(projectPath, { recursive: true });
                }

                const workingDir = projectPath || process.cwd();
                
                // Use the correct Goose CLI command structure from the documentation
                // goose run --text "task description" --name "session-name"
                const gooseArgs = [
                    'run',
                    '--text', task,
                    '--name', sessionId
                    // Removed --no-confirm as it's not a valid argument for Block AI "codename goose" CLI
                ];

                console.log(`[${sessionId}] Starting Goose with args:`, gooseArgs);
                console.log(`[${sessionId}] Working directory:`, workingDir);

                const gooseProcess = spawn('goose', gooseArgs, {
                    cwd: workingDir,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: {
                        ...process.env,
                        PWD: workingDir
                    }
                });

                this.activeProcesses.set(sessionId, {
                    process: gooseProcess,
                    resolve: resolve,
                    reject: reject,
                    startTime: new Date()
                });

                // Initialize activity tracking
                this.sessionLastActivity.set(sessionId, new Date());

                // Send initial status update
                socket.emit('goose_status', {
                    status: 'started',
                    message: `Goose session ${sessionId} started in ${workingDir}`,
                    sessionId: sessionId
                });

                // Handle stdout (main output)
                gooseProcess.stdout.on('data', (data) => {
                    this.updateLastActivity(sessionId);
                    this.parseGooseOutput(data.toString(), sessionId, socket);
                });

                // Handle stderr (errors and warnings)
                gooseProcess.stderr.on('data', (data) => {
                    this.updateLastActivity(sessionId);
                    this.handleGooseError(data.toString(), sessionId, socket);
                });

                // Handle process completion
                gooseProcess.on('close', (code) => {
                    this.clearSessionTimeout(sessionId);
                    const sessionData = this.activeProcesses.get(sessionId);
                    if (sessionData) {
                        const duration = new Date() - sessionData.startTime;
                        console.log(`[${sessionId}] Goose session completed in ${duration}ms with code ${code}`);
                        
                        this.handleGooseCompletion(code, sessionId, socket);
                        
                        // Emit completion status to frontend
                        socket.emit('goose_session_completed', {
                            sessionId: sessionId,
                            code: code,
                            duration: duration,
                            success: code === 0
                        });
                        
                        if (code === 0) {
                            sessionData.resolve({ success: true, code, duration });
                        } else {
                            sessionData.reject(new Error(`Goose process exited with code ${code}`));
                        }
                        
                        this.activeProcesses.delete(sessionId);
                        this.sessionLastActivity.delete(sessionId);
                    }
                });

                // Handle process errors
                gooseProcess.on('error', (error) => {
                    this.clearSessionTimeout(sessionId);
                    console.error(`[${sessionId}] Goose process error:`, error);
                    const sessionData = this.activeProcesses.get(sessionId);
                    if (sessionData) {
                        this.handleGooseProcessError(error, sessionId, socket);
                        sessionData.reject(error);
                        this.activeProcesses.delete(sessionId);
                        this.sessionLastActivity.delete(sessionId);
                    }
                });

                // Set up intelligent timeout management
                this.setupIntelligentTimeout(sessionId, task, socket);

            } catch (error) {
                console.error(`[${sessionId}] Error starting Goose process:`, error);
                socket.emit('task_error', { error: error.message, sessionId });
                reject(error);
            }
        });
    }

    /**
     * Set up intelligent timeout management
     */
    setupIntelligentTimeout(sessionId, task, socket) {
        // Determine timeout based on task complexity
        const timeout = this.determineTimeoutForTask(task);
        
        // Start heartbeat monitoring
        const heartbeatInterval = setInterval(() => {
            if (!this.activeProcesses.has(sessionId)) {
                clearInterval(heartbeatInterval);
                return;
            }

            const lastActivity = this.sessionLastActivity.get(sessionId);
            const now = new Date();
            const inactivityTime = now - lastActivity;

            // Check for inactivity timeout
            if (inactivityTime > this.timeoutSettings.maxInactivity) {
                console.log(`[${sessionId}] Session inactive for ${Math.round(inactivityTime / 1000)}s, terminating`);
                this.terminateSession(sessionId, 'Session timeout due to inactivity');
                clearInterval(heartbeatInterval);
                return;
            }

            // Emit heartbeat to frontend
            socket.emit('session_heartbeat', {
                sessionId: sessionId,
                lastActivity: lastActivity,
                inactivityTime: Math.round(inactivityTime / 1000)
            });

        }, this.timeoutSettings.heartbeatInterval);

        // Set maximum timeout
        const maxTimeout = setTimeout(() => {
            if (this.activeProcesses.has(sessionId)) {
                console.log(`[${sessionId}] Maximum timeout reached after ${timeout / 1000}s`);
                this.terminateSession(sessionId, 'Maximum session timeout reached');
            }
            clearInterval(heartbeatInterval);
        }, timeout);

        this.sessionTimeouts.set(sessionId, { heartbeatInterval, maxTimeout });
    }

    /**
     * Determine timeout based on task complexity
     */
    determineTimeoutForTask(task) {
        const complexKeywords = [
            'complete', 'full', 'entire', 'comprehensive', 'build', 'deploy',
            'frontend', 'backend', 'database', 'authentication', 'api'
        ];
        
        const taskLower = task.toLowerCase();
        const complexityScore = complexKeywords.reduce((score, keyword) => {
            return taskLower.includes(keyword) ? score + 1 : score;
        }, 0);

        // Use extended timeout for complex tasks
        return complexityScore >= 2 ? this.timeoutSettings.extended : this.timeoutSettings.default;
    }

    /**
     * Update last activity timestamp
     */
    updateLastActivity(sessionId) {
        this.sessionLastActivity.set(sessionId, new Date());
    }

    /**
     * Clear session timeout
     */
    clearSessionTimeout(sessionId) {
        const timeouts = this.sessionTimeouts.get(sessionId);
        if (timeouts) {
            clearInterval(timeouts.heartbeatInterval);
            clearTimeout(timeouts.maxTimeout);
            this.sessionTimeouts.delete(sessionId);
        }
    }

    /**
     * Terminate a session
     */
    terminateSession(sessionId, reason) {
        const sessionData = this.activeProcesses.get(sessionId);
        if (sessionData) {
            sessionData.process.kill('SIGTERM');
            sessionData.reject(new Error(reason));
            this.activeProcesses.delete(sessionId);
        }
        this.clearSessionTimeout(sessionId);
        this.sessionLastActivity.delete(sessionId);
    }

    /**
     * Parse Goose CLI output and extract agent information
     * @param {string} output - Raw output from Goose CLI
     * @param {string} sessionId - Session identifier
     * @param {Object} socket - Socket.IO socket
     */
    parseGooseOutput(output, sessionId, socket) {
        try {
            const lines = output.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                // Filter and categorize output
                const outputType = this.categorizeOutput(line);
                
                // Send important output to UI
                if (outputType.important) {
                    socket.emit('goose_output', {
                        sessionId: sessionId,
                        output: outputType.cleanedOutput,
                        timestamp: new Date().toISOString(),
                        type: outputType.type,
                        level: outputType.level
                    });
                }
                
                // Send ALL output to agent logs for debugging (new)
                socket.emit('agent_log', {
                    sessionId: sessionId,
                    message: line.trim(),
                    timestamp: new Date().toISOString(),
                    type: outputType.type,
                    level: outputType.level,
                    important: outputType.important,
                    raw: true  // Flag to indicate this is raw Goose CLI output
                });

                // Also emit to detailed logs (collapsed by default)
                socket.emit('goose_detailed_output', {
                    sessionId: sessionId,
                    output: line,
                    timestamp: new Date().toISOString(),
                    type: outputType.type
                });
                
                // Look for specific Goose CLI patterns
                if (line.includes('Starting Goose') || line.includes('Goose is starting')) {
                    this.createAgentFromText('Goose Agent', sessionId, socket);
                } else if (line.includes('Task:') || line.includes('Working on:')) {
                    this.updateAgentProgress(25, sessionId, socket);
                } else if (line.includes('Completed') || line.includes('Done') || line.includes('Finished')) {
                    this.updateAgentProgress(100, sessionId, socket);
                    this.handleTaskCompletedFromText(line, sessionId, socket);
                } else if (line.includes('Error:') || line.includes('Failed:')) {
                    this.handleGooseError(line, sessionId, socket);
                } else if (line.includes('Progress:')) {
                    // Extract percentage if available
                    const progressMatch = line.match(/(\d+)%/);
                    if (progressMatch) {
                        const progress = parseInt(progressMatch[1]);
                        this.updateAgentProgress(progress, sessionId, socket);
                    }
                } else if (line.includes('Creating') || line.includes('Generating') || line.includes('Writing')) {
                    this.updateAgentProgress(50, sessionId, socket);
                } else if (line.includes('Testing') || line.includes('Validating') || line.includes('Checking')) {
                    this.updateAgentProgress(75, sessionId, socket);
                }
            }
        } catch (error) {
            console.error('Error parsing Goose output:', error);
            socket.emit('task_error', { error: `Output parsing error: ${error.message}` });
        }
    }

    /**
     * Categorize output to determine importance and type
     */
    categorizeOutput(line) {
        const trimmed = line.trim();
        
        // Skip empty lines
        if (!trimmed) {
            return { important: false, type: 'debug', level: 'verbose' };
        }

        // Skip timestamp-only lines
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
            return { important: false, type: 'debug', level: 'verbose' };
        }

        // Skip session ID brackets
        if (/^\[[\w-]+\]/.test(trimmed)) {
            return { important: false, type: 'debug', level: 'verbose' };
        }

        // Important progress indicators
        if (trimmed.includes('Starting') || trimmed.includes('Completed') || 
            trimmed.includes('Creating') || trimmed.includes('Writing') ||
            trimmed.includes('Progress:') || trimmed.includes('%')) {
            return { 
                important: true, 
                type: 'progress', 
                level: 'info',
                cleanedOutput: this.cleanOutput(trimmed)
            };
        }

        // Errors and warnings
        if (trimmed.includes('Error:') || trimmed.includes('Failed:') || 
            trimmed.includes('Warning:')) {
            return { 
                important: true, 
                type: 'error', 
                level: 'error',
                cleanedOutput: this.cleanOutput(trimmed)
            };
        }

        // Task descriptions and important info
        if (trimmed.includes('Task:') || trimmed.includes('Working on:') ||
            trimmed.includes('Analyzing') || trimmed.includes('Building')) {
            return { 
                important: true, 
                type: 'task', 
                level: 'info',
                cleanedOutput: this.cleanOutput(trimmed)
            };
        }

        // Everything else is debug/verbose
        return { 
            important: false, 
            type: 'debug', 
            level: 'verbose',
            cleanedOutput: this.cleanOutput(trimmed)
        };
    }

    /**
     * Clean output by removing session IDs and timestamps
     */
    cleanOutput(output) {
        return output
            .replace(/^\[[\w-]+\]\s*/, '') // Remove session ID brackets
            .replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?\s*/, '') // Remove timestamps
            .trim();
    }

    /**
     * Process structured Goose events
     * @param {Object} data - Parsed JSON data from Goose
     * @param {string} sessionId - Session identifier
     * @param {Object} socket - Socket.IO socket
     */
    processGooseEvent(data, sessionId, socket) {
        switch (data.type) {
            case 'agent_created':
                this.handleAgentCreated(data, sessionId, socket);
                break;
            case 'agent_status_update':
                this.handleAgentStatusUpdate(data, sessionId, socket);
                break;
            case 'task_progress':
                this.handleTaskProgress(data, sessionId, socket);
                break;
            case 'task_completed':
                this.handleTaskCompleted(data, sessionId, socket);
                break;
            case 'error':
                this.handleGooseError(data.message, sessionId, socket);
                break;
            default:
                console.log('Unknown Goose event type:', data.type);
        }
    }

    /**
     * Process plain text output from Goose
     * @param {string} line - Text line from Goose output
     * @param {string} sessionId - Session identifier
     * @param {Object} socket - Socket.IO socket
     */
    processGooseTextOutput(line, sessionId, socket) {
        // Parse common Goose output patterns
        if (line.includes('Starting agent:')) {
            const agentName = line.split('Starting agent:')[1].trim();
            this.createAgentFromText(agentName, sessionId, socket);
        } else if (line.includes('Progress:')) {
            const progressMatch = line.match(/Progress:\s*(\d+)%/);
            if (progressMatch) {
                const progress = parseInt(progressMatch[1]);
                this.updateAgentProgress(progress, sessionId, socket);
            }
        } else if (line.includes('Completed:')) {
            this.handleTaskCompletedFromText(line, sessionId, socket);
        }
    }

    /**
     * Handle agent creation from Goose
     */
    handleAgentCreated(data, sessionId, socket) {
        const agent = {
            id: data.agent_id,
            type: data.agent_type,
            name: data.agent_name,
            status: 'idle',
            progress: 0,
            logs: [],
            createdAt: new Date(),
            sessionId: sessionId
        };

        // Add to agents map and broadcast update
        socket.emit('agent_created', agent);
        this.io.emit('agents_update', this.getAllAgents());
    }

    /**
     * Handle agent status updates from Goose
     */
    handleAgentStatusUpdate(data, sessionId, socket) {
        const update = {
            agentId: data.agent_id,
            status: data.status,
            progress: data.progress || 0,
            message: data.message || '',
            timestamp: new Date()
        };

        socket.emit('agent_status_update', update);
        this.io.emit('agents_update', this.getAllAgents());
    }

    /**
     * Handle task completion from Goose
     */
    handleTaskCompleted(data, sessionId, socket) {
        const summary = {
            task: data.task,
            agentsUsed: data.agents_used || 0,
            totalTime: data.total_time || 'Unknown',
            status: 'Success',
            files_created: data.files_created || [],
            files_modified: data.files_modified || []
        };

        socket.emit('task_completed', {
            message: 'Task completed successfully!',
            summary: summary
        });
    }

    /**
     * Handle Goose CLI errors with improved API error detection
     */
    handleGooseError(errorMessage, sessionId, socket) {
        console.error(`[${sessionId}] Goose CLI error:`, errorMessage);
        
        // Check for specific API formatting errors
        if (errorMessage.includes('tool_use') && errorMessage.includes('tool_result')) {
            console.error(`[${sessionId}] API formatting error detected - tool_use/tool_result mismatch`);
            socket.emit('task_error', { 
                error: 'API formatting error: Goose CLI encountered a tool calling issue. Session will be restarted.',
                sessionId: sessionId,
                errorType: 'api_formatting_error'
            });
            
            // Terminate the problematic session
            this.terminateSession(sessionId, 'API formatting error - tool_use/tool_result mismatch');
            return;
        }
        
        // Check for other common API errors
        if (errorMessage.includes('Request failed with status 400') || 
            errorMessage.includes('invalid_request_error')) {
            console.error(`[${sessionId}] API request error detected`);
            socket.emit('task_error', { 
                error: 'API request error: Please check Goose CLI configuration and try again.',
                sessionId: sessionId,
                errorType: 'api_request_error'
            });
            
            // Terminate the problematic session
            this.terminateSession(sessionId, 'API request error');
            return;
        }
        
        // Generic error handling
        socket.emit('task_error', { 
            error: `Goose CLI error: ${errorMessage}`,
            sessionId: sessionId,
            errorType: 'generic_error'
        });
    }

    /**
     * Handle Goose process completion
     */
    handleGooseCompletion(code, sessionId, socket) {
        if (code === 0) {
            console.log(`Goose session ${sessionId} completed successfully`);
        } else {
            console.error(`Goose session ${sessionId} exited with code ${code}`);
            socket.emit('task_error', { error: `Goose process exited with code ${code}` });
        }
    }

    /**
     * Handle Goose process errors
     */
    handleGooseProcessError(error, sessionId, socket) {
        console.error('Goose process error:', error);
        socket.emit('task_error', { 
            error: `Failed to start Goose process: ${error.message}` 
        });
    }

    /**
     * Cancel a running Goose task
     * @param {string} sessionId - Session identifier
     */
    cancelTask(sessionId) {
        const sessionData = this.activeProcesses.get(sessionId);
        if (sessionData) {
            console.log(`[${sessionId}] Cancelling Goose session`);
            sessionData.process.kill('SIGTERM');
            sessionData.reject(new Error('Task cancelled by user'));
            this.activeProcesses.delete(sessionId);
            return true;
        }
        return false;
    }

    /**
     * Cancel all running Goose tasks for a specific plan
     * @param {string} planId - Plan identifier
     */
    cancelPlanTasks(planId) {
        let cancelledCount = 0;
        const sessionsToCancel = [];
        
        // Find all sessions that belong to this plan
        for (const [sessionId, sessionData] of this.activeProcesses.entries()) {
            if (sessionId.startsWith(planId)) {
                sessionsToCancel.push(sessionId);
            }
        }
        
        // Cancel each session
        for (const sessionId of sessionsToCancel) {
            if (this.cancelTask(sessionId)) {
                cancelledCount++;
            }
        }
        
        console.log(`[${planId}] Cancelled ${cancelledCount} Goose sessions`);
        return cancelledCount;
    }

    /**
     * Get all active agents (implement based on your storage)
     */
    getAllAgents() {
        // Return array of all active agents
        // This should be implemented based on your agent storage system
        return [];
    }

    /**
     * Create agent from text output (fallback for non-JSON output)
     */
    createAgentFromText(agentName, sessionId, socket) {
        // Implement agent creation logic for text-based output
        console.log(`Creating agent from text: ${agentName}`);
    }

    /**
     * Update agent progress from text output
     */
    updateAgentProgress(progress, sessionId, socket) {
        // Implement progress update logic for text-based output
        console.log(`Updating progress: ${progress}%`);
    }

    /**
     * Handle task completion from text output
     */
    handleTaskCompletedFromText(line, sessionId, socket) {
        // Implement task completion logic for text-based output
        console.log(`Task completed: ${line}`);
    }

    /**
     * Detect infinite loop indicators in Goose CLI output
     * @param {string} output - Raw output from Goose CLI
     * @param {string} sessionId - Session identifier
     * @returns {boolean} True if an infinite loop is detected, false otherwise
     */
    detectTestInfiniteLoop(output, sessionId) {
        const lowerOutput = output.toLowerCase();
        
        // Only detect very specific infinite loop patterns
        // Detect Jest watch mode indicators (more specific)
        if (lowerOutput.includes('watch usage') && lowerOutput.includes('press w to show more') ||
            lowerOutput.includes('watching for file changes') && lowerOutput.includes('jest') ||
            lowerOutput.includes('jest --watchall --verbose')) {
            console.warn(`[${sessionId}] Jest watch mode detected`);
            return true;
        }
        
        // Detect npm test running with watch flags (more specific)
        if (lowerOutput.includes('npm test') && lowerOutput.includes('--watchall') &&
            lowerOutput.includes('watching')) {
            console.warn(`[${sessionId}] npm test with watchAll detected`);
            return true;
        }
        
        // Detect test runners waiting for input (very specific)
        if (lowerOutput.includes('test') && lowerOutput.includes('watching') && 
            (lowerOutput.includes('press w to show more') || 
             lowerOutput.includes('press a to run all tests') ||
             lowerOutput.includes('press f to run only failed tests'))) {
            console.warn(`[${sessionId}] Interactive test runner detected`);
            return true;
        }
        
        // Remove the overly broad detection patterns that were causing false positives
        // The previous patterns were too generic and triggered on normal output
        
        return false;
    }
}

/**
 * Integration helper functions
 */

/**
 * Check if Goose CLI is installed and available
 */
function checkGooseInstallation() {
    return new Promise((resolve, reject) => {
        try {
            const goose = spawn('goose', ['--version'], { 
                stdio: 'pipe',
                timeout: 5000 // 5 second timeout
            });
            
            let output = '';
            let errorOutput = '';
            
            goose.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            goose.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            goose.on('close', (code) => {
                if (code === 0 || output.length > 0) {
                    resolve(true);
                } else {
                    reject(new Error('Goose CLI not found or not working'));
                }
            });

            goose.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    reject(new Error('Goose CLI not installed'));
                } else {
                    reject(new Error(`Goose CLI error: ${error.message}`));
                }
            });
        } catch (error) {
            reject(new Error(`Failed to check Goose CLI: ${error.message}`));
        }
    });
}

/**
 * Get Goose configuration
 */
function getGooseConfig() {
    return new Promise((resolve, reject) => {
        try {
            // Use '--help' to get available commands and configuration info
            const goose = spawn('goose', ['--help'], { 
                stdio: 'pipe',
                timeout: 5000 // 5 second timeout
            });
            let output = '';
            let errorOutput = '';
            
            goose.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            goose.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            goose.on('close', (code) => {
                if (code === 0 && output.trim()) {
                    // Parse the help output to extract available commands
                    const lines = output.split('\n');
                    const commands = [];
                    let inCommandsSection = false;
                    
                    for (const line of lines) {
                        if (line.includes('Commands:')) {
                            inCommandsSection = true;
                            continue;
                        }
                        if (inCommandsSection && line.trim() && !line.startsWith(' ')) {
                            break;
                        }
                        if (inCommandsSection && line.trim().startsWith(' ')) {
                            const command = line.trim().split(/\s+/)[0];
                            if (command) commands.push(command);
                        }
                    }
                    
                    resolve({ 
                        status: 'available',
                        commands: commands,
                        help: output.trim(),
                        message: 'Goose CLI is available'
                    });
                } else {
                    resolve({ 
                        status: 'limited',
                        message: 'Goose CLI available but help unavailable',
                        error: errorOutput
                    });
                }
            });

            goose.on('error', (error) => {
                resolve({ 
                    status: 'error',
                    message: error.message 
                });
            });
        } catch (error) {
            resolve({ 
                status: 'error',
                message: `Failed to get Goose config: ${error.message}`
            });
        }
    });
}

/**
 * Example usage in server.js:
 * 
 * const gooseIntegration = new GooseIntegration(io);
 * 
 * // Check if Goose is available
 * checkGooseInstallation()
 *   .then(() => console.log('Goose CLI is available'))
 *   .catch(err => console.error('Goose CLI not available:', err.message));
 * 
 * // Handle task submission
 * socket.on('submit_task', async (data) => {
 *   const sessionId = uuidv4();
 *   await gooseIntegration.executeGooseTask(data.task, sessionId, socket);
 * });
 */

module.exports = {
    GooseIntegration,
    checkGooseInstallation,
    getGooseConfig
}; 