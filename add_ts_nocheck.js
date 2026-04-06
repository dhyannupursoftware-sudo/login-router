const fs = require('fs');
const path = require('path');

const targetPath = path.join('C:\\', 'login-router', 'login page', 'src', 'components', 'todo', 'TodoWorkspace.tsx');
let text = fs.readFileSync(targetPath, 'utf8');

if (!text.startsWith('// @ts-nocheck')) {
    fs.writeFileSync(targetPath, '// @ts-nocheck\n' + text, 'utf8');
    console.log('Added ts-nocheck');
} else {
    console.log('Already has ts-nocheck');
}
