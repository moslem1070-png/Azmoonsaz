'use client';

import Link from 'next/link';
import {
  BookOpen,
  User,
  LogOut,
  Edit,
  GraduationCap,
  Home,
  History,
  Briefcase,
  FilePlus,
  Settings,
  UserPlus,
  Users,
  LayoutDashboard,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useState, useEffect, type ReactNode } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Role = 'student' | 'teacher' | 'manager';

const Header = ({ children }: { children?: ReactNode }) => {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<Role | null>(null);

  useEffect(() => {
    // This will only run on the client side
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('userRole');
      router.push('/');
      toast({
        title: 'خروج موفق',
        description: 'شما با موفقیت از حساب خود خارج شدید.',
      });
    } catch (error) {
      console.error('Error signing out: ', error);
      toast({
        variant: 'destructive',
        title: 'خطا در خروج',
        description: 'هنگام خروج از حساب خطایی رخ داد.',
      });
    }
  };

  const getAvatarIcon = () => {
    if (userRole === 'student') {
      return <GraduationCap className="w-5 h-5" />;
    }
    if (userRole === 'teacher' || userRole === 'manager') {
      return <Briefcase className="w-5 h-5" />;
    }
    return <User className="w-5 h-5" />;
  };

  const getDashboardUrl = () => {
    return userRole === 'student' ? '/dashboard' : '/dashboard/teacher';
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="mt-4 flex h-16 items-center justify-between rounded-[30px] border border-white/10 bg-white/5 px-4 sm:px-6 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 outline-none p-1 rounded-full transition-colors hover:bg-white/10">
                  <span className="text-white font-medium hidden sm:inline">
                    {user?.displayName ?? 'کاربر'}
                  </span>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 border border-primary/50 text-primary">
                      {getAvatarIcon()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2">
                <DropdownMenuLabel className="font-normal text-right">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push(getDashboardUrl())}>
                    <LayoutDashboard className="ml-2 h-4 w-4" />
                    <span>داشبورد</span>
                  </DropdownMenuItem>
                  {userRole === 'student' ? (
                    <DropdownMenuItem onClick={() => router.push('/dashboard/history')}>
                      <History className="ml-2 h-4 w-4" />
                      <span>کارنامه آزمون‌ها</span>
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => router.push('/dashboard/teacher/create-exam')}>
                        <FilePlus className="ml-2 h-4 w-4" />
                        <span>ایجاد آزمون</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/dashboard/teacher/manage-exams')}>
                        <Settings className="ml-2 h-4 w-4" />
                        <span>مدیریت آزمون‌ها</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/dashboard/teacher/manage-users')}>
                        <Users className="ml-2 h-4 w-4" />
                        <span>مدیریت کاربران</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                  <Edit className="ml-2 h-4 w-4" />
                  <span>ویرایش پروفایل</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>خروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {children}
          </div>
          <Link
            href={getDashboardUrl()}
            className="flex items-center gap-3 group"
          >
            <h1 className="hidden sm:block text-lg sm:text-xl font-bold text-white group-hover:text-primary transition-colors">
              Persian QuizMaster
            </h1>
            <div className="p-2 bg-primary/80 rounded-lg group-hover:scale-110 transition-transform">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
