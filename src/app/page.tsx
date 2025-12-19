'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Key, ArrowRight, UserPlus, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/glass-card';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type Role = 'student' | 'teacher';
type AuthMode = 'login' | 'signup';

// Helper function to create a fake email from national ID or username
const createEmail = (username: string, role: Role) => {
    return `${role}-${username}@quizmaster.com`;
}

const formSchema = z.object({
  fullName: z.string(),
  nationalId: z.string().min(1, { message: 'کد ملی یا نام کاربری الزامی است.'}),
  password: z.string().min(1, { message: 'رمز عبور الزامی است.'}),
  confirmPassword: z.string(),
});

const getValidationSchema = (authMode: AuthMode, selectedRole: Role) => {
    return formSchema.superRefine((data, ctx) => {
        if (selectedRole === 'student') {
            if (!/^\d{10}$/.test(data.nationalId)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "کد ملی باید ۱۰ رقم و فقط شامل عدد باشد.",
                    path: ['nationalId'],
                });
            }
        }
        if (authMode === 'signup') {
            if (!data.fullName) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "نام و نام خانوادگی الزامی است.",
                    path: ['fullName'],
                });
            }
            if (data.password.length < 8) {
                 ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "رمز عبور باید حداقل ۸ کاراکتر باشد.",
                    path: ['password'],
                });
            }
            if (data.password !== data.confirmPassword) {
                 ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "رمز عبور و تکرار آن یکسان نیستند.",
                    path: ['confirmPassword'],
                });
            }
        }
    });
}


export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const currentSchema = useMemo(() => getValidationSchema(authMode, selectedRole), [authMode, selectedRole]);

  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      nationalId: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    form.reset();
  }, [selectedRole, authMode, form]);


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
  };
  
  const handleAuthSubmission: SubmitHandler<z.infer<typeof currentSchema>> = async (data) => {
    setLoading(true);
    const { nationalId, password, fullName } = data;

    if (authMode === 'signup') {
      // --- SIGNUP LOGIC (Only for students from this page) ---
       if (selectedRole === 'teacher') {
            toast({ variant: 'destructive', title: 'خطا', description: 'ثبت‌نام معلم از این صفحه امکان‌پذیر نیست. لطفا از یک معلم دیگر بخواهید شما را اضافه کند.' });
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
            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(handleAuthSubmission)}>
                
                {authMode === 'signup' && selectedRole === 'student' && (
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">نام و نام خانوادگی</FormLabel>
                        <div className="relative">
                          <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="نام و نام خانوادگی" 
                              className="pl-10 text-right"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="text-right" />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="nationalId"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className="sr-only">{selectedRole === 'teacher' ? "نام کاربری" : "کد ملی"}</FormLabel>
                        <div className="relative">
                            <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10 pointer-events-none" />
                            <FormControl>
                                <Input 
                                type="text" 
                                placeholder={selectedRole === 'teacher' ? "نام کاربری" : "کد ملی"}
                                className="pl-10 text-right"
                                maxLength={selectedRole === 'student' ? 10 : undefined}
                                {...field}
                                />
                            </FormControl>
                        </div>
                        <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className="sr-only">رمز عبور</FormLabel>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10 pointer-events-none" />
                            <FormControl>
                                <Input 
                                type="password" 
                                placeholder="رمز عبور" 
                                className="pl-10 text-right"
                                {...field}
                                />
                            </FormControl>
                        </div>
                        <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />

                {authMode === 'signup' && selectedRole === 'student' && (
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                       <FormItem>
                         <FormLabel className="sr-only">تکرار رمز عبور</FormLabel>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <FormControl>
                                <Input 
                                type="password" 
                                placeholder="تکرار رمز عبور" 
                                className="pl-10 text-right"
                                {...field}
                                />
                            </FormControl>
                          </div>
                          <FormMessage className="text-right" />
                       </FormItem>
                    )}
                  />
                )}
                <Button type="submit" className="w-full bg-primary/80 hover:bg-primary" disabled={loading || !form.formState.isValid}>
                  {loading ? 'در حال پردازش...' : (authMode === 'login' ? 'ورود' : 'ایجاد حساب')}
                  {!loading && <ArrowRight className="mr-2 h-4 w-4" />}
                </Button>
              </form>
            </Form>
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
