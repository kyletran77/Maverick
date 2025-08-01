# Goose Integration - AI Development CLI Bridge

## Overview

The Goose Integration system (`goose-integration.js`) serves as the critical bridge between Maverick's orchestration layer and the Goose CLI, providing real-time process management, output parsing, and resource lifecycle management for AI-powered development tasks.

## Architecture

### Core Design Principles

- **Process Lifecycle Management**: Comprehensive spawn, monitor, and cleanup operations
- **Real-Time Communication**: Socket.IO integration for live progress updates
- **Resource Safety**: Timeout management and emergency cleanup procedures
- **Cross-Platform Support**: Windows and Unix-compatible process operations
- **Graceful Degradation**: Simulation mode when Goose CLI unavailable

### Class Structure

```javascript
class GooseIntegration {
  io: SocketIO                    // WebSocket communication
  activeProcesses: Map()          // Running Goose process tracking
  sessionTimeouts: Map()          // Timeout management per session
  sessionLastActivity: Map()      // Activity tracking for sessions
  timeoutSettings: Object         // Configurable timeout thresholds
}
```

## Process Management

### Task Execution Flow

```
Task Request → Process Spawn → Activity Monitoring → Output Parsing → 
Real-Time Updates → Completion/Timeout → Resource Cleanup
```

### Process Spawning

```javascript
async executeGooseTask(task, sessionId, socket, projectPath) {
  return new Promise((resolve, reject) => {
    // Ensure project directory exists
    if (projectPath && !fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const workingDir = projectPath || process.cwd();
    
    // Configure Goose CLI arguments
    const gooseArgs = [
      'run',
      '--text', task,
      '--name', sessionId
    ];

    // Spawn process with comprehensive configuration
    const gooseProcess = spawn('goose', gooseArgs, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PWD: workingDir
      }
    });

    // Track active process
    this.activeProcesses.set(sessionId, {
      process: gooseProcess,
      resolve: resolve,
      reject: reject,
      startTime: new Date()
    });
  });
}
```

### Output Processing Pipeline

```javascript
// Real-time stdout processing
gooseProcess.stdout.on('data', (data) => {
  this.updateLastActivity(sessionId);
  this.parseGooseOutput(data.toString(), sessionId, socket);
});

// Error stream handling
gooseProcess.stderr.on('data', (data) => {
  this.updateLastActivity(sessionId);
  this.handleGooseError(data.toString(), sessionId, socket);
});

// Process completion handling
gooseProcess.on('close', (code) => {
  this.clearSessionTimeout(sessionId);
  const sessionData = this.activeProcesses.get(sessionId);
  if (sessionData) {
    const duration = new Date() - sessionData.startTime;
    console.log(`Session completed in ${duration}ms with code ${code}`);
    
    if (code === 0) {
      sessionData.resolve({ success: true, code, duration });
    } else {
      sessionData.reject(new Error(`Goose process failed with code ${code}`));
    }
    
    this.activeProcesses.delete(sessionId);
  }
});
```

## Real-Time Communication

### Socket.IO Event Patterns

```javascript
// Status update events
socket.emit('goose_status', {
  status: 'started',
  message: `Goose session ${sessionId} started in ${workingDir}`,
  sessionId: sessionId
});

socket.emit('goose_output', {
  sessionId: sessionId,
  output: parsedOutput,
  timestamp: new Date(),
  type: 'stdout'
});

socket.emit('goose_progress', {
  sessionId: sessionId,
  progress: progressPercentage,
  currentStep: stepDescription,
  estimatedCompletion: estimatedTime
});

socket.emit('goose_completed', {
  sessionId: sessionId,
  result: executionResult,
  duration: totalDuration,
  filesCreated: createdFiles
});
```

### Output Parsing & Intelligence

```javascript
parseGooseOutput(data, sessionId, socket) {
  const lines = data.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Detect progress indicators
    if (this.isProgressLine(line)) {
      const progress = this.extractProgress(line);
      socket.emit('goose_progress', {
        sessionId,
        progress: progress.percentage,
        currentStep: progress.step,
        timestamp: new Date()
      });
    }
    
    // Detect file operations
    if (this.isFileOperation(line)) {
      const fileOp = this.parseFileOperation(line);
      socket.emit('goose_file_operation', {
        sessionId,
        operation: fileOp.type,
        file: fileOp.path,
        timestamp: new Date()
      });
    }
    
    // Detect completion markers
    if (this.isCompletionMarker(line)) {
      socket.emit('goose_task_completed', {
        sessionId,
        message: line,
        timestamp: new Date()
      });
    }
    
    // Emit all output for transparency
    socket.emit('goose_output', {
      sessionId,
      output: line,
      timestamp: new Date(),
      type: 'stdout'
    });
  }
}
```

## Timeout & Activity Management

### Configurable Timeout System

```javascript
timeoutSettings: {
  default: 16 * 60 * 1000,      // 16 minutes default
  extended: 30 * 60 * 1000,     // 30 minutes for complex tasks
  maxInactivity: 5 * 60 * 1000, // 5 minutes of inactivity
  heartbeatInterval: 60 * 1000  // 60 seconds heartbeat
}
```

### Activity Tracking

```javascript
updateLastActivity(sessionId) {
  this.sessionLastActivity.set(sessionId, new Date());
}

checkInactivityTimeouts() {
  const now = new Date();
  
  for (const [sessionId, lastActivity] of this.sessionLastActivity) {
    const inactiveTime = now - lastActivity;
    
    if (inactiveTime > this.timeoutSettings.maxInactivity) {
      console.log(`Session ${sessionId} inactive for ${inactiveTime}ms, terminating...`);
      this.terminateSession(sessionId, 'Inactivity timeout');
    }
  }
}

// Periodic inactivity checks
setInterval(() => {
  this.checkInactivityTimeouts();
}, this.timeoutSettings.heartbeatInterval);
```

### Smart Timeout Management

```javascript
setSessionTimeout(sessionId, duration, taskComplexity = 'medium') {
  // Adjust timeout based on task complexity
  const timeoutDuration = this.calculateTimeout(duration, taskComplexity);
  
  const timeout = setTimeout(() => {
    const sessionData = this.activeProcesses.get(sessionId);
    if (sessionData) {
      console.log(`Session ${sessionId} timed out after ${timeoutDuration}ms`);
      this.terminateSession(sessionId, `Timeout after ${timeoutDuration / 1000}s`);
    }
  }, timeoutDuration);
  
  this.sessionTimeouts.set(sessionId, timeout);
}

calculateTimeout(baseDuration, complexity) {
  const multipliers = {
    'simple': 1.0,
    'medium': 1.5,
    'complex': 2.0,
    'enterprise': 3.0
  };
  
  const multiplier = multipliers[complexity] || 1.5;
  return Math.min(baseDuration * multiplier, this.timeoutSettings.extended);
}
```

## Resource Management & Cleanup

### Graceful Session Termination

```javascript
terminateSession(sessionId, reason) {
  const sessionData = this.activeProcesses.get(sessionId);
  
  if (sessionData) {
    console.log(`Terminating session ${sessionId}: ${reason}`);
    
    // Attempt graceful shutdown first
    try {
      sessionData.process.kill('SIGTERM');
      
      // Force kill after grace period
      setTimeout(() => {
        if (this.activeProcesses.has(sessionId)) {
          sessionData.process.kill('SIGKILL');
        }
      }, 5000);
      
    } catch (error) {
      console.error(`Error terminating session ${sessionId}:`, error);
    }
    
    // Clean up tracking data
    sessionData.reject(new Error(reason));
    this.activeProcesses.delete(sessionId);
  }
  
  this.clearSessionTimeout(sessionId);
  this.sessionLastActivity.delete(sessionId);
}
```

### Emergency Cleanup Procedures

```javascript
async emergencyCleanup() {
  console.log('🚨 Emergency cleanup: Terminating all Goose processes');
  
  const cleanupResults = {
    terminated: 0,
    failed: 0,
    orphaned: 0
  };
  
  // Terminate tracked processes
  for (const [sessionId, sessionData] of this.activeProcesses) {
    try {
      sessionData.process.kill('SIGKILL');
      sessionData.reject(new Error('Emergency cleanup'));
      cleanupResults.terminated++;
    } catch (error) {
      console.error(`Failed to terminate session ${sessionId}:`, error);
      cleanupResults.failed++;
    }
  }
  
  // Platform-specific orphaned process cleanup
  try {
    await this.killOrphanedGooseProcesses();
  } catch (error) {
    console.error('Failed to kill orphaned processes:', error);
  }
  
  // Clear all tracking data
  this.activeProcesses.clear();
  this.sessionTimeouts.clear();
  this.sessionLastActivity.clear();
  
  console.log('Emergency cleanup completed:', cleanupResults);
  return cleanupResults;
}
```

### Cross-Platform Process Discovery

```javascript
async killOrphanedGooseProcesses() {
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Windows: Use tasklist and taskkill
    return this.killWindowsGooseProcesses();
  } else {
    // Unix: Use pgrep and pkill
    return this.killUnixGooseProcesses();
  }
}

async killUnixGooseProcesses() {
  return new Promise((resolve, reject) => {
    const pgrep = spawn('pgrep', ['-f', 'goose'], { stdio: 'pipe' });
    let pids = '';
    
    pgrep.stdout.on('data', (data) => {
      pids += data.toString();
    });
    
    pgrep.on('close', (code) => {
      if (code === 0 && pids.trim()) {
        const pidList = pids.trim().split('\n');
        pidList.forEach(pid => {
          try {
            process.kill(parseInt(pid), 'SIGKILL');
            console.log(`Killed orphaned Goose process: ${pid}`);
          } catch (error) {
            console.error(`Failed to kill process ${pid}:`, error);
          }
        });
      }
      resolve(pidList?.length || 0);
    });
    
    pgrep.on('error', reject);
  });
}
```

## Installation & Configuration Management

### Goose CLI Verification

```javascript
async checkGooseInstallation() {
  return new Promise((resolve, reject) => {
    const goose = spawn('goose', ['--version'], { stdio: 'pipe' });
    
    let output = '';
    goose.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    goose.on('close', (code) => {
      if (code === 0) {
        const version = this.parseGooseVersion(output);
        resolve({
          installed: true,
          version: version,
          path: 'goose' // Assume in PATH
        });
      } else {
        resolve({
          installed: false,
          error: `Goose CLI not found or returned exit code ${code}`
        });
      }
    });
    
    goose.on('error', (error) => {
      resolve({
        installed: false,
        error: error.message
      });
    });
  });
}
```

### Configuration Discovery

```javascript
async getGooseConfig() {
  try {
    const configResult = await this.executeGooseCommand(['config', 'list']);
    return this.parseGooseConfig(configResult.output);
  } catch (error) {
    console.warn('Could not retrieve Goose configuration:', error);
    return {
      provider: 'unknown',
      model: 'unknown',
      available: false
    };
  }
}

parseGooseConfig(output) {
  const config = {};
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (line.includes('provider:')) {
      config.provider = line.split(':')[1]?.trim();
    }
    if (line.includes('model:')) {
      config.model = line.split(':')[1]?.trim();
    }
  }
  
  return {
    ...config,
    available: true,
    version: this.cachedVersion
  };
}
```

## Error Handling & Recovery

### Comprehensive Error Management

```javascript
handleGooseError(errorData, sessionId, socket) {
  const errorTypes = {
    PERMISSION_DENIED: /permission denied|access denied/i,
    FILE_NOT_FOUND: /no such file|file not found/i,
    NETWORK_ERROR: /network|connection|timeout/i,
    SYNTAX_ERROR: /syntax error|parse error/i,
    API_ERROR: /api error|rate limit|quota/i
  };
  
  let errorType = 'UNKNOWN';
  for (const [type, pattern] of Object.entries(errorTypes)) {
    if (pattern.test(errorData)) {
      errorType = type;
      break;
    }
  }
  
  const errorInfo = {
    sessionId,
    type: errorType,
    message: errorData.trim(),
    timestamp: new Date(),
    recoverable: this.isRecoverableError(errorType)
  };
  
  socket.emit('goose_error', errorInfo);
  
  // Attempt recovery for recoverable errors
  if (errorInfo.recoverable) {
    this.attemptErrorRecovery(sessionId, errorType, socket);
  }
}
```

### Recovery Mechanisms

```javascript
async attemptErrorRecovery(sessionId, errorType, socket) {
  const recoveryStrategies = {
    PERMISSION_DENIED: () => this.fixPermissions(sessionId),
    FILE_NOT_FOUND: () => this.createMissingDirectories(sessionId),
    NETWORK_ERROR: () => this.retryWithBackoff(sessionId),
    API_ERROR: () => this.handleApiError(sessionId)
  };
  
  const strategy = recoveryStrategies[errorType];
  if (strategy) {
    try {
      await strategy();
      socket.emit('goose_recovery_attempt', {
        sessionId,
        errorType,
        status: 'attempted',
        timestamp: new Date()
      });
    } catch (recoveryError) {
      socket.emit('goose_recovery_failed', {
        sessionId,
        errorType,
        error: recoveryError.message,
        timestamp: new Date()
      });
    }
  }
}
```

## Performance Monitoring

### Session Metrics

```javascript
// Track performance metrics per session
collectSessionMetrics(sessionId, result) {
  const sessionData = this.activeProcesses.get(sessionId) || this.completedSessions.get(sessionId);
  
  if (sessionData) {
    const metrics = {
      sessionId,
      duration: result.duration,
      success: result.success,
      outputLines: result.outputLines || 0,
      filesCreated: result.filesCreated || 0,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    };
    
    this.sessionMetrics.push(metrics);
    this.emit('metrics_collected', metrics);
  }
}
```

### Resource Usage Tracking

```javascript
monitorResourceUsage() {
  setInterval(() => {
    const activeCount = this.activeProcesses.size;
    const memUsage = process.memoryUsage();
    
    if (activeCount > 0) {
      this.io.emit('resource_usage', {
        activeProcesses: activeCount,
        memoryUsage: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        },
        timestamp: new Date()
      });
    }
  }, 30000); // Every 30 seconds
}
```

## TODOs & Future Enhancements

### High Priority
- [ ] **Advanced Output Parsing**: Machine learning-based output classification and progress detection
- [ ] **Process Sandboxing**: Container-based isolation for enhanced security
- [ ] **Distributed Execution**: Support for running Goose processes on remote machines
- [ ] **Performance Optimization**: Process pooling and reuse strategies

### Medium Priority
- [ ] **Plugin System**: Extensible output parsers for different development frameworks
- [ ] **Advanced Recovery**: Self-healing mechanisms for common failure scenarios
- [ ] **Resource Quotas**: CPU, memory, and disk usage limits per session
- [ ] **Session Persistence**: Resume interrupted sessions across server restarts

### Low Priority
- [ ] **Visual Process Monitor**: Real-time process tree visualization
- [ ] **Custom Goose Profiles**: Different Goose configurations for different project types
- [ ] **Integration Testing**: Automated testing framework for Goose integration
- [ ] **Performance Analytics**: Historical performance analysis and optimization recommendations

## Configuration Reference

### Environment Variables
```bash
# Goose CLI path (if not in system PATH)
GOOSE_CLI_PATH=/usr/local/bin/goose

# Default timeout settings (milliseconds)
GOOSE_DEFAULT_TIMEOUT=960000      # 16 minutes
GOOSE_EXTENDED_TIMEOUT=1800000    # 30 minutes
GOOSE_INACTIVITY_TIMEOUT=300000   # 5 minutes

# Process management settings
GOOSE_MAX_CONCURRENT_SESSIONS=10
GOOSE_GRACEFUL_SHUTDOWN_TIMEOUT=5000

# Resource monitoring
GOOSE_ENABLE_METRICS=true
GOOSE_METRICS_INTERVAL=30000
```

### Runtime Configuration
```javascript
// Dynamic configuration updates
gooseIntegration.updateTimeoutSettings({
  default: 20 * 60 * 1000,  // 20 minutes
  extended: 45 * 60 * 1000, // 45 minutes
  maxInactivity: 8 * 60 * 1000 // 8 minutes
});

// Enable/disable features
gooseIntegration.setFeatureFlags({
  enableMetrics: true,
  enableRecovery: true,
  enableResourceMonitoring: true
});
```

The Goose Integration system provides a robust, production-ready bridge to AI development capabilities, ensuring reliable process management, comprehensive monitoring, and graceful handling of all edge cases in the AI development workflow. 