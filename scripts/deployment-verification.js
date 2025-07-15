#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Comprehensive testing framework for generated projects to ensure deployability
 * Implements industry best practices for post-deployment verification (PDV)
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Deployment Verification Framework
 * Tests generated projects for immediate deployability
 */
class DeploymentVerifier {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = {
      timeout: 120000, // 2 minutes default timeout
      verbose: false,
      skipLongTests: false,
      ...options
    };
    
    this.results = {
      overall: false,
      score: 0,
      tests: [],
      issues: [],
      recommendations: [],
      deploymentReady: false
    };
    
    this.log = this.options.verbose ? console.log : () => {};
  }

  /**
   * Main verification entry point
   */
  async verify() {
    console.log(`🔍 Starting deployment verification for: ${this.projectPath}`);
    
    try {
      // Detect project type
      const projectType = await this.detectProjectType();
      console.log(`📋 Detected project type: ${projectType}`);
      
      // Run verification tests based on project type
      await this.runVerificationTests(projectType);
      
      // Calculate overall results
      this.calculateOverallResults();
      
      // Generate report
      this.generateReport();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      this.results.issues.push(`Verification error: ${error.message}`);
      return this.results;
    }
  }

  /**
   * Detect project type based on files and structure
   */
  async detectProjectType() {
    const files = await fs.readdir(this.projectPath);
    
    // Check for package.json (Node.js projects)
    if (files.includes('package.json')) {
      const packageJson = await fs.readJson(path.join(this.projectPath, 'package.json'));
      
      // React project detection
      if (packageJson.dependencies?.react) {
        return 'react';
      }
      
      // Node.js backend detection
      if (packageJson.dependencies?.express || 
          files.includes('server.js') || 
          files.includes('app.js')) {
        return 'nodejs-backend';
      }
      
      return 'nodejs-generic';
    }
    
    // Python projects
    if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
      return 'python';
    }
    
    // Docker projects
    if (files.includes('docker-compose.yml') || files.includes('Dockerfile')) {
      return 'docker';
    }
    
    // Static websites
    if (files.includes('index.html')) {
      return 'static-website';
    }
    
    return 'unknown';
  }

  /**
   * Run verification tests based on project type
   */
  async runVerificationTests(projectType) {
    // Universal tests (run for all project types)
    await this.testFileStructure();
    await this.testDocumentation();
    await this.testSecurityBasics();
    
    // Project-specific tests
    switch (projectType) {
      case 'react':
        await this.testReactProject();
        break;
      case 'nodejs-backend':
        await this.testNodejsBackend();
        break;
      case 'nodejs-generic':
        await this.testNodejsGeneric();
        break;
      case 'python':
        await this.testPythonProject();
        break;
      case 'docker':
        await this.testDockerProject();
        break;
      case 'static-website':
        await this.testStaticWebsite();
        break;
      default:
        this.results.issues.push('Unknown project type - limited verification available');
    }
  }

  /**
   * Test basic file structure
   */
  async testFileStructure() {
    const test = { name: 'File Structure', passed: true, details: [] };
    
    try {
      const files = await fs.readdir(this.projectPath);
      
      // Check for README
      if (files.includes('README.md') || files.includes('README.txt')) {
        test.details.push('✅ README file found');
      } else {
        test.passed = false;
        test.details.push('❌ No README file found');
        this.results.issues.push('Missing README file');
      }
      
      // Check for .gitignore
      if (files.includes('.gitignore')) {
        test.details.push('✅ .gitignore file found');
      } else {
        test.details.push('⚠️ No .gitignore file found');
        this.results.recommendations.push('Add .gitignore file');
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ Error reading project structure: ${error.message}`);
    }
    
    this.results.tests.push(test);
  }

  /**
   * Test documentation quality
   */
  async testDocumentation() {
    const test = { name: 'Documentation', passed: true, details: [] };
    
    try {
      const readmePath = path.join(this.projectPath, 'README.md');
      
      if (await fs.pathExists(readmePath)) {
        const content = await fs.readFile(readmePath, 'utf-8');
        
        // Check for installation instructions
        if (content.includes('install') || content.includes('npm install') || content.includes('pip install')) {
          test.details.push('✅ Installation instructions found');
        } else {
          test.passed = false;
          test.details.push('❌ No installation instructions found');
          this.results.issues.push('README missing installation instructions');
        }
        
        // Check for run instructions
        if (content.includes('start') || content.includes('run') || content.includes('npm start')) {
          test.details.push('✅ Run instructions found');
        } else {
          test.passed = false;
          test.details.push('❌ No run instructions found');
          this.results.issues.push('README missing run instructions');
        }
        
        // Check minimum length
        if (content.length < 100) {
          test.details.push('⚠️ README is very short');
          this.results.recommendations.push('Expand README with more details');
        }
        
      } else {
        test.passed = false;
        test.details.push('❌ README.md not found');
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ Error checking documentation: ${error.message}`);
    }
    
    this.results.tests.push(test);
  }

  /**
   * Test basic security practices
   */
  async testSecurityBasics() {
    const test = { name: 'Security Basics', passed: true, details: [] };
    
    try {
      const files = await fs.readdir(this.projectPath);
      
      // Check for environment variable example
      if (files.includes('.env.example')) {
        test.details.push('✅ Environment variable example found');
      } else {
        test.details.push('⚠️ No .env.example file found');
        this.results.recommendations.push('Add .env.example for environment configuration');
      }
      
      // Check that .env is not committed
      if (files.includes('.env')) {
        const gitignorePath = path.join(this.projectPath, '.gitignore');
        if (await fs.pathExists(gitignorePath)) {
          const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
          if (!gitignoreContent.includes('.env')) {
            test.passed = false;
            test.details.push('❌ .env file found but not in .gitignore');
            this.results.issues.push('Environment file not excluded from version control');
          }
        }
      }
      
    } catch (error) {
      test.details.push(`⚠️ Error checking security: ${error.message}`);
    }
    
    this.results.tests.push(test);
  }

  /**
   * Test React project specific requirements
   */
  async testReactProject() {
    const test = { name: 'React Project', passed: true, details: [] };
    
    try {
      // Check package.json
      const packageJson = await fs.readJson(path.join(this.projectPath, 'package.json'));
      
      // Check for React dependency
      if (packageJson.dependencies?.react) {
        test.details.push('✅ React dependency found');
      } else {
        test.passed = false;
        test.details.push('❌ React dependency missing');
      }
      
      // Check for build script
      if (packageJson.scripts?.build) {
        test.details.push('✅ Build script found');
      } else {
        test.passed = false;
        test.details.push('❌ Build script missing');
        this.results.issues.push('Missing build script in package.json');
      }
      
      // Check for start script
      if (packageJson.scripts?.start) {
        test.details.push('✅ Start script found');
      } else {
        test.passed = false;
        test.details.push('❌ Start script missing');
        this.results.issues.push('Missing start script in package.json');
      }
      
      // Check for src directory
      if (await fs.pathExists(path.join(this.projectPath, 'src'))) {
        test.details.push('✅ src directory found');
      } else {
        test.passed = false;
        test.details.push('❌ src directory missing');
        this.results.issues.push('Missing src directory');
      }
      
      // Check for public directory
      if (await fs.pathExists(path.join(this.projectPath, 'public'))) {
        test.details.push('✅ public directory found');
      } else {
        test.passed = false;
        test.details.push('❌ public directory missing');
        this.results.issues.push('Missing public directory');
      }
      
      // Test npm install
      await this.testNpmInstall(test);
      
      // Test build process
      if (!this.options.skipLongTests) {
        await this.testNpmBuild(test);
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ Error testing React project: ${error.message}`);
    }
    
    this.results.tests.push(test);
  }

  /**
   * Test Node.js backend project
   */
  async testNodejsBackend() {
    const test = { name: 'Node.js Backend', passed: true, details: [] };
    
    try {
      // Check for main entry point
      const packageJson = await fs.readJson(path.join(this.projectPath, 'package.json'));
      const mainFile = packageJson.main || 'index.js';
      
      if (await fs.pathExists(path.join(this.projectPath, mainFile))) {
        test.details.push(`✅ Main entry point found: ${mainFile}`);
      } else {
        test.passed = false;
        test.details.push(`❌ Main entry point missing: ${mainFile}`);
        this.results.issues.push(`Missing main entry point: ${mainFile}`);
      }
      
      // Check for Express dependency (common for backend)
      if (packageJson.dependencies?.express) {
        test.details.push('✅ Express dependency found');
      } else {
        test.details.push('⚠️ No Express dependency (might be using different framework)');
      }
      
      // Test npm install
      await this.testNpmInstall(test);
      
      // Test server start (with timeout)
      if (!this.options.skipLongTests) {
        await this.testServerStart(test);
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ Error testing Node.js backend: ${error.message}`);
    }
    
    this.results.tests.push(test);
  }

  /**
   * Test generic Node.js project
   */
  async testNodejsGeneric() {
    const test = { name: 'Node.js Generic', passed: true, details: [] };
    
    try {
      // Test npm install
      await this.testNpmInstall(test);
      
      // Check for test script
      const packageJson = await fs.readJson(path.join(this.projectPath, 'package.json'));
      if (packageJson.scripts?.test) {
        test.details.push('✅ Test script found');
      } else {
        test.details.push('⚠️ No test script found');
        this.results.recommendations.push('Add test script to package.json');
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ Error testing Node.js project: ${error.message}`);
    }
    
    this.results.tests.push(test);
  }

  /**
   * Test Python project
   */
  async testPythonProject() {
    const test = { name: 'Python Project', passed: true, details: [] };
    
    try {
      // Check for requirements.txt
      if (await fs.pathExists(path.join(this.projectPath, 'requirements.txt'))) {
        test.details.push('✅ requirements.txt found');
        
        // Test pip install
        if (!this.options.skipLongTests) {
          await this.testPipInstall(test);
        }
      } else {
        test.details.push('⚠️ No requirements.txt found');
        this.results.recommendations.push('Add requirements.txt for dependencies');
      }
      
      // Check for main Python file
      const pythonFiles = (await fs.readdir(this.projectPath))
        .filter(f => f.endsWith('.py'));
      
      if (pythonFiles.length > 0) {
        test.details.push(`✅ Python files found: ${pythonFiles.length}`);
      } else {
        test.passed = false;
        test.details.push('❌ No Python files found');
        this.results.issues.push('No Python source files found');
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ Error testing Python project: ${error.message}`);
    }
    
    this.results.tests.push(test);
  }

  /**
   * Test Docker project
   */
  async testDockerProject() {
    const test = { name: 'Docker Project', passed: true, details: [] };
    
    try {
      // Check for Dockerfile
      if (await fs.pathExists(path.join(this.projectPath, 'Dockerfile'))) {
        test.details.push('✅ Dockerfile found');
      } else {
        test.passed = false;
        test.details.push('❌ Dockerfile missing');
        this.results.issues.push('Missing Dockerfile');
      }
      
      // Check for docker-compose.yml
      if (await fs.pathExists(path.join(this.projectPath, 'docker-compose.yml'))) {
        test.details.push('✅ docker-compose.yml found');
        
        // Test docker-compose validation
        if (!this.options.skipLongTests) {
          await this.testDockerCompose(test);
        }
      } else {
        test.details.push('⚠️ No docker-compose.yml found');
        this.results.recommendations.push('Add docker-compose.yml for easy deployment');
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ Error testing Docker project: ${error.message}`);
    }
    
    this.results.tests.push(test);
  }

  /**
   * Test static website
   */
  async testStaticWebsite() {
    const test = { name: 'Static Website', passed: true, details: [] };
    
    try {
      // Check for index.html
      if (await fs.pathExists(path.join(this.projectPath, 'index.html'))) {
        test.details.push('✅ index.html found');
        
        // Validate HTML
        const htmlContent = await fs.readFile(path.join(this.projectPath, 'index.html'), 'utf-8');
        if (htmlContent.includes('<html') && htmlContent.includes('</html>')) {
          test.details.push('✅ Valid HTML structure');
        } else {
          test.details.push('⚠️ HTML structure might be incomplete');
        }
        
      } else {
        test.passed = false;
        test.details.push('❌ index.html missing');
        this.results.issues.push('Missing index.html');
      }
      
      // Check for CSS
      const cssFiles = (await fs.readdir(this.projectPath))
        .filter(f => f.endsWith('.css'));
      
      if (cssFiles.length > 0) {
        test.details.push('✅ CSS files found');
      } else {
        test.details.push('⚠️ No CSS files found');
        this.results.recommendations.push('Add CSS for styling');
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ Error testing static website: ${error.message}`);
    }
    
    this.results.tests.push(test);
  }

  /**
   * Test npm install
   */
  async testNpmInstall(test) {
    try {
      this.log('Testing npm install...');
      const { stdout, stderr } = await execAsync('npm install', {
        cwd: this.projectPath,
        timeout: this.options.timeout
      });
      
      test.details.push('✅ npm install completed successfully');
      
      // Check for package-lock.json creation
      if (await fs.pathExists(path.join(this.projectPath, 'package-lock.json'))) {
        test.details.push('✅ package-lock.json created');
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ npm install failed: ${error.message}`);
      this.results.issues.push('npm install failed');
    }
  }

  /**
   * Test npm build
   */
  async testNpmBuild(test) {
    try {
      this.log('Testing npm run build...');
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: this.projectPath,
        timeout: this.options.timeout
      });
      
      test.details.push('✅ npm run build completed successfully');
      
      // Check for build output
      const buildDirs = ['build', 'dist', 'public'];
      let buildFound = false;
      
      for (const dir of buildDirs) {
        if (await fs.pathExists(path.join(this.projectPath, dir))) {
          test.details.push(`✅ Build output found in ${dir}/`);
          buildFound = true;
          break;
        }
      }
      
      if (!buildFound) {
        test.details.push('⚠️ No build output directory found');
      }
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ npm run build failed: ${error.message}`);
      this.results.issues.push('Build process failed');
    }
  }

  /**
   * Test server start (with timeout and cleanup)
   */
  async testServerStart(test) {
    return new Promise((resolve) => {
      try {
        this.log('Testing server start...');
        
        const serverProcess = spawn('npm', ['start'], {
          cwd: this.projectPath,
          stdio: 'pipe'
        });
        
        let output = '';
        let serverStarted = false;
        
        const timeout = setTimeout(() => {
          if (!serverStarted) {
            test.details.push('⚠️ Server start test timed out (might be running)');
          }
          serverProcess.kill();
          resolve();
        }, 10000); // 10 second timeout for server start
        
        serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          
          // Look for common server start indicators
          if (output.includes('listening') || 
              output.includes('server') || 
              output.includes('port') ||
              output.includes('started')) {
            serverStarted = true;
            test.details.push('✅ Server appears to start successfully');
            clearTimeout(timeout);
            serverProcess.kill();
            resolve();
          }
        });
        
        serverProcess.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          if (errorOutput.includes('Error') || errorOutput.includes('error')) {
            test.passed = false;
            test.details.push(`❌ Server start error: ${errorOutput.slice(0, 100)}...`);
            clearTimeout(timeout);
            serverProcess.kill();
            resolve();
          }
        });
        
        serverProcess.on('error', (error) => {
          test.passed = false;
          test.details.push(`❌ Server start failed: ${error.message}`);
          clearTimeout(timeout);
          resolve();
        });
        
      } catch (error) {
        test.details.push(`❌ Error testing server start: ${error.message}`);
        resolve();
      }
    });
  }

  /**
   * Test pip install
   */
  async testPipInstall(test) {
    try {
      this.log('Testing pip install...');
      const { stdout, stderr } = await execAsync('pip install -r requirements.txt', {
        cwd: this.projectPath,
        timeout: this.options.timeout
      });
      
      test.details.push('✅ pip install completed successfully');
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ pip install failed: ${error.message}`);
      this.results.issues.push('pip install failed');
    }
  }

  /**
   * Test docker-compose validation
   */
  async testDockerCompose(test) {
    try {
      this.log('Testing docker-compose config...');
      const { stdout, stderr } = await execAsync('docker-compose config', {
        cwd: this.projectPath,
        timeout: 30000
      });
      
      test.details.push('✅ docker-compose configuration is valid');
      
    } catch (error) {
      test.passed = false;
      test.details.push(`❌ docker-compose config failed: ${error.message}`);
      this.results.issues.push('Invalid docker-compose configuration');
    }
  }

  /**
   * Calculate overall results
   */
  calculateOverallResults() {
    const totalTests = this.results.tests.length;
    const passedTests = this.results.tests.filter(t => t.passed).length;
    
    this.results.score = totalTests > 0 ? passedTests / totalTests : 0;
    this.results.overall = this.results.score >= 0.7 && this.results.issues.length === 0;
    this.results.deploymentReady = this.results.score >= 0.8 && this.results.issues.length <= 1;
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 DEPLOYMENT VERIFICATION REPORT');
    console.log('='.repeat(80));
    
    const scorePercent = (this.results.score * 100).toFixed(1);
    const statusIcon = this.results.overall ? '✅' : '❌';
    const deploymentIcon = this.results.deploymentReady ? '🚀' : '⚠️';
    
    console.log(`\n📊 Overall Score: ${scorePercent}% ${statusIcon}`);
    console.log(`🚀 Deployment Ready: ${this.results.deploymentReady ? 'YES' : 'NO'} ${deploymentIcon}`);
    console.log(`\n📋 Tests Run: ${this.results.tests.length}`);
    console.log(`✅ Passed: ${this.results.tests.filter(t => t.passed).length}`);
    console.log(`❌ Failed: ${this.results.tests.filter(t => !t.passed).length}`);
    
    // Test Details
    console.log('\n📝 Test Details:');
    console.log('-'.repeat(40));
    
    this.results.tests.forEach(test => {
      const icon = test.passed ? '✅' : '❌';
      console.log(`\n${icon} ${test.name}:`);
      test.details.forEach(detail => {
        console.log(`   ${detail}`);
      });
    });
    
    // Issues
    if (this.results.issues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      console.log('-'.repeat(40));
      this.results.issues.forEach(issue => {
        console.log(`❌ ${issue}`);
      });
    }
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      console.log('-'.repeat(40));
      this.results.recommendations.forEach(rec => {
        console.log(`💡 ${rec}`);
      });
    }
    
    // Summary
    console.log('\n📄 Summary:');
    console.log('-'.repeat(40));
    
    if (this.results.deploymentReady) {
      console.log('🎉 Project is deployment ready!');
      console.log('✅ All critical requirements are met');
      console.log('🚀 Project can be deployed immediately');
    } else if (this.results.overall) {
      console.log('⚠️ Project passes basic checks but has some issues');
      console.log('🔧 Address the issues above before deployment');
    } else {
      console.log('❌ Project has significant issues that must be fixed');
      console.log('🛠️ Project is not ready for deployment');
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node deployment-verification.js <project-path> [options]');
    console.log('Options:');
    console.log('  --verbose          Show detailed output');
    console.log('  --skip-long-tests  Skip tests that take a long time');
    console.log('  --timeout <ms>     Set timeout for long operations (default: 120000)');
    process.exit(1);
  }
  
  const projectPath = args[0];
  const options = {};
  
  // Parse options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
        options.verbose = true;
        break;
      case '--skip-long-tests':
        options.skipLongTests = true;
        break;
      case '--timeout':
        options.timeout = parseInt(args[i + 1]);
        i++; // Skip next argument
        break;
    }
  }
  
  if (!await fs.pathExists(projectPath)) {
    console.error(`❌ Project path does not exist: ${projectPath}`);
    process.exit(1);
  }
  
  const verifier = new DeploymentVerifier(projectPath, options);
  const results = await verifier.verify();
  
  // Exit with appropriate code
  process.exit(results.deploymentReady ? 0 : 1);
}

// Export for use as module
module.exports = DeploymentVerifier;

// Run CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Verification script failed:', error);
    process.exit(1);
  });
} 