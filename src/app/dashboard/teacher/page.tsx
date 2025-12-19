
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/header';
import { useUser } from '@/firebase';
import GlassCard from '@/components/glass-card';
import TeacherActionButtons from '@/components/teacher-action-buttons';

type Role = 'student' | 'teacher';

export default function TeacherDashboardPage() {
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
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || userRole !== 'teacher') {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-right">داشبورد مدیر</h1>
             <TeacherActionButtons />
        </div>

        <GlassCard className="p-8">
            <h2 className="text-2xl font-bold mb-4">خوش آمدید، {user.displayName}!</h2>
            <p className="text-muted-foreground">
                از این پنل می‌توانید آزمون‌های جدید ایجاد کنید، آزمون‌های موجود را مدیریت کنید و نتایج دانش‌آموزان را مشاهده نمایید.
            </p>
        </GlassCard>
        
        {/* Placeholder for future content like list of exams, stats, etc. */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <GlassCard className="p-6">
                <h3 className="text-xl font-semibold mb-4">آمار کلی</h3>
                <p className="text-muted-foreground">به زودی در این بخش آمار کلی آزمون‌ها و کاربران نمایش داده خواهد شد.</p>
            </GlassCard>
            <GlassCard className="p-6">
                <h3 className="text-xl font-semibold mb-4">فعالیت‌های اخیر</h3>
                <p className="text-muted-foreground">به زودی در این بخش آخرین فعالیت‌های ثبت شده نمایش داده خواهد شد.</p>
            </GlassCard>
        </div>

      </main>
    </div>
  );
}
