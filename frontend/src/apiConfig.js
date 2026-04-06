const getApiBaseUrl = () => {
    // Railway (Production) uchun: VITE_API_URL environment variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Local Development uchun: o'sha xost + 5000-port
    const hostname = window.location.hostname;
    return `http://${hostname}:5000`;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
