const fs = require('fs');

function fixFile(filePath, searchStart, replacement) {
  let c = fs.readFileSync(filePath, 'utf8');
  let i = c.indexOf(searchStart);
  if (i !== -1) {
    let j = c.indexOf('>', i);
    c = c.substring(0, i) + replacement + c.substring(j);
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('Fixed', filePath);
  }
}

fixFile('D:/archsketch/src/components/nodes/ServiceNode.tsx',
	'className={rounded-2xl',
	'className={`rounded-2xl p-4 bg-[#161b22] border-2 shadow-2xl min-w-[220px] transition-all duration-200 ${selected ? "border-purple-400 ring-4 ring-purple-400/20" : "border-[#30363d] hover:border-[#8b949e]"}`}'
);

fixFile('D:/archsketch/src/components/nodes/TableNode.tsx',
	'className={rounded-xl',
	'className={`rounded-xl overflow-hidden bg-[#161b22] border-2 transition-all duration-200 shadow-2xl min-w-[280px] max-w-[340px] ${selected ? "border-amber-400 ring-4 ring-amber-400/20" : "border-[#30363d] hover:border-[#8b949e]"}`}'
);
