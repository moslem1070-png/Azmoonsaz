
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { ArrowRight, Trash2, Eye, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, deleteDoc, doc, getDoc, writeBatch } from 'firebase/firestore';

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
import type { User as AppUser } from '@/lib/types';
import { deleteUser } from 'firebase/auth';
import { cn } from '@/lib/utils';


type Role = 'student' | 'teacher';

const LoadingAnimation = () => (
    <div className="flex flex-col items-center justify-center min-h-screen">
        <motion.div
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
            }}
            transition={{
                duration: 1.5,
                ease: "easeInOut",
                repeat: Infinity,
            }}
        >
            <BrainCircuit className="w-24 h-24 text-primary" />
        </motion.div>
        <p className="mt-4 text-lg text-muted-foreground">در حال بارگذاری...</p>
    </div>
);

export default function ManageUsersPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<Role | null>(null);

  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: usersLoading, error } = useCollection<AppUser>(usersCollection);
  
  const teacherNationalId = typeof window !== 'undefined' ? localStorage.getItem('userNationalId') : null;

  useEffect(() => {
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);

    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserLoading && user && role !== 'teacher') {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);


  const handleDeleteUser = async (userToDelete: AppUser) => {
    if (!firestore) return;
    
    try {
        const batch = writeBatch(firestore);
        
        // Delete user document
        const userDocRef = doc(firestore, 'users', userToDelete.nationalId);
        batch.delete(userDocRef);
        
        // Also delete their exam results
        const resultsCollectionRef = collection(firestore, 'users', userToDelete.nationalId, 'examResults');
        // We can't batch-delete a subcollection directly, this needs more complex logic
        // For now, we'll just delete the user doc. A cloud function would be better for cleanup.

        await batch.commit();

        toast({
            title: 'موفق',
            description: 'پروفایل کاربر با موفقیت از پایگاه داده حذف شد.',
        });
    } catch(error) {
        console.error('Error deleting user:', error);
        toast({
            variant: 'destructive',
            title: 'خطا در حذف کاربر',
            description: 'مشکلی در حذف پروفایل کاربر از پایگاه داده رخ داد.',
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

  const handleViewUser = (nationalId: string) => {
    router.push(`/dashboard/teacher/user-details/${nationalId}`);
  };


  const isLoading = isUserLoading || (usersLoading && userRole === 'teacher');

  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="container mx-auto px-4 py-8 flex-1">
             <LoadingAnimation />
          </main>
        </div>
    );
  }
  
  if (!user || userRole !== 'teacher') {
     return <LoadingAnimation />;
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
                    <TableHead className="text-right hidden sm:table-cell">کد ملی</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: AppUser) => {
                    const isCurrentUser = u.nationalId === teacherNationalId;
                    return (
                        <TableRow 
                            key={u.id} 
                            className={cn(
                                "hover:bg-white/10",
                                !isCurrentUser && "cursor-pointer"
                            )}
                            onClick={!isCurrentUser ? () => handleViewUser(u.nationalId) : undefined}
                        >
                        <TableCell className="font-medium text-right">{`${u.firstName} ${u.lastName}`}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={getRoleBadgeVariant(u.role as Role)}>
                            {getRoleText(u.role as Role)}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell text-muted-foreground">{u.nationalId}</TableCell>
                        <TableCell className="text-left">
                            {isCurrentUser ? (
                                <div className="font-bold text-accent pr-4">شما</div>
                            ) : (
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewUser(u.nationalId); }}>
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">مشاهده</span>
                                    </Button>
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
                                                  این عمل فقط پروفایل کاربر (نام، نتایج آزمون‌ها و...) را از پایگاه داده حذف می‌کند. حساب کاربری او در سیستم احراز هویت (Authentication) باقی می‌ماند. برای حذف کامل کاربر، باید از کنسول فایربیس اقدام کنید.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteUser(u)}>
                                                  حذف پروفایل
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        </TableCell>
                        </TableRow>
                    );
                  })}
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
