
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFieldArray, useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowRight,
  Save,
  Trash2,
  PlusCircle,
  Loader2,
  Sparkles,
  BrainCircuit,
  Plus,
  Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch, serverTimestamp, query, where, deleteDoc } from 'firebase/firestore';

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
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { generateExamQuestions } from '@/ai/flows/generate-exam-questions';
import type { Exam, Question } from '@/lib/types';
import { examCategories } from '@/lib/exam-icons';
import ExamCoverVector from '@/components/exam-cover-vector';


const questionSchema = z.object({
  id: z.string().optional(), // Keep track of existing questions
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
  category: z.string({ required_error: 'انتخاب دسته بندی الزامی است.' }),
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

export default function EditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [originalQuestions, setOriginalQuestions] = useState<Question[]>([]);
  const [numAiQuestions, setNumAiQuestions] = useState(5);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      difficulty: 'Medium',
      category: 'General',
      timer: 10,
      questions: [],
    },
  });
  
  const watchedCategory = form.watch('category');

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

  useEffect(() => {
    if (!examId || !firestore) return;

    const fetchExamData = async () => {
      setIsLoadingData(true);
      try {
        const examDocRef = doc(firestore, 'exams', examId);
        const examSnap = await getDoc(examDocRef);

        if (!examSnap.exists()) {
          toast({ variant: 'destructive', title: 'خطا', description: 'آزمون مورد نظر یافت نشد.' });
          router.push('/dashboard/teacher/manage-exams');
          return;
        }

        const examData = examSnap.data() as Exam;
        
        const questionsQuery = query(collection(firestore, 'exams', examId, 'questions'));
        const questionsSnap = await getDocs(questionsQuery);
        const questionsData = questionsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Question[];
        setOriginalQuestions(questionsData);

        form.reset({
          title: examData.title,
          description: examData.description,
          difficulty: examData.difficulty,
          timer: examData.timer,
          category: examData.category,
          questions: questionsData.map(q => ({
            id: q.id,
            text: q.text,
            options: q.options.map(o => ({ value: o })),
            correctAnswer: q.correctAnswer,
          })),
        });
      } catch (error) {
        console.error("Error fetching exam data:", error);
        toast({ variant: 'destructive', title: 'خطا', description: 'دریافت اطلاعات آزمون با مشکل مواجه شد.' });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchExamData();
  }, [examId, firestore, form, router, toast]);
  

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
        }));
        replace(newQuestions);
        toast({
          title: 'سوالات با موفقیت تولید شد',
          description: `سوالات فرم با ${numAiQuestions} سوال جدید جایگزین شد.`,
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

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!user || !firestore || !examId) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'اطلاعات لازم برای به‌روزرسانی آزمون در دسترس نیست.',
      });
      return;
    }
    setIsSubmitting(true);
    
    try {
      const batch = writeBatch(firestore);
      
      const examDocRef = doc(firestore, 'exams', examId);
      batch.update(examDocRef, {
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        timer: data.timer,
        category: data.category,
        updatedAt: serverTimestamp(),
      });

      const submittedQuestionIds = new Set(data.questions.map(q => q.id).filter(id => !!id));
      const originalQuestionIds = new Set(originalQuestions.map(q => q.id));

      // Delete questions that are no longer in the form
      for (const originalId of originalQuestionIds) {
        if (!submittedQuestionIds.has(originalId)) {
          const questionToDeleteRef = doc(firestore, `exams/${examId}/questions`, originalId);
          batch.delete(questionToDeleteRef);
        }
      }

      // Update existing questions and add new ones
      for (const q of data.questions) {
        const questionData = {
            examId: examId,
            text: q.text,
            options: q.options.map(opt => opt.value),
            correctAnswer: q.correctAnswer,
        };

        if (q.id) { // Existing question
          const questionRef = doc(firestore, `exams/${examId}/questions`, q.id);
          batch.update(questionRef, questionData);
        } else { // New question
          const newQuestionRef = doc(collection(firestore, `exams/${examId}/questions`));
          batch.set(newQuestionRef, { ...questionData, id: newQuestionRef.id });
        }
      }
      
      await batch.commit();

      toast({
        title: 'آزمون با موفقیت به‌روزرسانی شد',
        description: `تغییرات در آزمون "${data.title}" ذخیره شد.`,
      });
      router.push('/dashboard/teacher/manage-exams');
    } catch (error) {
      console.error('Error updating exam:', error);
      toast({
        variant: 'destructive',
        title: 'خطا در به‌روزرسانی آزمون',
        description: 'مشکلی در ذخیره تغییرات آزمون رخ داد.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoadingData || isUserLoading || !user || userRole === 'student') {
    return <LoadingAnimation />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-right">ویرایش آزمون</h1>
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
                    <Select onValueChange={field.onChange} value={field.value} dir="rtl">
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
                
                 <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>دسته بندی</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} dir="rtl">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="یک دسته بندی برای آزمون انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(examCategories).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {watchedCategory && (
                        <div className="mt-4 p-4 flex items-center justify-center bg-white/5 rounded-lg h-32">
                           <ExamCoverVector category={watchedCategory} className="w-20 h-20 text-accent" />
                        </div>
                    )}
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
                      <div
                        className="flex h-10 w-16 items-center justify-center rounded-md border border-input bg-background text-lg font-bold"
                        aria-label="تعداد سوالات برای تولید"
                      >
                        {numAiQuestions}
                      </div>
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setNumAiQuestions(prev => Math.min(20, prev + 1))}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={handleGenerateQuestions} disabled={isGenerating} className="self-end">
                    {isGenerating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4" />}
                    جایگزینی سوالات با هوش مصنوعی
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
                {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
