import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/v1/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token if it exists
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const loginUser = async (email: string, password: string) => {
    const params = new URLSearchParams();
    // OAuth2 specification requires explicitly stating the grant_type
    params.append('grant_type', 'password');
    // Backend uses OAuth2PasswordRequestForm which strictly requires 'username'
    params.append('username', email);
    params.append('password', password);

    const response = await api.post('/auth/token', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return response.data;
};

export default api;