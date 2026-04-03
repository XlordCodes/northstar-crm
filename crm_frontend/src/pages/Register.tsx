import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Compass } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const registerSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/\d/, 'Must contain at least one digit')
        .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one special character'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
    const [isLoading, setIsLoading] = useState(false);
    const { register: registerFn } = useAuth();
    const navigate = useNavigate();

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);

        try {
            await registerFn(data.name, data.email, data.password);
            toast.success('Account created successfully. Please sign in.');
            navigate('/login', { replace: true });
        } catch (err: unknown) {
            const message = err instanceof Error && 'response' in err
                ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Registration failed. Please try again.'
                : 'Registration failed. Please try again.';
            toast.error(typeof message === 'string' ? message : 'Registration failed');
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
                        Create Account
                    </CardTitle>
                    <CardDescription className="text-zinc-500 text-sm">
                        Get started with Northstar CRM.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-zinc-700 text-sm font-medium">Full Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Olivia Chen"
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        name={field.name}
                                        ref={field.ref}
                                        className="bg-zinc-50 border-transparent hover:bg-zinc-100 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white focus-visible:border-zinc-200 h-11 rounded-xl shadow-none px-4"
                                    />
                                    {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                                </div>
                            )}
                        />

                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-zinc-700 text-sm font-medium">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="olivia@northstar.com"
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        name={field.name}
                                        ref={field.ref}
                                        className="bg-zinc-50 border-transparent hover:bg-zinc-100 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white focus-visible:border-zinc-200 h-11 rounded-xl shadow-none px-4"
                                    />
                                    {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                                </div>
                            )}
                        />

                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-zinc-700 text-sm font-medium">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        name={field.name}
                                        ref={field.ref}
                                        className="bg-zinc-50 border-transparent hover:bg-zinc-100 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white focus-visible:border-zinc-200 h-11 rounded-xl shadow-none px-4"
                                    />
                                    {errors.password ? (
                                        <p className="text-red-500 text-xs">{errors.password.message}</p>
                                    ) : (
                                        <p className="text-[11px] text-zinc-400">
                                            Min 8 chars, uppercase, lowercase, digit, and special character.
                                        </p>
                                    )}
                                </div>
                            )}
                        />

                        <Button
                            type="submit"
                            disabled={isLoading || !isValid}
                            className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-none mt-2 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? "Creating account..." : "Create account"}
                        </Button>

                        <p className="text-center text-sm text-zinc-500">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-zinc-900 hover:text-zinc-700 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
