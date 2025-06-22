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
  const [subscription, setSubscription] = useState(null); 
  const [creations, setCreations] = useState([]);
  
  // For login/signup button spinners
  const [loading, setLoading] = useState(false);
  
  // --- NEW ---
  // This tracks the initial, essential data fetch when the app loads.
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const navigate = useNavigate();

  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/token/", { email, password });
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      // Set tokens to trigger the useEffect hook which will fetch all data
      setTokens(response.data); 
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
      // This will call loginUser, which sets tokens and triggers the data fetch
      await loginUser(email, password); 
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
    setSubscription(null);
    setCreations([]);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
    toast.info("You have been logged out.");
  };

  // --- CONSOLIDATED DATA FETCHING LOGIC ---
  useEffect(() => {
    const fetchData = async () => {
      // If there are no tokens, we know we're not logged in.
      // Stop the initial loading state and exit.
      if (!tokens) {
        setIsInitialLoading(false);
        return;
      }
    
      try {
        // Fetch all essential user data in parallel for performance.
        const [profileRes, subRes, creationsRes] = await Promise.all([
          api.get("/auth/profile/"),
          api.get("/subscriptions/my-subscription/").catch(() => null),
          api.get("/creations/history/").catch(() => []),
        ]);
        
        setUser(profileRes.data);
        setSubscription(subRes.data);
        setCreations(creationsRes.data);

      } catch (error) {
        console.error("Failed to fetch user data on load:", error);
        // If any critical fetch fails (especially profile), it likely means
        // the token is expired or invalid. Log the user out.
        if (error.response?.status === 401) {
          logoutUser();
        }
      } finally {
        // Whether it succeeded or failed, the initial load attempt is now complete.
        setIsInitialLoading(false);
      }
    };
    
    fetchData();
  }, [tokens]); // This effect re-runs whenever the user logs in (tokens change).


  const contextData = {
    user,
    tokens,
    subscription, 
    creations,
    loading, // For login/signup actions
    isInitialLoading, // The new global loading state for components to use
    loginUser,
    signupUser,
    logoutUser,
    // A function to allow manual refresh from other components if needed
    refreshData: () => {
        // Re-trigger the fetch logic by re-setting the token state
        // This is a simple way to force the useEffect to run again.
        if (tokens) setTokens({ ...tokens });
    }
  };

  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;