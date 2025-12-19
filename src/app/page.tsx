'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Key, ArrowRight, UserPlus, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/glass-card';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type Role = 'student' | 'teacher';
type AuthMode = 'login' | 'signup';

// Helper function to create a fake email from national ID or username
const createEmail = (username: string, role: Role) => {
    return `${role}-${username}@quizmaster.com`;
}


export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const isPasswordLengthValid = useMemo(() => password.length >= 8, [password]);


  const nationalIdError = useMemo(() => {
    if (selectedRole === 'student' && nationalId && !/^\d{10}$/.test(nationalId)) {
      return "کد ملی باید ۱۰ رقم و فقط شامل عدد باشد.";
    }
    return null;
  }, [selectedRole, nationalId]);

  const passwordError = useMemo(() => {
    if (authMode === 'signup' && password && password.length < 8) {
        return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
    }
    return null;
  }, [authMode, password]);


  useEffect(() => {
    if (!isUserLoading && user) {
      const role = localStorage.getItem('userRole');
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
      toast({ variant: 'destructive', title: 'خطا', description: 'نام کاربری/کد ملی و رمز عبور الزامی است.' });
      setLoading(false);
      return;
    }
    
    if (selectedRole === 'student' && nationalIdError) {
        toast({ variant: 'destructive', title: 'خطا', description: nationalIdError });
        setLoading(false);
        return;
    }

    if (authMode === 'signup') {
      // --- SIGNUP LOGIC (Only for students from this page) ---
       if (selectedRole === 'teacher') {
            toast({ variant: 'destructive', title: 'خطا', description: 'ثبت‌نام معلم از این صفحه امکان‌پذیر نیست. لطفا از یک معلم دیگر بخواهید شما را اضافه کند.' });
            setLoading(false);
            return;
       }

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

      const email = createEmail(nationalId, 'student');
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: fullName });

        // Also create a user document in Firestore, identified by the user's UID from Auth
        const userDocRef = doc(firestore, 'users', user.uid);
        const newUserDoc = {
          id: user.uid,
          nationalId: nationalId,
          firstName: fullName.split(' ')[0] || '',
          lastName: fullName.split(' ').slice(1).join(' ') || '',
          role: 'student',
        };
        
        setDoc(userDocRef, newUserDoc).catch(serverError => {
            console.error("Firestore user creation failed:", serverError);
            const permissionError = new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'create',
              requestResourceData: newUserDoc,
            });
            errorEmitter.emit('permission-error', permissionError);
             toast({
                variant: 'destructive',
                title: 'خطای پایگاه داده',
                description: 'حساب کاربری شما ایجاد شد، اما در ذخیره پروفایل مشکلی پیش آمد.'
            });
        });

        toast({ title: 'ثبت‌نام موفق', description: 'حساب کاربری شما با موفقیت ایجاد شد.' });
        
        localStorage.setItem('userRole', 'student');
        router.push('/dashboard');

      } catch(error: any) {
         console.error("Signup error:", error);
         const errorMessage =
          error.code === 'auth/email-already-in-use' ? 'این کد ملی قبلا ثبت‌نام کرده است.' :
          'خطایی در هنگام پردازش درخواست شما رخ داد.';
        toast({ variant: 'destructive', title: 'خطا در ثبت‌نام', description: errorMessage });
      } finally {
        setLoading(false);
      }
      return; // End signup logic
    }
    
    // --- LOGIN LOGIC ---
    const email = createEmail(nationalId, selectedRole);

    try {
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('userRole', selectedRole);

        toast({ title: 'ورود موفق', description: 'خوش آمدید!' });
        
        if (selectedRole === 'teacher') {
            router.push('/dashboard/teacher');
        } else {
            router.push('/dashboard');
        }

    } catch (error: any) {
        console.error("Login error:", error);
        toast({ variant: 'destructive', title: 'خطا', description: 'اطلاعات ورود نامعتبر است.' });
    } finally {
        setLoading(false);
    }
  };
  
  const getTitle = () => {
    if (selectedRole === 'teacher') {
        return 'ورود معلم';
    }
    return authMode === 'login' ? 'ورود دانش‌آموز' : 'ثبت‌نام دانش‌آموز';
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };
  
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
            معلم
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
              
              <div className='relative'>
                <div className="relative flex items-center">
                  <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10 pointer-events-none" />
                  <Input 
                    type="text" 
                    placeholder={selectedRole === 'teacher' ? "نام کاربری" : "کد ملی"}
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
                    <p className="text-xs text-red-400 mt-1.5 text-right">{nationalIdError}</p>
                )}
              </div>

              <div>
                <div className="relative flex items-center">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10 pointer-events-none" />
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
                    <p className="text-xs text-red-400 mt-1.5 text-right">{passwordError}</p>
                )}
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
                    disabled={!isPasswordLengthValid}
                  />
                </div>
              )}
              <Button type="submit" className="w-full bg-primary/80 hover:bg-primary" disabled={loading || (selectedRole === 'student' && !!nationalIdError) || (authMode === 'signup' && !!passwordError)}>
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

      </GlassCard>
    </div>
  );
}
