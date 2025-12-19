'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  CheckCircle,
  Percent,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { collection, doc, getDoc } from 'firebase/firestore';

import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import type { HistoryItem, ExamResult, Exam } from '@/lib/types';


export default function HistoryPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the user's exam results
  const examResultsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users', user.uid, 'examResults') : null),
    [firestore, user]
  );
  const { data: examResults, isLoading: resultsLoading } = useCollection<ExamResult>(examResultsCollection);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const fetchHistoryDetails = async () => {
      if (!examResults || !firestore) {
        setIsLoading(resultsLoading);
        return;
      };

      setIsLoading(true);
      const historyItems: HistoryItem[] = [];

      // Using Promise.all for parallel fetching
      const promises = examResults.map(async (result) => {
        const examDocRef = doc(firestore, 'exams', result.examId);
        const examDocSnap = await getDoc(examDocRef);

        if (examDocSnap.exists()) {
          const examData = examDocSnap.data() as Exam;
          return {
            id: result.id,
            examId: result.examId,
            title: examData.title,
            // Convert Firestore Timestamp to JS Date, then format it
            date: result.submissionTime?.toDate ? result.submissionTime.toDate().toLocaleDateString('fa-IR') : 'تاریخ نامشخص',
            score: result.scorePercentage,
            correctAnswers: result.correctness,
            totalQuestions: examData.questions?.length || result.totalQuestions || 0, // Fallback
          };
        }
        return null;
      });

      const items = await Promise.all(promises);
      const validItems = items.filter((item): item is HistoryItem => item !== null);

      setHistory(validItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIsLoading(false);
    };

    fetchHistoryDetails();
  }, [examResults, firestore, resultsLoading]);


  const isLoadingCombined = isUserLoading || isLoading;

  if (isLoadingCombined) {
    return (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="container mx-auto px-4 py-8 flex-1">
            <div className="flex items-center justify-center">در حال بارگذاری تاریخچه آزمون‌ها...</div>
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
