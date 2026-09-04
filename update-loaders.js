import fs from 'fs';
import path from 'path';

const DIR = 'd:/villy/inventory/frontend/src/pages/admin';

const NEW_LOADER = `<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading data...</div>
        </div>`;

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const fullPath = path.join(DIR, file);
  if (file === 'AdminLogin.jsx') return;

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  // Ensure Loader2 is imported
  if (!content.includes('Loader2')) {
    content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, imports) => {
      return `import { Loader2, ${imports.trim()} } from 'lucide-react';`;
    });
    changed = true;
  }

  // Replace various loading patterns
  // Pattern 1: <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
  const regex1 = /<div style=\{\{ color: 'var\(--text-secondary\)' \}\}>Loading\.\.\.<\/div>/g;
  if (regex1.test(content)) {
    content = content.replace(regex1, NEW_LOADER);
    changed = true;
  }

  // Pattern 2: <div style={{ display: 'flex' ... <div className="animate-spin" ... >◌</div> Loading... </div>
  const regex2 = /<div style=\{\{\s*display:\s*'flex',\s*justifyContent:\s*'center',\s*padding:\s*'(?:60|48)px',\s*color:\s*'var\(--text-secondary\)'\s*\}\}>\s*<div className="animate-spin" style=\{\{\s*marginRight:\s*'8px'\s*\}\}>◌<\/div>\s*Loading[^<]*<\/div>/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, NEW_LOADER);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(fullPath, content);
    console.log(`Updated loaders in ${file}`);
  }
});
