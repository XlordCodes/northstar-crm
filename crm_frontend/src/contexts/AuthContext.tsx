import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { loginUser } from '@/lib/api';

export interface User {
    id: number;
    email: string;
    name: string | null;
    tenant_id: number | null;
    role_id: number | null;
    role_name?: string | null;
    role?: { name: string } | null;
    created_at: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseUser = (data: any): User => {
    const role_name = data.role_name || data.role?.name || null;
    return { ...data, role_name };
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    const response = await api.get('/auth/users/me');
                    setUser(parseUser(response.data));
                    setToken(storedToken);
                } catch {
                    localStorage.removeItem('token');
                    setUser(null);
                    setToken(null);
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const { access_token } = await loginUser(email, password);
        localStorage.setItem('token', access_token);
        setToken(access_token);

        const response = await api.get('/auth/users/me');
        setUser(parseUser(response.data));
    };

    const register = async (name: string, email: string, password: string) => {
        await api.post('/auth/register', { name, email, password });

        const { access_token } = await loginUser(email, password);
        localStorage.setItem('token', access_token);
        setToken(access_token);

        const response = await api.get('/auth/users/me');
        setUser(parseUser(response.data));
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
    };

    const isAuthenticated = !!user && !!token;

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
