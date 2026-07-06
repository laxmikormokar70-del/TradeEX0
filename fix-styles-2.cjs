const fs = require('fs');

const files = [
  'src/pages/Portfolio.tsx',
  'src/pages/Account.tsx',
  'src/pages/Home.tsx',
  'src/pages/Markets.tsx',
  'src/pages/Login.tsx',
  'src/pages/Signup.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/dark:[^\s"'\`\}]+/g, '');
    fs.writeFileSync(file, content, 'utf-8');
  }
}
