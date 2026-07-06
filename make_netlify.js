const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace imports
code = `import serverless from "serverless-http";\n` + code;

// Remove startServer wrapper
code = code.replace(/async function startServer\(\) \{/, '');
code = code.replace(/startServer\(\);/, '');

// Remove Vite middleware block
code = code.replace(/\/\/ Vite middleware for development[\s\S]*?(?=app\.listen)/, '');

// Remove app.listen
code = code.replace(/app\.listen\([\s\S]*?\n\s*\}\);/, 'export const handler = serverless(app);');

// Remove trailing brace
code = code.replace(/\}\s*$/, '');

fs.writeFileSync('netlify/functions/api.ts', code);
