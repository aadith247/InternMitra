import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  // Respect an existing Authorization header if caller provided it
  const hasAuth = config.headers && ('Authorization' in config.headers)
  config.headers = { ...config.headers, ...(hasAuth ? {} : getAuthHeaders()) }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Do not hard-redirect here; let Clerk handle auth state.
    // Hard redirects here can cause Landing<->Dashboard loops.
    return Promise.reject(error)
  }
)
