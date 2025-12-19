'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  Upload,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

// Note: File validation is tricky with Zod. We'll handle it in the component.
const questionSchema = z.object({
  text: z.string().min(1, 'متن سوال الزامی است.'),
  options: z
    .array(z.object({ value: z.string().min(1, 'گزینه نمی‌تواند خالی باشد.') }))
    .min(2, 'حداقل دو گزینه الزامی است.'),
  correctAnswer: z.string().min(1, 'انتخاب پاسخ صحیح الزامی است.'),
  imageURL: z.string().optional(), // Will hold the data URI for preview
});

const formSchema = z.object({
  title: z.string().min(3, 'عنوان آزمون باید حداقل ۳ حرف باشد.'),
  description: z.string().optional(),
  coverImageURL: z.string().optional(), // Will hold data URI for preview
  difficulty: z.enum(['Easy', 'Medium', 'Hard'], {
    required_error: 'انتخاب سطح دشواری الزامی است.',
  }),
  timer: z.coerce.number().min(1, 'زمان آزمون باید حداقل ۱ دقیقه باشد.'),
  questions: z.array(questionSchema).min(1, 'حداقل یک سوال باید اضافه شود.'),
});

type FormData = z.infer<typeof formSchema>;
type Role = 'student' | 'teacher';

export default function CreateExamPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // State to hold file objects before upload
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [questionImageFiles, setQuestionImageFiles] = useState<Record<number, File | null>>({});

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      coverImageURL: '',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, questionIndex?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        if (questionIndex !== undefined) {
          form.setValue(`questions.${questionIndex}.imageURL`, dataUri);
          setQuestionImageFiles(prev => ({...prev, [questionIndex]: file}));
        } else {
          form.setValue('coverImageURL', dataUri);
          setCoverImageFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
        numberOfQuestions: 10,
      });

      if (result && result.questions) {
        const newQuestions = result.questions.map(q => ({
          text: q.question,
          options: q.options.map(opt => ({ value: opt })),
          correctAnswer: q.correctAnswer,
          imageURL: '',
        }));
        replace(newQuestions); // Replace existing questions with new ones
        toast({
          title: 'سوالات با موفقیت تولید شد',
          description: '۱۰ سوال جدید به فرم اضافه شد. می‌توانید آن‌ها را ویرایش کنید.',
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
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'کاربر احراز هویت نشده یا پایگاه داده در دسترس نیست.',
      });
      return;
    }
    setIsSubmitting(true);
    
    // In a real scenario, you would upload files to Firebase Storage here
    // and get back the download URLs. For now, we'll just use the data URIs as placeholders.
    
    try {
      // This is a placeholder. In a real app, you'd upload `coverImageFile` to Storage
      // and get a `downloadURL` to save in the `examData`.
      const finalCoverImageUrl = form.getValues('coverImageURL');

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
      // Update the document with its own ID
      await setDoc(examDocRef, { id: examId }, { merge: true });

      // Upload question images and create question documents
      const questionPromises = data.questions.map(async (q, index) => {
        // Placeholder: In real app, upload questionImageFiles[index] to get a URL
        const finalQuestionImageUrl = q.imageURL;
        
        const questionDocRef = doc(collection(firestore, `exams/${examId}/questions`));
        
        await setDoc(questionDocRef, {
            id: questionDocRef.id,
            examId: examId,
            text: q.text,
            options: q.options.map(opt => opt.value),
            correctAnswer: q.correctAnswer,
            imageURL: finalQuestionImageUrl || '', // Ensure it's not undefined
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
                
                <FormItem>
                    <FormLabel>تصویر کاور</FormLabel>
                    <div className="flex items-center gap-4">
                        <FormControl>
                            <label className={cn("flex-1 cursor-pointer", !form.watch('coverImageURL') && "w-full")}>
                                <div className={cn(
                                    "flex items-center justify-center gap-2 rounded-md border border-dashed border-input p-2 text-sm text-muted-foreground hover:bg-accent",
                                    form.watch('coverImageURL') ? "flex-1" : "w-full"
                                )}>
                                    <Upload className="w-4 h-4" />
                                    <span>{form.watch('coverImageURL') ? 'تغییر تصویر' : 'انتخاب تصویر'}</span>
                                </div>
                                <Input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e)}/>
                            </label>
                        </FormControl>
                        {form.watch('coverImageURL') && (
                            <div className="relative w-24 h-16 rounded-md overflow-hidden">
                                <Image src={form.watch('coverImageURL')!} alt="پیش‌نمایش کاور" fill className="object-cover" />
                            </div>
                        )}
                    </div>
                </FormItem>
                
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
                  {isGenerating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4" />}
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
                      <FormField control={form.control} name={`questions.${index}.text`} render={({ field: qField }) => (
                        <FormItem>
                          <FormLabel>متن سوال</FormLabel>
                          <FormControl><Textarea placeholder="متن سوال را اینجا وارد کنید" {...qField} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <FormItem>
                          <FormLabel>تصویر سوال (اختیاری)</FormLabel>
                          <div className="flex items-center gap-4">
                              <FormControl>
                                  <label className={cn("flex-1 cursor-pointer", !form.watch(`questions.${index}.imageURL`) && "w-full")}>
                                      <div className={cn("flex text-xs items-center justify-center gap-2 rounded-md border border-dashed border-input p-2 text-muted-foreground hover:bg-accent")}>
                                          <Upload className="w-4 h-4" />
                                          <span>{form.watch(`questions.${index}.imageURL`) ? 'تغییر تصویر' : 'انتخاب تصویر برای سوال'}</span>
                                      </div>
                                      <Input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, index)}/>
                                  </label>
                              </FormControl>
                              {form.watch(`questions.${index}.imageURL`) && (
                                  <div className="relative w-24 h-16 rounded-md overflow-hidden">
                                      <Image src={form.watch(`questions.${index}.imageURL`)!} alt={`پیش‌نمایش سوال ${index + 1}`} fill className="object-cover" />
                                  </div>
                              )}
                          </div>
                      </FormItem>

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
