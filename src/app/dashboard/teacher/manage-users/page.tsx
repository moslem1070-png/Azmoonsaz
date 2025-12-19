'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Edit, Trash2, UserPlus } from 'lucide-react';
import { collection } from 'firebase/firestore';

import Header from '@/components/header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import GlassCard from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { User as AppUser } from '@/lib/types';


type Role = 'student' | 'teacher';

export default function ManageUsersPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [userRole, setUserRole] = useState<Role | null>(null);

  // Fetch all users from Firestore only if the user is a teacher
  const usersCollection = useMemoFirebase(
    () => {
        if (firestore && userRole === 'teacher') {
            return collection(firestore, 'users');
        }
        return null;
    },
    [firestore, userRole]
  );
  const { data: users, isLoading: usersLoading } = useCollection<AppUser>(usersCollection);

  useEffect(() => {
    // This will only run on the client side
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);

    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserLoading && user && role !== 'teacher') {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case 'teacher':
        return 'default';
      case 'student':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const getRoleText = (role: Role) => {
    switch (role) {
      case 'teacher':
        return 'معلم';
      case 'student':
        return 'دانش‌آموز';
      default:
        return 'نامشخص';
    }
  }

  // Helper to extract the username/nationalId from the user's email
   const getIdentifier = (email?: string | null): string => {
        if (!email) return 'N/A';
        const emailPrefix = email.split('@')[0];
        const parts = emailPrefix.split('-');
        return parts.length > 1 ? parts.slice(1).join('-') : emailPrefix;
    };


  const isLoading = isUserLoading || (usersLoading && userRole === 'teacher');

  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="container mx-auto px-4 py-8 flex-1">
             <div className="flex items-center justify-center">در حال بارگذاری کاربران...</div>
          </main>
        </div>
    );
  }
  
  if (!user || userRole !== 'teacher') {
     return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-right">مدیریت کاربران</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowRight className="ml-2 h-4 w-4" />
              بازگشت
            </Button>
            <Button size="sm" onClick={() => router.push('/dashboard/teacher/create-user')}>
                <UserPlus className="ml-2 h-4 w-4" />
                ایجاد کاربر جدید
              </Button>
          </div>
        </div>

        <GlassCard className="p-4 sm:p-6">
          {users && users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">نام کامل</TableHead>
                    <TableHead className="text-center">نقش</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">کد ملی / نام کاربری</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: AppUser) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-right">{u.displayName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getRoleBadgeVariant(u.role as Role)}>
                          {getRoleText(u.role as Role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">{getIdentifier(u.email)}</TableCell>
                      <TableCell className="text-left">
                        {u.role === 'student' && (
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">ویرایش</span>
                            </Button>
                            <Button variant="destructive" size="icon" className="h-8 w-8" disabled>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">حذف</span>
                            </Button>
                          </div>
                        )}
                        {u.role !== 'student' && (<span className="text-xs text-muted-foreground">-</span>)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">هیچ کاربری یافت نشد.</p>
            </div>
          )}
        </GlassCard>
      </main>
    </div>
  );
}

    