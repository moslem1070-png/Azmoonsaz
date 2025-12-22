
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  CheckCircle,
  Percent,
  Calendar,
  BookOpen,
  BrainCircuit,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import type { HistoryItem, ExamResult, Exam, User as AppUser } from '@/lib/types';

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


export default function HistoryPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the user's exam results
  const nationalId = typeof window !== 'undefined' ? localStorage.getItem('userNationalId') : null;
  const examResultsCollection = useMemoFirebase(
    () => (firestore && nationalId ? collection(firestore, 'users', nationalId, 'examResults') : null),
    [firestore, nationalId]
  );
  const { data: examResults, isLoading: resultsLoading } = useCollection<ExamResult>(examResultsCollection);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const fetchHistoryDetails = async () => {
      if (!examResults || !firestore || !user) {
        setIsLoading(resultsLoading);
        return;
      };

      setIsLoading(true);

      // 1. Fetch all exams and all student users once.
      const examsSnapshot = await getDocs(collection(firestore, 'exams'));
      const examsMap = new Map(examsSnapshot.docs.map(doc => [doc.id, doc.data() as Exam]));

      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const studentUsers = usersSnapshot.docs
        .map(doc => doc.data() as AppUser)
        .filter(u => u.role === 'student');
      
      // 2. Fetch all results for all students and group by examId.
      const allResultsByExam: Record<string, ExamResult[]> = {};

      for (const student of studentUsers) {
        const studentResultsSnapshot = await getDocs(collection(firestore, `users/${student.nationalId}/examResults`));
        studentResultsSnapshot.forEach(resultDoc => {
          const result = resultDoc.data() as ExamResult;
          if (!allResultsByExam[result.examId]) {
            allResultsByExam[result.examId] = [];
          }
          allResultsByExam[result.examId].push(result);
        });
      }

      // 3. Process the current user's results to add rank and title.
      const enrichedHistory = examResults.map(result => {
        const examData = examsMap.get(result.examId);
        if (!examData) return null; // Exam might have been deleted

        const resultsForThisExam = allResultsByExam[result.examId] || [];
        resultsForThisExam.sort((a, b) => b.scorePercentage - a.scorePercentage);
        
        const rank = resultsForThisExam.findIndex(r => r.studentId === user.uid) + 1;

        return {
          id: result.id,
          examId: result.examId,
          title: examData.title,
          date: result.submissionTime?.toDate ? result.submissionTime.toDate().toLocaleDateString('fa-IR') : 'تاریخ نامشخص',
          score: result.scorePercentage,
          correctAnswers: result.correctness,
          totalQuestions: result.totalQuestions || 0,
          rank: rank > 0 ? rank : undefined,
        };
      });
      
      const validItems = enrichedHistory.filter((item): item is HistoryItem => item !== null);

      setHistory(validItems.sort((a, b) => {
        // Handle potential invalid date strings before creating Date objects
        const dateA = a.date !== 'تاریخ نامشخص' ? new Date(a.date.replace(/(\d{4})\/(\d{2})\/(\d{2})/, '$1-$2-$3')) : new Date(0);
        const dateB = b.date !== 'تاریخ نامشخص' ? new Date(b.date.replace(/(\d{4})\/(\d{2})\/(\d{2})/, '$1-$2-$3')) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      }));

      setIsLoading(false);
    };

    fetchHistoryDetails();
  }, [examResults, firestore, resultsLoading, user]);


  const isLoadingCombined = isUserLoading || isLoading;

  if (isLoadingCombined) {
    return (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="container mx-auto px-4 py-8 flex-1">
            <LoadingAnimation />
          </main>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <section id="exam-history">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-right">تاریخچه آزمون‌ها</h1>
          {history.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-muted-foreground">شما هنوز در هیچ آزمونی شرکت نکرده‌اید.</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                مشاهده آزمون‌های موجود
              </Button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {history.map((item) => (
                <GlassCard key={item.id} className="p-6 flex flex-col transition-transform duration-300 hover:-translate-y-2">
                  <h3 className="text-lg font-bold mb-2 text-right">{item.title}</h3>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                     <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {item.date}
                     </p>
                      <p className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        {item.totalQuestions} سوال
                      </p>
                  </div>
                  <div className="flex-1 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Percent className="w-4 h-4 text-accent" /> امتیاز
                      </span>
                      <span className="font-semibold">{item.score}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-400" /> پاسخ
                        صحیح
                      </span>
                      <span className="font-semibold">{item.correctAnswers} / {item.totalQuestions}</span>
                    </div>
                    {item.rank && (
                        <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                            <TrendingUp className="w-4 h-4 text-accent" /> رتبه
                        </span>
                        <span className="font-semibold">{item.rank}</span>
                        </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-6 border-accent/50 text-accent hover:bg-accent/20 hover:text-accent"
                    onClick={() => router.push(`/exam/${item.examId}/results`)}
                  >
                    مشاهده جزئیات
                  </Button>
                </GlassCard>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

