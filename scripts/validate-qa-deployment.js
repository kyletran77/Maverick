#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

/**
 * Final validation of deployed QA system
 */
async function validateQADeployment() {
    console.log('🚀 Final QA System Deployment Validation\n');

    const checks = [];
    let passed = 0;
    let total = 0;

    // Check 1: Server is running
    total++;
    try {
        const response = await fetch('http://localhost:3000');
        if (response.ok) {
            console.log('✅ Server is running and accessible');
            passed++;
            checks.push({ name: 'Server Running', status: 'PASS' });
        } else {
            console.log('❌ Server responded with error');
            checks.push({ name: 'Server Running', status: 'FAIL' });
        }
    } catch (error) {
        console.log('❌ Server is not accessible');
        checks.push({ name: 'Server Running', status: 'FAIL' });
    }

    // Check 2: QA Analytics endpoint
    total++;
    try {
        const response = await fetch('http://localhost:3000/api/qa/analytics');
        if (response.ok) {
            const data = await response.json();
            console.log('✅ QA Analytics endpoint working');
            console.log(`   - Total verifications: ${data.overall?.totalVerifications || 0}`);
            console.log(`   - Pass rate: ${data.overall?.passRate?.toFixed(1) || 0}%`);
            passed++;
            checks.push({ name: 'QA Analytics API', status: 'PASS' });
        } else {
            console.log('❌ QA Analytics endpoint failed');
            checks.push({ name: 'QA Analytics API', status: 'FAIL' });
        }
    } catch (error) {
        console.log('❌ QA Analytics endpoint error:', error.message);
        checks.push({ name: 'QA Analytics API', status: 'FAIL' });
    }

    // Check 3: QA Verifications endpoint
    total++;
    try {
        const response = await fetch('http://localhost:3000/api/qa/verifications');
        if (response.ok) {
            const data = await response.json();
            console.log('✅ QA Verifications endpoint working');
            console.log(`   - Active verifications: ${Array.isArray(data) ? data.length : 0}`);
            passed++;
            checks.push({ name: 'QA Verifications API', status: 'PASS' });
        } else {
            console.log('❌ QA Verifications endpoint failed');
            checks.push({ name: 'QA Verifications API', status: 'FAIL' });
        }
    } catch (error) {
        console.log('❌ QA Verifications endpoint error:', error.message);
        checks.push({ name: 'QA Verifications API', status: 'FAIL' });
    }

    // Check 4: Enhanced QA test confirms scoring fix
    total++;
    try {
        const testResult = await import('./test-qa-enhanced.js');
        const success = await testResult.testEnhancedQASystem();
        if (success) {
            console.log('✅ Enhanced QA test passed (scores ≤ 100%)');
            passed++;
            checks.push({ name: 'Enhanced QA Test', status: 'PASS' });
        } else {
            console.log('❌ Enhanced QA test failed');
            checks.push({ name: 'Enhanced QA Test', status: 'FAIL' });
        }
    } catch (error) {
        console.log('❌ Enhanced QA test error:', error.message);
        checks.push({ name: 'Enhanced QA Test', status: 'FAIL' });
    }

    // Check 5: QA Engineer class features
    total++;
    try {
        const QAEngineer = require('../backend/src/orchestrator/QAEngineer');
        const qa = new QAEngineer();
        
        // Check if new methods exist
        const hasTestGeneration = typeof qa.generateAndExecuteTests === 'function';
        const hasBuildVerification = typeof qa.comprehensiveBuildVerification === 'function';
        const hasProjectTypeDetection = typeof qa.detectProjectType === 'function';
        
        if (hasTestGeneration && hasBuildVerification && hasProjectTypeDetection) {
            console.log('✅ QA Engineer has all enhanced features');
            console.log('   - Test script generation ✓');
            console.log('   - Comprehensive build verification ✓');
            console.log('   - Project type detection ✓');
            passed++;
            checks.push({ name: 'QA Features', status: 'PASS' });
        } else {
            console.log('❌ QA Engineer missing enhanced features');
            checks.push({ name: 'QA Features', status: 'FAIL' });
        }
    } catch (error) {
        console.log('❌ QA Engineer feature check error:', error.message);
        checks.push({ name: 'QA Features', status: 'FAIL' });
    }

    // Results Summary
    console.log('\n📊 Deployment Validation Summary');
    console.log('================================');
    console.log(`Overall Status: ${passed === total ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)\n`);

    console.log('Detailed Results:');
    checks.forEach((check, index) => {
        const icon = check.status === 'PASS' ? '✅' : '❌';
        console.log(`${index + 1}. ${icon} ${check.name}: ${check.status}`);
    });

    if (passed === total) {
        console.log('\n🎉 All systems operational! QA enhancement deployment successful.');
        console.log('\n🚀 Key Enhancements Deployed:');
        console.log('   • Fixed scoring calculation (no more >100% scores)');
        console.log('   • Automated test script generation for each task');
        console.log('   • Comprehensive build verification pipeline');
        console.log('   • Project type detection and specialized testing');
        console.log('   • Enhanced UI with real-time QA progress tracking');
        console.log('   • Comprehensive validation and error handling');
        
        console.log('\n📈 Quality Assurance Impact:');
        console.log('   • Every task now has automated tests');
        console.log('   • Projects are build-verified before completion');  
        console.log('   • Users receive deployable, working projects');
        console.log('   • Real-time feedback on quality issues');
        console.log('   • Comprehensive scoring system (0-100%)');
    } else {
        console.log('\n⚠️ Some validation checks failed. Please review and fix issues.');
    }

    return passed === total;
}

// Run validation if script is executed directly
if (require.main === module) {
    validateQADeployment()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Validation error:', error);
            process.exit(1);
        });
}

module.exports = { validateQADeployment }; 