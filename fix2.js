const fs = require('fs');
const filePath = 'c:\\login-router\\login page\\src\\components\\todo\\TodoWorkspace.tsx';

let content = fs.readFileSync(filePath, 'utf8');

const targetString = `    toast("Comment added locally. Server sync is not available right now.");
    setCommentSubmitting(false);
  };
      );
    }

    return (`;

const replacementString = `    toast("Comment added locally. Server sync is not available right now.");
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

      return (
        <div key={\`\${options.imageVariant}-\${todo.id}\`} className={\`todo-task-stack \${options.stackClassName ?? ""}\`}>
          <article
            className={\`todoist-task task-enter \${options.cardClassName} \${getPriorityClass(todo.priority)} \${todo.done ? "done" : ""}\`}
          >
            <div className="premium-task-card">
              <header className="premium-task-card__header" onClick={(e) => {
                setExpandedTaskIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(todo.id)) next.delete(todo.id);
                  else next.add(todo.id);
                  return next;
                });
              }} style={{ cursor: "pointer" }}>
                <div className="premium-task-card__title-row">
                  <div className="premium-task-card__title-left">
                    <button
                      className={\`premium-task-toggle \${todo.done ? "is-done" : ""}\`}
                      onClick={(e) => { e.stopPropagation(); handleTaskToggle(todo.id); }}
                      type="button"
                    >
                      <i className={\`bi \${todo.done ? "bi-check-circle-fill" : "bi-circle"}\`} />
                    </button>
                    <h3 className="premium-task-title">{todo.title}</h3>
                  </div>
                  <div className="premium-task-card__title-right">
                    <button className="premium-icon-btn" onClick={(e) => { e.stopPropagation(); handleTaskEdit(todo); }} aria-label="Edit Task">
                      <i className="bi bi-pencil" />
                    </button>
                    <button
                      className="premium-icon-btn premium-task-expand-toggle"
                      aria-label="Toggle Details"
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.3s ease",
                      }}
                    >
                      <i className="bi bi-chevron-down" />
                    </button>
                    <div className="todo-task-menu-shell">
                      <button
                        type="button"
                        className="premium-icon-btn"
                        aria-expanded={isTaskMenuOpen}
                        onClick={(e) => { e.stopPropagation(); setOpenTaskMenuId((current) => (current === todo.id ? null : todo.id)); }}
                      >
                        <i className="bi bi-three-dots" />
                      </button>
                      {isTaskMenuOpen && (
                        <div className="todo-task-menu-dropdown" role="menu">
                          <button type="button" className="todo-task-menu-item" onClick={(e) => { e.stopPropagation(); handleTaskEdit(todo); setOpenTaskMenuId(null); }} disabled={todo.done}>
                            <i className="bi bi-pencil-square" /> <span>Edit Task</span>
                          </button>
                          <button type="button" className="todo-task-menu-item" onClick={(e) => { e.stopPropagation(); openCommentComposer(todo); setOpenTaskMenuId(null); }}>
                            <i className="bi bi-chat-left-text" /> <span>Add Comment</span>
                          </button>
                          <button type="button" className="todo-task-menu-item" onClick={(e) => { e.stopPropagation(); handleTaskToggle(todo.id); setOpenTaskMenuId(null); }}>
                            <i className={\`bi \${todo.done ? "bi-arrow-counterclockwise" : "bi-check2-circle"}\`} /> <span>{todo.done ? "Mark as Pending" : "Mark as Done"}</span>
                          </button>
                          <button type="button" className="todo-task-menu-item todo-task-menu-item--danger" onClick={(e) => { e.stopPropagation(); handleTaskDelete(todo); setOpenTaskMenuId(null); }}>
                            <i className="bi bi-trash3" /> <span>Delete Task</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="premium-task-card__meta-bar">
                  <span className={\`premium-meta-badge status-\${todo.done ? "done" : "pending"}\`}>
                    {dashboardStatusLabel}
                  </span>
                  <span className="premium-meta-item">
                    <i className="bi bi-folder" /> {todo.project?.trim() || "General"}
                  </span>
                  <span className="premium-meta-item">
                    <i className="bi bi-calendar3" /> Created: {compactCreatedLabel}
                  </span>
                </div>
              </header>

              <div className={\`premium-task-card__collapsible \${isExpanded ? "is-expanded" : ""}\`}>
                <div className="premium-task-card__collapsible-inner">
                  <div className="premium-task-divider" />

                  <div className="premium-task-card__body">
                    <div className="premium-task-card__left">
                      <div className="premium-task-description">
                        <label>Description</label>
                        <p>{todo.description || todo.statusNote || "No description provided."}</p>
                      </div>

                      {dashboardSignals.length > 0 && (
                        <div className="premium-task-suggestions">
                          <label>Suggestions / Tags</label>
                          <div className="premium-task-tags">
                            {dashboardSignals.map((signal, index) => (
                              <span key={\`\${todo.id}-sig-\${index}\`} className="premium-pill">{signal}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="premium-task-card__right">
                      <div className={\`premium-info-card priority-\${todo.priority.toLowerCase()}\`}>
                        <div className="premium-info-card-header">
                          <i className="bi bi-flag" /> Priority
                        </div>
                        <strong>{todo.priority}</strong>
                      </div>

                      <div className="premium-info-card">
                        <div className="premium-info-card-header">
                          <i className="bi bi-calendar-event" /> Due Date
                        </div>
                        <strong>{compactDueLabel}</strong>
                      </div>
                    </div>
                  </div>

                  <footer className="premium-task-card__footer">
                    <div className="premium-task-avatars">
                      {collaboratorLabels.map((label, index) => (
                        <div key={\`\${todo.id}-p-\${index}\`} className="premium-avatar" style={{ zIndex: 10 - index }}>
                          {index === 0 && matchedSidebarAvatar ? <img src={matchedSidebarAvatar} alt={label} /> : <span>{getAvatarInitials(label)}</span>}
                        </div>
                      ))}
                    </div>

                    <div className="premium-task-actions">
                      <button className="premium-action-btn" onClick={() => openCommentComposer(todo)}>
                        <i className="bi bi-chat-left-text" /> <span>Comment</span>
                      </button>
                      <button className="premium-action-btn" onClick={() => handleTaskEdit(todo)}>
                        <i className="bi bi-pencil" /> <span>Edit Details</span>
                      </button>
                      <button className="premium-action-btn" title="Attach Files">
                        <i className="bi bi-paperclip" /> <span>Attach</span>
                      </button>
                    </div>
                  </footer>
                </div>
              </div>
            </div>
          </article>
        </div>
      );
    }

    return (`;

if (content.includes(targetString)) {
  content = content.replace(targetString, replacementString);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Success");
} else {
  console.log("Not found target string");
}
