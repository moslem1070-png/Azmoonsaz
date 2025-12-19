'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Fingerprint, Key, Briefcase } from 'lucide-react';

const formSchema = z.object({
  fullName: z.string().min(3, { message: 'نام کامل باید حداقل ۳ حرف باشد.' }),
  username: z.string().min(1, { message: 'نام کاربری یا کد ملی الزامی است.' }),
  password: z.string().min(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' }),
  role: z.enum(['student', 'teacher', 'manager'], { required_error: 'انتخاب نقش الزامی است.' }),
}).refine(data => {
    if (data.role === 'student') {
        return /^\d{10}$/.test(data.username);
    }
    return true;
}, {
    message: 'برای دانش‌آموز، کد ملی باید ۱۰ رقم و فقط شامل عدد باشد.',
    path: ['username'],
});

type FormData = z.infer<typeof formSchema>;
type Role = 'student' | 'teacher' | 'manager';

const createEmailFromUsername = (username: string, role: Role) => {
    return `${role}-${username}@quizmaster.com`;
}

export default function CreateUserForm() {
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      username: '',
      password: '',
      role: 'student',
    },
  });
  
  const selectedRole = form.watch('role');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    const email = createEmailFromUsername(data.username, data.role as Role);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
      await updateProfile(userCredential.user, { displayName: data.fullName });

      toast({
        title: 'کاربر با موفقیت ایجاد شد',
        description: `کاربر "${data.fullName}" با نقش "${data.role}" ایجاد شد.`,
      });
      form.reset();

    } catch (error: any) {
      console.error("Create user error:", error);
      const errorMessage =
        error.code === 'auth/email-already-in-use' ? 'این نام کاربری/کد ملی قبلاً استفاده شده است.' :
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>نام و نام خانوادگی</FormLabel>
                <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <FormControl>
                    <Input placeholder="نام کامل کاربر" {...field} className="pl-10 text-right" />
                    </FormControl>
                </div>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                <FormLabel>نقش کاربر</FormLabel>
                 <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                        <FormControl>
                        <SelectTrigger className="pl-10 text-right">
                            <SelectValue placeholder="نقش کاربر را انتخاب کنید" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="student">دانش‌آموز</SelectItem>
                        <SelectItem value="teacher">معلم</SelectItem>
                        <SelectItem value="manager">مدیر</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{selectedRole === 'student' ? 'کد ملی' : 'نام کاربری'}</FormLabel>
                    <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <FormControl>
                        <Input placeholder={selectedRole === 'student' ? 'کد ملی ۱۰ رقمی' : 'نام کاربری انگلیسی'} {...field} className="pl-10 text-right" />
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
          <Button type="submit" className="w-full sm:w-auto bg-primary/80 hover:bg-primary" disabled={loading}>
            {loading ? 'در حال ایجاد...' : 'ایجاد کاربر'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
