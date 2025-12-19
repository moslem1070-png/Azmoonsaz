"use client";

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
import { ArrowRight, CheckCircle, Home, XCircle } from "lucide-react";

import { exams } from "@/lib/mock-data";
import GlassCard from "@/components/glass-card";
import { Button } from "@/components/ui/button";

const MOCK_RESULTS = {
  score: 80,
  correct: 4,
  incorrect: 1,
  total: 5,
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const exam = exams.find((e) => e.id === params.id);

  const data = [
    { name: "صحیح", value: MOCK_RESULTS.correct, color: "hsl(var(--chart-1))" },
    { name: "غلط", value: MOCK_RESULTS.incorrect, color: "hsl(var(--chart-3))" },
    { name: "بدون پاسخ", value: MOCK_RESULTS.total - MOCK_RESULTS.correct - MOCK_RESULTS.incorrect, color: "hsl(var(--muted))" },
  ].sort((a, b) => {
    if (a.value > b.value) return -1;
    if (a.value < b.value) return 1;
    if (a.name === "صحیح") return -1;
    if (b.name === "صحیح") return 1;
    return 0;
  });

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">آزمون یافت نشد.</h1>
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
                        strokeDasharray={`${MOCK_RESULTS.score}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold">{MOCK_RESULTS.score}</span>
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
                  <span className="text-xl font-bold">{MOCK_RESULTS.correct}</span>
              </GlassCard>
              <GlassCard className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-500" />
                      <span className="text-lg">پاسخ‌های غلط</span>
                  </div>
                  <span className="text-xl font-bold">{MOCK_RESULTS.incorrect}</span>
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
          <Button onClick={() => router.push("/")} className="gap-2 px-8">
            <Home className="w-4 h-4" />
            <span>بازگشت به داشبورد</span>
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
