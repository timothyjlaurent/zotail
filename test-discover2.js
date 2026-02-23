const { exchangeOAuthToken } = require('./lib/oauth');

async function discoverTailnet() {
  const token = await exchangeOAuthToken(
    process.env.TAILSCALE_CLIENT_ID,
    process.env.TAILSCALE_CLIENT_SECRET
  );
  
  const https = require('https');
  
  // Try common tailnet formats
  const possibleTailnets = [
    'timothyjlaurent',
    'timothyjlaurent.ts.net',
    'github.com-timothyjlaurent',
    'user-timothyjlaurent'
  ];
  
  console.log('Trying to discover tailnet...\\n');
  
  for (const tailnet of possibleTailnets) {
    await new Promise((resolve) => {
      const options = {
        hostname: 'api.tailscale.com',
        path: `/api/v2/tailnet/${tailnet}/devices`,
        headers: { 'Authorization': 'Bearer ' + token }
      };
      
      https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✓ Found tailnet:', tailnet);
            console.log('  Response:', data.substring(0, 200));
          } else {
            console.log('✗', tailnet, '-', res.statusCode);
          }
          resolve();
        });
      }).on('error', (err) => {
        console.log('✗', tailnet, '- error:', err.message);
        resolve();
      });
    });
  }
}

discoverTailnet().catch(console.error);
