'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowRight,
  FilePlus,
  Trash2,
  PlusCircle,
  BrainCircuit,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { generateExamQuestions } from '@/ai/flows/generate-exam-questions';

const questionSchema = z.object({
  text: z.string().min(1, 'متن سوال الزامی است.'),
  options: z
    .array(z.object({ value: z.string().min(1, 'گزینه نمی‌تواند خالی باشد.') }))
    .min(2, 'حداقل دو گزینه الزامی است.'),
  correctAnswer: z.string().min(1, 'انتخاب پاسخ صحیح الزامی است.'),
});

const formSchema = z.object({
  title: z.string().min(3, 'عنوان آزمون باید حداقل ۳ حرف باشد.'),
  description: z.string().optional(),
  coverImageId: z.string().min(1, 'انتخاب تصویر کاور الزامی است.'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard'], {
    required_error: 'انتخاب سطح دشواری الزامی است.',
  }),
  timer: z.coerce.number().min(1, 'زمان آزمون باید حداقل ۱ دقیقه باشد.'),
  questions: z.array(questionSchema).min(1, 'حداقل یک سوال باید اضافه شود.'),
});

type FormData = z.infer<typeof formSchema>;
type Role = 'student' | 'teacher' | 'manager';

export default function CreateExamPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      coverImageId: '',
      difficulty: 'Medium',
      timer: 10,
      questions: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  useEffect(() => {
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);
    if (!isUserLoading && (!user || role === 'student')) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleGenerateQuestions = async () => {
    const topic = form.getValues('title');
    const difficulty = form.getValues('difficulty');
    if (!topic) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'برای تولید سوال، ابتدا باید عنوان آزمون را وارد کنید.',
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateExamQuestions({
        topic,
        difficulty,
        numberOfQuestions: 5,
      });
      const newQuestions = result.questions.map((q) => ({
        text: q.question,
        options: q.options.map(opt => ({ value: opt })),
        correctAnswer: q.correctAnswer,
      }));
      replace(newQuestions); // Replace existing questions
      toast({
        title: 'موفق',
        description: `${result.questions.length} سوال با موفقیت تولید و جایگزین شد.`,
      });
    } catch (error) {
      console.error('AI question generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'خطا در تولید سوال',
        description: 'مشکلی در ارتباط با هوش مصنوعی رخ داد.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'کاربر احراز هویت نشده یا پایگاه داده در دسترس نیست.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const examData = {
        ...data,
        teacherId: user.uid,
        createdAt: serverTimestamp(),
        questions: data.questions.map(q => ({
          ...q,
          id: Math.random().toString(36).substring(2, 11), // Generate random ID
          options: q.options.map(opt => opt.value),
        })),
      };

      const docRef = await addDoc(collection(firestore, 'exams'), examData);

      toast({
        title: 'آزمون با موفقیت ایجاد شد',
        description: `آزمون "${data.title}" به لیست آزمون‌ها اضافه شد.`,
      });
      router.push('/dashboard/teacher/manage-exams');
    } catch (error) {
      console.error('Error creating exam:', error);
      toast({
        variant: 'destructive',
        title: 'خطا در ایجاد آزمون',
        description: 'مشکلی در ذخیره آزمون در پایگاه داده رخ داد.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || !user || userRole === 'student') {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-right">ایجاد آزمون جدید</h1>
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            <GlassCard className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-right mb-6 border-b border-white/10 pb-4">اطلاعات کلی آزمون</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان آزمون</FormLabel>
                    <FormControl><Input placeholder="مثال: آزمون تاریخ ایران باستان" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="timer" render={({ field }) => (
                  <FormItem>
                    <FormLabel>زمان آزمون (دقیقه)</FormLabel>
                    <FormControl><Input type="number" placeholder="مثال: ۲۰" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>سطح دشواری</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                      <FormControl><SelectTrigger><SelectValue placeholder="سطح دشواری را انتخاب کنید" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Easy">آسان</SelectItem>
                        <SelectItem value="Medium">متوسط</SelectItem>
                        <SelectItem value="Hard">سخت</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="coverImageId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تصویر کاور</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                      <FormControl><SelectTrigger><SelectValue placeholder="یک تصویر برای کاور آزمون انتخاب کنید" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PlaceHolderImages.filter(img => img.id.includes('exam-cover-')).map(img => (
                          <SelectItem key={img.id} value={img.id}>{img.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="md:col-span-2">
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>توضیحات (اختیاری)</FormLabel>
                      <FormControl><Textarea placeholder="توضیحات مختصری درباره آزمون بنویسید..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-right">سوالات آزمون</h2>
                <Button type="button" variant="outline" onClick={handleGenerateQuestions} disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="ml-2 h-4 w-4" />
                  )}
                  تولید سوال با هوش مصنوعی
                </Button>
              </div>

              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-white/10 rounded-lg relative">
                    <h3 className="font-semibold mb-4 text-right">سوال {index + 1}</h3>
                    <Button type="button" variant="destructive" size="icon" className="absolute top-4 left-4 h-8 w-8" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="space-y-4">
                      <FormField control={form.control} name={`questions.${index}.text`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>متن سوال</FormLabel>
                          <FormControl><Textarea placeholder="متن سوال را اینجا وارد کنید" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {form.getValues(`questions.${index}.options`).map((opt, optIndex) => (
                           <FormField key={optIndex} control={form.control} name={`questions.${index}.options.${optIndex}.value`} render={({ field }) => (
                            <FormItem>
                                <FormLabel>گزینه {optIndex + 1}</FormLabel>
                                <FormControl><Input placeholder={`متن گزینه ${optIndex + 1}`} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                           )}/>
                        ))}
                      </div>
                      
                      <Button type="button" size="sm" variant="ghost" onClick={() => form.setValue(`questions.${index}.options`, [...form.getValues(`questions.${index}.options`), {value: ''}])}>
                          افزودن گزینه
                      </Button>

                      <FormField control={form.control} name={`questions.${index}.correctAnswer`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>پاسخ صحیح</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                            <FormControl><SelectTrigger><SelectValue placeholder="پاسخ صحیح را انتخاب کنید" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {form.watch(`questions.${index}.options`).map((opt, optIndex) => (
                                opt.value && <SelectItem key={optIndex} value={opt.value}>{opt.value}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" className="mt-6" onClick={() => append({ text: '', options: [{ value: '' }, { value: '' }], correctAnswer: '' })}>
                <PlusCircle className="ml-2 h-4 w-4" />
                افزودن سوال جدید
              </Button>
            </GlassCard>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <FilePlus className="ml-2 h-4 w-4" />}
                {isSubmitting ? 'در حال ذخیره...' : 'ایجاد آزمون'}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
