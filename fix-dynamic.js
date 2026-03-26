const fs = require('fs');
const path = require('path');

function fixDynamic(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixDynamic(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const lines = content.split('\n');
      if (lines[0].trim() === "export const dynamic = 'force-dynamic'") {
        // Remove line 0
        lines.shift();
        
        // Find last import
        let lastImportIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ') || lines[i].trim() === '') {
            lastImportIdx = i;
          } else {
            break; // Stop at first non-import/non-empty line
          }
        }
        
        // Insert it after the imports
        lines.splice(lastImportIdx + 1, 0, "export const dynamic = 'force-dynamic'");
        
        // Save
        fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
        console.log('Fixed dynamic export in:', fullPath);
      }
    }
  }
}

fixDynamic(path.join(__dirname, 'src'));
console.log('Done');
