const fs = require('fs');
const filePath = 'c:\\login-router\\login page\\src\\components\\todo\\TodoWorkspace.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = '  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());\n  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());';
const replacement = '  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Success duplicate removed");
} else {
  // Let's remove the second occurrence using regex if there's whitespace between them
  const regex = /const \[expandedTaskIds, setExpandedTaskIds\] = useState<Set<number>>\(new Set\(\)\);[\s\S]*?const \[expandedTaskIds, setExpandedTaskIds\] = useState<Set<number>>\(new Set\(\)\);/;
  if (regex.test(content)) {
    content = content.replace(/const \[expandedTaskIds, setExpandedTaskIds\] = useState<Set<number>>\(new Set\(\)\);\r?\n\s*const \[expandedTaskIds, setExpandedTaskIds\] = useState<Set<number>>\(new Set\(\)\);/, 'const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Success duplicate removed using regex");
  } else {
      console.log("Not found duplicate");
  }
}
