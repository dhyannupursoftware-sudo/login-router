import { useReducer, useState } from "react";
import "./Todo.css";

type TaskFilter = "all" | "pending" | "completed";
type Priority = "low" | "medium" | "high";

interface TodoType {
  id: number;
  text: string;
  category: string;
  priority: Priority;
  done: boolean;
  createdAt: number;
}

type ActionType =
  | { type: "ADD_TODO"; payload: { text: string; category: string; priority: Priority } }
  | { type: "DELETE_TODO"; payload: number }
  | { type: "EDIT_TODO"; payload: { id: number; text: string; category: string; priority: Priority } }
  | { type: "TOGGLE_DONE"; payload: number };

const reducer = (state: TodoType[], action: ActionType): TodoType[] => {
  switch (action.type) {
    case "ADD_TODO":
      return [
        {
          id: Date.now(),
          text: action.payload.text,
          category: action.payload.category,
          priority: action.payload.priority,
          done: false,
          createdAt: Date.now(),
        },
        ...state,
      ];
    case "DELETE_TODO":
      return state.filter((item) => item.id !== action.payload);
    case "EDIT_TODO":
      return state.map((item) =>
        item.id === action.payload.id
          ? {
              ...item,
              text: action.payload.text,
              category: action.payload.category,
              priority: action.payload.priority,
            }
          : item
      );
    case "TOGGLE_DONE":
      return state.map((item) =>
        item.id === action.payload
          ? {
              ...item,
              done: !item.done,
            }
          : item
      );
    default:
      return state;
  }
};

const filterOptions: Array<{ id: TaskFilter; label: string }> = [
  { id: "all", label: "All Tasks" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
];

const priorityLabels: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const formatTaskTime = (value: number) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function Todo() {
  const [state, dispatch] = useReducer(reducer, []);
  const [task, setTask] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<Priority>("medium");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");

  const trimmedSearch = search.trim().toLowerCase();
  const visibleTodos = state.filter((item) => {
    const matchesFilter =
      filter === "all" ? true : filter === "pending" ? !item.done : item.done;
    const matchesSearch =
      trimmedSearch.length === 0
        ? true
        : `${item.text} ${item.category} ${priorityLabels[item.priority]}`
            .toLowerCase()
            .includes(trimmedSearch);

    return matchesFilter && matchesSearch;
  });

  const totalTasks = state.length;
  const completedTasks = state.filter((item) => item.done).length;
  const pendingTasks = totalTasks - completedTasks;
  const highPriorityTasks = state.filter((item) => item.priority === "high" && !item.done).length;

  const resetComposer = () => {
    setTask("");
    setCategory("General");
    setPriority("medium");
    setEditingId(null);
  };

  const submitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedTask = task.trim();
    const normalizedCategory = category.trim() || "General";
    if (!normalizedTask) return;

    if (editingId !== null) {
      dispatch({
        type: "EDIT_TODO",
        payload: {
          id: editingId,
          text: normalizedTask,
          category: normalizedCategory,
          priority,
        },
      });
      resetComposer();
      return;
    }

    dispatch({
      type: "ADD_TODO",
      payload: {
        text: normalizedTask,
        category: normalizedCategory,
        priority,
      },
    });
    resetComposer();
  };

  const startEdit = (item: TodoType) => {
    setTask(item.text);
    setCategory(item.category);
    setPriority(item.priority);
    setEditingId(item.id);
  };

  const completionPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="todo-container dashboard-planner">
      <section className="dashboard-hero">
        <div className="dashboard-hero__copy">
          <p className="dashboard-kicker">Task Studio</p>
          <h2>Cleaner layout, stronger structure, faster daily review.</h2>
          <p>
            Add clear tasks, filter your queue, and review progress from one focused dashboard instead of a loose list.
          </p>
        </div>

        <div className="dashboard-hero__badges" aria-label="Dashboard highlights">
          <span>{editingId !== null ? "Edit mode active" : "Ready for new tasks"}</span>
          <span>{pendingTasks} pending focus</span>
          <span>{visibleTodos.length} visible now</span>
        </div>
      </section>

      <section className="dashboard-stats-grid" aria-label="Task summary">
        <article className="dashboard-stat-card">
          <span>Total Tasks</span>
          <strong>{totalTasks}</strong>
          <small>All items in this dashboard</small>
        </article>
        <article className="dashboard-stat-card">
          <span>Completion</span>
          <strong>{completionPct}%</strong>
          <small>{completedTasks} tasks finished cleanly</small>
        </article>
        <article className="dashboard-stat-card">
          <span>Pending</span>
          <strong>{pendingTasks}</strong>
          <small>Work still waiting for action</small>
        </article>
        <article className="dashboard-stat-card">
          <span>High Priority</span>
          <strong>{highPriorityTasks}</strong>
          <small>Urgent tasks still open</small>
        </article>
      </section>

      <div className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-panel--composer">
          <div className="dashboard-panel__head">
            <div>
              <p>Composer</p>
              <h3>{editingId !== null ? "Update task details" : "Create a well-structured task"}</h3>
            </div>
            {editingId !== null && <span className="dashboard-panel__tag">Editing</span>}
          </div>

          <form className="dashboard-form" onSubmit={submitHandler}>
            <label className="dashboard-form-row dashboard-form-row--full" htmlFor="dashboard-task-title">
              <span>Task title</span>
              <input
                id="dashboard-task-title"
                type="text"
                value={task}
                onChange={(event) => setTask(event.target.value)}
                placeholder="Write a task with a clear outcome"
                className="dashboard-input"
              />
            </label>

            <div className="dashboard-form-split">
              <label className="dashboard-form-row" htmlFor="dashboard-task-category">
                <span>Category</span>
                <input
                  id="dashboard-task-category"
                  type="text"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Design, Dev, Review"
                  className="dashboard-input"
                />
              </label>

              <label className="dashboard-form-row" htmlFor="dashboard-task-priority">
                <span>Priority</span>
                <select
                  id="dashboard-task-priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority)}
                  className="dashboard-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <div className="dashboard-composer-actions">
              <button type="submit" className="add-btn">
                {editingId !== null ? "Update Task" : "Add Task"}
              </button>
              {editingId !== null && (
                <button type="button" className="edit-btn" onClick={resetComposer}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="dashboard-composer-note">
            <strong>Structure matters.</strong>
            <p>Short titles, proper category names, and real priorities make the list easier to scan and finish.</p>
          </div>
        </article>

        <article className="dashboard-panel dashboard-panel--tasks">
          <div className="dashboard-panel__head">
            <div>
              <p>Queue</p>
              <h3>Task list with better scanning and control</h3>
            </div>
            <span className="dashboard-panel__tag">{visibleTodos.length} visible</span>
          </div>

          <div className="dashboard-toolbar">
            <label className="dashboard-search" htmlFor="dashboard-search">
              <span>Search task, category, or priority</span>
              <input
                id="dashboard-search"
                type="text"
                placeholder="Search your current queue"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="search-input dashboard-input"
              />
            </label>

            <div className="dashboard-filter-tabs" aria-label="Task filters">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`dashboard-filter-btn ${filter === option.id ? "active" : ""}`}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {visibleTodos.length === 0 ? (
            <div className="dashboard-empty">
              <h3>{trimmedSearch ? "No task matched your search" : "Your task list is empty"}</h3>
              <p>
                {trimmedSearch
                  ? "Try a different keyword, or clear the search to see the full queue."
                  : "Use the composer panel to add your first task with a proper category and priority."}
              </p>
            </div>
          ) : (
            <ul className="dashboard-task-list">
              {visibleTodos.map((item) => (
                <li key={item.id} className={`dashboard-task-card ${item.done ? "is-done" : ""}`}>
                  <div className="dashboard-task-card__main">
                    <label className="dashboard-task-toggle" htmlFor={`task-toggle-${item.id}`}>
                      <input
                        id={`task-toggle-${item.id}`}
                        type="checkbox"
                        checked={item.done}
                        onChange={() => dispatch({ type: "TOGGLE_DONE", payload: item.id })}
                      />
                    </label>

                    <div className="dashboard-task-card__copy">
                      <div className="dashboard-task-card__title-row">
                        <h3>{item.text}</h3>
                        <span className={`dashboard-priority dashboard-priority--${item.priority}`}>
                          {priorityLabels[item.priority]}
                        </span>
                      </div>

                      <p>{item.done ? "Completed task" : "Active task"} inside the {item.category} lane.</p>

                      <div className="dashboard-task-meta">
                        <span>{item.category}</span>
                        <span>{formatTaskTime(item.createdAt)}</span>
                        <span>{item.done ? "Done" : "In progress"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="btn-group dashboard-task-actions">
                    <button type="button" className="edit-btn" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => dispatch({ type: "DELETE_TODO", payload: item.id })}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
