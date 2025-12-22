'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FilePlus, Settings, Users, BarChart2, BrainCircuit, DatabaseZap } from 'lucide-react';
import { motion } from 'framer-motion';

import Header from '@/components/header';
import { useUser } from '@/firebase';
import GlassCard from '@/components/glass-card';
import { migrateUsersToNationalIdKey } from '@/lib/migration';
import { useToast } from '@/hooks/use-toast';

type Role = 'student' | 'teacher';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

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

const DashboardCard = ({ title, description, icon, onClick, disabled, className }: DashboardCardProps) => (
  <GlassCard
    className={`p-6 text-right transition-all duration-300 hover:-translate-y-2 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
    } ${className}`}
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
  const { toast } = useToast();

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

  const handleMigration = async () => {
    if (!confirm('آیا از اجرای اسکریپت انتقال داده‌ها اطمینان دارید؟ این یک عملیات غیرقابل بازگشت است. لطفاً از داده‌های خود پشتیبان تهیه کنید.')) {
      return;
    }
    toast({ title: 'شروع فرآیند انتقال...', description: 'این عملیات ممکن است چند لحظه طول بکشد.' });
    try {
      await migrateUsersToNationalIdKey();
      toast({ title: 'موفقیت!', description: 'انتقال داده‌های کاربران با موفقیت انجام شد.' });
    } catch (error: any) {
      console.error('Migration failed:', error);
      toast({ variant: 'destructive', title: 'خطا در انتقال', description: error.message || 'مشکلی در اجرای اسکریپت پیش آمد.' });
    }
  };

  if (isUserLoading || !user || userRole === 'student') {
    return <LoadingAnimation />;
  }

  const getTitle = () => {
    return 'داشبورد معلم';
  };

  const getWelcomeMessage = () => {
    const name = user.displayName || 'معلم';
    return `خوش آمدید، ${name}!`;
  };

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
                description="دانش‌آموزان جدید ایجاد کنید و لیست کاربران را ببینید."
                icon={<Users className="w-8 h-8" />}
                onClick={() => router.push('/dashboard/teacher/manage-users')}
            />
            <DashboardCard
                title="مشاهده نتایج کلی"
                description="گزارش‌ها و آمارهای کلی نتایج آزمون‌ها را ببینید."
                icon={<BarChart2 className="w-8 h-8" />}
                onClick={() => router.push('/dashboard/teacher/results')}
            />
            {/* Temporary Migration Card */}
            <DashboardCard
                title="اجرای اسکریپت انتقال کاربران"
                description="مهم: این دکمه را فقط یک بار برای انتقال کاربران به ساختار جدید (ID = کد ملی) اجرا کنید."
                icon={<DatabaseZap className="w-8 h-8" />}
                onClick={handleMigration}
                className="!border-destructive/50 hover:!border-destructive"
            />
        </div>
      </main>
    </div>
  );
}
