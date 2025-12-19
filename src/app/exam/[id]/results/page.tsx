"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CheckCircle, Home, XCircle } from "lucide-react";
import { doc, getDoc } from 'firebase/firestore';

import GlassCard from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import type { Exam, ExamResult } from '@/lib/types';


export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isUserLoading: userLoading } = useUser();
  const firestore = useFirestore();

  const examId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Fetch the exam details
  const examRef = useMemoFirebase(
    () => (firestore && examId ? doc(firestore, 'exams', examId) : null),
    [firestore, examId]
  );
  const { data: exam, isLoading: examLoading } = useDoc<Exam>(examRef);

  // Fetch the user's specific result for this exam
  const resultRef = useMemoFirebase(
    () => (firestore && user && examId ? doc(firestore, 'users', user.uid, 'examResults', examId) : null),
    [firestore, user, examId]
  );
  const { data: result, isLoading: resultLoading } = useDoc<ExamResult>(resultRef);

  const isLoading = userLoading || examLoading || resultLoading;

  const chartData = useMemo(() => {
    if (!result) return [];

    const incorrect = result.totalQuestions - result.correctAnswers - (result.totalQuestions - Object.keys(result.userAnswers).length);
    const unanswered = result.totalQuestions - Object.keys(result.userAnswers).length;

    return [
      { name: "صحیح", value: result.correctAnswers, color: "hsl(var(--chart-1))" },
      { name: "غلط", value: incorrect, color: "hsl(var(--chart-3))" },
      { name: "بدون پاسخ", value: unanswered, color: "hsl(var(--muted))" },
    ].sort((a, b) => {
      if (a.value > b.value) return -1;
      if (a.value < b.value) return 1;
      if (a.name === "صحیح") return -1;
      if (b.name === "صحیح") return 1;
      return 0;
    });
  }, [result]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">در حال بارگذاری نتایج...</h1>
      </div>
    );
  }

  if (!exam || !result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">نتیجه آزمون یافت نشد.</h1>
      </div>
    );
  }

  const incorrectAnswers = result.totalQuestions - result.correctAnswers - (result.totalQuestions - Object.keys(result.userAnswers).length);

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
              <GlassCard className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <span className="text-md sm:text-lg">پاسخ‌های صحیح</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold">{result.correctAnswers}</span>
              </GlassCard>
              <GlassCard className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-500" />
                      <span className="text-md sm:text-lg">پاسخ‌های غلط</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold">{incorrectAnswers}</span>
              </GlassCard>
          </div>
        </div>

        <div className="h-48 mt-12" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--foreground))' }} width={80} tickMargin={10} />
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
          <Button onClick={() => router.push("/dashboard")} className="gap-2 px-8">
            <Home className="w-4 h-4" />
            <span>بازگشت به داشبورد</span>
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
