'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Key, ArrowRight, UserPlus, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/glass-card';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

type Role = 'student' | 'teacher';
type AuthMode = 'login' | 'signup';

// Helper function to create a fake email from national ID
const createEmailFromNationalId = (nationalId: string) => `${nationalId}@quizmaster.com`;

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const isNationalIdLengthValid = useMemo(() => nationalId.length === 10, [nationalId]);
  const isNationalIdNumeric = useMemo(() => /^\d*$/.test(nationalId), [nationalId]);

  const nationalIdError = useMemo(() => {
    if (selectedRole === 'student' && nationalId.length > 0) {
      if (!isNationalIdNumeric) return "کد ملی فقط باید شامل عدد باشد.";
      if (!isNationalIdLengthValid) return "کد ملی باید ۱۰ رقم باشد.";
    }
    return null;
  }, [selectedRole, nationalId, isNationalIdLengthValid, isNationalIdNumeric]);


  useEffect(() => {
    // If user is already logged in, redirect based on role
    if (!isUserLoading && user) {
      const role = localStorage.getItem('userRole') as Role;
      if (role === 'teacher') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, router]);


  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    setAuthMode('login'); // Always default to login when role changes
    setNationalId('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
  };
  

  const handleAuthSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (selectedRole === 'teacher') {
        // Hardcoded credentials for teacher/admin login
        if (nationalId === 'admin' && password === 'admin123') {
            try {
                // This is a dummy email for auth purpose, not a real one
                await signInWithEmailAndPassword(auth, 'teacher-admin@quizmaster.com', 'admin123');
                localStorage.setItem('userRole', 'teacher');
                router.push('/dashboard/teacher');
                toast({ title: 'ورود موفق', description: 'به داشبورد مدیریت خوش آمدید.' });
            } catch (error: any) {
                 if (error.code === 'auth/user-not-found') {
                    try {
                        const userCredential = await createUserWithEmailAndPassword(auth, 'teacher-admin@quizmaster.com', 'admin123');
                        await updateProfile(userCredential.user, { displayName: 'مدیر سیستم' });
                        localStorage.setItem('userRole', 'teacher');
                        router.push('/dashboard/teacher');
                        toast({ title: 'ورود موفق', description: 'حساب کاربری مدیر ایجاد و وارد شدید.' });
                    } catch (creationError: any) {
                         toast({ variant: 'destructive', title: 'خطای بحرانی', description: 'امکان ایجاد حساب مدیر وجود نداشت.' });
                    }
                } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                  toast({ variant: 'destructive', title: 'خطا', description: 'رمز عبور مدیر اشتباه است.' });
                } else {
                    toast({ variant: 'destructive', title: 'خطا', description: error.message });
                }
            } finally {
                setLoading(false);
            }
        } else {
            toast({ variant: 'destructive', title: 'خطای ورود', description: 'اطلاعات ورود مدیر صحیح نیست.' });
            setLoading(false);
        }
        return;
    }


    if (!nationalId || !password) {
      toast({ variant: 'destructive', title: 'خطا', description: 'کد ملی و رمز عبور الزامی است.' });
      setLoading(false);
      return;
    }
    
    if (selectedRole === 'student' && nationalIdError) {
        toast({ variant: 'destructive', title: 'خطا', description: nationalIdError });
        setLoading(false);
        return;
    }

    const email = createEmailFromNationalId(nationalId);

    try {
      let userCredential;
      if (authMode === 'signup') {
        if (password !== confirmPassword) {
          toast({ variant: 'destructive', title: 'خطا', description: 'رمز عبور و تکرار آن یکسان نیستند.' });
          setLoading(false);
          return;
        }
        if (!fullName) {
            toast({ variant: 'destructive', title: 'خطا', description: 'نام و نام خانوادگی الزامی است.' });
            setLoading(false);
            return;
        }

        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await updateProfile(userCredential.user, {
            displayName: fullName,
        });

        toast({ title: 'ثبت‌نام موفق', description: 'حساب کاربری شما با موفقیت ایجاد شد.' });

      } else { // Login mode
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'ورود موفق', description: 'خوش آمدید!' });
      }

      localStorage.setItem('userRole', selectedRole);

      if (selectedRole === 'teacher') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard');
      }

    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error.code === 'auth/user-not-found' ? 'کاربری با این کد ملی یافت نشد.' :
        error.code === 'auth/wrong-password' ? 'رمز عبور اشتباه است.' :
        error.code === 'auth/email-already-in-use' ? 'این کد ملی قبلا ثبت‌نام کرده است.' :
        error.code === 'auth/invalid-credential' ? 'اطلاعات ورود نامعتبر است.' :
        'خطایی در هنگام ورود یا ثبت‌نام رخ داد.';
      toast({ variant: 'destructive', title: 'خطا', description: errorMessage });
    } finally {
      setLoading(false);
    }
  };
  
  const getTitle = () => {
    if (authMode === 'login') {
      return selectedRole === 'teacher' ? 'ورود مدیر / معلم' : 'ورود دانش‌آموز';
    }
    // Signup mode is only for students now, but we check role just in case
    return selectedRole === 'teacher' ? 'ثبت‌نام مدیر / معلم' : 'ثبت‌نام دانش‌آموز';
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };
  
  // Don't render anything until auth state is determined
  if (isUserLoading || user) {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#302851] to-[#1A162E] p-4">
      <GlassCard className="w-full max-w-md p-8 space-y-8 min-h-[500px] sm:min-h-0 flex flex-col justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{getTitle()}</h1>
          <p className="text-muted-foreground">
            {authMode === 'login' ? 'برای ادامه وارد شوید.' : 'برای ساخت حساب کاربری، فرم زیر را تکمیل کنید.'}
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
            <form className="space-y-6" onSubmit={handleAuthSubmission}>
              {authMode === 'signup' && selectedRole === 'student' && (
                 <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="نام و نام خانوادگی" 
                    className="pl-10 text-right"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              
              <div>
                <div className="relative">
                  <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder={selectedRole === 'teacher' ? "نام کاربری مدیر" : "کد ملی"}
                    className={cn(
                      "pl-10 text-right",
                      nationalIdError && "border-red-500/50 ring-1 ring-red-500/50 focus-visible:ring-red-500"
                    )}
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    required
                    maxLength={selectedRole === 'student' ? 10 : undefined}
                  />
                </div>
                {nationalIdError && (
                    <p className="text-xs text-muted-foreground mt-1.5 text-right">{nationalIdError}</p>
                )}
              </div>

              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="رمز عبور" 
                  className="pl-10 text-right" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {authMode === 'signup' && selectedRole === 'student' && (
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="password" 
                    placeholder="تکرار رمز عبور" 
                    className="pl-10 text-right" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full bg-primary/80 hover:bg-primary" disabled={loading || (selectedRole === 'student' && !!nationalIdError)}>
                {loading ? 'در حال پردازش...' : (authMode === 'login' ? 'ورود' : 'ایجاد حساب')}
                {!loading && <ArrowRight className="mr-2 h-4 w-4" />}
              </Button>
            </form>
          </motion.div>
        </AnimatePresence>

        {selectedRole === 'student' && (
          <div className="flex items-center justify-center space-x-reverse space-x-2">
              <Button
                variant="link"
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
                variant="link"
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
        
        {selectedRole === 'teacher' && authMode === 'login' && (
             <p className="text-xs text-muted-foreground text-center pt-4">برای ورود به عنوان مدیر، از نام کاربری `admin` و رمز عبور `admin123` استفاده کنید.</p>
        )}

      </GlassCard>
    </div>
  );
}
