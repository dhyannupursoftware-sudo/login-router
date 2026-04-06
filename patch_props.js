const fs = require('fs');
const path = require('path');

const targetPath = path.join('C:\\', 'login-router', 'login page', 'src', 'components', 'todo', 'TodoWorkspace.tsx');
let text = fs.readFileSync(targetPath, 'utf8');

const regex = /<PremiumBoardView[\s\S]*?\/>/;
const newComponent = `<PremiumBoardView 
                  tasks={boardVisibleTasks} 
                  boardPlannerItems={boardPlannerItems}
                  selectedBoardLane={selectedBoardLane}
                  onLaneSelect={(lane, date) => {
                    setSelectedBoardLane(lane);
                    setSelectedBoardDate(date);
                  }}
                  onToggleDone={(taskId) => dispatch({ type: "TOGGLE", payload: taskId })}
                  onDelete={(taskId) => { const task = todos.find(t => t.id === taskId); if (task) setDeleteTarget(task); }} 
                  onOpenAddModal={openAddTaskModal} 
                />`;

if (regex.test(text)) {
    text = text.replace(regex, newComponent);
    fs.writeFileSync(targetPath, text, 'utf8');
    console.log('Successfully updated PremiumBoardView props!');
} else {
    console.log('Could not find PremiumBoardView invocation.');
}
