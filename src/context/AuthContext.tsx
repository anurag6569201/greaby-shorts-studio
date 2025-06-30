// src/context/AuthContext.js

import { createContext, useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../services/api";
import eventService from "../services/eventService"; // <-- IMPORTED

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

  // --- Login/Signup/Logout functions (from your previous correct version) ---
  const loginUser = async (email, password) => {
    setAuthLoading(true);
    try {
      const response = await api.post("/auth/token/", { email, password });
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      api.defaults.headers.common["Authorization"] = "Bearer " + response.data.access;
      setTokens(response.data);
      // fetchUserProfile will be called by the useEffect below
      navigate("/dashboard");
      toast.success("Login successful!");
    } catch (error) {
      toast.error("Login failed. Please check your credentials.");
    } finally {
      setAuthLoading(false);
    }
  };
  
  const registerUser = async (firstName, lastName, email, password) => {
    setAuthLoading(true);
    try {
        await api.post("/auth/register/", { first_name: firstName, last_name: lastName, email, password });
        return { success: true };
    } catch (error) {
        toast.error(error.response?.data?.detail || "Signup failed.");
        return { success: false };
    } finally {
        setAuthLoading(false);
    }
  };
  
  const verifyOtpAndLogin = async (email, otp, password) => {
    setAuthLoading(true);
    try {
        await api.post('/auth/verify-otp/', { email, otp });
        await loginUser(email, password);
        return { success: true };
    } catch (error) {
        toast.error(error.response?.data?.detail || "OTP Verification failed.");
        return { success: false };
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
  }, [navigate]);
  
  const fetchUserProfile = useCallback(async () => {
    if(!localStorage.getItem("accessToken")) return;
    try {
        const res = await api.get("/auth/profile/");
        setUser(res.data);
    } catch (error) {
        console.error("Could not fetch user profile", error);
    }
  }, []);

  // --- THIS IS THE NEW LOGIC TO SYNC WITH THE INTERCEPTOR ---
  useEffect(() => {
    const onTokenRefreshed = (data) => {
      console.log("AuthContext: Heard tokenRefreshed event. Updating tokens state.");
      setTokens((prevTokens) => ({
        ...prevTokens,
        access: data.access,
      }));
    };
    
    const onLogout = () => {
        console.log("AuthContext: Heard logout event. Logging out.");
        if (user) { // Only show toast if a user was logged in
          toast.info("Your session has expired.");
        }
        logoutUser();
    };

    const unsubscribeRefresh = eventService.subscribe('tokenRefreshed', onTokenRefreshed);
    const unsubscribeLogout = eventService.subscribe('logout', onLogout);
    
    return () => {
      unsubscribeRefresh();
      unsubscribeLogout();
    };
  }, [logoutUser]);


  useEffect(() => {
    const fetchInitialData = async () => {
      if (tokens?.access) {
        api.defaults.headers.common["Authorization"] = "Bearer " + tokens.access;
        await fetchUserProfile();
      }
      setIsInitialLoading(false);
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
    registerUser,
    verifyOtpAndLogin,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);