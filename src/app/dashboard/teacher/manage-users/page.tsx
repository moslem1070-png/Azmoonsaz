'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Trash2, Eye } from 'lucide-react';
import { collection, deleteDoc, doc } from 'firebase/firestore';

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
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { User as AppUser } from '@/lib/types';


type Role = 'student' | 'teacher';

export default function ManageUsersPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<Role | null>(null);

  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: usersLoading, error } = useCollection<AppUser>(usersCollection);

  useEffect(() => {
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);

    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserLoading && user && role !== 'teacher') {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleDeleteUser = async (userId: string) => {
    if (!firestore || !user || user.uid === userId) {
        toast({
            variant: 'destructive',
            title: 'خطا',
            description: 'شما نمی‌توانید حساب کاربری خودتان را حذف کنید.',
        });
        return;
    }
    
    try {
        await deleteDoc(doc(firestore, 'users', userId));
        toast({
            title: 'موفق',
            description: 'کاربر با موفقیت از پایگاه داده حذف شد. برای حذف کامل، او را از بخش Authentication کنسول فایربیس نیز حذف کنید.',
        });
    } catch(error) {
        console.error('Error deleting user:', error);
        toast({
            variant: 'destructive',
            title: 'خطا در حذف کاربر',
            description: 'مشکلی در حذف کاربر از پایگاه داده رخ داد.',
        });
    }
  };
  
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

  const handleViewUser = (userId: string) => {
    router.push(`/dashboard/teacher/user-details/${userId}`);
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
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowRight className="ml-2 h-4 w-4" />
              بازگشت
            </Button>
          </div>
        </div>

        <GlassCard className="p-4 sm:p-6">
          {error && <p className='text-destructive text-center p-4'>خطا در بارگذاری کاربران: {error.message}</p>}
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
                    <TableRow key={u.id} className="cursor-pointer hover:bg-white/10" onClick={() => handleViewUser(u.id)}>
                      <TableCell className="font-medium text-right">{`${u.firstName} ${u.lastName}`}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getRoleBadgeVariant(u.role as Role)}>
                          {getRoleText(u.role as Role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">{u.nationalId}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2 justify-end">
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewUser(u.id); }}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">مشاهده</span>
                            </Button>
                          {u.id !== user.uid && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">حذف</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>آیا از حذف این کاربر مطمئن هستید؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        این عمل کاربر را فقط از پایگاه داده حذف می‌کند. برای حذف کامل، باید او را از بخش Authentication کنسول فایربیس نیز حذف کنید.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(u.id)}>
                                        حذف
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {u.id === user.uid && (<div className="w-8"></div>)}
                        </div>
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
