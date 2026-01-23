const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join('backups', '2_data.sql'), 'utf8');
const lines = content.split('\n');

let inserts = [];
let currentTable = '';
let columns = [];
let inCopy = false;

for (const line of lines) {
  if (line.startsWith('COPY ')) {
    // Parse: COPY public."TableName" (col1, "col2", ...) FROM stdin;
    const match = line.match(/COPY public\."([^"]+)" \(([^)]+)\)/);
    if (match) {
      currentTable = match[1];
      // Parse columns - they may or may not have quotes
      columns = match[2].split(', ').map(c => {
        c = c.trim();
        // Remove existing quotes if present
        if (c.startsWith('"') && c.endsWith('"')) {
          c = c.slice(1, -1);
        }
        return c;
      });
      inCopy = true;
    }
  } else if (line === '\\.' || line.trim() === '\\.') {
    inCopy = false;
    currentTable = '';
    columns = [];
  } else if (inCopy && line.trim()) {
    // Tab-separated values
    const values = line.split('\t').map(v => {
      if (v === '\\N') return 'NULL';
      // Escape single quotes by doubling them
      const escaped = v.replace(/'/g, "''");
      return "'" + escaped + "'";
    });

    // Add quotes around column names properly
    const colsStr = columns.map(c => '"' + c + '"').join(', ');
    const valsStr = values.join(', ');
    inserts.push('INSERT INTO "' + currentTable + '" (' + colsStr + ') VALUES (' + valsStr + ');');
  } else if (line.startsWith('SELECT pg_catalog.setval')) {
    inserts.push(line);
  }
}

// Write all inserts to one file
fs.writeFileSync(path.join('backups', '3_inserts_fixed.sql'), inserts.join('\n'), 'utf8');
console.log('Generated', inserts.length, 'INSERT statements');
console.log('File size:', Math.round(fs.statSync(path.join('backups', '3_inserts_fixed.sql')).size / 1024), 'KB');

// Split into parts
const chunkSize = 500;
const chunks = [];
for (let i = 0; i < inserts.length; i += chunkSize) {
  chunks.push(inserts.slice(i, i + chunkSize));
}

chunks.forEach((chunk, idx) => {
  const filename = path.join('backups', 'data_part_' + (idx + 1) + '.sql');
  fs.writeFileSync(filename, chunk.join('\n'), 'utf8');
  console.log(filename + ': ' + chunk.length + ' statements');
});

console.log('\nTotal parts:', chunks.length);
