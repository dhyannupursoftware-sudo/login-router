const fs = require('fs');
const filePath = 'c:\\login-router\\login page\\src\\components\\todo\\TodoWorkspace.tsx';

let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Find the indices of `const [submitting, setSubmitting] = useState(false);`
let subIndices = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [submitting, setSubmitting] = useState(false);')) {
    subIndices.push(i);
  }
}

if (subIndices.length >= 2) {
  lines.splice(subIndices[0] + 1, subIndices[1] - subIndices[0]);
}

// Ensure the part from `submitTaskComment` is properly patched
let newContent = lines.join('\n');

const brokenIndex = newContent.indexOf('    toast("Comment added locally. Server sync is not available right now.");\n    setCommentSubmitting(false);\n  };\n      );\n    }\n\n    return (');

if (brokenIndex !== -1) {
  const replacement = `    toast("Comment added locally. Server sync is not available right now.");
    setCommentSubmitting(false);
  };

  const handleTaskDelete = (todo: Todo) => {
    setDeleteTarget(todo);
  };

  const confirmTaskDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setOpenTaskMenuId(null);
    if (selectedBoardTaskId === target.id) {
      setSelectedBoardTaskId(null);
    }
    await deleteTodo(target.id);
  };

  const clearTaskSearch = () => {
    setSearchInput("");
  };

  const renderPremiumTaskCard = (
    todo: Todo,
    options: {
      imageVariant: "list" | "board";
      showCompletion?: boolean;
      stackClassName?: string;
      cardClassName?: string;
      showDateStrip?: boolean;
    }
  ) => {
    const assigneeName = typeof todo.assignee === "string" ? todo.assignee.trim() : "";
    const matchedSidebarAvatar =
      assigneeName &&
      sidebarProfile.avatar &&
      assigneeName.toLowerCase() === sidebarProfile.name.trim().toLowerCase()
        ? sidebarProfile.avatar
        : "";
    const assigneeLabel = assigneeName || "Unassigned";
    const assigneeInitials = getAvatarInitials(assigneeName);
    const taskCategory = todo.category?.trim() ? todo.category.trim() : "General";
    const showTaskImages = hasTaskImages(todo);
    const showCompletion = Boolean(options.showCompletion && todo.done);
    const plannedTaskTime = getPlannedTaskTime(todo);
    const taskHoursLabel =
      (typeof todo.estimatedHours === "string" && todo.estimatedHours.trim()) || plannedTaskTime || "Not set";
    const completionDuration =
      showCompletion && typeof todo.completedAt === "number"
        ? formatCompletionDuration(todo.createdAt, todo.completedAt)
        : null;
    const taskDueLabel =
      typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0
        ? formatLongDayDate(todo.dueAt)
        : "No due date";
    const taskCommentCount = todo.comments.filter((comment) => comment.text.trim().length > 0).length;
    const taskCheckpointPreview = todo.checkpoints.filter(Boolean).slice(0, 3);
    const taskTagPreview = todo.tags.filter(Boolean).slice(0, 4);
    const taskFieldCards = [
      { label: "Project", value: todo.project?.trim() || "Workspace Queue" },
      { label: "Department", value: todo.department?.trim() || taskCategory },
      { label: "Client", value: todo.clientName?.trim() || "Internal" },
      { label: "Location", value: todo.location?.trim() || "Remote" },
    ];
    const showDateStrip = options.showDateStrip ?? true;
    const isTaskMenuOpen = openTaskMenuId === todo.id;

    if (options.cardClassName === "todoist-task--dashboard") {
      const compactCreatedLabel = formatCardDate(todo.createdAt);
      const compactDueLabel =
        typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0 ? formatCardDate(todo.dueAt) : "Not scheduled";
      const dashboardSignals =
        taskTagPreview.length > 0
          ? taskTagPreview.slice(0, 2)
          : [todo.project?.trim() || "Website", todo.department?.trim() || "Design"].filter(Boolean).slice(0, 2);
      const collaboratorLabels = [
        assigneeLabel,
        todo.project?.trim() || taskCategory,
        todo.department?.trim() || "",
      ]
        .filter(Boolean)
        .filter((label, index, values) => values.indexOf(label) === index)
        .slice(0, 3);
      const dashboardStatusLabel = todo.done ? "Done" : "OK";

      const isExpanded = expandedTaskIds.has(todo.id);
      const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedTaskIds((prev) => {
          const next = new Set(prev);
          if (next.has(todo.id)) next.delete(todo.id);
          else next.add(todo.id);
          return next;
        });
      };

      return (`;
  
  newContent = newContent.replace('    toast("Comment added locally. Server sync is not available right now.");\n    setCommentSubmitting(false);\n  };\n      );\n    }\n\n    return (', replacement);
}

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Fixed');
