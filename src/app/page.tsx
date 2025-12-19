"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, FileQuestion, TrendingUp, CheckCircle, Percent, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exams, history } from "@/lib/mock-data";
import Header from "@/components/header";
import GlassCard from "@/components/glass-card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();

  const getPlaceholderImage = (id: string) => {
    return PlaceHolderImages.find(img => img.id === id)?.imageUrl ?? 'https://picsum.photos/seed/1/600/400';
  }

  const completedExamIds = new Set(history.map(h => h.examId));

  const handleStartExam = (examId: string) => {
    if (completedExamIds.has(examId)) {
      toast({
        variant: "destructive",
        title: "آزمون تکراری",
        description: "شما قبلاً در این آزمون شرکت کرده‌اید.",
      });
    } else {
      router.push(`/exam/${examId}`);
    }
  };


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
                  <h2 className="text-xl font-bold mb-2">{exam.title}</h2>
                  <p className="text-muted-foreground mb-4 flex-1">{exam.description}</p>
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
                      isCompleted ? "bg-gray-500 hover:bg-gray-600" : "bg-primary/80 hover:bg-primary"
                    )}
                  >
                    {isCompleted ? <Lock className="ml-2 h-4 w-4" /> : null}
                    {isCompleted ? "تکمیل شده" : "شروع آزمون"}
                  </Button>
                </div>
              </GlassCard>
            )})}
          </div>
        </section>

        <section id="exam-history" className="mt-16">
           <h2 className="text-3xl font-bold mb-6 text-right">تاریخچه آزمون‌ها</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {history.map((item) => (
              <GlassCard key={item.id} className="p-6 flex flex-col">
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">تاریخ: {item.date}</p>
                <div className="flex-1 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground"><Percent className="w-4 h-4 text-accent"/> امتیاز</span>
                    <span className="font-semibold">{item.score}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="w-4 h-4 text-green-400"/> پاسخ صحیح</span>
                    <span className="font-semibold">{item.correctAnswers}</span>
                  </div>
                   <div className="flex items-center justify-between">
                     <span className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="w-4 h-4 text-accent"/> رتبه</span>
                    <span className="font-semibold">{item.rank}</span>
                  </div>
                </div>
                 <Button variant="outline" className="w-full mt-6 border-accent/50 text-accent hover:bg-accent/20 hover:text-accent">
                    مشاهده جزئیات
                  </Button>
              </GlassCard>
            ))}
           </div>
        </section>
      </main>
    </div>
  );
}
