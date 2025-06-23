import { createContext, useState, useEffect, useContext, useCallback } from "react";
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
  
  const [authLoading, setAuthLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const navigate = useNavigate();

  const loginUser = async (email, password) => {
    setAuthLoading(true);
    try {
      const response = await api.post("/auth/token/", { email, password });
      api.defaults.headers.common["Authorization"] = "Bearer " + response.data.access;
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      setTokens(response.data);
      await fetchUserProfile();
      navigate("/dashboard");
      toast.success("Login successful!");
    } catch (error) {
      toast.error("Login failed. Please check your credentials.");
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const signupUser = async (firstName, lastName, email, password) => {
    setAuthLoading(true);
    try {
      await api.post("/auth/register/", { first_name: firstName, last_name: lastName, email, password });
      await loginUser(email, password);
    } catch (error) {
      toast.error("Signup failed. This email may already be in use.");
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const logoutUser = useCallback(() => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    delete api.defaults.headers.common["Authorization"];
    navigate("/login");
    toast.info("You have been logged out.");
  }, [navigate]);
  
  const fetchUserProfile = useCallback(async () => {
    try {
        const res = await api.get("/auth/profile/");
        setUser(res.data);
    } catch (error) {
        console.error("Failed to refetch user profile:", error);
        toast.error("Could not update user information.");
        logoutUser();
    }
  }, [logoutUser]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!tokens?.access) {
        setIsInitialLoading(false);
        return;
      }
      
      api.defaults.headers.common["Authorization"] = "Bearer " + tokens.access;

      try {
        await fetchUserProfile();
      } catch (error) {
        console.error("Failed to fetch user data, logging out:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    fetchInitialData();
  }, [tokens, fetchUserProfile]);

  const contextData = {
    user,
    setUser,
    fetchUserProfile,
    tokens,
    authLoading,
    isInitialLoading,
    loginUser,
    signupUser,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {!isInitialLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);