import axios from "axios";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalConfig = err.config;

    if (originalConfig.url !== "/auth/token/" && err.response) {
      if (err.response.status === 401 && !originalConfig._retry) {
        originalConfig._retry = true;

        try {
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) throw new Error("No refresh token available");

          const rs = await axios.post(API_URL + "/auth/token/refresh/", {
            refresh: refreshToken,
          });

          const { access } = rs.data;
          localStorage.setItem("accessToken", access);
          api.defaults.headers.common["Authorization"] = "Bearer " + access;

          return api(originalConfig);
        } catch (_error) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          toast.error("Session expired. Please log in again.");
          return Promise.reject(_error);
        }
      }
    }

    return Promise.reject(err);
  }
);

export default api;