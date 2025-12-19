'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  CheckCircle,
  Percent,
} from 'lucide-react';

import { exams, history as mockHistory } from '@/lib/mock-data';
import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { getCompletedExams } from '@/lib/results-storage';
import { HistoryItem } from '@/lib/types';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>(mockHistory);
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // This will only run on the client
    const completed = getCompletedExams();

    const newHistory: HistoryItem[] = Object.keys(completed)
      .map((examId) => {
        const exam = exams.find((e) => e.id === examId);
        if (!exam) return null;

        const userAnswers = completed[examId];
        let correctAnswers = 0;
        const totalQuestions = exam.questions.length;
        exam.questions.forEach((q) => {
          if (userAnswers[q.id] === q.correctAnswerIndex) {
            correctAnswers++;
          }
        });
        const score =
          totalQuestions > 0
            ? Math.round((correctAnswers / totalQuestions) * 100)
            : 0;

        return {
          id: `hist-${examId}`,
          examId: examId,
          title: exam.title,
          date: new Date().toLocaleDateString('fa-IR'),
          score: score,
          correctAnswers: correctAnswers,
          totalQuestions: totalQuestions,
          rank: Math.floor(Math.random() * 10) + 1, // Mock rank
        };
      })
      .filter((item): item is HistoryItem => item !== null);

    setHistory((prev) =>
      [...newHistory, ...prev.filter((h) => !completed[h.examId])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    );
  }, []);

  if (isUserLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <section id="exam-history">
          <h1 className="text-3xl font-bold mb-6 text-right">تاریخچه آزمون‌ها</h1>
          {history.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-muted-foreground">شما هنوز در هیچ آزمونی شرکت نکرده‌اید.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {history.map((item) => (
                <GlassCard key={item.id} className="p-6 flex flex-col">
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    تاریخ: {item.date}
                  </p>
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
                      <span className="font-semibold">{item.correctAnswers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="w-4 h-4 text-accent" /> رتبه
                      </span>
                      <span className="font-semibold">{item.rank}</span>
                    </div>
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
