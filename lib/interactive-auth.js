'use strict';

const { execSync, spawn } = require('child_process');
const readline = require('readline');

/**
 * Run tailscale up in interactive mode and capture the auth URL
 * @returns {Promise<string>} The authentication URL
 */
function getAuthURL(hostname) {
  return new Promise((resolve, reject) => {
    console.log('  Starting Tailscale in interactive mode...');
    console.log('  (This will provide a URL to authenticate in your browser)');
    
    const tailscale = spawn('tailscale', ['up', '--hostname=' + hostname, '--accept-routes'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let authURL = null;
    
    tailscale.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Look for the auth URL in the output
      const match = text.match(/(https:\/\/login\.tailscale\.com\/[^\s]+)/);
      if (match && !authURL) {
        authURL = match[1];
        console.log('\n  🔐 Authentication URL:');
        console.log('     ' + authURL);
        console.log('\n  Please open this URL in your browser to authenticate.');
        console.log('  Waiting for authentication...\n');
      }
    });
    
    tailscale.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Check if already authenticated
      if (text.includes('already authenticated') || text.includes('Logged in')) {
        console.log('  ✓ Already authenticated!');
        tailscale.kill();
        resolve(null);
      }
    });
    
    tailscale.on('close', (code) => {
      if (code === 0 || output.includes('Success')) {
        resolve(authURL);
      } else {
        reject(new Error('Tailscale authentication failed'));
      }
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      tailscale.kill();
      reject(new Error('Authentication timed out (5 minutes)'));
    }, 5 * 60 * 1000);
  });
}

module.exports = { getAuthURL };
