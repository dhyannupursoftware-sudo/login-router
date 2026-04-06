import TodoWorkspace from "../components/todo/TodoWorkspace";

interface TodoTasksPageProps {
  initialFilter?: "all" | "pending" | "completed";
}

export default function TodoTasksPage({ initialFilter = "all" }: TodoTasksPageProps) {
  return <TodoWorkspace view="tasks" initialFilter={initialFilter} />;
}
