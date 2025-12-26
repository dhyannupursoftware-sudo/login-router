import { useReducer, useState, useEffect } from "react";
import "./Todo.css";

interface TodoType {
  id: number;
  text: string;
  done: boolean;
}

type ActionType =
  | { type: "ADD_TODO"; payload: string }
  | { type: "DELETE_TODO"; payload: number }
  | { type: "EDIT_TODO"; payload: { id: number; text: string } }
  | { type: "TOGGLE_DONE"; payload: number };

const reducer = (state: TodoType[], action: ActionType): TodoType[] => {
  switch (action.type) {
    case "ADD_TODO":
      return [
        ...state,
        { id: Date.now() + Math.random(), text: action.payload, done: false },
      ];

    case "DELETE_TODO":
      return state.filter((item) => item.id !== action.payload);

    case "EDIT_TODO":
      return state.map((item) =>
        item.id === action.payload.id
          ? { ...item, text: action.payload.text }
          : item
      );

    case "TOGGLE_DONE":
      return state.map((item) =>
        item.id === action.payload
          ? { ...item, done: !item.done }
          : item
      );

    default:
      return state;
  }
};

const init = (): TodoType[] => {
  const saved = localStorage.getItem("todos");
  return saved ? JSON.parse(saved) : [];
};

export default function Todo() {
  const [state, dispatch] = useReducer(reducer, [], init);
  const [task, setTask] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(state));
  }, [state]);

  const submitHandler = () => {
    if (!task.trim()) return;

    if (editId !== null) {
      dispatch({ type: "EDIT_TODO", payload: { id: editId, text: task } });
      setEditId(null);
    } else {
      dispatch({ type: "ADD_TODO", payload: task });
    }
    setTask("");
  };

  const filteredTodos = state
    .filter((item) =>
      item.text.toLowerCase().includes(search.toLowerCase())
    )
    .filter((item) => {
      if (filter === "pending") return !item.done;
      if (filter === "completed") return item.done;
      return true;
    });

  return (
    <div className="todo-container">
      <h2> 🎯Todo List</h2>

      <div className="input-section">
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter task..."
        />
        <button
          onClick={submitHandler}
          style={{ backgroundColor: "#2563eb", height: "50px", marginTop: "5px" }}
        >
          {editId ? "Update" : "Add"}
        </button>
      </div>

      <input
        className="search-input"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="filter-buttons">
        <button
          onClick={() => setFilter("all")}
          style={{
            backgroundColor: "blue",
            color: "white",
            width: "100px",
            marginLeft: "35px",
            padding: "10px",
            marginBottom: "30px",
          }}
        >
          All
        </button>

        <button
          onClick={() => setFilter("pending")}
          style={{
            backgroundColor: "blue",
            color: "white",
            width: "100px",
            marginLeft: "15px",
            padding: "10px",
          }}
        >
          Pending
        </button>

        <button
          onClick={() => setFilter("completed")}
          style={{
            backgroundColor: "blue",
            color: "white",
            width: "100px",
            marginLeft: "15px",
            padding: "10px",
          }}
        >
          Completed
        </button>
      </div>

      <ul className="todo-list">
        {filteredTodos.map((item) => (
          <li key={item.id} className="todo-item">
            <div className="todo-left">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  dispatch({ type: "TOGGLE_DONE", payload: item.id })
                }
              />

              
              <span
                className="todo-text"
                onClick={() =>
                  dispatch({ type: "TOGGLE_DONE", payload: item.id })
                }
                style={{ cursor: "pointer" }}
              >
                {item.text}
              </span>
            </div>

            <div className="btn-group">
              <button
                style={{ backgroundColor: "#eab308" }}
                disabled={item.done}
                onClick={() => {
                  setTask(item.text);
                  setEditId(item.id);
                }}
              >
               Edit
              </button>

              <button
                style={{ backgroundColor: "#ef4444" }}
                disabled={item.done}
                onClick={() =>
                  dispatch({ type: "DELETE_TODO", payload: item.id })
                }
              >
               Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
