'use client';

import Link from "next/link";
import { BookOpen, User, LogOut, Edit, GraduationCap, Home, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useState, useEffect, type ReactNode } from "react";


import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

type Role = 'student' | 'teacher';

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
        title: "خروج موفق",
        description: "شما با موفقیت از حساب خود خارج شدید."
      });
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        variant: "destructive",
        title: "خطا در خروج",
        description: "هنگام خروج از حساب خطایی رخ داد.",
      });
    }
  };
  
  const getAvatarIcon = () => {
    if (userRole === 'student') {
        return <GraduationCap />;
    }
    return <User />;
  }

  return (
    <header className="sticky top-0 z-50">
        <div className="container mx-auto px-4">
            <div className="mt-4 flex h-16 items-center justify-between rounded-[30px] border border-white/20 bg-white/10 px-6 backdrop-blur-lg">
                <div className="flex items-center gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
                      <span className="text-white font-medium">{user?.displayName ?? 'کاربر'}</span>
                      <Avatar>
                          <AvatarFallback>
                              {getAvatarIcon()}
                          </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>{user?.displayName}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                        <Home className="ml-2 h-4 w-4" />
                        <span>صفحه اصلی</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/dashboard#exam-history')}>
                        <History className="ml-2 h-4 w-4" />
                        <span>کارنامه آزمون‌های قبلی</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/profile')}>
                        <Edit className="ml-2 h-4 w-4" />
                        <span>ویرایش پروفایل</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="ml-2 h-4 w-4" />
                        <span>خروج</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                   {children}
                </div>
                <Link href="/dashboard" className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white hidden sm:block">Persian QuizMaster</h1>
                    <div className="p-2 bg-primary/80 rounded-lg">
                        <BookOpen className="h-6 w-6 text-primary-foreground" />
                    </div>
                </Link>
            </div>
        </div>
    </header>
  );
};

export default Header;
