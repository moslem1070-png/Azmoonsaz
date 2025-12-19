'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/header';
import { useUser } from '@/firebase';
import GlassCard from '@/components/glass-card';
import CreateUserForm from '@/components/create-user-form';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Role = 'student' | 'teacher';

export default function CreateUserPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [userRole, setUserRole] = useState<Role | null>(null);

  useEffect(() => {
    // This will only run on the client side
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);

    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserLoading && user && role !== 'teacher') {
      // Only teachers can create users.
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || userRole !== 'teacher') {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
        <GlassCard className="w-full max-w-2xl p-6 sm:p-8">
            <div className='flex justify-between items-center mb-6'>
                <h1 className="text-2xl sm:text-3xl font-bold text-right">ایجاد کاربر جدید</h1>
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowRight className="ml-2 h-4 w-4" />
                    بازگشت
                </Button>
            </div>
          
            <p className="text-muted-foreground text-right mb-8">
                از این فرم برای اضافه کردن دانش‌آموزان جدید به سیستم استفاده کنید.
            </p>

            <CreateUserForm />

        </GlassCard>
      </main>
    </div>
  );
}

    