#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const QAEngineer = require('../backend/src/orchestrator/QAEngineer');

/**
 * Comprehensive test for enhanced QA system
 */
async function testEnhancedQASystem() {
    console.log('🧪 Testing Enhanced QA Verification System\n');

    const qaEngineer = new QAEngineer();
    
    // Create a test project directory
    const testProjectPath = path.join(__dirname, '..', 'test-qa-project');
    
    try {
        // Clean up any existing test project
        if (await fs.pathExists(testProjectPath)) {
            await fs.remove(testProjectPath);
        }
        
        await fs.ensureDir(testProjectPath);
        
        // Create test project files
        console.log('📁 Creating test project...');
        await createTestProject(testProjectPath);
        
        // Mock socket for testing
        const mockSocket = {
            emit: (event, data) => {
                console.log(`📡 Socket Event: ${event}`, data);
            }
        };
        
        // Test task object
        const testTask = {
            id: 'test-task-123',
            title: 'Test Node.js Project',
            type: 'backend',
            projectPath: testProjectPath
        };
        
        console.log('\n🔍 Running QA Verification...\n');
        
        // Run the enhanced QA verification  
        const result = await qaEngineer.verifyTaskCompletion('test-project', testTask.id, testTask, testProjectPath, mockSocket);
        
        console.log('\n📊 QA Verification Results:');
        console.log('=================================');
        console.log(`✅ Passed: ${result.passed}`);
        console.log(`📊 Score: ${(result.score * 100).toFixed(1)}%`);
        console.log(`🔍 Steps Completed: ${result.details.length}`);
        
        if (result.issues.length > 0) {
            console.log('\n❌ Issues Found:');
            result.issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }
        
        if (result.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            result.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }
        
        console.log('\n📋 Detailed Step Results:');
        result.details.forEach((step, index) => {
            const scorePercent = step.maxScore > 0 ? ((step.score / step.maxScore) * 100).toFixed(1) : 'N/A';
            console.log(`   ${index + 1}. ${step.name}: ${scorePercent}% (${step.score}/${step.maxScore})`);
        });
        
        // Validate scoring doesn't exceed 100%
        console.log('\n🔬 Scoring Validation:');
        const overallScorePercent = result.score * 100;
        console.log(`Overall Score: ${overallScorePercent.toFixed(1)}%`);
        
        if (overallScorePercent > 100) {
            console.log('❌ ERROR: Score exceeds 100%! This indicates a scoring calculation bug.');
            return false;
        } else {
            console.log('✅ Score calculation is correct (≤ 100%)');
        }
        
        // Check if test files were generated
        console.log('\n🧪 Test Generation Validation:');
        const testFiles = [
            path.join(testProjectPath, 'tests', 'basic.test.js'),
            path.join(testProjectPath, 'tests', 'integration.test.js'),
            path.join(testProjectPath, '.qa-test-results.json')
        ];
        
        for (const testFile of testFiles) {
            if (await fs.pathExists(testFile)) {
                console.log(`✅ Generated: ${path.relative(testProjectPath, testFile)}`);
            } else {
                console.log(`❌ Missing: ${path.relative(testProjectPath, testFile)}`);
            }
        }
        
        console.log('\n✅ Enhanced QA System Test Completed Successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        console.error(error.stack);
        return false;
    } finally {
        // Clean up test project
        if (await fs.pathExists(testProjectPath)) {
            await fs.remove(testProjectPath);
            console.log('\n🧹 Cleaned up test project');
        }
    }
}

/**
 * Create a realistic test project for QA verification
 */
async function createTestProject(projectPath) {
    // Create package.json
    const packageJson = {
        name: 'test-qa-project',
        version: '1.0.0',
        description: 'Test project for QA verification',
        main: 'index.js',
        scripts: {
            start: 'node index.js',
            build: 'echo "Build completed"',
            test: 'echo "Tests disabled to prevent infinite loops"'
        },
        dependencies: {
            express: '^4.18.0'
        },
        devDependencies: {
            jest: '^29.0.0'
        }
    };
    
    await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
    
    // Create main application file
    const indexJs = `
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello World from Test Project!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(\`Test server running on port \${port}\`);
  });
}

module.exports = app;
`;
    
    await fs.writeFile(path.join(projectPath, 'index.js'), indexJs.trim());
    
    // Create README.md
    const readme = `
# Test QA Project

This is a test project for QA verification system validation.

## Features
- Express.js server
- Health check endpoint
- Test-ready structure

## Usage
\`\`\`bash
npm start
\`\`\`

## Testing
\`\`\`bash
npm test
\`\`\`
`;
    
    await fs.writeFile(path.join(projectPath, 'README.md'), readme.trim());
    
    // Create .gitignore
    const gitignore = `
node_modules/
.env
*.log
.DS_Store
`;
    
    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore.trim());
    
    // Create tests directory (will be populated by QA system)
    await fs.ensureDir(path.join(projectPath, 'tests'));
    
    console.log('✅ Test project created successfully');
}

// Run the test if this script is executed directly
if (require.main === module) {
    testEnhancedQASystem()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { testEnhancedQASystem }; 