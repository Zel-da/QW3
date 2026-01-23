const fs = require('fs');

let content = fs.readFileSync('backups/1_schema.sql', 'utf8');

// Remove all psql internal commands
const cleanLines = content.split('\n').filter(line => {
  if (line.startsWith('\\')) return false;
  if (line.includes('Data for Name:') && line.includes('TABLE DATA')) return false;
  return true;
});

const cleanContent = cleanLines.join('\n').replace(/\n{3,}/g, '\n\n');

fs.writeFileSync('backups/supabase_schema.sql', cleanContent, 'utf8');
console.log('Size:', Math.round(fs.statSync('backups/supabase_schema.sql').size / 1024), 'KB');
