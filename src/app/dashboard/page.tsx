'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Clock, FileQuestion, CheckCircle, Trophy, BrainCircuit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';


import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Exam, ExamResult } from '@/lib/types';

type Role = 'student' | 'teacher' | 'manager';

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


export default function DashboardPage() {
  const router = useRouter();
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
  const { user, isUserLoading } = useUser();
  const [userRole, setUserRole] = useState<Role | null>(null);

  const firestore = useFirestore();

  const examsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'exams') : null),
    [firestore]
  );
  const { data: exams, isLoading: examsLoading } = useCollection<Exam>(examsCollection);

  const nationalId = typeof window !== 'undefined' ? localStorage.getItem('userNationalId') : null;
  const examResultsCollection = useMemoFirebase(
    () => (firestore && nationalId ? collection(firestore, 'users', nationalId, 'examResults') : null),
    [firestore, nationalId]
  );
  const { data: examResults, isLoading: resultsLoading } = useCollection<ExamResult>(examResultsCollection);

  useEffect(() => {
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);

    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserLoading && user && (role === 'teacher' || role === 'manager')) {
      router.push('/dashboard/teacher');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (examResults) {
      setCompletedExamIds(new Set(examResults.map((result) => result.examId)));
    }
  }, [examResults]);

  const handleStartExam = (examId: string, isCompleted: boolean) => {
    if (isCompleted) {
      router.push(`/exam/${examId}/results`);
    } else {
      router.push(`/exam/${examId}/start`);
    }
  };

  const isLoading = isUserLoading || examsLoading || resultsLoading;

  if (isLoading || !user || userRole === 'teacher' || userRole === 'manager') {
    return <LoadingAnimation />;
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
                const difficultyMap = {
                    'Easy': 'آسان',
                    'Medium': 'متوسط',
                    'Hard': 'سخت',
                };

                return (
                  <GlassCard key={exam.id} className="flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-2">
                    <div className="relative h-48 w-full">
                      <Image
                        src={exam.coverImageURL || 'https://picsum.photos/seed/1/600/400'}
                        alt={exam.title}
                        fill
                        className="object-cover"
                        data-ai-hint="quiz education"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <Badge
                        variant={exam.difficulty === 'Easy' ? 'secondary' : exam.difficulty === 'Medium' ? 'default' : 'destructive'}
                        className="absolute top-3 left-3"
                      >
                        {difficultyMap[exam.difficulty] || exam.difficulty}
                      </Badge>
                       <h2 className="absolute bottom-4 right-4 text-xl font-bold text-white">{exam.title}</h2>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-center text-muted-foreground text-sm mb-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-accent" />
                          <span>{exam.timer} دقیقه</span>
                        </div>
                        {/* Question count will be fetched on the start page */}
                      </div>
                      <Button
                        onClick={() => handleStartExam(exam.id, isCompleted)}
                        className={cn(
                          'w-full transition-colors mt-auto',
                          isCompleted ? 'bg-green-600 hover:bg-green-700' : 'bg-primary/80 hover:bg-primary'
                        )}
                      >
                        {isCompleted ? <Trophy className="ml-2 h-4 w-4" /> : <CheckCircle className="ml-2 h-4 w-4" />}
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
