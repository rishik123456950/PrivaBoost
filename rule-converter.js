const fs = require('fs');
const path = require('path');

// Convert EasyList rules to declarativeNetRequest format
function convertRules(rulesText) {
  const rules = [];
  let id = 1;
  
  rulesText.split('\n').forEach(line => {
    if (line.startsWith('!') || line.trim() === '') return;
    
    try {
      const rule = {
        id: id++,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: line,
          resourceTypes: ["script", "image", "stylesheet", "object", "xmlhttprequest"]
        }
      };
      rules.push(rule);
    } catch (e) {
      console.warn(`Skipping invalid rule: ${line}`);
    }
  });
  
  return rules;
}

// Load EasyList and convert
const easyList = fs.readFileSync('easylist.txt', 'utf-8');
const convertedRules = convertRules(easyList);

// Save to rules.json
fs.writeFileSync(
  'rules.json', 
  JSON.stringify(convertedRules, null, 2)
);

console.log(`Generated ${convertedRules.length} rules`);