"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, FileQuestion, Lock } from "lucide-react";
import { useState, useEffect } from 'react';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exams } from "@/lib/mock-data";
import Header from "@/components/header";
import GlassCard from "@/components/glass-card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import { getCompletedExams } from "@/lib/results-storage";
import { useUser } from "@/firebase";

export default function DashboardPage() {
  const router = useRouter();
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);


  useEffect(() => {
    // This will only run on the client
    const completed = getCompletedExams();
    setCompletedExamIds(new Set(Object.keys(completed)));
  }, []);

  const getPlaceholderImage = (id: string) => {
    return PlaceHolderImages.find(img => img.id === id)?.imageUrl ?? 'https://picsum.photos/seed/1/600/400';
  }

  const handleStartExam = (examId: string) => {
    // Navigate to the pre-exam start page
    router.push(`/exam/${examId}/start`);
  };
  
  if (isUserLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <section id="available-exams">
          <h1 className="text-3xl font-bold mb-6 text-right">آزمون‌های موجود</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    onClick={() => handleStartExam(exam.id)}
                    className={cn(
                      "w-full transition-colors",
                      isCompleted ? "bg-gray-500 hover:bg-gray-600 cursor-not-allowed" : "bg-primary/80 hover:bg-primary"
                    )}
                    disabled={isCompleted}
                  >
                    {isCompleted ? <Lock className="ml-2 h-4 w-4" /> : null}
                    {isCompleted ? "مشاهده نتایج" : "شروع آزمون"}
                  </Button>
                </div>
              </GlassCard>
            )})}
          </div>
        </section>
      </main>
    </div>
  );
}
