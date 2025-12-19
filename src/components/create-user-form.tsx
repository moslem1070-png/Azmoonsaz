'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UserPlus, Fingerprint, Key } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  fullName: z.string().min(3, { message: 'نام کامل باید حداقل ۳ حرف باشد.' }),
  nationalId: z.string().refine(data => /^\d{10}$/.test(data), {
    message: 'کد ملی باید ۱۰ رقم و فقط شامل عدد باشد.',
  }),
  password: z.string().min(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' }),
});

type FormData = z.infer<typeof formSchema>;

const createEmailFromNationalId = (nationalId: string) => {
    return `student-${nationalId}@quizmaster.com`;
}

export default function CreateUserForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      nationalId: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    const email = createEmailFromNationalId(data.nationalId);

    try {
      // Step 1: Create user in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
      const user = userCredential.user;
      
      // Step 2: Update user's display name in Auth
      await updateProfile(user, { displayName: data.fullName });

      // Step 3: Create user document in Firestore, identified by the user's UID from Auth
      const userDocRef = doc(firestore, 'users', user.uid);
      const newUserDoc = {
          id: user.uid,
          nationalId: data.nationalId,
          firstName: data.fullName.split(' ')[0] || '',
          lastName: data.fullName.split(' ').slice(1).join(' ') || '',
          role: 'student', // Always create a student
      };

      // Set document in Firestore, with error handling
      setDoc(userDocRef, newUserDoc)
        .catch((serverError) => {
            console.error("Failed to create user document in Firestore", serverError);
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: newUserDoc,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: 'destructive',
                title: 'خطای پایگاه داده',
                description: 'کاربر در سیستم احراز هویت ایجاد شد اما پروفایل او در پایگاه داده ذخیره نشد.',
            });
        });


      toast({
        title: 'دانش‌آموز با موفقیت ایجاد شد',
        description: `کاربر "${data.fullName}" با موفقیت ایجاد شد.`,
      });
      form.reset();

    } catch (error: any) {
      console.error("Create user error:", error);
      const errorMessage =
        error.code === 'auth/email-already-in-use' ? 'این کد ملی قبلاً استفاده شده است.' :
        'خطایی در ایجاد کاربر رخ داد.';
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>نام و نام خانوادگی دانش‌آموز</FormLabel>
                <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <FormControl>
                    <Input placeholder="نام کامل دانش‌آموز" {...field} className="pl-10 text-right" />
                    </FormControl>
                </div>
                <FormMessage />
                </FormItem>
            )}
            />
        
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="nationalId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>کد ملی دانش‌آموز</FormLabel>
                    <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <FormControl>
                        <Input placeholder="کد ملی ۱۰ رقمی" {...field} className="pl-10 text-right" />
                        </FormControl>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>رمز عبور</FormLabel>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <FormControl>
                        <Input type="password" placeholder="حداقل ۸ کاراکتر" {...field} className="pl-10 text-right" />
                        </FormControl>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit" className="w-full sm:w-auto bg-primary/80 hover:bg-primary" disabled={loading || !form.formState.isValid}>
            {loading ? 'در حال ایجاد...' : 'ایجاد دانش‌آموز'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
