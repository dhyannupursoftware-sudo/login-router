const fs = require('fs');
const filePath = 'c:\\login-router\\login page\\src\\pages\\Todo.css';

let content = fs.readFileSync(filePath, 'utf8');

const cssToAdd = `
.todo-page .premium-task-card__collapsible {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.todo-page .premium-task-card__collapsible.is-expanded {
  grid-template-rows: 1fr;
}

.todo-page .premium-task-card__collapsible-inner {
  overflow: hidden;
}

.todo-page .premium-task-expand-toggle {
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
}

.todo-page .premium-task-expand-toggle:hover {
  background: var(--surface-2);
  color: var(--text-brand) !important;
}
`;

if (!content.includes('premium-task-card__collapsible')) {
  fs.appendFileSync(filePath, cssToAdd, 'utf8');
  console.log("Success CSS");
} else {
  console.log("Already appended");
}
