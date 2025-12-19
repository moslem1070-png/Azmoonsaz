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
const createEmailFromNationalId = (nationalId: string, role: Role) => `${role}-${nationalId}@quizmaster.com`;

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
  const isPasswordLengthValid = useMemo(() => password.length >= 8, [password]);


  const nationalIdError = useMemo(() => {
    if (selectedRole === 'student' && nationalId.length > 0) {
      if (!isNationalIdNumeric) return "کد ملی فقط باید شامل عدد باشد.";
      if (!isNationalIdLengthValid) return "کد ملی باید ۱۰ رقم باشد.";
    }
    return null;
  }, [selectedRole, nationalId, isNationalIdLengthValid, isNationalIdNumeric]);

  const passwordError = useMemo(() => {
    if (authMode === 'signup' && password.length > 0 && !isPasswordLengthValid) {
        return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
    }
    return null;
  }, [authMode, password, isPasswordLengthValid]);


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

    const email = createEmailFromNationalId(nationalId, selectedRole);

    try {
      let userCredential;
      if (authMode === 'signup') {
        if (passwordError) {
            toast({ variant: 'destructive', title: 'خطا', description: passwordError });
            setLoading(false);
            return;
        }
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
    return selectedRole === 'teacher' ? 'ثبت‌نام مدیر / معلم' : 'ثبت‌نام دانش‌آموز';
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };
  
  if (isUserLoading || user) {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  const isSignupButtonDisabled = () => {
    if (authMode !== 'signup') return false;
    return loading || !!nationalIdError || !!passwordError;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#302851] to-[#1A162E] p-4">
      <GlassCard className="w-full max-w-md p-8 space-y-8 min-h-[500px] sm:min-h-0 flex flex-col justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{getTitle()}</h1>
          <p className="text-muted-foreground">
            {authMode === 'login' ? 'برای ادامه وارد شوید.' : 'برای ساخت حساب کاربری، فرم زیر را تکمیل کنید.'}
          </p>
        </div>

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
              {authMode === 'signup' && (
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
                    placeholder={selectedRole === 'teacher' ? "کد ملی یا نام کاربری" : "کد ملی"}
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

              <div>
                <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                    type="password" 
                    placeholder="رمز عبور" 
                    className={cn(
                        "pl-10 text-right",
                        passwordError && "border-red-500/50 ring-1 ring-red-500/50 focus-visible:ring-red-500"
                    )}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    />
                </div>
                {passwordError && (
                    <p className="text-xs text-muted-foreground mt-1.5 text-right">{passwordError}</p>
                )}
              </div>

              {authMode === 'signup' && (
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="password" 
                    placeholder="تکرار رمز عبور" 
                     className="pl-10 text-right"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={!isPasswordLengthValid}
                  />
                </div>
              )}
              <Button type="submit" className="w-full bg-primary/80 hover:bg-primary" disabled={loading || (selectedRole === 'student' && (!!nationalIdError || (authMode === 'signup' && !!passwordError)))}>
                {loading ? 'در حال پردازش...' : (authMode === 'login' ? 'ورود' : 'ایجاد حساب')}
                {!loading && <ArrowRight className="mr-2 h-4 w-4" />}
              </Button>
            </form>
          </motion.div>
        </AnimatePresence>

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

      </GlassCard>
    </div>
  );
}
