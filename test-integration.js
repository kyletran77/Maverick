#!/usr/bin/env node

/**
 * Simple integration test for the Goose Multi-Agent Visualizer
 */

const http = require('http');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const req = http.get(`${BASE_URL}${endpoint}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Request timeout')));
    });
}

async function runTests() {
    console.log('🧪 Testing Goose Multi-Agent Visualizer Integration...\n');
    
    try {
        // Test 1: Check if server is running
        console.log('1. Testing server availability...');
        const serverTest = await makeRequest('/');
        console.log(`   ✅ Server is running (Status: ${serverTest.status})`);
        
        // Test 2: Check Goose CLI status
        console.log('\n2. Testing Goose CLI status...');
        const gooseStatus = await makeRequest('/api/goose-status');
        console.log(`   Status: ${gooseStatus.status}`);
        console.log(`   Available: ${gooseStatus.data.available}`);
        console.log(`   Message: ${gooseStatus.data.message}`);
        
        if (gooseStatus.data.available) {
            console.log('   ✅ Goose CLI is available');
        } else {
            console.log('   ⚠️  Goose CLI not available - will use simulation mode');
        }
        
        // Test 3: Check directory listing
        console.log('\n3. Testing directory listing...');
        const dirTest = await makeRequest('/api/directories');
        console.log(`   Status: ${dirTest.status}`);
        console.log(`   Current Path: ${dirTest.data.currentPath}`);
        console.log(`   Directories found: ${dirTest.data.directories?.length || 0}`);
        
        if (dirTest.data.directories && dirTest.data.directories.length > 0) {
            console.log('   ✅ Directory listing works');
            console.log(`   Sample directories: ${dirTest.data.directories.slice(0, 3).map(d => d.name).join(', ')}`);
        } else {
            console.log('   ⚠️  No directories found or access issue');
        }
        
        // Test 4: Test specific directory
        console.log('\n4. Testing specific directory access...');
        const testDir = path.join(dirTest.data.currentPath, 'Documents');
        const specificDirTest = await makeRequest(`/api/directories?path=${encodeURIComponent(testDir)}`);
        
        if (specificDirTest.status === 200) {
            console.log('   ✅ Specific directory access works');
            console.log(`   Path: ${specificDirTest.data.currentPath}`);
        } else {
            console.log('   ⚠️  Specific directory access failed');
        }
        
        // Summary
        console.log('\n📊 Test Summary:');
        console.log('   - Server: Running ✅');
        console.log(`   - Goose CLI: ${gooseStatus.data.available ? 'Available ✅' : 'Not Available ⚠️'}`);
        console.log(`   - Directory Access: ${dirTest.status === 200 ? 'Working ✅' : 'Issues ⚠️'}`);
        
        console.log('\n🎉 Integration test completed!');
        console.log('\n📝 Next steps:');
        console.log('   1. Open http://localhost:3000 in your browser');
        console.log('   2. Select a project directory');
        console.log('   3. Submit a task to test the full workflow');
        
        if (!gooseStatus.data.available) {
            console.log('\n💡 Note: Goose CLI is not available, but the app will work in simulation mode.');
            console.log('   To get the full experience, install Goose CLI following the official documentation.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Make sure the server is running: npm start');
        console.log('   2. Check if port 3000 is available');
        console.log('   3. Verify file permissions for directory access');
        process.exit(1);
    }
}

// Run tests
runTests(); 