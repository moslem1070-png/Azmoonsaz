'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Clock, FileQuestion, Lock, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Exam, ExamResult } from '@/lib/types';

type Role = 'student' | 'teacher';

export default function DashboardPage() {
  const router = useRouter();
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
  const { user, isUserLoading } = useUser();
  const [userRole, setUserRole] = useState<Role | null>(null);

  const firestore = useFirestore();

  // 1. Fetch all available exams only when user is logged in
  const examsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'exams') : null),
    [firestore, user]
  );
  const { data: exams, isLoading: examsLoading } = useCollection<Exam>(examsCollection);

  // 2. Fetch the user's results to know which exams are completed
  const examResultsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users', user.uid, 'examResults') : null),
    [firestore, user]
  );
  const { data: examResults, isLoading: resultsLoading } = useCollection<ExamResult>(examResultsCollection);

  useEffect(() => {
    // This will only run on the client side
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);

    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserLoading && user && role === 'teacher') {
      router.push('/dashboard/teacher');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (examResults) {
      setCompletedExamIds(new Set(examResults.map((result) => result.examId)));
    }
  }, [examResults]);

  const getPlaceholderImage = (id: string) => {
    return PlaceHolderImages.find((img) => img.id === id)?.imageUrl ?? 'https://picsum.photos/seed/1/600/400';
  };

  const handleStartExam = (examId: string, isCompleted: boolean) => {
    if (isCompleted) {
      router.push(`/exam/${examId}/results`);
    } else {
      router.push(`/exam/${examId}/start`);
    }
  };

  if (isUserLoading || !user || userRole === 'teacher' || examsLoading || resultsLoading) {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <section id="available-exams">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-right">آزمون‌های موجود</h1>
          {exams && exams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {exams.map((exam) => {
                const isCompleted = completedExamIds.has(exam.id);
                return (
                  <GlassCard key={exam.id} className="flex flex-col overflow-hidden">
                    <div className="relative h-48 w-full">
                      <Image
                        src={getPlaceholderImage(exam.coverImageId)}
                        alt={exam.title}
                        fill
                        className="object-cover"
                        data-ai-hint="quiz education"
                      />
                      <div className="absolute inset-0 bg-black/30"></div>
                      <Badge
                        variant={exam.difficulty === 'آسان' ? 'secondary' : exam.difficulty === 'متوسط' ? 'default' : 'destructive'}
                        className="absolute top-3 left-3"
                      >
                        {exam.difficulty}
                      </Badge>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h2 className="text-xl font-bold mb-4 flex-1">{exam.title}</h2>
                      <div className="flex justify-between items-center text-muted-foreground text-sm mb-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-accent" />
                          <span>{exam.timeLimitMinutes} دقیقه</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileQuestion className="w-4 h-4 text-accent" />
                          <span>{exam.questions.length} سوال</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleStartExam(exam.id, isCompleted)}
                        className={cn(
                          'w-full transition-colors',
                          isCompleted ? 'bg-green-600 hover:bg-green-700' : 'bg-primary/80 hover:bg-primary'
                        )}
                      >
                        {isCompleted ? <Lock className="ml-2 h-4 w-4" /> : null}
                        {isCompleted ? 'مشاهده نتایج' : 'شروع آزمون'}
                      </Button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            <GlassCard className="p-8 text-center">
              <p className="text-muted-foreground">در حال حاضر هیچ آزمونی برای نمایش وجود ندارد.</p>
            </GlassCard>
          )}
        </section>
      </main>
    </div>
  );
}
