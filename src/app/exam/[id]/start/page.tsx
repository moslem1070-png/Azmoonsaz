'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, FileQuestion, Users, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

import { exams } from '@/lib/mock-data';
import GlassCard from '@/components/glass-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCompletedExams } from '@/lib/results-storage';
import { useUser } from '@/firebase';

export default function ExamStartPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const exam = exams.find((e) => e.id === params.id);
  
  const [isCompleted, setIsCompleted] = useState(false);
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (exam && user) {
      const completed = getCompletedExams(user.uid);
      if (completed[exam.id]) {
        setIsCompleted(true);
      }
    }
  }, [exam, user]);

  const getPlaceholderImage = (id: string) => {
    return PlaceHolderImages.find((img) => img.id === id)?.imageUrl ?? 'https://picsum.photos/seed/1/600/400';
  };

  const handleStart = () => {
    if (isCompleted) {
       toast({
        variant: "destructive",
        title: "آزمون تکراری",
        description: "شما قبلاً در این آزمون شرکت کرده‌اید. برای مشاهده نتایج به صفحه تاریخچه مراجعه کنید.",
      });
    } else {
       router.push(`/exam/${params.id}`);
    }
  };

  if (isUserLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">آزمون یافت نشد.</h1>
      </div>
    );
  }
  
  const participants = Math.floor(Math.random() * 200) + 50; // Mock participants

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#302851] to-[#1A162E]">
      <GlassCard className="w-full max-w-2xl overflow-hidden">
        <div className="relative h-60 w-full">
          <Image
            src={getPlaceholderImage(exam.coverImageId)}
            alt={exam.title}
            fill
            className="object-cover"
            data-ai-hint="quiz education"
          />
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="absolute bottom-6 right-6">
            <h1 className="text-3xl font-bold text-white">{exam.title}</h1>
          </div>
           <Badge
              variant={exam.difficulty === 'آسان' ? 'secondary' : exam.difficulty === 'متوسط' ? 'default' : 'destructive'}
              className="absolute top-4 left-4 text-sm px-3 py-1"
            >
              {exam.difficulty}
            </Badge>
        </div>

        <div className="p-8">
            <p className="text-muted-foreground text-right mb-6 leading-relaxed">
                {exam.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 text-center">
                <GlassCard className="p-4">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-accent" />
                    <p className="font-bold text-lg">{exam.timeLimitMinutes} دقیقه</p>
                    <p className="text-sm text-muted-foreground">زمان آزمون</p>
                </GlassCard>
                 <GlassCard className="p-4">
                    <FileQuestion className="w-8 h-8 mx-auto mb-2 text-accent" />
                    <p className="font-bold text-lg">{exam.questions.length} سوال</p>
                    <p className="text-sm text-muted-foreground">تعداد سوالات</p>
                </GlassCard>
                 <GlassCard className="p-4">
                    <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
                    <p className="font-bold text-lg">{participants}</p>
                    <p className="text-sm text-muted-foreground">شرکت کننده</p>
                </GlassCard>
            </div>

            <div className="flex items-center justify-center gap-4">
                 <Button variant="outline" size="lg" className="w-1/2" onClick={() => router.push('/dashboard')}>
                    <X className="w-5 h-5 ml-2" />
                    انصراف
                 </Button>
                 <Button size="lg" className="w-1/2 bg-primary/80 hover:bg-primary" onClick={handleStart}>
                     {isCompleted ? "مشاهده نتایج" : "شروع آزمون"}
                    {isCompleted ? null : <Check className="w-5 h-5 mr-2" />}
                 </Button>
            </div>
        </div>

      </GlassCard>
    </div>
  );
}
