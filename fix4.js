const fs = require('fs');
const filePath = 'c:\\login-router\\login page\\src\\components\\todo\\TodoWorkspace.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = '  const [openTaskMenuId, setOpenTaskMenuId] = useState<number | null>(null);';
const replacement = target + '\n  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Success");
} else {
  console.log("Not found");
}
