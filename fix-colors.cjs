const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages', 'admin');

const colorMap = {
  "'#fff'": "'var(--text-primary)'",
  "'#ffffff'": "'var(--text-primary)'",
  "'#888'": "'var(--text-secondary)'",
  "'#666'": "'var(--text-muted)'",
  "'#555'": "'var(--text-muted)'",
  "'#444'": "'var(--text-muted)'",
  "'#a1a1aa'": "'var(--text-secondary)'",
  "'#e2c171'": "'var(--accent-gold)'",
  "'#22c55e'": "'var(--accent-success)'",
  "'#f87171'": "'var(--accent-danger)'",
  "'#0a0a0c'": "'var(--bg-dark)'",
  "'#111'": "'var(--bg-input)'",
  '"#fff"': '"var(--text-primary)"',
  '"#888"': '"var(--text-secondary)"',
  '"#666"': '"var(--text-muted)"',
  '"#a1a1aa"': '"var(--text-secondary)"',
  '"#e2c171"': '"var(--accent-gold)"',
  '"#22c55e"': '"var(--accent-success)"',
  '"#f87171"': '"var(--accent-danger)"'
};

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const [hex, cssVar] of Object.entries(colorMap)) {
        if (content.includes(hex)) {
          // simple string replacement across all occurrences
          content = content.split(hex).join(cssVar);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated colors in ${file}`);
      }
    }
  }
}

processDir(dir);
