import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, tokens } = useAuth();
  
  // A simple check for tokens can be faster on initial load
  // before the user profile is fetched.
  if (!tokens && !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;