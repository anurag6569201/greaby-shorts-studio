import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


const PublicRoute = ({ children }) => {
  const { tokens } = useAuth();

  // If tokens exist in context/state, the user is considered logged in.
  if (tokens) {
    return <Navigate to="/dashboard" replace />;
  }

  // If not logged in, render the requested public page (e.g., Login, Signup).
  return children;
};

export default PublicRoute;