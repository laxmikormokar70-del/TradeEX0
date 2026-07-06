const fs = require('fs');

const files = [
  'src/pages/Trade.tsx',
  'src/components/TradingChart.tsx',
  'src/components/UnrealizedPNLPulse.tsx',
  'src/components/MarketSelectorModal.tsx',
  'src/components/CalculatorModal.tsx',
  'src/pages/Charts.tsx',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    
    // remove dark: classes
    content = content.replace(/dark:[^\s"'\`\}]+/g, '');

    // remove text-[10px] uppercase font-extrabold and replace with text-[14px] font-medium text-slate-500
    content = content.replace(/text-\[10px\][^"'\`\}]*font-extrabold/g, 'text-[14px] font-medium text-slate-500');
    content = content.replace(/text-\[10px\][^"'\`\}]*font-bold/g, 'text-[14px] font-medium text-slate-500');
    content = content.replace(/text-xs[^"'\`\}]*font-extrabold/g, 'text-[14px] font-medium text-slate-500');

    // Make sizes consistent
    content = content.replace(/text-\[15px\]/g, 'text-[16px]');
    content = content.replace(/text-\[13\.5px\]/g, 'text-[16px]');
    content = content.replace(/text-\[13px\]/g, 'text-[15px]');

    // fix extrabold and black weights
    content = content.replace(/font-extrabold/g, 'font-semibold');
    content = content.replace(/font-black/g, 'font-semibold');
    
    // fix the grid col missing
    content = content.replace(/col-span-9 order-1/g, 'col-span-7 order-1');

    fs.writeFileSync(file, content, 'utf-8');
  }
}
