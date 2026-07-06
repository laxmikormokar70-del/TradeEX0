const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = `import serverless from "serverless-http";\n` + code;
code = code.replace(/async function startServer\(\) \{/, '');
code = code.replace(/startServer\(\);/, '');
code = code.replace(/\/\/ Vite middleware for development[\s\S]*?(?=app\.listen)/, '');
code = code.replace(/app\.listen\([\s\S]*?\n\s*\}\);/, 'export const handler = serverless(app);');
code = code.replace(/\}\s*$/, '');

fs.writeFileSync('netlify/functions/api.ts', code);
