'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Mail, Key, ArrowRight, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/glass-card';

type Role = 'student' | 'teacher';
type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    if (role === 'teacher') {
      setAuthMode('login');
    }
  };

  const getTitle = () => {
    if (selectedRole === 'teacher') return 'ورود مدیر / معلم';
    if (authMode === 'login') return 'ورود دانش‌آموز';
    return 'ثبت‌نام دانش‌آموز';
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#302851] to-[#1A162E] p-4">
      <GlassCard className="w-full max-w-md p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{getTitle()}</h1>
          <p className="text-muted-foreground">
            {selectedRole === 'student' ? 'برای ادامه وارد شوید یا ثبت‌نام کنید.' : 'برای دسترسی به پنل خود وارد شوید.'}
          </p>
        </div>

        {/* Role Selection */}
        <div className="flex bg-white/5 p-1 rounded-full">
          <button
            onClick={() => handleRoleChange('student')}
            className={cn(
              'w-full py-2 rounded-full text-sm font-semibold transition-colors',
              selectedRole === 'student' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-white/10'
            )}
          >
            <User className="inline-block w-4 h-4 ml-2" />
            دانش‌آموز
          </button>
          <button
            onClick={() => handleRoleChange('teacher')}
            className={cn(
              'w-full py-2 rounded-full text-sm font-semibold transition-colors',
              selectedRole === 'teacher' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-white/10'
            )}
          >
            <Briefcase className="inline-block w-4 h-4 ml-2" />
            مدیر / معلم
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedRole + authMode}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <form className="space-y-6">
              {authMode === 'signup' && (
                 <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input type="text" placeholder="نام و نام خانوادگی" className="pl-10 text-right" />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type="email" placeholder="ایمیل" className="pl-10 text-right" />
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type="password" placeholder="رمز عبور" className="pl-10 text-right" />
              </div>
              <Button type="submit" className="w-full bg-primary/80 hover:bg-primary">
                {authMode === 'login' ? 'ورود' : 'ایجاد حساب'}
                <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        </AnimatePresence>

        {selectedRole === 'student' && (
          <div className="flex items-center justify-center space-x-reverse space-x-2">
            <Button
              variant={authMode === 'login' ? 'ghost' : 'link'}
              onClick={() => setAuthMode('login')}
              className={cn(
                'text-muted-foreground transition-colors',
                authMode === 'login' && 'font-bold text-accent'
              )}
            >
              ورود
            </Button>
            <div className="h-4 w-px bg-border"></div>
            <Button
              variant={authMode === 'signup' ? 'ghost' : 'link'}
              onClick={() => setAuthMode('signup')}
              className={cn(
                'text-muted-foreground transition-colors',
                authMode === 'signup' && 'font-bold text-accent'
              )}
            >
              ثبت‌نام
            </Button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
