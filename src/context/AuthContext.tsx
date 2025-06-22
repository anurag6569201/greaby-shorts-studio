import { createContext, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(() =>
    localStorage.getItem("accessToken")
      ? {
          access: localStorage.getItem("accessToken"),
          refresh: localStorage.getItem("refreshToken"),
        }
      : null
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null); 
  const [creations, setCreations] = useState([]);

  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/token/", { email, password });
      setTokens(response.data);
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      await fetchUserProfile();
      navigate("/dashboard");
      toast.success("Login successful!");
    } catch (error) {
      toast.error("Failed to login. Please check your credentials.");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const signupUser = async (firstName, lastName, email, password) => {
    setLoading(true);
    try {
      await api.post("/auth/register/", {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });
      await loginUser(email, password); // Automatically log in after successful signup
    } catch (error) {
      toast.error("Signup failed. This email may already be in use.");
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
    toast.info("You have been logged out.");
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get("/auth/profile/");
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      logoutUser(); // If we can't get profile, tokens might be invalid
    }
  };

  const fetchData = async () => {
    if (!tokens) return;
    try {
      // Fetch all data in parallel for efficiency
      const [profileRes, subRes, creationsRes] = await Promise.all([
        api.get("/auth/profile/"),
        api.get("/subscriptions/my-subscription/").catch(() => null), // Gracefully handle no subscription
        api.get("/creations/history/").catch(() => null),
      ]);
      
      setUser(profileRes.data);
      if (subRes) setSubscription(subRes.data);
      if (creationsRes) setCreations(creationsRes.data);

    } catch (error) {
      console.error("Failed to fetch user data:", error);
      // If profile fails, it's a critical error, so log out
      if (error.response?.config?.url.includes('/auth/profile/')) {
        logoutUser(); 
      }
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [tokens]);
  
  useEffect(() => {
    if (tokens) {
      fetchUserProfile();
    }
  }, [tokens]);

  const contextData = {
    user,
    tokens,
    loading,
    subscription, 
    creations,  
    loginUser,
    signupUser,
    logoutUser,
    refreshData: fetchData,
  };

  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;