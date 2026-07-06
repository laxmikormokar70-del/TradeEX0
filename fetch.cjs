const https = require('https');

https.get('https://ibb.co/4nS3gGnj', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    const match = data.match(/https:\/\/i\.ibb\.co\/[^"']+/g);
    console.log(match ? match[0] : 'Not found');
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
