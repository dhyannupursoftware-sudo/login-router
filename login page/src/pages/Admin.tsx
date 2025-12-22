import { useReducer, useState, useEffect } from "react";
import "./Todo.css";

interface TodoType {
  text: string;
  done: boolean;
}

type ActionType =
  | { type: "ADD_TODO"; payload: string }
  | { type: "DELETE_TODO"; payload: number }
  | { type: "EDIT_TODO"; payload: { index: number; text: string } }
  | { type: "TOGGLE_DONE"; payload: number };

const reducer = (state: TodoType[], action: ActionType): TodoType[] => {
  switch (action.type) {
    case "ADD_TODO":
      return [...state, { text: action.payload, done: false }];

    case "DELETE_TODO":
      return state.filter((_, index) => index !== action.payload);

    case "EDIT_TODO":
      return state.map((item, index) =>
        index === action.payload.index
          ? { ...item, text: action.payload.text }
          : item
      );

    case "TOGGLE_DONE":
      return state.map((item, index) =>
        index === action.payload
          ? { ...item, done: !item.done }
          : item
      );

    default:
      return state;
  }
};

/*  FUNCTION */
const init = (): TodoType[] => {
  const saved = localStorage.getItem("todos");
  return saved ? JSON.parse(saved) : [];
};

export default function Todo() {
  const [state, dispatch] = useReducer(reducer, [], init);
  const [task, setTask] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  /*  SAVE only after state updates */
  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(state));
  }, [state]);

  const submitHandler = () => {
    if (!task.trim()) return;

    if (editIndex !== null) {
      dispatch({
        type: "EDIT_TODO",
        payload: { index: editIndex, text: task },
      });
      setEditIndex(null);
    } else {
      dispatch({ type: "ADD_TODO", payload: task });
    }
    setTask("");
  };

  const filtered = state.filter((item) =>
    item.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="todo-container">
      <h2>Todo List</h2>

      <div className="input-section">
        <input
          type="text"
          placeholder="Enter your task..."
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
        <button onClick={submitHandler} className="add-btn">
          {editIndex !== null ? "Update" : "Add"}
        </button>
      </div>

      <input
        type="text"
        placeholder="Search task..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      <ul className="todo-list">
        {filtered.map((item, index) => (
          <li key={index} className="todo-item">
            <div className="todo-left">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  dispatch({ type: "TOGGLE_DONE", payload: index })
                }
              />
              <span className="todo-text">{item.text}</span>
            </div>

            <div className="btn-group">
              <button
                className="edit-btn"
                disabled={item.done}
                onClick={() => {
                  setTask(item.text);
                  setEditIndex(index);
                }}
              >
                Edit
              </button>

              <button
                className="delete-btn"
                disabled={item.done}
                onClick={() =>
                  dispatch({ type: "DELETE_TODO", payload: index })
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
