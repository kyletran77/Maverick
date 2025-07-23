#!/usr/bin/env node

/**
 * Goose Sessions Cleanup CLI
 * 
 * This script can be used to close all active goose sessions and perform cleanup operations.
 * Usage:
 *   node scripts/close-goose-sessions.js [command] [options]
 * 
 * Commands:
 *   close-all           Close all active sessions using Goose CLI
 *   emergency-cleanup   Perform emergency cleanup (including orphaned processes)
 *   health-check        Show session health report
 *   list                List all active sessions
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

class GooseSessionCLI {
  constructor() {
    this.commands = {
      'close-all': this.closeAllSessions.bind(this),
      'emergency-cleanup': this.emergencyCleanup.bind(this),
      'health-check': this.healthCheck.bind(this),
      'list': this.listSessions.bind(this),
      'help': this.showHelp.bind(this)
    };

    // Determine session directory based on platform
    this.sessionDir = this.getSessionDirectory();
  }

  getSessionDirectory() {
    if (process.platform === 'win32') {
      return path.join(process.env.APPDATA, 'Block', 'goose', 'data', 'sessions');
    } else {
      return path.join(os.homedir(), '.local', 'share', 'goose', 'sessions');
    }
  }

  async runGooseCommand(args) {
    return new Promise((resolve, reject) => {
      const gooseProcess = spawn('goose', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      gooseProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      gooseProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      gooseProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Goose command failed with code ${code}: ${stderr || stdout}`));
        }
      });

      gooseProcess.on('error', (error) => {
        reject(new Error(`Failed to run goose command: ${error.message}`));
      });
    });
  }

  async listAllSessions() {
    try {
      const result = await this.runGooseCommand(['session', 'list', '--format', 'json']);
      return JSON.parse(result.stdout);
    } catch (error) {
      console.warn('Failed to get session list via CLI, checking session directory...');
      // Fallback: list sessions from filesystem
      try {
        const files = await fs.readdir(this.sessionDir);
        const sessionFiles = files.filter(f => f.endsWith('.jsonl'));
        return sessionFiles.map(f => ({
          id: f.replace('.jsonl', ''),
          filename: f,
          path: path.join(this.sessionDir, f)
        }));
      } catch (fsError) {
        throw new Error(`Cannot access sessions: ${error.message}. Session directory: ${this.sessionDir}`);
      }
    }
  }

  async closeAllSessions() {
    console.log('🛑 Closing all active goose sessions...');
    
    try {
      // First, try to list all sessions
      const sessions = await this.listAllSessions();
      
      if (sessions.length === 0) {
        console.log('✅ No active sessions found');
        return;
      }

      console.log(`📊 Found ${sessions.length} session(s) to close`);
      
      let closedCount = 0;
      let failedCount = 0;

      // Remove each session using the CLI
      for (const session of sessions) {
        try {
          const sessionId = session.id || session.filename?.replace('.jsonl', '');
          if (sessionId) {
            await this.runGooseCommand(['session', 'remove', '-i', sessionId]);
            console.log(`✅ Closed session: ${sessionId}`);
            closedCount++;
          }
        } catch (error) {
          console.warn(`⚠️  Failed to close session ${session.id || session.filename}: ${error.message}`);
          failedCount++;
        }
      }
      
      console.log(`\n📊 Summary:`);
      console.log(`✅ Sessions closed: ${closedCount}`);
      if (failedCount > 0) {
        console.log(`❌ Failed to close: ${failedCount}`);
      }

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      console.log('💡 Make sure Goose CLI is installed and accessible');
      process.exit(1);
    }
  }

  async emergencyCleanup() {
    console.log('🚨 Starting emergency cleanup...');
    
    try {
      // First, try normal session cleanup
      await this.closeAllSessions();
      
      // Then try to kill any orphaned goose processes
      console.log('\n🔍 Searching for orphaned goose processes...');
      
      let killCommand, killArgs;
      if (process.platform === 'win32') {
        // Windows: use taskkill to terminate goose processes
        killCommand = 'taskkill';
        killArgs = ['/F', '/IM', 'goose.exe'];
      } else {
        // Unix-like: use pkill to terminate goose processes
        killCommand = 'pkill';
        killArgs = ['-f', 'goose'];
      }

      try {
        const { stdout, stderr } = await execAsync(`${killCommand} ${killArgs.join(' ')}`);
        if (stdout || stderr) {
          console.log('✅ Terminated orphaned goose processes');
        } else {
          console.log('✅ No orphaned goose processes found');
        }
      } catch (killError) {
        // pkill/taskkill returns non-zero when no processes found, which is normal
        if (killError.code === 1 || killError.message.includes('No tasks are running')) {
          console.log('✅ No orphaned goose processes found');
        } else {
          console.warn(`⚠️  Could not kill orphaned processes: ${killError.message}`);
        }
      }

      console.log('✅ Emergency cleanup completed');

    } catch (error) {
      console.error(`❌ Emergency cleanup failed: ${error.message}`);
      process.exit(1);
    }
  }

  async healthCheck() {
    console.log('🔍 Checking session health...');
    
    try {
      const sessions = await this.listAllSessions();
      
      console.log(`\n📊 Session Health Report:`);
      console.log(`Total Sessions: ${sessions.length}`);
      
      if (sessions.length === 0) {
        console.log('✅ No active sessions');
        return;
      }

      let healthySessions = 0;
      let stuckSessions = 0;
      let oldSessions = 0;
      const recommendations = [];

      const now = new Date();
      
      // Check each session file for age and potential issues
      for (const session of sessions) {
        try {
          const sessionPath = session.path || path.join(this.sessionDir, session.filename);
          const stats = await fs.stat(sessionPath);
          const ageHours = (now - stats.mtime) / (1000 * 60 * 60);
          
          if (ageHours > 24) {
            oldSessions++;
            recommendations.push({
              sessionId: session.id || session.filename,
              issue: 'old',
              suggestion: 'Consider removing old session',
              age: `${Math.round(ageHours)} hours old`
            });
          } else if (ageHours > 2) {
            stuckSessions++;
            recommendations.push({
              sessionId: session.id || session.filename,
              issue: 'potentially stuck',
              suggestion: 'Monitor this session',
              age: `${Math.round(ageHours)} hours old`
            });
          } else {
            healthySessions++;
          }
        } catch (statError) {
          recommendations.push({
            sessionId: session.id || session.filename,
            issue: 'inaccessible',
            suggestion: 'Session file may be corrupted',
            error: statError.message
          });
        }
      }

      console.log(`Healthy: ${healthySessions}`);
      console.log(`Potentially Stuck: ${stuckSessions}`);
      console.log(`Old Sessions: ${oldSessions}`);
      
      if (recommendations.length > 0) {
        console.log(`\n⚠️  Recommendations:`);
        recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.sessionId}: ${rec.suggestion} (${rec.age || rec.error})`);
        });
      }
      
      if (sessions.length > 0) {
        console.log(`\n📋 Active Sessions:`);
        sessions.forEach((session, index) => {
          console.log(`${index + 1}. ${session.id || session.filename}`);
        });
      }

    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      process.exit(1);
    }
  }

  async listSessions() {
    console.log('📋 Listing active sessions...');
    await this.healthCheck();
  }

  showHelp() {
    console.log(`
🦆 Goose Sessions Cleanup CLI

Usage: node scripts/close-goose-sessions.js [command]

Commands:
  close-all           Close all active goose sessions using official CLI
  emergency-cleanup   Perform emergency cleanup (including orphaned processes)
  health-check        Show detailed session health report
  list                List all active sessions
  help                Show this help message

Examples:
  node scripts/close-goose-sessions.js close-all
  node scripts/close-goose-sessions.js health-check
  node scripts/close-goose-sessions.js emergency-cleanup

Requirements:
  - Goose CLI must be installed and accessible in PATH
  - Session directory: ${this.sessionDir}
`);
  }

  async run() {
    const command = process.argv[2] || 'help';
    
    if (this.commands[command]) {
      await this.commands[command]();
    } else {
      console.error(`❌ Unknown command: ${command}`);
      this.showHelp();
      process.exit(1);
    }
  }
}

// Run the CLI
if (require.main === module) {
  const cli = new GooseSessionCLI();
  cli.run().catch((error) => {
    console.error('❌ CLI Error:', error.message);
    process.exit(1);
  });
}

module.exports = GooseSessionCLI; 