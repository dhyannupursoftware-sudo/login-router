import { Link, useNavigate } from "react-router-dom";

interface HeaderProps {
  auth: {
    token: string | null;
    role: string | null;
  };
  setAuth: React.Dispatch<
    React.SetStateAction<{
      token: string | null;
      role: string | null;
    }>
  >;
}

export default function Header({ auth, setAuth }: HeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    setAuth({ token: null, role: null });
    navigate("/login");
  };

  return (
    <header className="w-full bg-blue-700 text-white p-4 flex justify-between">
      <h1 className="text-xl font-bold">My React App</h1>

      <nav className="flex gap-4">
        {/* SHOW LOGIN / REGISTER ONLY IF NOT LOGGED IN */}
        {!auth.token && (
          <>
            <Link
              to="/login"
              style={{
                backgroundColor: "lightblue",
                color: "black",
                padding: "10px 20px",
                borderRadius: "10px",
                fontSize: "20px",
              }}
            >
              Login
            </Link>

            <Link
              to="/register"
              style={{
                backgroundColor: "lightblue",
                color: "black",
                padding: "10px 20px",
                borderRadius: "10px",
                fontSize: "20px",
              }}
            >
              Register
            </Link>
          </>
        )}

        {/* SHOW LOGOUT ONLY IF LOGGED IN */}
        {auth.token && (
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "red",
              color: "white",
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
