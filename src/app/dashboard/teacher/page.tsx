'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FilePlus, Settings, Users, BarChart2 } from 'lucide-react';

import Header from '@/components/header';
import { useUser } from '@/firebase';
import GlassCard from '@/components/glass-card';

type Role = 'student' | 'teacher' | 'manager';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

const DashboardCard = ({ title, description, icon, onClick, disabled }: DashboardCardProps) => (
  <GlassCard
    className={`p-6 text-right transition-all duration-300 hover:-translate-y-2 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
    }`}
    onClick={!disabled ? onClick : undefined}
  >
    <div className="flex items-start justify-end gap-4">
      <div className="flex-1">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="p-3 bg-primary/20 rounded-lg text-primary">{icon}</div>
    </div>
  </GlassCard>
);

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
    } else if (!isUserLoading && user && role === 'student') {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || userRole === 'student') {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  const getTitle = () => {
    if (userRole === 'manager') return 'داشبورد مدیر';
    if (userRole === 'teacher') return 'داشبورد معلم';
    return 'داشبورد';
  };

  const getWelcomeMessage = () => {
    const name = user.displayName || (userRole === 'manager' ? 'مدیر' : 'معلم');
    return `خوش آمدید، ${name}!`;
  };
  
  const isManager = userRole === 'manager';

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 text-right">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{getTitle()}</h1>
            <p className="text-muted-foreground mt-2">{getWelcomeMessage()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <DashboardCard
                title="ایجاد آزمون جدید"
                description="یک آزمون جدید با سوالات و تنظیمات دلخواه بسازید."
                icon={<FilePlus className="w-8 h-8" />}
                onClick={() => router.push('/dashboard/teacher/create-exam')}
            />
             <DashboardCard
                title="مدیریت آزمون‌ها"
                description="آزمون‌های موجود را ویرایش، حذف یا مشاهده کنید."
                icon={<Settings className="w-8 h-8" />}
                onClick={() => router.push('/dashboard/teacher/manage-exams')}
            />
             <DashboardCard
                title="مدیریت کاربران"
                description={isManager ? "کاربران جدید ایجاد کنید و لیست کاربران را ببینید." : "لیست کاربران سیستم را مشاهده کنید."}
                icon={<Users className="w-8 h-8" />}
                onClick={() => router.push('/dashboard/teacher/manage-users')}
            />
            <DashboardCard
                title="مشاهده نتایج کلی"
                description="گزارش‌ها و آمارهای کلی نتایج آزمون‌ها را ببینید."
                icon={<BarChart2 className="w-8 h-8" />}
                onClick={() => {}}
                disabled={true}
            />
        </div>
      </main>
    </div>
  );
}
