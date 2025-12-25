
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Key, User, Fingerprint, Lock, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile, updateEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';


import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useAuth } from '@/firebase';
import type { User as AppUser } from '@/lib/types';


// Helper to get role from email
const getRoleFromEmail = (email?: string | null): string => {
    if (!email) return 'student';
    if (email.startsWith('teacher-')) return 'teacher';
    return 'student';
}

// Helper function to create a fake email from national ID
const createEmail = (username: string, role: string) => {
    return `${role}-${username}@quizmaster.com`;
}

const formSchema = z.object({
    firstName: z.string().min(1, { message: 'نام الزامی است.' }),
    lastName: z.string().min(1, { message: 'نام خانوادگی الزامی است.' }),
    nationalId: z.string().min(1, { message: "کد ملی الزامی است."}),
    oldPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.newPassword || data.oldPassword) {
        return data.newPassword === data.confirmPassword;
    }
    return true;
}, {
    message: 'رمز عبور جدید و تکرار آن یکسان نیستند.',
    path: ['confirmPassword'],
}).refine(data => {
    if (data.newPassword) {
        return !!data.oldPassword;
    }
    return true;
}, {
    message: 'برای تنظیم رمز عبور جدید، باید رمز عبور فعلی را وارد کنید.',
    path: ['oldPassword'],
}).refine(data => {
    if (data.newPassword) {
        return data.newPassword.length >= 6;
    }
    return true;
}, {
    message: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.',
    path: ['newPassword'],
});

type FormData = z.infer<typeof formSchema>;

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

export default function ProfilePage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<AppUser | null>(null);
    let role: string | null = null;
    if (typeof window !== 'undefined') {
      role = localStorage.getItem('userRole');
    }
    
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/');
        }
        if (user && firestore && !userProfile) {
            const fetchUserProfile = async () => {
                // Since doc ID is nationalId, we can't use user.uid to fetch the doc directly.
                // We must get the nationalId from localStorage or another source.
                const storedNationalId = localStorage.getItem('userNationalId');
                if (!storedNationalId) {
                    // This can happen if user logs in but hasn't stored their ID yet, or old session.
                    // We can't fetch the profile, maybe force logout or show error.
                    console.error("National ID not found in local storage.");
                    toast({variant: 'destructive', title: 'خطا', description: 'اطلاعات پروفایل یافت نشد، لطفا مجدد وارد شوید.'})
                    return;
                }

                const userDocRef = doc(firestore, 'users', storedNationalId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const profileData = userDocSnap.data() as AppUser;
                    setUserProfile(profileData);
                } else {
                     console.error("User document not found in Firestore.");
                     toast({variant: 'destructive', title: 'خطا', description: 'پروفایل کاربری یافت نشد.'})
                }
            };
            fetchUserProfile();
        }
    }, [user, isUserLoading, router, firestore, userProfile, toast]);


    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        values: { // Changed from defaultValues to values
            firstName: userProfile?.firstName || '',
            lastName: userProfile?.lastName || '',
            nationalId: userProfile?.nationalId || '',
            oldPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
        // We need to re-enable revalidation so `values` is updated
        // when userProfile state changes after the async fetch.
        reValidateMode: 'onChange',
    });

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        setLoading(true);
        if (!user || !user.email || !userProfile || !firestore) {
            toast({ variant: 'destructive', title: 'خطا', description: 'کاربر احراز هویت نشده یا پروفایل یافت نشد.' });
            setLoading(false);
            return;
        }

        const didNationalIdChange = data.nationalId !== userProfile.nationalId;
        const didPasswordChange = !!data.newPassword;
        const didNameChange = data.firstName !== userProfile.firstName || data.lastName !== userProfile.lastName;
        const fullName = `${data.firstName} ${data.lastName}`;
        const hasAnyChange = didNationalIdChange || didPasswordChange || didNameChange;

        if (!hasAnyChange) {
            toast({ title: 'توجه', description: 'هیچ تغییری برای ذخیره وجود ندارد.' });
            setLoading(false);
            return;
        }

        if (!data.oldPassword) {
            toast({ variant: 'destructive', title: 'خطا', description: 'برای ذخیره هرگونه تغییر، باید رمز عبور فعلی را وارد کنید.' });
            setLoading(false);
            return;
        }
        
        if (role === 'student' && !/^\d{10}$/.test(data.nationalId)) {
            toast({ variant: 'destructive', title: 'خطا', description: 'کد ملی دانش‌آموز باید ۱۰ رقم و فقط شامل عدد باشد.' });
            setLoading(false);
            return;
        }


        try {
            // Re-authenticate for all critical changes
            const credential = EmailAuthProvider.credential(user.email, data.oldPassword);
            await reauthenticateWithCredential(user, credential);

            let successMessages = [];

            // Update Auth displayName if changed
            if (didNameChange && !didNationalIdChange) { // Only update if name changed but ID didn't (ID change handles this)
                await updateProfile(user, { displayName: fullName });
            }

            if (didNationalIdChange) {
                const newDocRef = doc(firestore, 'users', data.nationalId);
                const oldDocRef = doc(firestore, 'users', userProfile.nationalId);

                // Check if the new national ID is already taken
                const newDocSnap = await getDoc(newDocRef);
                if (newDocSnap.exists()) {
                    throw new Error('کد ملی جدید قبلاً استفاده شده است.');
                }

                // Use a batch write to move the document
                const batch = writeBatch(firestore);
                
                const newDocumentData = {
                    ...userProfile,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    nationalId: data.nationalId,
                };
                
                batch.set(newDocRef, newDocumentData);
                batch.delete(oldDocRef);
                
                // Also update the email in auth and display name
                const newEmail = createEmail(data.nationalId, userProfile.role);
                await updateEmail(user, newEmail);
                await updateProfile(user, { displayName: fullName });
                
                await batch.commit();

                // Update local storage
                localStorage.setItem('userNationalId', data.nationalId);
                successMessages.push('اطلاعات شما با موفقیت به‌روزرسانی شد.');

            } else if (didNameChange) {
                // If only name changed (and ID did not), just update the existing document
                const userDocRef = doc(firestore, 'users', userProfile.nationalId);
                await updateDoc(userDocRef, {
                    firstName: data.firstName,
                    lastName: data.lastName,
                });
                successMessages.push('نام شما با موفقیت به‌روزرسانی شد.');
            }

            // Update password if changed
            if (didPasswordChange && data.newPassword) {
                await updatePassword(user, data.newPassword);
                successMessages.push('رمز عبور شما با موفقیت تغییر کرد.');
            }

            toast({ title: 'موفق', description: successMessages.join(' ') || 'اطلاعات با موفقیت به‌روزرسانی شد.' });
            
            // Manually update profile state to reflect changes immediately
            setUserProfile(prev => prev ? ({ ...prev, ...data }) : null);

            form.reset({ ...form.getValues(), oldPassword: '', newPassword: '', confirmPassword: '' });

        } catch (error: any) {
            console.error("Profile update error:", error);
            const errorMessage = 
                error.code === 'auth/wrong-password' ? 'رمز عبور فعلی اشتباه است.' :
                error.code === 'auth/weak-password' ? 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' :
                error.code === 'auth/email-already-in-use' ? 'این کد ملی قبلاً استفاده شده است.' :
                error.code === 'auth/requires-recent-login' ? 'برای این عملیات نیاز به ورود مجدد است. لطفاً رمز عبور فعلی را وارد کنید.' :
                error.message || 'خطایی در به‌روزرسانی اطلاعات رخ داد.';
            toast({ variant: 'destructive', title: 'خطا', description: errorMessage });
        } finally {
            setLoading(false);
        }
    };
    
    if (isUserLoading || !user || !userProfile) {
        return <LoadingAnimation />;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
                <GlassCard className="w-full max-w-lg p-6 sm:p-8">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">ویرایش پروفایل</h1>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>نام</FormLabel>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                                <FormControl>
                                                    <Input placeholder="نام" {...field} className="pl-10 text-right" />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>نام خانوادگی</FormLabel>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                                <FormControl>
                                                    <Input placeholder="نام خانوادگی" {...field} className="pl-10 text-right" />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="nationalId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>کد ملی</FormLabel>
                                        <div className="relative">
                                            <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <FormControl>
                                                <Input {...field} className="pl-10 text-right" maxLength={role === 'student' ? 10 : undefined}/>
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="oldPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>رمز عبور فعلی</FormLabel>
                                        <div className="relative">
                                             <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <FormControl>
                                                <Input type="password" placeholder="برای تغییر، رمز عبور فعلی را وارد کنید" {...field} className="pl-10 text-right" />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>رمز عبور جدید</FormLabel>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <FormControl>
                                                <Input type="password" placeholder="رمز عبور جدید" {...field} className="pl-10 text-right" />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>تکرار رمز عبور جدید</FormLabel>
                                        <div className="relative">
                                             <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <FormControl>
                                                <Input type="password" placeholder="تکرار رمز عبور جدید" {...field} className="pl-10 text-right" />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="flex gap-4 pt-4">
                               <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
                                   انصراف
                               </Button>
                               <Button type="submit" className="w-full bg-primary/80 hover:bg-primary" disabled={loading}>
                                   {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                               </Button>
                            </div>
                        </form>
                    </Form>
                </GlassCard>
            </main>
        </div>
    );
}

    




    





    