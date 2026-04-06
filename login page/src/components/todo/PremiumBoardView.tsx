import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import "./PremiumBoardView.css";

type Priority = "Low" | "Medium" | "High";

interface TodoComment {
  id: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  text: string;
  createdAt: number;
}

interface Todo {
  id: number;
  title: string;
  description: string;
  category: string;
  assignee?: string;
  project?: string;
  department?: string;
  estimatedHours?: string;
  priority: Priority;
  done: boolean;
  createdAt: number;
  completedAt?: number;
  dueAt?: string;
  checkpoints: string[];
  tags: string[];
  comments: TodoComment[];
}

interface BoardPlannerItem {
  lane: string;
  date: string;
  tasks: Todo[];
  high: number;
  medium: number;
  low: number;
}

interface PremiumBoardViewProps {
  tasks: Todo[];
  boardPlannerItems: BoardPlannerItem[];
  selectedBoardLane: string;
  selectedBoardDate?: string;
  currentUserName?: string;
  currentUserEmail?: string;
  currentUserAvatar?: string;
  onLaneSelect: (lane: string, date: string) => void;
  onDateChange?: (date: string) => void;
  onToggleDone: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onEdit?: (task: Todo) => void;
  onOpenComment?: (task: Todo) => void;
  onOpenAddModal: () => void;
}

const LIVE_BOARD_REFRESH_INTERVAL_MS = 30000;

type TaskCountdownState = {
  label: string;
  tone: "running" | "expired" | "done";
  icon: string;
};

const getAvatarInitials = (name?: string) => {
  const clean = (name ?? "").trim();
  if (!clean) return "UA";

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const parseEstimatedDurationParts = (
  value: string | undefined
): { estimatedHours: number | null; estimatedMinutes: number | null } => {
  const clean = (value ?? "").trim();
  if (!clean) {
    return { estimatedHours: null, estimatedMinutes: null };
  }

  const hourMatch = clean.match(/(\d+)\s*h/i);
  const minuteMatch = clean.match(/(\d+)\s*m/i);
  const numericValue = Number.parseInt(clean, 10);

  const estimatedHours = hourMatch
    ? Number.parseInt(hourMatch[1], 10)
    : Number.isFinite(numericValue) && !minuteMatch
      ? numericValue
      : null;
  const estimatedMinutes = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : null;

  return {
    estimatedHours: Number.isFinite(estimatedHours ?? Number.NaN) ? Math.max(0, estimatedHours ?? 0) : null,
    estimatedMinutes: Number.isFinite(estimatedMinutes ?? Number.NaN) ? Math.max(0, Math.min(59, estimatedMinutes ?? 0)) : null,
  };
};

const getEstimatedDurationMs = (value: string | undefined): number | null => {
  const { estimatedHours, estimatedMinutes } = parseEstimatedDurationParts(value);
  const totalMinutes = (estimatedHours ?? 0) * 60 + (estimatedMinutes ?? 0);
  return totalMinutes > 0 ? totalMinutes * 60000 : null;
};

const formatCountdownClock = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

const getTaskCountdown = (task: Todo, referenceTime: number): TaskCountdownState | null => {
  const estimatedDurationMs = getEstimatedDurationMs(task.estimatedHours);
  if (estimatedDurationMs === null) return null;

  if (task.done) {
    return {
      label: "Completed",
      tone: "done",
      icon: "bi-check2-circle",
    };
  }

  const remainingMs = Math.max(0, task.createdAt + estimatedDurationMs - referenceTime);
  if (remainingMs === 0) {
    return {
      label: "00:00:00",
      tone: "expired",
      icon: "bi-alarm",
    };
  }

  return {
    label: formatCountdownClock(remainingMs),
    tone: "running",
    icon: "bi-stopwatch",
  };
};

const getTaskLiveTimeMeta = (task: Todo, countdown: TaskCountdownState | null, formatTime: (ts: number | string) => string) => {
  if (countdown?.tone === "done") {
    return task.completedAt ? `Closed ${formatTime(task.completedAt)}` : "Task completed";
  }

  if (countdown?.tone === "expired") {
    return "Timer expired";
  }

  if (countdown?.tone === "running") {
    return task.estimatedHours?.trim()
      ? `${task.estimatedHours.trim()} tracked window`
      : "Live timer";
  }

  if (task.estimatedHours?.trim()) return `${task.estimatedHours.trim()} estimate`;
  return "No live timer";
};

const getValidComments = (comments: TodoComment[] | undefined): TodoComment[] =>
  Array.isArray(comments) ? comments.filter((comment) => comment.text?.trim().length > 0) : [];

export default function PremiumBoardView({ 
  tasks, 
  boardPlannerItems,
  selectedBoardLane,
  selectedBoardDate,
  currentUserName,
  currentUserEmail,
  currentUserAvatar,
  onLaneSelect,
  onDateChange,
  onToggleDone, 
  onDelete, 
  onEdit,
  onOpenComment,
  onOpenAddModal 
}: PremiumBoardViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState<"details" | "comments" | "history">("details");
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Record<number, number[]>>({});

  const todayDate = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    []
  );

  const hasTimeSensitiveBoardTasks = useMemo(
    () =>
      tasks.some(
        (task) =>
          !task.done &&
          ((typeof task.dueAt === "string" && task.dueAt.trim().length > 0) || getEstimatedDurationMs(task.estimatedHours) !== null)
      ),
    [tasks]
  );

  const boardSummary = useMemo(() => {
    const activeCount = tasks.filter((task) => !task.done).length;
    const overdueCount = tasks.filter((task) => {
      if (task.done || !task.dueAt) return false;
      return new Date(task.dueAt).getTime() < liveNow;
    }).length;
    const completedCount = tasks.filter((task) => task.done).length;
    const upcomingCount = tasks.filter(
      (task) => !task.done && task.dueAt && new Date(task.dueAt).getTime() >= liveNow
    ).length;

    return {
      activeCount,
      overdueCount,
      productivity: Math.round((completedCount / (tasks.length || 1)) * 100),
      upcomingCount,
    };
  }, [liveNow, tasks]);

  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredTasks = useMemo(() => {
    if (!normalizedSearchQuery) return tasks;

    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(normalizedSearchQuery) ||
        task.category.toLowerCase().includes(normalizedSearchQuery) ||
        task.tags.some((tag) => tag.toLowerCase().includes(normalizedSearchQuery)) ||
        getValidComments(task.comments).some((comment) => comment.text.toLowerCase().includes(normalizedSearchQuery))
    );
  }, [normalizedSearchQuery, tasks]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  );

  const displayTask = selectedTask || (filteredTasks.length > 0 ? filteredTasks[0] : null);
  const displayTaskComments = useMemo(
    () => [...getValidComments(displayTask?.comments)].sort((a, b) => b.createdAt - a.createdAt),
    [displayTask]
  );
  const normalizedCurrentUserName = (currentUserName ?? "").trim().toLowerCase();
  const normalizedCurrentUserEmail = (currentUserEmail ?? "").trim().toLowerCase();
  const normalizedCurrentUserAvatar = (currentUserAvatar ?? "").trim();

  useEffect(() => {
    if (selectedTaskId === null) return;
    if (tasks.some((task) => task.id === selectedTaskId)) return;

    const resetId = window.setTimeout(() => {
      setSelectedTaskId(null);
      setIsPanelOpen(false);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [selectedTaskId, tasks]);

  useEffect(() => {
    if (!hasTimeSensitiveBoardTasks) {
      return;
    }

    const syncLiveNow = () => {
      startTransition(() => {
        setLiveNow(Date.now());
      });
    };

    const timeoutId = window.setTimeout(syncLiveNow, 0);
    const intervalId = window.setInterval(() => {
      syncLiveNow();
    }, LIVE_BOARD_REFRESH_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [hasTimeSensitiveBoardTasks]);

  const handleTaskClick = (task: Todo) => {
    setSelectedTaskId(task.id);
    if (typeof window !== "undefined" && window.innerWidth <= 820) {
      setIsPanelOpen(true);
    }
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const getTaskStatus = (t: Todo) => {
    if (t.done) return "completed";
    if (t.dueAt && new Date(t.dueAt).getTime() < liveNow) return "overdue";
    return "active";
  };
  
  const toggleCheckpoint = (taskId: number, idx: number) => {
    setCompletedCheckpoints(prev => {
      const taskChecks = prev[taskId] || [];
      if (taskChecks.includes(idx)) {
        return { ...prev, [taskId]: taskChecks.filter(i => i !== idx) };
      } else {
        return { ...prev, [taskId]: [...taskChecks, idx] };
      }
    });
  };
  
  const getProgress = (t: Todo) => {
    if (t.done) return 100;
    if (!t.checkpoints || t.checkpoints.length === 0) return 0;
    const completed = (completedCheckpoints[t.id] || []).length;
    return Math.round((completed / t.checkpoints.length) * 100);
  };

  const formatTime = (ts: number | string) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getCommentAvatarSource = (comment: TodoComment) => {
    const directAvatar = (comment.authorAvatar ?? "").trim();
    if (directAvatar) return directAvatar;

    const normalizedAuthorEmail = (comment.authorEmail ?? "").trim().toLowerCase();
    const normalizedAuthorName = (comment.authorName ?? "").trim().toLowerCase();

    if (
      normalizedCurrentUserAvatar
      && (
        (normalizedAuthorEmail && normalizedCurrentUserEmail && normalizedAuthorEmail === normalizedCurrentUserEmail)
        || (!normalizedAuthorEmail && normalizedAuthorName && normalizedCurrentUserName && normalizedAuthorName === normalizedCurrentUserName)
      )
    ) {
      return normalizedCurrentUserAvatar;
    }

    return "";
  };

  const displayTaskStatus = displayTask ? getTaskStatus(displayTask) : "active";
  const displayTaskStatusLabel =
    displayTaskStatus === "completed" ? "Completed" : displayTaskStatus === "overdue" ? "Overdue" : "In Progress";
  const displayTaskCountdown = displayTask ? getTaskCountdown(displayTask, liveNow) : null;
  const displayTaskProgress = displayTask ? getProgress(displayTask) : 0;
  const displayTaskCheckpointTotal = displayTask?.checkpoints.length ?? 0;
  const displayTaskCompletedCheckpointCount = displayTask
    ? displayTask.done
      ? displayTaskCheckpointTotal
      : (completedCheckpoints[displayTask.id] || []).length
    : 0;
  const displayTaskMetaCards = displayTask
    ? [
        { label: "Status", value: displayTaskStatusLabel, icon: "bi-check2-circle", tone: displayTaskStatus },
        { label: "Priority", value: displayTask.priority, icon: "bi-flag", tone: displayTask.priority.toLowerCase() },
        { label: "Assignee", value: displayTask.assignee?.trim() || "Unassigned", icon: "bi-person-badge", tone: "neutral" },
        { label: "Project", value: displayTask.project?.trim() || displayTask.department?.trim() || displayTask.category, icon: "bi-briefcase", tone: "neutral" },
        { label: "Due", value: displayTask.dueAt ? formatTime(displayTask.dueAt) : "Not scheduled", icon: "bi-calendar-event", tone: displayTask.dueAt ? displayTaskStatus : "neutral" },
        { label: "Focus", value: displayTaskCountdown?.label || displayTask.estimatedHours?.trim() || `${displayTaskProgress}% progress`, icon: displayTaskCountdown?.icon || "bi-stopwatch", tone: displayTaskCountdown?.tone || "neutral" },
      ]
    : [];
  const displayTaskPanelSummaryCards = displayTask
    ? [
        {
          label: "Progress",
          value: `${displayTaskProgress}%`,
          note:
            displayTaskCheckpointTotal > 0
              ? `${displayTaskCompletedCheckpointCount}/${displayTaskCheckpointTotal} checkpoints complete`
              : displayTask.done
                ? "Task marked complete"
                : "No checklist items yet",
          icon: "bi-graph-up-arrow",
          tone: displayTaskStatus,
        },
        {
          label: "Comments",
          value: String(displayTaskComments.length),
          note:
            displayTaskComments.length > 0
              ? `Latest update ${formatTime(displayTaskComments[0].createdAt)}`
              : "Conversation has not started",
          icon: "bi-chat-dots",
          tone: "neutral",
        },
        {
          label: "Tags",
          value: String(displayTask.tags.length),
          note: displayTask.tags.length > 0 ? "Quick context labels attached" : "No tags linked yet",
          icon: "bi-tags",
          tone: "neutral",
        },
        {
          label: "Estimate",
          value: displayTask.estimatedHours?.trim() || "Not set",
          note: displayTaskCountdown?.label || "Time budget for this task",
          icon: displayTaskCountdown?.icon || "bi-stopwatch",
          tone: displayTaskCountdown?.tone || "neutral",
        },
      ]
    : [];
  const displayTaskHistoryItems = displayTask
    ? [
        {
          id: `created-${displayTask.id}`,
          label: "Task created",
          timestamp: displayTask.createdAt,
          icon: "bi-plus-circle",
          tone: "created",
          description: "The task was added to the board and became part of the active workflow.",
        },
        ...(displayTask.dueAt
          ? [
              {
                id: `due-${displayTask.id}`,
                label: "Due date scheduled",
                timestamp: new Date(displayTask.dueAt).getTime(),
                icon: "bi-calendar-event",
                tone: "scheduled",
                description: `Deadline planned for ${formatTime(displayTask.dueAt)}.`,
              },
            ]
          : []),
        ...displayTaskComments.map((comment) => ({
          id: `comment-${comment.id}`,
          label: "Comment added",
          timestamp: comment.createdAt,
          icon: "bi-chat-left-text",
          tone: "comment",
          description: `${comment.authorName} added an update to this task.`,
        })),
        ...(displayTask.completedAt
          ? [
              {
                id: `completed-${displayTask.id}`,
                label: "Task completed",
                timestamp: displayTask.completedAt,
                icon: "bi-check2-circle",
                tone: "completed",
                description: "The task was marked complete and moved out of the active queue.",
              },
            ]
          : []),
      ].sort((a, b) => b.timestamp - a.timestamp)
    : [];

  // Calculate chart data from the entire week items for a broader perspective
  const totalHigh = boardPlannerItems.reduce((acc, item) => acc + item.high, 0);
  const totalMedium = boardPlannerItems.reduce((acc, item) => acc + item.medium, 0);
  const totalLow = boardPlannerItems.reduce((acc, item) => acc + item.low, 0);



  return (
    <div className="premium-board">
      {/* 1. Smart Header */}
      <header className="pb-smart-header">
        <div className="pb-sh-left">
          <h1>Task Intelligence</h1>
          <span className="pb-sh-date">{todayDate}</span>
        </div>
        <div className="pb-sh-right">
          <div className="pb-sh-search-wrapper">
            <i className="bi bi-search pb-sh-search-icon"></i>
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pb-sh-search-input"
            />
          </div>
          <button type="button" className="btn todoist-add-btn" onClick={onOpenAddModal}>
            <i className="bi bi-plus-lg" aria-hidden="true"></i>
            <span>Create Task</span>
          </button>
        </div>
      </header>

      {/* 2. Focus Strip (Hero Section) */}
      <section className="pb-focus-strip">
        <div className="pb-focus-card pb-stat-today">
          <div className="pb-fc-icon"><i className="bi bi-calendar-check"></i></div>
          <div className="pb-fc-info">
            <span className="pb-fc-label">Active Tasks ({selectedBoardLane})</span>
            <span className="pb-fc-value">{boardSummary.activeCount}</span>
          </div>
        </div>
        <div className="pb-focus-card pb-stat-upcoming">
          <div className="pb-fc-icon"><i className="bi bi-hourglass-split"></i></div>
          <div className="pb-fc-info">
            <span className="pb-fc-label">Upcoming Deadlines</span>
            <span className="pb-fc-value">{boardSummary.upcomingCount}</span>
          </div>
        </div>
        <div className="pb-focus-card pb-stat-productivity">
          <div className="pb-fc-icon"><i className="bi bi-graph-up-arrow"></i></div>
          <div className="pb-fc-info">
            <span className="pb-fc-label">Productivity</span>
            <span className="pb-fc-value">{boardSummary.productivity}%</span>
          </div>
        </div>
        <div className="pb-focus-card pb-stat-overdue">
          <div className="pb-fc-icon"><i className="bi bi-exclamation-octagon"></i></div>
          <div className="pb-fc-info">
            <span className="pb-fc-label">Overdue Tasks</span>
            <span className="pb-fc-value">{boardSummary.overdueCount}</span>
          </div>
        </div>
      </section>

      {/* 65% / 35% Layout */}
      <div className="pb-main-layout">
        
        {/* LEFT COLUMN: 65% (Tasks Feed) */}
        <section className="pb-smart-task-feed">
          
              {/* HORIZONTAL WEEKLY PIPELINE */}
              <div className="pb-horizontal-weekly-pipeline">
                <div className="pb-hwp-header">
                  <h3>Weekly Pipeline</h3>
                  <div className="pb-hwp-actions">
                <button 
                  className="pb-hwp-nav-btn" 
                  onClick={() => {
                    if (onDateChange) {
                      const d = selectedBoardDate ? new Date(selectedBoardDate) : new Date();
                      d.setDate(d.getDate() - 7);
                      onDateChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
                    }
                  }}
                  title="Previous Week"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <i 
                    className="bi bi-calendar3 pb-hwp-calendar-icon" 
                    title="Select Date"
                    onClick={() => {
                      const input = document.getElementById('pb-week-date-picker') as HTMLInputElement;
                      if (input && input.showPicker) {
                        input.showPicker();
                      } else if (input) {
                        input.click();
                      }
                    }}
                  ></i>
                  <input 
                    id="pb-week-date-picker"
                    type="date"
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, right: 0, top: 0, pointerEvents: 'none' }}
                    value={selectedBoardDate || ''}
                    onChange={(e) => onDateChange?.(e.target.value)}
                  />
                </div>
                <button 
                  className="pb-hwp-nav-btn" 
                  onClick={() => {
                    if (onDateChange) {
                      const d = selectedBoardDate ? new Date(selectedBoardDate) : new Date();
                      d.setDate(d.getDate() + 7);
                      onDateChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
                    }
                  }}
                  title="Next Week"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>

            <div className="pb-hwp-days-container">
              {boardPlannerItems && boardPlannerItems.map((item) => {
                const dayDate = new Date(item.date).getDate();
                const isActive = selectedBoardLane === item.lane;
                return (
                  <div 
                    key={item.lane} 
                    className={`pb-hwp-day-card ${isActive ? 'active' : ''}`}
                    onClick={() => onLaneSelect(item.lane, item.date)}
                  >
                    <div className="pb-hwp-day-top">
                      <span className="pb-hwp-day-name">{item.lane.slice(0, 3)}</span>
                      <span className="pb-hwp-day-date">{dayDate}</span>
                    </div>
                    <div className="pb-hwp-day-bottom">
                      <span className="pb-hwp-day-count">{item.tasks.length} task{item.tasks.length !== 1 ? 's' : ''}</span>
                      <div className="pb-hwp-day-dots">
                        {item.high > 0 && <span className="pb-dot high"></span>}
                        {item.medium > 0 && <span className="pb-dot medium"></span>}
                        {item.low > 0 && <span className="pb-dot low"></span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comprehensive Task List Table */}
          <div className="pb-table-widget">
            <div className="pb-tw-header">
              <h2 className="pb-tw-title">Comprehensive Task List</h2>
              <div className="pb-tw-tools">
                <div className="pb-sh-search-wrapper" style={{ transform: 'scale(0.9)', transformOrigin: 'right center' }}>
                  <i className="bi bi-search pb-sh-search-icon"></i>
                  <input 
                    type="text" 
                    placeholder="Search tasks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pb-sh-search-input"
                  />
                </div>
                <i className="bi bi-three-dots"></i>
              </div>
            </div>
            
            <div className="pb-tw-table-container">
              <table className="pb-tw-table">
                <thead>
                  <tr>
                    <th className="pb-tw-col-priority">Priority</th>
                    <th className="pb-tw-col-task">Task</th>
                    <th className="pb-tw-col-live-time">Live Time</th>
                    <th className="pb-tw-col-due-time">Due Time</th>
                    <th className="pb-tw-col-assignee">Assignees</th>
                    <th className="pb-tw-col-status">Status</th>
                    <th className="pb-tw-col-comments">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="pb-tw-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6 }}>
                          <i className="bi bi-inboxes" style={{ fontSize: '3rem', marginBottom: '16px' }}></i>
                          <h3 style={{ marginBottom: '8px', color: 'var(--todo-text-p)', fontSize: '1.2rem', fontWeight: 'bold' }}>No Tasks Yet</h3>
                          <p style={{ margin: 0 }}>There are no tasks scheduled for {selectedBoardLane}. Time to chill.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(task => {
                      const status = getTaskStatus(task);
                      const assigneeName = task.assignee?.trim() || "Unassigned";
                      const assigneeMeta = task.project?.trim() || task.department?.trim() || task.category;
                      const assigneeInitials = getAvatarInitials(task.assignee);
                      const countdown = getTaskCountdown(task, liveNow);
                      const liveTimeLabel = countdown
                        ? countdown.label
                        : task.estimatedHours?.trim() || (task.done ? "Completed" : "No timer");
                      const liveTimeIcon = countdown
                        ? countdown.icon
                        : task.done
                          ? "bi-check2-circle"
                          : task.estimatedHours?.trim()
                            ? "bi-hourglass-split"
                            : "bi-stopwatch";
                      const liveTimeToneClass = countdown
                        ? `is-${countdown.tone}`
                        : task.done
                          ? "is-done"
                          : "";
                      const liveTimeMeta = getTaskLiveTimeMeta(task, countdown, formatTime);
                      const dueTimeLabel = task.dueAt ? formatTime(task.dueAt) : "No due time";
                      const dueTimeToneClass = task.dueAt
                        ? task.done
                          ? "is-done"
                          : status === "overdue"
                            ? "is-overdue"
                            : ""
                        : "is-empty";
                      const dueTimeMeta = task.dueAt
                        ? status === "overdue"
                          ? "Deadline passed"
                          : task.done
                            ? "Completed"
                            : "Scheduled deadline"
                        : "No deadline set";
                      const commentCount = getValidComments(task.comments).length;
                      return (
                        <tr key={task.id} onClick={() => handleTaskClick(task)} className={`pb-tw-row pb-tw-status-${status}`}>
                          <td>
                            <span className={`pb-tw-priority-badge pb-tw-pr-${task.priority.toLowerCase()}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="pb-tw-task-name">{task.title}</td>
                          <td className="pb-tw-time-cell">
                            <div className={`pb-tw-time-main ${liveTimeToneClass}`.trim()}>
                              <i className={`bi ${liveTimeIcon}`} aria-hidden="true"></i>
                              <span>{liveTimeLabel}</span>
                            </div>
                            <span className="pb-tw-time-meta">{liveTimeMeta}</span>
                          </td>
                          <td className="pb-tw-due-cell">
                            <div className={`pb-tw-due-main ${dueTimeToneClass}`.trim()}>
                              <i className="bi bi-alarm" aria-hidden="true"></i>
                              <span>{dueTimeLabel}</span>
                            </div>
                            <span className="pb-tw-due-meta">{dueTimeMeta}</span>
                          </td>
                          <td className="pb-tw-assignee-cell">
                            <div className="pb-tw-assignee-card">
                              <div className="pb-tw-assignees">
                                <div className="pb-tw-avatar" style={{ background: "var(--todo-accent)" }}>{assigneeInitials}</div>
                              </div>
                              <div className="pb-tw-assignee-copy">
                                <strong>{assigneeName}</strong>
                                <span>{assigneeMeta}</span>
                              </div>
                            </div>
                          </td>
                          <td className="pb-tw-status-cell">
                            <label className="pb-tw-checkbox" onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={task.done} 
                                onChange={() => onToggleDone(task.id)} 
                              />
                              <span className="pb-tw-checkmark"></span>
                            </label>
                          </td>
                          <td className="pb-tw-comments-cell">
                            <span className="pb-tw-comments">
                              <i className="bi bi-chat-left-text" aria-hidden="true"></i>
                              <span>{commentCount}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="pb-tw-mobile-list">
              {filteredTasks.length === 0 ? (
                <div className="pb-tw-empty">No tasks scheduled for {selectedBoardLane} yet.</div>
              ) : (
                filteredTasks.map((task) => {
                  const status = getTaskStatus(task);
                  const statusLabel =
                    status === "completed"
                      ? "Completed"
                      : status === "overdue"
                        ? "Overdue"
                        : "In Progress";
                  const commentCount = getValidComments(task.comments).length;
                  const assigneeName = task.assignee?.trim() || "Unassigned";
                  const assigneeMeta = task.project?.trim() || task.department?.trim() || task.category;
                  const assigneeInitials = getAvatarInitials(task.assignee);
                  const countdown = getTaskCountdown(task, liveNow);
                  const liveTimeLabel = countdown
                    ? countdown.label
                    : task.estimatedHours?.trim() || (task.done ? "Completed" : "No timer");
                  const liveTimeIcon = countdown
                    ? countdown.icon
                    : task.done
                      ? "bi-check2-circle"
                      : task.estimatedHours?.trim()
                        ? "bi-hourglass-split"
                        : "bi-stopwatch";
                  const liveTimeToneClass = countdown
                    ? `is-${countdown.tone}`
                    : task.done
                      ? "is-done"
                      : "";
                  const liveTimeMeta = getTaskLiveTimeMeta(task, countdown, formatTime);
                  const dueTimeLabel = task.dueAt ? formatTime(task.dueAt) : "No due time";
                  const dueTimeToneClass = task.dueAt
                    ? task.done
                      ? "is-done"
                      : status === "overdue"
                        ? "is-overdue"
                        : ""
                    : "is-empty";
                  const dueTimeMeta = task.dueAt
                    ? status === "overdue"
                      ? "Deadline passed"
                      : task.done
                        ? "Completed"
                        : "Scheduled deadline"
                    : "No deadline set";

                  return (
                    <article
                      key={`mobile-${task.id}`}
                      className={`pb-tw-mobile-card pb-tw-status-${status}`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="pb-tw-mobile-card__top">
                        <div className="pb-tw-mobile-card__heading">
                          <strong>{task.title}</strong>
                          <p>{task.category}</p>
                        </div>
                        <label
                          className="pb-tw-checkbox"
                          onClick={(event) => event.stopPropagation()}
                          aria-label={task.done ? "Mark task as pending" : "Mark task as complete"}
                        >
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => onToggleDone(task.id)}
                          />
                          <span className="pb-tw-checkmark"></span>
                        </label>
                      </div>

                      <div className="pb-tw-mobile-card__table" role="presentation">
                        <div className="pb-tw-mobile-card__row">
                          <span className="pb-tw-mobile-card__label">Priority</span>
                          <span className={`pb-tw-priority-badge pb-tw-pr-${task.priority.toLowerCase()}`}>
                            {task.priority}
                          </span>
                        </div>

                        <div className="pb-tw-mobile-card__row">
                          <span className="pb-tw-mobile-card__label">Live Time</span>
                          <div className="pb-tw-mobile-card__value pb-tw-mobile-card__value--stack">
                            <span className={`pb-tw-mobile-card__time ${liveTimeToneClass}`.trim()}>
                              <i className={`bi ${liveTimeIcon}`} aria-hidden="true"></i>
                              <strong>{liveTimeLabel}</strong>
                            </span>
                            <small className="pb-tw-mobile-card__time-meta">{liveTimeMeta}</small>
                          </div>
                        </div>

                        <div className="pb-tw-mobile-card__row">
                          <span className="pb-tw-mobile-card__label">Due Time</span>
                          <div className="pb-tw-mobile-card__value pb-tw-mobile-card__value--stack">
                            <span className={`pb-tw-due-main ${dueTimeToneClass}`.trim()}>
                              <i className="bi bi-alarm" aria-hidden="true"></i>
                              <strong>{dueTimeLabel}</strong>
                            </span>
                            <small className="pb-tw-due-meta">{dueTimeMeta}</small>
                          </div>
                        </div>

                        <div className="pb-tw-mobile-card__row">
                          <span className="pb-tw-mobile-card__label">Assignee</span>
                          <div className="pb-tw-mobile-card__value">
                            <div className="pb-tw-assignee-card">
                              <div className="pb-tw-assignees">
                                <div className="pb-tw-avatar" style={{ background: "var(--todo-accent)" }}>{assigneeInitials}</div>
                              </div>
                              <div className="pb-tw-assignee-copy">
                                <strong>{assigneeName}</strong>
                                <span>{assigneeMeta}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pb-tw-mobile-card__row">
                          <span className="pb-tw-mobile-card__label">Status</span>
                          <span className={`pb-tw-mobile-card__status pb-tw-mobile-card__status--${status}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="pb-tw-mobile-card__row">
                          <span className="pb-tw-mobile-card__label">Comments</span>
                          <div className="pb-tw-mobile-card__value">
                            <i className="bi bi-chat-left-text" aria-hidden="true"></i>
                            {commentCount} comments
                          </div>
                        </div>
                      </div>

                      <div className="pb-tw-mobile-card__footer">
                        <button
                          type="button"
                          className="pb-tw-mobile-card__open"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleTaskClick(task);
                            setIsPanelOpen(true);
                          }}
                        >
                          View details
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: 35% (7-Day Widget & Chart) */}
        <aside className="pb-sidebar-widgets">
          
          {(() => {
            const t = totalHigh + totalMedium + totalLow;
            const hPct = t === 0 ? 0 : (totalHigh / t) * 100;
            const mPct = t === 0 ? 0 : (totalMedium / t) * 100;
            return (
              <div className="pb-priority-widget">
                <div className="pb-pw-header">
                  <div>
                    <h3>Priority Distribution</h3>
                    <p>Total tasks across the week</p>
                  </div>
                  <i className="bi bi-bar-chart-line"></i>
                </div>
    
                <div className="pb-pw-content">
                  {/* Left: Donut Chart */}
                  <div className="pb-pw-chart-container">
                    <div 
                      className="pb-pw-donut" 
                      style={{ 
                        background: t === 0 
                          ? 'conic-gradient(#1e293b 0% 100%)'
                          : `conic-gradient(#ef4444 0% ${hPct}%, #eab308 ${hPct}% ${hPct + mPct}%, #22c55e ${hPct + mPct}% 100%)`
                      }}
                    >
                      <div className="pb-pw-donut-inner">
                        <span className="pb-pw-total-num">{t}</span>
                        <span className="pb-pw-total-label">Tasks</span>
                      </div>
                    </div>
                  </div>
    
                  {/* Right: Data Blocks */}
                  <div className="pb-pw-stats">
                    <div className="pb-pw-stat-col">
                      <span className="pb-pw-stat-num" style={{ color: '#ef4444' }}>{totalHigh}</span>
                      <span className="pb-pw-stat-label">High</span>
                    </div>
                    <div className="pb-pw-stat-col">
                      <span className="pb-pw-stat-num" style={{ color: '#eab308' }}>{totalMedium}</span>
                      <span className="pb-pw-stat-label">Medium</span>
                    </div>
                    <div className="pb-pw-stat-col">
                      <span className="pb-pw-stat-num" style={{ color: '#22c55e' }}>{totalLow}</span>
                      <span className="pb-pw-stat-label">Low</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Dynamic Task Details Widget */}
          <div className="pb-task-details-widget">
            {displayTask ? (
              <>
                <div className="pb-tdw-header">
                  <div className="pb-tdw-h-left">
                    <div 
                      className="pb-tdw-checkbox" 
                      onClick={() => onToggleDone(displayTask.id)}
                      style={{cursor: 'pointer'}}
                    >
                      {displayTask.done ? <i className="bi bi-check-circle-fill" style={{color:'var(--todo-success)'}}></i> : <i className="bi bi-circle"></i>}
                    </div>
                    <h3 style={{ textDecoration: displayTask.done ? 'line-through' : 'none', opacity: displayTask.done ? 0.6 : 1 }}>
                      {displayTask.title}
                    </h3>
                  </div>
                  <div className="pb-tdw-h-right">
                    <button className="pb-tdw-icon-btn" onClick={() => onOpenComment?.(displayTask)} title="Add Comment"><i className="bi bi-chat-left-text"></i></button>
                    <button className="pb-tdw-icon-btn" onClick={() => onEdit?.(displayTask)} title="Edit Task"><i className="bi bi-pencil"></i></button>
                    <button className="pb-tdw-icon-btn" onClick={() => { 
                      onDelete(displayTask.id); 
                      if (selectedTaskId === displayTask.id) setSelectedTaskId(null);
                      setIsPanelOpen(false);
                    }} title="Delete Task"><i className="bi bi-trash"></i></button>
                    <button className="pb-tdw-icon-btn" onClick={() => setIsPanelOpen(true)} title="Open Full Details Panel"><i className="bi bi-arrow-right-short"></i></button>
                  </div>
                </div>

                <div className="pb-tdw-tabs">
                  <button 
                    className={`pb-tdw-tab ${activeTaskTab === "details" ? "active" : ""}`} 
                    onClick={() => setActiveTaskTab("details")}
                  >Details</button>
                  <button 
                    className={`pb-tdw-tab ${activeTaskTab === "comments" ? "active" : ""}`} 
                    onClick={() => setActiveTaskTab("comments")}
                  >Comments</button>
                  <button 
                    className={`pb-tdw-tab ${activeTaskTab === "history" ? "active" : ""}`} 
                    onClick={() => setActiveTaskTab("history")}
                  >History</button>
                </div>

                <div className="pb-tdw-content">
                  {activeTaskTab === "details" && (
                    <div className="pb-tdw-details-tab">
                      <div className="pb-tdw-overview-grid">
                        {displayTaskMetaCards.map((item) => (
                          <article key={item.label} className={`pb-tdw-overview-card is-${item.tone}`}>
                            <span className="pb-tdw-overview-card__label">
                              <i className={`bi ${item.icon}`} aria-hidden="true"></i>
                              {item.label}
                            </span>
                            <strong>{item.value}</strong>
                          </article>
                        ))}
                      </div>

                      <section className="pb-tdw-panel">
                        <div className="pb-tdw-panel__head">
                          <span>Description</span>
                          <small>{displayTask.category}</small>
                        </div>
                        <p className="pb-tdw-desc">{displayTask.description || "No description provided."}</p>
                      </section>

                      <section className="pb-tdw-panel">
                        <div className="pb-tdw-panel__head">
                          <span>Work Summary</span>
                          <small>{displayTaskProgress}% complete</small>
                        </div>
                        <div className="pb-tdw-summary-grid">
                          <div className="pb-tdw-summary-chip">
                            <span>Comments</span>
                            <strong>{displayTaskComments.length}</strong>
                          </div>
                          <div className="pb-tdw-summary-chip">
                            <span>Checkpoints</span>
                            <strong>{displayTask.checkpoints.length}</strong>
                          </div>
                          <div className="pb-tdw-summary-chip">
                            <span>Tags</span>
                            <strong>{displayTask.tags.length}</strong>
                          </div>
                        </div>
                      </section>

                      {displayTask.tags.length > 0 && (
                        <section className="pb-tdw-panel">
                          <div className="pb-tdw-panel__head">
                            <span>Tags & Context</span>
                            <small>Quick labels</small>
                          </div>
                          <div className="pb-tdw-tag-list">
                            {displayTask.tags.map((tag) => (
                              <span key={tag} className="pb-tdw-tag">{tag}</span>
                            ))}
                          </div>
                        </section>
                      )}

                      <section className="pb-tdw-panel">
                        <div className="pb-tdw-panel__head">
                          <span>Sub-tasks</span>
                          <small>{displayTask.checkpoints.length} items</small>
                        </div>
                        <div className="pb-tdw-progress-list">
                          {displayTask.checkpoints && displayTask.checkpoints.length > 0 ? (
                            displayTask.checkpoints.map((cp, idx) => {
                              const isCompleted = (completedCheckpoints[displayTask.id] || []).includes(idx);
                              return (
                                <div key={idx} className="pb-tdw-progress-item" style={{cursor: 'pointer'}} onClick={() => toggleCheckpoint(displayTask.id, idx)}>
                                  <div className="pb-tdw-pi-header">
                                    <span className="pb-tdw-pi-label" style={{textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1}}>{cp}</span>
                                    <span className="pb-tdw-pi-val">{isCompleted ? 'Done' : 'Pending'}</span>
                                  </div>
                                  <div className="pb-tdw-pi-track">
                                    <div className={`pb-tdw-pi-fill ${isCompleted ? 'pb-fill-high' : 'pb-fill-low'}`} style={{ width: isCompleted ? '100%' : '2%' }}></div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="pb-tdw-panel__empty">No sub-tasks available for this task yet.</p>
                          )}
                        </div>
                      </section>
                    </div>
                  )}

                  {activeTaskTab === "comments" && (
                    <div className="pb-tdw-comments-tab">
                      <div className="pb-tdw-comments-summary">
                        <div className="pb-tdw-comments-summary__copy">
                          <span className="pb-tdw-comments-summary__eyebrow">Conversation</span>
                          <strong>{displayTaskComments.length} comment{displayTaskComments.length === 1 ? "" : "s"}</strong>
                        </div>
                        <button
                          type="button"
                          className="pb-tdw-comments-summary__action"
                          onClick={() => onOpenComment?.(displayTask)}
                        >
                          <i className="bi bi-chat-left-text" aria-hidden="true"></i>
                          <span>Add comment</span>
                        </button>
                      </div>

                      {displayTaskComments.length === 0 ? (
                        <div className="pb-tdw-comments-empty">
                          <span className="pb-tdw-comments-empty__icon">
                            <i className="bi bi-chat-square-text" aria-hidden="true"></i>
                          </span>
                          <strong>No comments yet</strong>
                          <p>Use comments to capture updates, quick notes, and follow-ups for this task.</p>
                        </div>
                      ) : (
                        <div className="pb-tdw-comments-list">
                          {displayTaskComments.map((comment, index) => {
                            const commentAvatar = getCommentAvatarSource(comment);
                            return (
                              <article key={comment.id} className="pb-tdw-comment-card">
                                <div className="pb-tdw-comment-card__avatar">
                                  {commentAvatar ? (
                                    <img src={commentAvatar} alt={comment.authorName} />
                                  ) : (
                                    getAvatarInitials(comment.authorName)
                                  )}
                                </div>
                                <div className="pb-tdw-comment-card__body">
                                  <div className="pb-tdw-comment-card__top">
                                    <div className="pb-tdw-comment-card__author-block">
                                      <strong>{comment.authorName}</strong>
                                      <span>{formatTime(comment.createdAt)}</span>
                                    </div>
                                    <span className="pb-tdw-comment-card__badge">
                                      #{String(index + 1).padStart(2, "0")}
                                    </span>
                                  </div>
                                  <p>{comment.text}</p>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTaskTab === "history" && (
                    <div className="pb-tdw-history-tab">
                      <div className="pb-tdw-history-summary">
                        <span className="pb-tdw-history-summary__eyebrow">Activity timeline</span>
                        <strong>{displayTaskHistoryItems.length} events captured</strong>
                        <p>Track when the task was created, scheduled, discussed, and completed.</p>
                      </div>

                      <div className="pb-tdw-history-list">
                        {displayTaskHistoryItems.map((item) => (
                          <article key={item.id} className={`pb-tdw-history-card is-${item.tone}`}>
                            <span className="pb-tdw-history-card__icon">
                              <i className={`bi ${item.icon}`} aria-hidden="true"></i>
                            </span>
                            <div className="pb-tdw-history-card__body">
                              <div className="pb-tdw-history-card__top">
                                <strong>{item.label}</strong>
                                <span>{formatTime(item.timestamp)}</span>
                              </div>
                              <p>{item.description}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="pb-tdw-empty-state" style={{padding: '60px 20px', textAlign: 'center', opacity: 0.5}}>
                <i className="bi bi-card-checklist" style={{fontSize: '2.5rem', marginBottom: '16px', display: 'block'}}></i>
                <p>Select a task to view details</p>
              </div>
            )}
          </div>

        </aside>
      </div>

      {/* Bottom Slide Task Panel */}
      <div className={`pb-bottom-slide-panel ${isPanelOpen && displayTask ? 'open' : ''}`}>
        <div className="pb-bsp-overlay" onClick={closePanel}></div>
        <div className="pb-bsp-content">
          {displayTask && (
            <>
              <div className="pb-bsp-header">
                <div className="pb-bsp-h-left">
                  <h2>{displayTask.title}</h2>
                  <div className="pb-bsp-tags">
                    <span className="pb-stf-tag pb-stf-cat-tag">{displayTask.category}</span>
                    {displayTask.tags?.map(tag => <span key={tag} className="pb-stf-tag">{tag}</span>)}
                  </div>
                </div>
                <div className="pb-bsp-h-right">
                  <div className="pb-circular-progress" style={{background: `conic-gradient(var(--todo-accent) ${getProgress(displayTask) * 3.6}deg, var(--todo-border) 0deg)`}}>
                    <div className="pb-inner-circle">{getProgress(displayTask)}%</div>
                  </div>
                  <button className="pb-bsp-btn toggle-btn" onClick={() => onToggleDone(displayTask.id)}>
                    {displayTask.done ? <i className="bi bi-arrow-return-left"></i> : <i className="bi bi-check2"></i>}
                  </button>
                  <button className="pb-bsp-btn" onClick={() => onOpenComment?.(displayTask)}>
                    <i className="bi bi-chat-left-text"></i>
                  </button>
                  <button className="pb-bsp-btn delete-btn" onClick={() => { 
                    onDelete(displayTask.id); 
                    if (selectedTaskId === displayTask.id) setSelectedTaskId(null);
                    closePanel(); 
                  }}>
                    <i className="bi bi-trash"></i>
                  </button>
                  <button className="pb-bsp-btn close-btn" onClick={closePanel}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>

              <div className="pb-bsp-body">
                <div className="pb-bsp-column pb-bsp-main-col">
                  <div className="pb-bsp-overview-grid">
                    {displayTaskPanelSummaryCards.map((item) => (
                      <article key={item.label} className={`pb-bsp-overview-card is-${item.tone}`}>
                        <span className="pb-bsp-overview-card__label">
                          <i className={`bi ${item.icon}`} aria-hidden="true"></i>
                          {item.label}
                        </span>
                        <strong>{item.value}</strong>
                        <p>{item.note}</p>
                      </article>
                    ))}
                  </div>

                  <div className="pb-bsp-section pb-bsp-section--elevated">
                    <div className="pb-bsp-section-head">
                      <div>
                        <span className="pb-bsp-section-eyebrow">Task brief</span>
                        <h3>Description</h3>
                      </div>
                      <span className="pb-bsp-section-pill">
                        {displayTask.project?.trim() || displayTask.department?.trim() || displayTask.category}
                      </span>
                    </div>
                    <p className="pb-task-desc">{displayTask.description || "No description provided for this task yet."}</p>
                  </div>

                  <div className="pb-bsp-section pb-bsp-section--elevated">
                    <div className="pb-bsp-section-head">
                      <div>
                        <span className="pb-bsp-section-eyebrow">Execution plan</span>
                        <h3>Subtasks Checklist</h3>
                      </div>
                      <div className="pb-bsp-section-metric">
                        <strong>{displayTaskProgress}%</strong>
                        <span>
                          {displayTaskCheckpointTotal > 0
                            ? `${displayTaskCompletedCheckpointCount}/${displayTaskCheckpointTotal} completed`
                            : "No checklist yet"}
                        </span>
                      </div>
                    </div>
                    <div className="pb-bsp-progress">
                      <div className="pb-bsp-progress__bar">
                        <span className="pb-bsp-progress__fill" style={{ width: `${displayTaskProgress}%` }}></span>
                      </div>
                      <p>
                        {displayTaskCheckpointTotal > 0
                          ? "Track every step and update checklist progress directly from here."
                          : "Add checkpoints to break this task into smaller milestones."}
                      </p>
                    </div>
                    <div className="pb-bsp-subtasks">
                      {!displayTask.checkpoints || displayTask.checkpoints.length === 0 ? (
                        <p className="pb-empty-text">No checkpoints for this task.</p>
                      ) : (
                        displayTask.checkpoints.map((cp, idx) => {
                          const isCompleted = (completedCheckpoints[displayTask.id] || []).includes(idx);
                          return (
                            <label key={idx} className={`pb-bsp-subtask ${isCompleted || displayTask.done ? 'completed' : ''}`}>
                              <input 
                                type="checkbox" 
                                checked={isCompleted || displayTask.done}
                                onChange={() => toggleCheckpoint(displayTask.id, idx)}
                                disabled={displayTask.done}
                              />
                              <span className="pb-sub-title">{cp}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pb-bsp-section pb-bsp-section--elevated">
                    <div className="pb-bsp-section-head">
                      <div>
                        <span className="pb-bsp-section-eyebrow">Conversation</span>
                        <h3>Comments</h3>
                      </div>
                      <button
                        type="button"
                        className="pb-bsp-inline-btn"
                        onClick={() => onOpenComment?.(displayTask)}
                      >
                        <i className="bi bi-chat-left-text" aria-hidden="true"></i>
                        <span>Add comment</span>
                      </button>
                    </div>
                    <div className="pb-bsp-chat">
                      {displayTaskComments.length === 0 ? (
                        <p className="pb-no-comments">No comments yet. Start the conversation!</p>
                      ) : (
                        displayTaskComments.map((c, index) => {
                          const commentAvatar = getCommentAvatarSource(c);
                          return (
                          <article key={c.id} className="pb-chat-msg">
                            <div className="pb-chat-avatar">
                              {commentAvatar ? <img src={commentAvatar} alt={c.authorName} /> : getAvatarInitials(c.authorName)}
                            </div>
                            <div className="pb-chat-bubble">
                              <div className="pb-chat-meta">
                                <div className="pb-chat-meta__author">
                                  <strong>{c.authorName}</strong>
                                  <span>{c.authorEmail || "Workspace comment"}</span>
                                </div>
                                <div className="pb-chat-meta__stamp">
                                  <span>{formatTime(c.createdAt)}</span>
                                  <strong>#{String(index + 1).padStart(2, "0")}</strong>
                                </div>
                              </div>
                              <p>{c.text}</p>
                            </div>
                          </article>
                        )})
                      )}
                      
                    </div>
                  </div>

                </div>

                <div className="pb-bsp-column pb-bsp-side-col">
                  <div className="pb-bsp-section pb-bsp-section--elevated">
                    <div className="pb-bsp-section-head">
                      <div>
                        <span className="pb-bsp-section-eyebrow">Quick facts</span>
                        <h3>Task Snapshot</h3>
                      </div>
                      <span className="pb-bsp-section-pill">{displayTaskMetaCards.length} metrics</span>
                    </div>
                    <div className="pb-bsp-facts-grid">
                      {displayTaskMetaCards.map((item) => (
                        <article key={item.label} className={`pb-bsp-fact-card is-${item.tone}`}>
                          <span className="pb-bsp-fact-card__label">
                            <i className={`bi ${item.icon}`} aria-hidden="true"></i>
                            {item.label}
                          </span>
                          <strong>{item.value}</strong>
                        </article>
                      ))}
                    </div>
                  </div>

                  {displayTask.tags.length > 0 && (
                    <div className="pb-bsp-section pb-bsp-section--elevated">
                      <div className="pb-bsp-section-head">
                        <div>
                          <span className="pb-bsp-section-eyebrow">Context</span>
                          <h3>Tags & Labels</h3>
                        </div>
                        <span className="pb-bsp-section-pill">{displayTask.tags.length} tags</span>
                      </div>
                      <div className="pb-bsp-tag-list">
                        {displayTask.tags.map((tag) => (
                          <span key={tag} className="pb-bsp-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pb-bsp-section pb-bsp-section--elevated">
                    <div className="pb-bsp-section-head">
                      <div>
                        <span className="pb-bsp-section-eyebrow">Task journey</span>
                        <h3>Activity Timeline</h3>
                      </div>
                      <span className="pb-bsp-section-pill">{displayTaskHistoryItems.length} events</span>
                    </div>
                    <div className="pb-bsp-timeline">
                      {displayTaskHistoryItems.map((item) => (
                        <article key={item.id} className={`pb-bsp-timeline-card is-${item.tone}`}>
                          <span className="pb-bsp-timeline-card__icon">
                            <i className={`bi ${item.icon}`} aria-hidden="true"></i>
                          </span>
                          <div className="pb-bsp-timeline-card__body">
                            <div className="pb-bsp-timeline-card__top">
                              <strong>{item.label}</strong>
                              <span>{formatTime(item.timestamp)}</span>
                            </div>
                            <p>{item.description}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
