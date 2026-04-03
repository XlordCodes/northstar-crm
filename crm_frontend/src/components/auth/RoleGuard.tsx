import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: string[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { user } = useAuth();

    if (!user || !user.role_name) return null;

    if (!allowedRoles.includes(user.role_name)) return null;

    return <>{children}</>;
}
