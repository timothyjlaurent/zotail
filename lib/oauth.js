'use strict';

const https = require('https');

/**
 * Exchange OAuth client credentials for an access token
 * @param {string} clientId - OAuth client ID
 * @param {string} clientSecret - OAuth client secret
 * @returns {Promise<string>} Access token
 */
function exchangeOAuthToken(clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const postData = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;

    const options = {
      hostname: 'api.tailscale.com',
      port: 443,
      path: '/api/v2/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            resolve(result.access_token);
          } else {
            reject(new Error(result.error_description || result.error || 'OAuth exchange failed'));
          }
        } catch (e) {
          reject(new Error('Invalid OAuth response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Generate a device auth key using OAuth token
 * @param {string} oauthToken - OAuth access token
 * @param {string} tailnet - Your tailnet name (e.g., 'yourname' or 'yourname.ts.net')
 * @returns {Promise<string>} Device auth key
 */
function generateDeviceAuthKey(oauthToken, tailnet) {
  return new Promise((resolve, reject) => {
    // Normalize tailnet name (remove .ts.net suffix if present)
    const normalizedTailnet = tailnet.replace(/\.ts\.net$/, '');
    
    const postData = JSON.stringify({
      capabilities: {
        devices: {
          create: {
            reusable: true,
            ephemeral: false,
            preauthorized: true,
            tags: ['tag:zotail']
          }
        }
      },
      expirySeconds: 0
    });

    const options = {
      hostname: 'api.tailscale.com',
      port: 443,
      path: `/api/v2/tailnet/${encodeURIComponent(normalizedTailnet)}/keys`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${oauthToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.key) {
            resolve(result.key);
          } else if (result.message) {
            reject(new Error(`API error: ${result.message}`));
          } else {
            reject(new Error(`Failed to generate auth key: ${JSON.stringify(result)}`));
          }
        } catch (e) {
          reject(new Error(`Invalid API response: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Request failed: ${err.message}`)));
    req.write(postData);
    req.end();
  });
}

module.exports = { exchangeOAuthToken, generateDeviceAuthKey };
