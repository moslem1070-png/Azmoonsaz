'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Trash2, UserPlus, RefreshCw } from 'lucide-react';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';

import Header from '@/components/header';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { User as AppUser } from '@/lib/types';


type Role = 'student' | 'teacher';

// This is a simple check to see if we're in an environment where server-side functions MIGHT be available.
// In a real production environment, you might have a more robust way to check this.
const isServerFunctionalityEnabled = !!process.env.NEXT_PUBLIC_ENABLE_ADMIN_FUNCTIONS || process.env.NODE_ENV !== 'production';

export default function ManageUsersPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

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
  const { data: users, isLoading: usersLoading, error } = useCollection<AppUser>(usersCollection);

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

  const handleDeleteUser = async (userId: string) => {
    if (!firestore || !user || user.uid === userId) {
        toast({
            variant: 'destructive',
            title: 'خطا',
            description: 'شما نمی‌توانید حساب کاربری خودتان را حذف کنید.',
        });
        return;
    }
    
    // Note: This only deletes the Firestore document, not the Auth user.
    // A full user deletion would require a backend function (Firebase Cloud Function).
    try {
        await deleteDoc(doc(firestore, 'users', userId));
        toast({
            title: 'موفق',
            description: 'کاربر با موفقیت از پایگاه داده حذف شد. برای حذف کامل از سیستم احراز هویت، از گزینه "حذف کاربران سرگردان" استفاده کنید.',
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
  
  const handleDeleteOrphanedUsers = async () => {
    setIsSyncing(true);
    toast({ title: 'شروع عملیات...', description: 'در حال شناسایی و حذف کاربران سرگردان...' });
    try {
        const response = await fetch('/api/sync-users', {
            method: 'POST',
        });
        
        const result = await response.json();

        if (!response.ok) {
            // Use the specific error message from the API, or a fallback.
            throw new Error(result.error || 'خطایی در سرور رخ داد.');
        }

        toast({
            title: 'عملیات موفق',
            description: result.message,
        });

    } catch (error: any) {
        console.error('Failed to delete orphaned users:', error);
        toast({
            variant: 'destructive',
            title: 'خطا در حذف کاربران سرگردان',
            description: error.message || 'مشکلی در ارتباط با سرور پیش آمد.',
        });
    } finally {
        setIsSyncing(false);
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
  
  const OrphanedUsersButton = () => {
      const button = (
         <Button variant="outline" size="sm" disabled={isSyncing || !isServerFunctionalityEnabled}>
            {isSyncing ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
            {isSyncing ? 'در حال پردازش...' : 'حذف کاربران سرگردان'}
         </Button>
      )

      if (isServerFunctionalityEnabled) {
          return (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    {button}
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>آیا از حذف کاربران سرگردان مطمئن هستید؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          این عمل تمام کاربرانی که در سیستم احراز هویت وجود دارند اما در پایگاه داده پروفایلی برایشان ثبت نشده را برای همیشه حذف می‌کند. این عمل غیرقابل بازگشت است.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteOrphanedUsers} disabled={isSyncing}>
                          بله، حذف کن
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          )
      }

      return (
         <Tooltip>
            <TooltipTrigger asChild>
                {/* A div is needed to wrap the disabled button for Tooltip to work */}
                <div>{button}</div>
            </TooltipTrigger>
            <TooltipContent>
                <p>برای فعالسازی، متغیر FIREBASE_SERVICE_ACCOUNT_KEY باید تنظیم شود.</p>
            </TooltipContent>
         </Tooltip>
      )
  }


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
            <Button size="sm" onClick={() => router.push('/dashboard/teacher/create-user')}>
                <UserPlus className="ml-2 h-4 w-4" />
                ایجاد کاربر جدید
            </Button>
            <OrphanedUsersButton />
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
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-right">{`${u.firstName} ${u.lastName}`}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getRoleBadgeVariant(u.role as Role)}>
                          {getRoleText(u.role as Role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">{u.nationalId}</TableCell>
                      <TableCell className="text-left">
                        {u.id !== user.uid && (
                          <div className="flex gap-2 justify-end">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">حذف</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>آیا از حذف این کاربر مطمئن هستید؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        این عمل کاربر را فقط از پایگاه داده حذف می‌کند اما حساب احراز هویت او باقی می‌ماند. این عمل غیرقابل بازگشت است.
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
                          </div>
                        )}
                        {u.id === user.uid && (<span className="text-xs text-muted-foreground">شما</span>)}
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
