// src/context/AuthContext.jsx

import { createContext, useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
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
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      api.defaults.headers.common["Authorization"] = "Bearer " + response.data.access;
      setTokens(response.data);
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
    setSubscription(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    delete api.defaults.headers.common["Authorization"];
    navigate("/login");
    toast.info("You have been logged out.");
  }, [navigate]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!tokens) {
        setIsInitialLoading(false);
        return;
      }
      
      try {
        const [profileRes, subRes] = await Promise.all([
          api.get("/auth/profile/"),
          api.get("/subscriptions/my-subscription/"),
        ]);
        
        setUser(profileRes.data);
        setSubscription(subRes.data);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        logoutUser();
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    fetchInitialData();
  }, [tokens, logoutUser]);

  const contextData = {
    user,
    setUser,
    subscription,
    setSubscription,
    tokens,
    authLoading,
    isInitialLoading,
    loginUser,
    signupUser,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={contextData}>{!isInitialLoading && children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);