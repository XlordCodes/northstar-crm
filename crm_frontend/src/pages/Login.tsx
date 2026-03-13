import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            await login(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            setErrorMsg('Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4">
            <Card className="w-full max-w-sm border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="space-y-3 pb-6 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                            <Compass className="w-6 h-6 text-slate-900" strokeWidth={1.5} />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-medium text-slate-900 tracking-tight">
                        Northstar CRM
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-sm">
                        Welcome back. Please sign in to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-700 text-sm font-medium">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="olivia@northstar.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-50 border-transparent hover:bg-slate-100 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white focus-visible:border-slate-200 h-11 rounded-xl shadow-none px-4"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-slate-700 text-sm font-medium">Password</Label>
                                <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                                    Forgot password?
                                </a>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="bg-slate-50 border-transparent hover:bg-slate-100 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white focus-visible:border-slate-200 h-11 rounded-xl shadow-none px-4"
                            />
                        </div>

                        {errorMsg && (
                            <p className="text-sm font-medium text-rose-500 text-center">{errorMsg}</p>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-none mt-2 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? "Authenticating..." : "Sign in"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
