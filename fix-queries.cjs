const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
};

const fixFiles = () => {
  const srcDir = path.join(__dirname, 'src');
  const files = walk(srcDir);
  let updatedCount = 0;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Regex to match queryClient.invalidateQueries([ ... ])
    // It captures everything inside the outermost array brackets if it's passed directly as an argument.
    // Be careful to match the array syntax properly.
    const regex = /queryClient\.invalidateQueries\(\s*(\[.*?\])\s*\)/gs;
    
    if (regex.test(content)) {
      const newContent = content.replace(regex, 'queryClient.invalidateQueries({ queryKey: $1 })');
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated ${file}`);
      updatedCount++;
    }
  });
  
  console.log(`\nFinished! Updated ${updatedCount} files.`);
};

fixFiles();
