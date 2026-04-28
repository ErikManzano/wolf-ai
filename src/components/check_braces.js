const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Admin\\OneDrive\\Desktop\\wolf-ai\\src\\components\\CentralPanel.tsx', 'utf8');
const lines = content.split('\n');
let balance = 0;
lines.forEach((line, i) => {
  for (let char of line) {
    if (char === '{') balance++;
    if (char === '}') balance--;
  }
  if (balance < 0) {
    console.log(`Mismatch at line ${i + 1}: balance ${balance}`);
    balance = 0; // reset to find more
  }
});
console.log(`Final balance: ${balance}`);
