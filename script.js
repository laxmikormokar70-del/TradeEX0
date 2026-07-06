const fs = require('fs');

const path = 'src/pages/Trade.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/bg-\[#0B0E11\]/g, 'dark:bg-bg-base');
content = content.replace(/bg-\[#151A20\]/g, 'dark:bg-surface');
content = content.replace(/bg-\[#1E2329\]/g, 'dark:bg-bg-sec');
content = content.replace(/bg-\[#FCFAF7\]/g, 'bg-bg-base');
content = content.replace(/bg-\[#FFFDFB\]/g, 'bg-surface');

content = content.replace(/text-\[#F3F4F6\]/g, 'dark:text-text-main');
content = content.replace(/text-\[#1F2937\]/g, 'text-text-main');

content = content.replace(/text-\[#00C076\]/g, 'text-success');
content = content.replace(/text-\[#FF4D4F\]/g, 'text-danger');
content = content.replace(/bg-\[#00C076\]/g, 'bg-success');
content = content.replace(/bg-\[#FF4D4F\]/g, 'bg-danger');

content = content.replace(/bg-\[#FF8A00\]/g, 'bg-brand');
content = content.replace(/text-\[#FF8A00\]/g, 'text-brand');

// Specific replacements:
content = content.replace(/dark bg-\[#0B0E11\]/g, 'dark:bg-bg-base');
content = content.replace(/dark:bg-\[#0B0E11\]/g, 'dark:bg-bg-base');
content = content.replace(/dark:bg-\[#151A20\]/g, 'dark:bg-surface');

fs.writeFileSync(path, content);
console.log('Done');
