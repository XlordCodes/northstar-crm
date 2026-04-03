import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/', { replace: true });
        } catch (err: unknown) {
            const message = err instanceof Error && 'response' in err
                ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Invalid email or password'
                : 'Invalid email or password';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA] px-4">
            <Card className="w-full max-w-sm border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="space-y-3 pb-6 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="h-12 w-12 bg-zinc-50 rounded-2xl flex items-center justify-center">
                            <Compass className="w-6 h-6 text-zinc-900" strokeWidth={1.5} />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-medium text-zinc-900 tracking-tight">
                        Northstar CRM
                    </CardTitle>
                    <CardDescription className="text-zinc-500 text-sm">
                        Welcome back. Please sign in to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-700 text-sm font-medium">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="olivia@northstar.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-zinc-50 border-transparent hover:bg-zinc-100 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white focus-visible:border-zinc-200 h-11 rounded-xl shadow-none px-4"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-700 text-sm font-medium">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="bg-zinc-50 border-transparent hover:bg-zinc-100 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white focus-visible:border-zinc-200 h-11 rounded-xl shadow-none px-4"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-none mt-2 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? "Signing in..." : "Sign in"}
                        </Button>

                        <p className="text-center text-sm text-zinc-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-medium text-zinc-900 hover:text-zinc-700 transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
