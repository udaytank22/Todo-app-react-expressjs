const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/HP/Desktop/To-Do app/Todo-app-react-expressjs/frontend/src';

function walk(d) {
  let results = [];
  const list = fs.readdirSync(d);
  list.forEach(file => {
    file = path.join(d, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk(dir);
let updatedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Background colors
  content = content.replace(/bg-slate-950/g, 'bg-slate-50');
  content = content.replace(/bg-slate-900\/(\d+)/g, 'bg-white/$1'); // e.g. bg-slate-900/50 -> bg-white/50
  content = content.replace(/bg-slate-900/g, 'bg-white');
  content = content.replace(/bg-slate-800\/(\d+)/g, 'bg-slate-100/$1');
  content = content.replace(/bg-slate-800/g, 'bg-slate-100');
  
  // Text colors
  content = content.replace(/text-slate-100/g, 'text-slate-900');
  content = content.replace(/text-slate-200/g, 'text-slate-800');
  content = content.replace(/text-slate-300/g, 'text-slate-700');
  content = content.replace(/text-slate-400/g, 'text-slate-600');
  
  // Borders
  content = content.replace(/border-white\/5/g, 'border-black/5');
  content = content.replace(/border-white\/10/g, 'border-black/10');
  content = content.replace(/border-white\/20/g, 'border-black/20');
  
  // Divides
  content = content.replace(/divide-white\/5/g, 'divide-black/5');
  
  // Remove light: prefixes
  content = content.replace(/light:bg-slate-50\/(\d+)/g, '');
  content = content.replace(/light:bg-slate-50/g, '');
  content = content.replace(/light:bg-slate-100/g, '');
  content = content.replace(/light:text-slate-900/g, '');
  content = content.replace(/light:text-slate-800/g, '');
  content = content.replace(/light:text-slate-600/g, '');
  content = content.replace(/light:border-slate-200\/50/g, '');
  content = content.replace(/light:divide-slate-200\/50/g, '');
  
  // Clean up any double spaces left behind by prefix removal
  content = content.replace(/  +/g, ' ');

  if(content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated: ' + f);
    updatedCount++;
  }
});
console.log('Total files updated: ' + updatedCount);
