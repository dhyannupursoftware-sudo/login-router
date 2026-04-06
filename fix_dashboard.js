const fs = require('fs');
const filePath = 'c:\\login-router\\login page\\src\\components\\todo\\TodoWorkspace.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `  const taskListSummaryCards = useMemo(() => {
    const totalShare = stats.total === 0 ? 0 : clampPercentage((filteredByFilter.length / stats.total) * 100);
    const assignedShare = stats.total === 0 ? 0 : clampPercentage((taskListAssignedCount / stats.total) * 100);
    const projectShare = clampPercentage(taskListProjectCount * 24);
    const recentActionLabel = taskListLatestActionAt ? formatRelativeSyncTime(taskListLatestActionAt) : "No activity";

    return [
      {
        label: activeFilterLabel,
        value: \`\${filteredByFilter.length}\`.padStart(2, "0"),
        caption: \`\${filteredByFilter.length} task\${filteredByFilter.length === 1 ? "" : "s"} in view\`,
        progress: totalShare || (filteredByFilter.length > 0 ? 22 : 0),
        emphasis: "wide" as const,
      },
      {
        label: "Assign to me",
        value: \`\${taskListAssignedCount}\`.padStart(2, "0"),
        caption: sidebarProfile.name.trim() || "Workspace owner",
        progress: assignedShare || (taskListAssignedCount > 0 ? 18 : 8),
      },
      {
        label: "Completion",
        value: \`\${stats.completionPct}%\`,
        caption: \`\${stats.completed} done / \${stats.pending} pending\`,
        progress: stats.completionPct,
      },
      {
        label: "Projects",
        value: \`\${taskListProjectCount}\`.padStart(2, "0"),
        caption: \`\${stats.high + stats.medium + stats.low} priority items\`,
        progress: projectShare,
      },
      {
        label: "Most recent action",
        value: recentActionLabel,
        caption: searchQuery ? \`Search: "\${searchInput.trim()}"\` : formatRelativeSyncTime(lastSyncedAt),
        progress: taskListLatestActionAt ? 100 : 0,
        emphasis: "large" as const,
      },
    ];
  }, [
    activeFilterLabel,
    filteredByFilter.length,
    lastSyncedAt,
    searchInput,
    searchQuery,
    sidebarProfile.name,
    stats,
    taskListAssignedCount,
    taskListLatestActionAt,
    taskListProjectCount,
  ]);`;

const replacementStr = `  const taskListSummaryCards = useMemo(() => {
    const totalShare = stats.total === 0 ? 0 : clampPercentage((filteredByFilter.length / stats.total) * 100);
    const assignedShare = stats.total === 0 ? 0 : clampPercentage((taskListAssignedCount / stats.total) * 100);
    const projectShare = clampPercentage(taskListProjectCount * 24);
    const recentActionLabel = taskListLatestActionAt ? formatRelativeSyncTime(taskListLatestActionAt) : "No activity";

    // Extra Metrics
    const criticalTasksCount = stats.high;
    const criticalShare = stats.total === 0 ? 0 : clampPercentage((criticalTasksCount / stats.total) * 100);

    const timeSensitiveCount = filteredByFilter.filter(t => t.dueAt && !t.done).length;
    
    const totalEstHours = filteredByFilter.reduce((acc, t) => {
      if (t.done) return acc;
      const val = parseFloat(t.estimatedHours || "0");
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const totalComments = filteredByFilter.reduce((acc, t) => acc + (Array.isArray(t.comments) ? t.comments.length : 0), 0);
    const totalCheckpoints = filteredByFilter.reduce((acc, t) => acc + (Array.isArray(t.checkpoints) ? t.checkpoints.filter(Boolean).length : 0), 0);

    return [
      {
        label: activeFilterLabel,
        value: \`\${filteredByFilter.length}\`.padStart(2, "0"),
        caption: \`\${filteredByFilter.length} task\${filteredByFilter.length === 1 ? "" : "s"} in view\`,
        progress: totalShare || (filteredByFilter.length > 0 ? 22 : 0),
        emphasis: "wide" as const,
      },
      {
        label: "Assign to me",
        value: \`\${taskListAssignedCount}\`.padStart(2, "0"),
        caption: sidebarProfile.name.trim() || "Workspace owner",
        progress: assignedShare || (taskListAssignedCount > 0 ? 18 : 8),
      },
      {
        label: "Completion",
        value: \`\${stats.completionPct}%\`,
        caption: \`\${stats.completed} done / \${stats.pending} pending\`,
        progress: stats.completionPct,
      },
      {
        label: "Projects",
        value: \`\${taskListProjectCount}\`.padStart(2, "0"),
        caption: \`\${stats.high + stats.medium + stats.low} priority items\`,
        progress: projectShare,
      },
      {
        label: "Most recent action",
        value: recentActionLabel,
        caption: searchQuery ? \`Search: "\${searchInput.trim()}"\` : formatRelativeSyncTime(lastSyncedAt),
        progress: taskListLatestActionAt ? 100 : 0,
        emphasis: "large" as const,
      },
      // New 5 Fields!
      {
        label: "Critical Tasks",
        value: \`\${criticalTasksCount}\`.padStart(2, "0"),
        caption: "High priority workload",
        progress: criticalShare || (criticalTasksCount > 0 ? 30 : 0),
      },
      {
        label: "Time Sensitive",
        value: \`\${timeSensitiveCount}\`.padStart(2, "0"),
        caption: "Upcoming due dates",
        progress: clampPercentage(timeSensitiveCount * 15),
      },
      {
        label: "Est. Workload",
        value: \`\${totalEstHours}h\`,
        caption: "Pending estimated hours",
        progress: clampPercentage(totalEstHours * 5),
      },
      {
        label: "Collaboration",
        value: \`\${totalComments}\`.padStart(2, "0"),
        caption: "Active task messages",
        progress: clampPercentage(totalComments * 10),
      },
      {
        label: "Action Points",
        value: \`\${totalCheckpoints}\`.padStart(2, "0"),
        caption: "Checkpoints in queue",
        progress: clampPercentage(totalCheckpoints * 8),
      }
    ];
  }, [
    activeFilterLabel,
    filteredByFilter,
    lastSyncedAt,
    searchInput,
    searchQuery,
    sidebarProfile.name,
    stats,
    taskListAssignedCount,
    taskListLatestActionAt,
    taskListProjectCount,
  ]);`;

if (content.indexOf("const taskListSummaryCards = useMemo(() => {") !== -1) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Replaced successfully!");
} else {
  console.log("Could not find the target to replace.");
}
