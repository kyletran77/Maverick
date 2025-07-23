# Goose Session Cleanup System

This document describes the comprehensive goose session cleanup system implemented to ensure proper resource management and prevent orphaned processes.

## Overview

The Goose Session Cleanup System provides multiple layers of cleanup functionality:

1. **Manual cleanup commands** for immediate session termination
2. **Automatic cleanup routines** triggered by project completion/failure
3. **Graceful shutdown handling** when the server stops
4. **Health monitoring** and automatic orphaned session detection
5. **Emergency cleanup** for stuck or unresponsive processes

## Features

### 1. Close All Sessions

Immediately closes all active goose sessions with proper cleanup.

**API Endpoint:**
```http
POST /api/close-all-sessions
Content-Type: application/json

{
  "reason": "Manual cleanup request"
}
```

**Socket Event:**
```javascript
socket.emit('close_all_sessions', { reason: 'User requested cleanup' });
```

**CLI Command:**
```bash
npm run cleanup:sessions
# or
node scripts/close-goose-sessions.js close-all
```

### 2. Project-Based Cleanup

Automatically cleans up sessions when projects complete, fail, or are stopped.

**Usage in Code:**
```javascript
await gooseIntegration.cleanupProjectSessions(projectId, 'completed', socket);
```

**Supported Status Types:**
- `completed` - Normal project completion
- `failed` - Project failed or encountered errors
- `stopped` - Project manually stopped
- `cancelled` - Project cancelled by user
- `emergency` - Emergency cleanup situation

### 3. Emergency Cleanup

Performs aggressive cleanup including detection and termination of orphaned goose processes.

**API Endpoint:**
```http
POST /api/emergency-cleanup
```

**CLI Command:**
```bash
npm run cleanup:emergency
# or
node scripts/close-goose-sessions.js emergency-cleanup
```

**What Emergency Cleanup Does:**
- Closes all tracked sessions
- Searches for orphaned goose processes using platform-specific commands
- Attempts to kill orphaned processes with SIGTERM
- Provides detailed cleanup report

### 4. Session Health Monitoring

Continuously monitors session health and provides detailed reports.

**API Endpoint:**
```http
GET /api/active-sessions
```

**CLI Command:**
```bash
npm run cleanup:health
# or
node scripts/close-goose-sessions.js health-check
```

**Health Check Categories:**
- **Healthy Sessions** - Normal active sessions
- **Stuck Sessions** - Sessions inactive for 30+ minutes
- **Orphaned Sessions** - Sessions inactive for 1+ hours

### 5. Automatic Periodic Cleanup

The server automatically performs health checks every 10 minutes and cleans up orphaned sessions.

**Configuration:**
```javascript
// Runs every 10 minutes
setInterval(() => {
  const healthReport = gooseIntegration.performSessionHealthCheck();
  // Auto-cleanup orphaned sessions
}, 10 * 60 * 1000);
```

## Implementation Details

### Session Tracking

Sessions are tracked using multiple data structures:

```javascript
class GooseIntegration {
  constructor(io) {
    this.activeProcesses = new Map();    // sessionId -> { process, resolve, reject, startTime }
    this.sessionTimeouts = new Map();    // sessionId -> { heartbeatInterval, maxTimeout }
    this.sessionLastActivity = new Map(); // sessionId -> Date
  }
}
```

### Cleanup Methods

#### closeAllSessions(reason)
```javascript
closeAllSessions(reason = 'System shutdown') {
  const sessionIds = Array.from(this.activeProcesses.keys());
  let closedCount = 0;

  for (const sessionId of sessionIds) {
    try {
      this.terminateSession(sessionId, reason);
      closedCount++;
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error.message);
    }
  }

  // Clear all tracking maps
  this.activeProcesses.clear();
  this.sessionTimeouts.clear();
  this.sessionLastActivity.clear();

  return closedCount;
}
```

#### cleanupProjectSessions(projectId, status, socket)
```javascript
async cleanupProjectSessions(projectId, status = 'completed', socket = null) {
  // Find all sessions related to this project
  const sessionsToCleanup = [];
  for (const [sessionId] of this.activeProcesses.entries()) {
    if (sessionId.includes(projectId) || sessionId.startsWith(projectId)) {
      sessionsToCleanup.push(sessionId);
    }
  }

  // Cleanup each session
  for (const sessionId of sessionsToCleanup) {
    this.terminateSession(sessionId, `Project ${status}: ${projectId}`);
  }

  // Additional cleanup for failed/emergency status
  if (status === 'failed' || status === 'emergency') {
    setTimeout(() => this.emergencyCleanup(), 2000);
  }
}
```

### Graceful Shutdown

The server implements graceful shutdown handlers:

```javascript
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Starting graceful shutdown...`);
  
  // Close all active goose sessions
  const closedCount = gooseIntegration.closeAllSessions(`Server shutdown (${signal})`);
  
  // Close server with timeout
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## CLI Usage

The cleanup CLI provides easy access to all cleanup functions:

### Basic Commands

```bash
# Close all active sessions
npm run cleanup:sessions

# Check session health
npm run cleanup:health

# List active sessions
npm run cleanup:list

# Emergency cleanup
npm run cleanup:emergency
```

### Advanced Usage

```bash
# Use the CLI directly with options
node scripts/close-goose-sessions.js close-all
node scripts/close-goose-sessions.js health-check
node scripts/close-goose-sessions.js emergency-cleanup

# Set custom server host/port
SERVER_HOST=remote-server SERVER_PORT=8080 npm run cleanup:sessions
```

### CLI Output Examples

**Health Check:**
```
📊 Session Health Report:
Total Sessions: 3
Healthy: 1
Stuck: 1
Orphaned: 1

⚠️  Recommendations:
1. frontend-CreateLoginForm: Session may be stuck, monitor closely (35 minutes)
2. backend-SetupDatabase: Consider terminating this long-running session (75 minutes)

📋 Active Sessions:
1. orchestrator-MainTask (15m old, PID: 12345)
2. frontend-CreateLoginForm (35m old, PID: 12346)
3. backend-SetupDatabase (75m old, PID: 12347)
```

**Close All Sessions:**
```
🛑 Closing all active goose sessions...
✅ Closed 3 active goose sessions
📊 Sessions closed: 3
```

## Integration Points

### TaskOrchestrator Integration

The TaskOrchestrator automatically triggers cleanup:

```javascript
// On job completion
await this.gooseIntegration.cleanupProjectSessions(project.id, 'completed', socket);

// On job failure
await this.gooseIntegration.cleanupProjectSessions(job.projectId, 'failed', socket);

// On job stop
await this.gooseIntegration.cleanupProjectSessions(job.projectId, 'stopped', socket);
```

### Socket Events

Real-time cleanup notifications:

```javascript
// Session cleanup notification
socket.emit('session_cleanup', {
  sessionId,
  projectId,
  status: 'cleaned_up',
  reason: cleanupReason
});

// Project cleanup completed
socket.emit('project_cleanup_completed', {
  projectId,
  status,
  cleanedSessionsCount,
  failedCleanupCount
});
```

## Error Handling

The cleanup system includes comprehensive error handling:

1. **Individual session failures** don't stop overall cleanup
2. **Process already dead** errors are handled gracefully
3. **Permission errors** are logged but don't crash the system
4. **Network errors** in CLI are handled with helpful messages

## Platform Support

The emergency cleanup supports multiple platforms:

- **Unix/Linux/macOS**: Uses `pgrep` to find goose processes
- **Windows**: Uses `tasklist` to find goose.exe processes

## Best Practices

1. **Use project-based cleanup** when possible for targeted cleanup
2. **Run health checks** periodically to monitor session health
3. **Use emergency cleanup** only when normal cleanup fails
4. **Monitor logs** for cleanup success/failure messages
5. **Set up automated monitoring** to detect stuck sessions early

## Troubleshooting

### Common Issues

**Sessions won't terminate:**
```bash
# Try emergency cleanup
npm run cleanup:emergency

# Check if processes are still running
ps aux | grep goose  # Unix/Linux/macOS
tasklist | findstr goose  # Windows
```

**CLI can't connect to server:**
```bash
# Check if server is running
curl http://localhost:3000/api/active-sessions

# Try with custom host/port
SERVER_HOST=localhost SERVER_PORT=3000 npm run cleanup:health
```

**Orphaned processes persist:**
```bash
# Manual process killing (Unix/Linux/macOS)
pkill -f goose

# Manual process killing (Windows)
taskkill /f /im goose.exe
```

### Logging

All cleanup operations are logged with detailed information:

```
[session-id] Terminating session: Project completed: project-123
Project cleanup completed: {
  projectId: 'project-123',
  status: 'completed',
  cleanedSessionsCount: 3,
  failedCleanupCount: 0,
  totalAttempted: 3
}
```

## Configuration

### Timeout Settings

```javascript
this.timeoutSettings = {
  default: 15 * 60 * 1000,      // 15 minutes default
  extended: 30 * 60 * 1000,     // 30 minutes for complex tasks
  maxInactivity: 5 * 60 * 1000, // 5 minutes of inactivity
  heartbeatInterval: 60 * 1000  // 60 seconds
};
```

### Health Check Thresholds

```javascript
const stuckThreshold = 30 * 60 * 1000;    // 30 minutes
const orphanedThreshold = 60 * 60 * 1000; // 1 hour
```

These can be adjusted based on your typical task completion times and system requirements. 