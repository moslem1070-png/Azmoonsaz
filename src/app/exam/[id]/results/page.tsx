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

import { exams } from "@/lib/mock-data";
import GlassCard from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { getExamResult } from "@/lib/results-storage";
import { useUser } from "@/firebase";

type Results = {
  score: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const exam = exams.find((e) => e.id === params.id);
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    if (!exam || !user) return;

    const savedResult = getExamResult(user.uid, exam.id);
    if (savedResult) {
      let correct = 0;
      let incorrect = 0;
      const total = exam.questions.length;
      
      exam.questions.forEach(question => {
        const userAnswer = savedResult[question.id];
        if (userAnswer !== undefined) {
          if (userAnswer === question.correctAnswerIndex) {
            correct++;
          } else {
            incorrect++;
          }
        }
      });

      const unanswered = total - correct - incorrect;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      
      setResults({ score, correct, incorrect, unanswered, total });
    }
  }, [exam, user]);

  const data = useMemo(() => {
    if (!results) return [];

    return [
      { name: "صحیح", value: results.correct, color: "hsl(var(--chart-1))" },
      { name: "غلط", value: results.incorrect, color: "hsl(var(--chart-3))" },
      { name: "بدون پاسخ", value: results.unanswered, color: "hsl(var(--muted))" },
    ].sort((a, b) => {
      if (a.value > b.value) return -1;
      if (a.value < b.value) return 1;
      if (a.name === "صحیح") return -1;
      if (b.name === "صحیح") return 1;
      return 0;
    });
  }, [results]);

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">آزمون یافت نشد.</h1>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">در حال محاسبه نتایج...</h1>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#302851] to-[#1A162E]">
      <GlassCard className="w-full max-w-3xl p-8 text-center">
        <h1 className="text-3xl font-bold mb-2">کارنامه آزمون</h1>
        <p className="text-lg text-muted-foreground mb-8">{exam.title}</p>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-48 h-48">
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
                        strokeDasharray={`${results.score}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold">{results.score}</span>
                    <span className="text-muted-foreground">امتیاز</span>
                </div>
            </div>
          </div>
          <div className="space-y-4">
              <GlassCard className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <span className="text-lg">پاسخ‌های صحیح</span>
                  </div>
                  <span className="text-xl font-bold">{results.correct}</span>
              </GlassCard>
              <GlassCard className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-500" />
                      <span className="text-lg">پاسخ‌های غلط</span>
                  </div>
                  <span className="text-xl font-bold">{results.incorrect}</span>
              </GlassCard>
          </div>
        </div>

        <div className="h-48 mt-12" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
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
                         {data.map((entry, index) => (
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
