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
  Loader2,
  Sparkles,
  BrainCircuit,
  Plus,
  Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { addDoc, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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
import { generateExamQuestions } from '@/ai/flows/generate-exam-questions';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const questionSchema = z.object({
  text: z.string().min(1, 'متن سوال الزامی است.'),
  options: z
    .array(z.object({ value: z.string().min(1, 'گزینه نمی‌تواند خالی باشد.') }))
    .min(2, 'حداقل دو گزینه الزامی است.'),
  correctAnswer: z.string().min(1, 'انتخاب پاسخ صحیح الزامی است.'),
  imageURL: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(3, 'عنوان آزمون باید حداقل ۳ حرف باشد.'),
  description: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard'], {
    required_error: 'انتخاب سطح دشواری الزامی است.',
  }),
  timer: z.coerce.number().min(1, 'زمان آزمون باید حداقل ۱ دقیقه باشد.'),
  questions: z.array(questionSchema).min(1, 'حداقل یک سوال باید اضافه شود.'),
});

type FormData = z.infer<typeof formSchema>;
type Role = 'student' | 'teacher';

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

export default function CreateExamPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numAiQuestions, setNumAiQuestions] = useState(5);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
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
    const { title, difficulty } = form.getValues();
    if (!title) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'برای تولید سوال، ابتدا باید عنوان آزمون را مشخص کنید.',
      });
      return;
    }

    setIsGenerating(true);
    toast({
      title: 'در حال تولید سوالات...',
      description: 'لطفا چند لحظه منتظر بمانید. این فرآیند ممکن است کمی طول بکشد.',
    });

    try {
      const result = await generateExamQuestions({
        topic: title,
        difficulty,
        numberOfQuestions: numAiQuestions,
      });

      if (result && result.questions) {
        const newQuestions = result.questions.map(q => ({
          text: q.question,
          options: q.options.map(opt => ({ value: opt })),
          correctAnswer: q.correctAnswer,
          imageURL: '',
        }));
        replace(newQuestions);
        toast({
          title: 'سوالات با موفقیت تولید شد',
          description: `${numAiQuestions} سوال جدید به فرم اضافه شد. می‌توانید آن‌ها را ویرایش کنید.`,
        });
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        variant: 'destructive',
        title: 'خطا در تولید سوال',
        description: 'مشکلی در ارتباط با هوش مصنوعی پیش آمد. لطفا دوباره تلاش کنید.',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const getRandomCoverImage = () => {
    const examCovers = PlaceHolderImages.filter(img => img.id.startsWith('exam-cover'));
    if (examCovers.length === 0) {
        // Fallback if no specific cover images are found
        return PlaceHolderImages[0]?.imageUrl || 'https://picsum.photos/seed/1/600/400';
    }
    const randomIndex = Math.floor(Math.random() * examCovers.length);
    return examCovers[randomIndex].imageUrl;
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
      const finalCoverImageUrl = getRandomCoverImage();

      const examDocRef = await addDoc(collection(firestore, 'exams'), {
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        timer: data.timer,
        coverImageURL: finalCoverImageUrl,
        teacherId: user.uid,
        createdAt: serverTimestamp(),
      });
      
      const examId = examDocRef.id;
      await setDoc(examDocRef, { id: examId }, { merge: true });

      const questionPromises = data.questions.map(async (q) => {
        const questionDocRef = doc(collection(firestore, `exams/${examId}/questions`));
        
        await setDoc(questionDocRef, {
            id: questionDocRef.id,
            examId: examId,
            text: q.text,
            options: q.options.map(opt => opt.value),
            correctAnswer: q.correctAnswer,
            imageURL: '',
        });
      });

      await Promise.all(questionPromises);

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
    return <LoadingAnimation />;
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
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex flex-col items-end gap-2">
                     <FormLabel>تعداد سوالات برای تولید</FormLabel>
                     <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setNumAiQuestions(prev => Math.max(1, prev - 1))}><Minus className="h-4 w-4" /></Button>
                      <Input
                        type="number"
                        readOnly
                        value={numAiQuestions}
                        className="w-16 text-center text-lg font-bold"
                        aria-label="تعداد سوالات برای تولید"
                      />
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setNumAiQuestions(prev => Math.min(20, prev + 1))}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={handleGenerateQuestions} disabled={isGenerating} className="self-end">
                    {isGenerating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4" />}
                    تولید سوال با هوش مصنوعی
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-white/10 rounded-lg relative">
                    <h3 className="font-semibold mb-4 text-right">سوال {index + 1}</h3>
                    <Button type="button" variant="destructive" size="icon" className="absolute top-4 left-4 h-8 w-8" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="space-y-4">
                      <FormField control={form.control} name={`questions.${index}.text`} render={({ field: qField }) => (
                        <FormItem>
                          <FormLabel>متن سوال</FormLabel>
                          <FormControl><Textarea placeholder="متن سوال را اینجا وارد کنید" {...qField} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {form.getValues(`questions.${index}.options`).map((opt, optIndex) => (
                           <FormField key={`${field.id}-opt-${optIndex}`} control={form.control} name={`questions.${index}.options.${optIndex}.value`} render={({ field: optField }) => (
                            <FormItem>
                                <FormLabel>گزینه {optIndex + 1}</FormLabel>
                                <FormControl><Input placeholder={`متن گزینه ${optIndex + 1}`} {...optField} /></FormControl>
                                <FormMessage />
                            </FormItem>
                           )}/>
                        ))}
                      </div>
                      
                      <Button type="button" size="sm" variant="ghost" onClick={() => {
                          const currentOptions = form.getValues(`questions.${index}.options`);
                          form.setValue(`questions.${index}.options`, [...currentOptions, { value: '' }]);
                      }}>
                          افزودن گزینه
                      </Button>

                      <FormField control={form.control} name={`questions.${index}.correctAnswer`} render={({ field: correctAnsField }) => (
                        <FormItem>
                          <FormLabel>پاسخ صحیح</FormLabel>
                          <Select onValueChange={correctAnsField.onChange} value={correctAnsField.value} dir="rtl">
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
