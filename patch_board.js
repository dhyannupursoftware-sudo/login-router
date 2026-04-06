const fs = require('fs');
const path = require('path');

const targetPath = path.join('C:\\', 'login-router', 'login page', 'src', 'components', 'todo', 'TodoWorkspace.tsx');
let text = fs.readFileSync(targetPath, 'utf8');

// Add import
const importStmt = 'import PremiumBoardView from "./PremiumBoardView";\nimport SectionCard';
text = text.replace('import SectionCard', importStmt);

const startIdx = text.indexOf('{activeMode === "board" && (');
const endIdx = text.indexOf('{activeMode === "timeline" && (');

if (startIdx !== -1 && endIdx !== -1) {
    const lastClosing = text.lastIndexOf(')}', endIdx);
    if (lastClosing !== -1) {
        const newBoardBlock = `{activeMode === "board" && (
                <PremiumBoardView 
                  tasks={todos} 
                  onToggleDone={(taskId) => dispatch({ type: "TOGGLE", payload: taskId })}
                  onDelete={(taskId) => { const task = todos.find(t => t.id === taskId); if (task) setDeleteTarget(task); }} 
                  onOpenAddModal={openAddTaskModal} 
                />
              )}`;
        
        const newText = text.slice(0, startIdx) + newBoardBlock + text.slice(lastClosing + 2);
        fs.writeFileSync(targetPath, newText, 'utf8');
        console.log('Successfully Replaced Board Mode!');
    } else {
        console.log('Could not find closing bracket.');
    }
} else {
    console.log(`Start: ${startIdx}, End: ${endIdx}`);
}
