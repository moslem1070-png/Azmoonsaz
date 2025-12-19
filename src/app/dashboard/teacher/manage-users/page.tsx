'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Edit, Trash2, UserPlus } from 'lucide-react';

import Header from '@/components/header';
import { useUser } from '@/firebase';
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
import { mockUsers } from '@/lib/mock-users';
import type { MockUser } from '@/lib/types';

type Role = 'student' | 'teacher' | 'manager';

export default function ManageUsersPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [userRole, setUserRole] = useState<Role | null>(null);

  useEffect(() => {
    // This will only run on the client side
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);

    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserLoading && user && role !== 'manager') {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case 'manager':
        return 'destructive';
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
      case 'manager':
        return 'مدیر';
      case 'teacher':
        return 'معلم';
      case 'student':
        return 'دانش‌آموز';
      default:
        return 'نامشخص';
    }
  }

  if (isUserLoading || !user || userRole !== 'manager') {
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
                {mockUsers.map((u: MockUser) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-right">{u.fullName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getRoleBadgeVariant(u.role as Role)}>
                        {getRoleText(u.role as Role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell text-muted-foreground">{u.username}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">ویرایش</span>
                        </Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                           <span className="sr-only">حذف</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
