
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Home, CheckCircle, XCircle, HelpCircle, Award, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, collection, getDocs, query, getDoc } from 'firebase/firestore';

import GlassCard from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { Exam, ExamResult, User as AppUser } from '@/lib/types';

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

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isUserLoading: userLoading } = useUser();
  const firestore = useFirestore();

  const examId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [rank, setRank] = useState<number | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [rankLoading, setRankLoading] = useState(true);

  const examRef = useMemoFirebase(
    () => (firestore && examId ? doc(firestore, 'exams', examId) : null),
    [firestore, examId]
  );
  const { data: exam, isLoading: examLoading } = useDoc<Exam>(examRef);

  const nationalId = typeof window !== 'undefined' ? localStorage.getItem('userNationalId') : null;
  const resultRef = useMemoFirebase(
    () =>
      firestore && nationalId && examId
        ? doc(firestore, 'users', nationalId, 'examResults', examId)
        : null,
    [firestore, nationalId, examId]
  );
  const { data: result, isLoading: resultLoading } = useDoc<ExamResult>(resultRef);
  
  useEffect(() => {
    const fetchRank = async () => {
        if (!firestore || !nationalId || !examId) {
            setRankLoading(false);
            return;
        }

        setRankLoading(true);

        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        
        const allResultsForExam: (ExamResult & {nationalId: string})[] = [];

        for (const userDoc of usersSnapshot.docs) {
            if (userDoc.data().role !== 'student') continue;
            const resultDocRef = doc(firestore, 'users', userDoc.id, 'examResults', examId);
            const resultSnap = await getDoc(resultDocRef);
            if (resultSnap.exists()) {
                allResultsForExam.push({ ...(resultSnap.data() as ExamResult), nationalId: userDoc.id });
            }
        }
        
        allResultsForExam.sort((a, b) => b.scorePercentage - a.scorePercentage);
        
        const currentUserRank = allResultsForExam.findIndex(r => r.nationalId === nationalId) + 1;

        setTotalParticipants(allResultsForExam.length);
        setRank(currentUserRank > 0 ? currentUserRank : null);
        setRankLoading(false);
    };

    fetchRank();
    
  }, [firestore, examId, nationalId]);


  const isLoading = userLoading || examLoading || resultLoading || rankLoading;

  const chartData = useMemo(() => {
    if (!result) return [];
    
    const totalQuestions = result.totalQuestions || 0;
    const answeredCount = Object.keys(result.userAnswers).length;
    const correctCount = result.correctness;
    const incorrectCount = answeredCount - correctCount;
    const unansweredCount = totalQuestions - answeredCount;

    return [
      { name: 'صحیح', value: correctCount, color: 'hsl(var(--chart-1))' },
      { name: 'غلط', value: incorrectCount, color: 'hsl(var(--chart-3))' },
      { name: 'بدون پاسخ', value: unansweredCount, color: 'hsl(var(--muted))' },
    ].sort((a, b) => b.value - a.value);

  }, [result]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation />
      </div>
    );
  }

  if (!exam || !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl">نتیجه آزمون یافت نشد.</h1>
        <Button onClick={() => router.push('/dashboard')}>
            بازگشت به داشبورد
        </Button>
      </div>
    );
  }

  const answeredCount = Object.keys(result.userAnswers).length;
  const incorrectCount = answeredCount - result.correctness;
  const totalQuestions = result.totalQuestions;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#302851] to-[#1A162E]">
      <GlassCard className="w-full max-w-3xl p-6 sm:p-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">کارنامه آزمون</h1>
        <p className="text-md sm:text-lg text-muted-foreground mb-8">{exam.title}</p>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-40 h-40 sm:w-48 sm:h-48">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${result.scorePercentage}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 18 18)"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl sm:text-5xl font-bold">{result.scorePercentage}</span>
                <span className="text-muted-foreground">امتیاز</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <GlassCard className="p-4 flex items-center justify-between text-right">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-md sm:text-lg">پاسخ‌های صحیح</span>
              </div>
              <span className="text-lg sm:text-xl font-bold">{result.correctness}</span>
            </GlassCard>
            <GlassCard className="p-4 flex items-center justify-between text-right">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-500" />
                <span className="text-md sm:text-lg">پاسخ‌های غلط</span>
              </div>
              <span className="text-lg sm:text-xl font-bold">{incorrectCount}</span>
            </GlassCard>
             <GlassCard className="p-4 flex items-center justify-between text-right">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-gray-500" />
                <span className="text-md sm:text-lg">بدون پاسخ</span>
              </div>
              <span className="text-lg sm:text-xl font-bold">{totalQuestions - answeredCount}</span>
            </GlassCard>
          </div>
        </div>
        
        {rank && totalParticipants > 0 && (
            <div className="mt-8">
                <p className="text-sm text-muted-foreground mb-3">رتبه شما در این آزمون</p>
                <GlassCard className="p-4 inline-flex items-center justify-center text-center">
                    <div className="flex items-center gap-3">
                        <Award className="w-8 h-8 text-yellow-400" />
                        <p className="text-xl">
                            <span className="font-bold text-2xl text-white">{rank}</span>
                            <span className="mx-1 text-muted-foreground">/</span>
                            <span className="text-muted-foreground">{totalParticipants}</span>
                        </p>
                    </div>
                </GlassCard>
            </div>
        )}

        <div className="h-48 mt-12" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--foreground))' }}
                width={80}
                tickMargin={10}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  background: 'hsl(var(--background) / 0.8)',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-12">
          <Button onClick={() => router.push('/dashboard')} className="gap-2 px-8">
            <Home className="w-4 h-4" />
            <span>بازگشت به داشبورد</span>
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
