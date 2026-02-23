const { exchangeOAuthToken } = require('./lib/oauth');

async function discoverTailnet() {
  const token = await exchangeOAuthToken(
    process.env.TAILSCALE_CLIENT_ID,
    process.env.TAILSCALE_CLIENT_SECRET
  );
  
  const https = require('https');
  
  // Try to get current user info which includes tailnet
  const options = {
    hostname: 'api.tailscale.com',
    path: '/api/v2/user',
    headers: { 'Authorization': 'Bearer ' + token }
  };
  
  https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      try {
        const result = JSON.parse(data);
        if (result.loginName) {
          console.log('Login name:', result.loginName);
        }
      } catch (e) {}
    });
  }).on('error', console.error);
}

discoverTailnet().catch(console.error);
