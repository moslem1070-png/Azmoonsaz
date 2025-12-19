'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Key, User, Fingerprint, Lock } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile, updateEmail } from 'firebase/auth';

import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useUser, useAuth } from '@/firebase';

// Helper to get role from email
const getRoleFromEmail = (email?: string | null): string => {
    if (!email) return 'student';
    // Handles roles like 'student', 'teacher', 'manager'
    const role = email.split('-')[0].split('@')[0];
    return role;
}

// Helper function to create a fake email from national ID
const createEmailFromNationalId = (nationalId: string, role: string) => {
    return `${role}-${nationalId}@quizmaster.com`;
}

const formSchema = z.object({
    fullName: z.string().min(3, { message: 'نام و نام خانوادگی باید حداقل ۳ حرف باشد.' }),
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

export default function ProfilePage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    // Helper function to extract the pure ID part from the email
    const getNationalIdFromEmail = (email?: string | null): string => {
        if (!email) return '';
        const emailPrefix = email.split('@')[0];
        const parts = emailPrefix.split('-');
        // Return the last part, which should be the ID
        return parts.length > 1 ? parts[parts.length - 1] : emailPrefix;
    };
    
    const nationalId = getNationalIdFromEmail(user?.email);
    const role = getRoleFromEmail(user?.email);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: '',
            nationalId: nationalId,
            oldPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/');
        }
        if (user) {
            form.reset({
                fullName: user.displayName || '',
                nationalId: getNationalIdFromEmail(user.email),
                oldPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        }
    }, [user, isUserLoading, router, form]);

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        setLoading(true);
        if (!user || !user.email) {
            toast({ variant: 'destructive', title: 'خطا', description: 'کاربر احراز هویت نشده است.' });
            setLoading(false);
            return;
        }

        const originalNationalId = getNationalIdFromEmail(user.email);
        const didNationalIdChange = data.nationalId !== originalNationalId;
        const didPasswordChange = !!data.newPassword;
        const didFullNameChange = data.fullName !== user.displayName;

        if (!didNationalIdChange && !didPasswordChange && !didFullNameChange) {
            toast({ title: 'توجه', description: 'هیچ تغییری برای ذخیره وجود ندارد.' });
            setLoading(false);
            return;
        }

        if ((didNationalIdChange || didPasswordChange) && !data.oldPassword) {
            toast({ variant: 'destructive', title: 'خطا', description: 'برای تغییر کد ملی یا رمز عبور، باید رمز عبور فعلی را وارد کنید.' });
            setLoading(false);
            return;
        }

        if (role === 'student' && !/^\d{10}$/.test(data.nationalId)) {
            toast({ variant: 'destructive', title: 'خطا', description: 'کد ملی دانش‌آموز باید ۱۰ رقم و فقط شامل عدد باشد.' });
            setLoading(false);
            return;
        }


        try {
            // Re-authenticate if necessary
            if (didNationalIdChange || didPasswordChange) {
                const credential = EmailAuthProvider.credential(user.email, data.oldPassword!);
                await reauthenticateWithCredential(user, credential);
            }

            let successMessages = [];

            // Update displayName if changed
            if (didFullNameChange) {
                await updateProfile(user, { displayName: data.fullName });
                successMessages.push('نام شما با موفقیت به‌روزرسانی شد.');
            }
            
            // Update email (nationalId) if changed
            if (didNationalIdChange) {
                const newEmail = createEmailFromNationalId(data.nationalId, role);
                await updateEmail(user, newEmail);
                successMessages.push('کد ملی شما با موفقیت تغییر کرد.');
                 // Update the local storage role to reflect the new email structure potential
                const newRole = getRoleFromEmail(newEmail);
                localStorage.setItem('userRole', newRole);
            }

            // Update password if changed
            if (didPasswordChange) {
                await updatePassword(user, data.newPassword!);
                successMessages.push('رمز عبور شما با موفقیت تغییر کرد.');
            }

            toast({ title: 'موفق', description: successMessages.join(' ') });
            form.reset({ ...form.getValues(), oldPassword: '', newPassword: '', confirmPassword: '' });

        } catch (error: any) {
            console.error("Profile update error:", error);
            const errorMessage = 
                error.code === 'auth/wrong-password' ? 'رمز عبور فعلی اشتباه است.' :
                error.code === 'auth/weak-password' ? 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' :
                error.code === 'auth/email-already-in-use' ? 'این کد ملی قبلاً استفاده شده است.' :
                error.code === 'auth/requires-recent-login' ? 'برای این عملیات نیاز به ورود مجدد است. لطفاً رمز عبور فعلی را وارد کنید.' :
                'خطایی در به‌روزرسانی اطلاعات رخ داد.';
            toast({ variant: 'destructive', title: 'خطا', description: errorMessage });
        } finally {
            setLoading(false);
        }
    };
    
    if (isUserLoading || !user) {
        return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
                <GlassCard className="w-full max-w-lg p-6 sm:p-8">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">ویرایش پروفایل</h1>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>نام و نام خانوادگی</FormLabel>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <FormControl>
                                                <Input placeholder="نام کامل خود را وارد کنید" {...field} className="pl-10 text-right" />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="nationalId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{role === 'student' ? 'کد ملی' : 'نام کاربری'}</FormLabel>
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
                            
                            <hr className="border-white/10 my-8" />
                            
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
