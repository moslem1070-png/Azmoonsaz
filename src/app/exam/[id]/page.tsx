"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import GlassCard from '@/components/glass-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { saveExamResult } from '@/lib/results-storage';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Exam } from '@/lib/types';


export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const examId = Array.isArray(params.id) ? params.id[0] : params.id;

  const examRef = useMemoFirebase(
    () => (firestore && examId ? doc(firestore, 'exams', examId) : null),
    [firestore, examId]
  );
  const { data: exam, isLoading: examLoading } = useDoc<Exam>(examRef);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExamFinished, setIsExamFinished] = useState(false);

  useEffect(() => {
    if (exam && !isExamFinished) {
        setTimeLeft(exam.timeLimitMinutes * 60);
    }
  }, [exam, isExamFinished]);


  useEffect(() => {
    if (isExamFinished || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          finishExam();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isExamFinished]);

  const progressValue = useMemo(() => {
    if (!exam) return 0;
    return ((currentQuestionIndex + 1) / exam.questions.length) * 100;
  }, [currentQuestionIndex, exam]);

  const handleNext = () => {
    if (exam && currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleAnswerSelect = (questionId: string, option: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const finishExam = async () => {
    if (!exam || !user || isExamFinished) return;
    setIsExamFinished(true); // Prevent multiple submissions
    
    try {
        await saveExamResult(user.uid, exam, selectedAnswers);
        toast({
            title: "آزمون به پایان رسید",
            description: "در حال محاسبه نتایج...",
        });
        router.push(`/exam/${exam.id}/results`);
    } catch(error) {
        toast({
            variant: "destructive",
            title: "خطا در ذخیره نتایج",
            description: "مشکلی در ذخیره نتایج آزمون شما پیش آمد. لطفا دوباره تلاش کنید.",
        });
        setIsExamFinished(false); // Allow retry
    }
  }

  if (examLoading || !exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">{examLoading ? 'در حال بارگذاری آزمون...' : 'آزمون یافت نشد.'}</h1>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const placeholderImage = PlaceHolderImages.find(img => img.id === currentQuestion.imageURL)?.imageUrl;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#302851] to-[#1A162E]">
      <GlassCard className="w-full max-w-4xl h-full max-h-[95vh] sm:max-h-[90vh] flex flex-col p-4 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold self-end">{exam.title}</h1>
            <div className="flex items-center gap-2 text-accent text-lg font-mono font-semibold self-start sm:self-center">
              <Clock className="w-6 h-6"/>
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <Progress value={progressValue} className="w-full h-3 [&>*]:bg-primary" />
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-y-auto pr-2 sm:pr-4">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">سوال {currentQuestionIndex + 1} از {exam.questions.length}</h2>
          <p className="text-md sm:text-lg text-right mb-6 min-h-[60px]">{currentQuestion.text}</p>
          
          {placeholderImage && (
            <div className="relative w-full h-48 sm:h-64 mb-6 rounded-2xl overflow-hidden">
                <Image src={placeholderImage} alt={`Question ${currentQuestion.id}`} fill objectFit="cover" data-ai-hint="question illustration" />
            </div>
          )}

          <RadioGroup
            dir="rtl"
            value={selectedAnswers[currentQuestion.id]}
            onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
            className="space-y-3 sm:space-y-4"
          >
            {currentQuestion.options.map((option, index) => (
              <GlassCard
                key={index}
                className={`flex items-center space-x-reverse space-x-3 p-3 sm:p-4 transition-all duration-300 ${selectedAnswers[currentQuestion.id] === option ? 'border-primary' : ''}`}
              >
                <RadioGroupItem value={option} id={`q${currentQuestion.id}-o${index}`} />
                <Label htmlFor={`q${currentQuestion.id}-o${index}`} className="flex-1 text-sm sm:text-base cursor-pointer">
                  {option}
                </Label>
              </GlassCard>
            ))}
          </RadioGroup>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
          <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            <span>قبلی</span>
          </Button>

          {currentQuestionIndex === exam.questions.length - 1 ? (
             <Button onClick={finishExam} disabled={isExamFinished} className="bg-primary/80 hover:bg-primary gap-2">
                <Check className="w-4 h-4" />
                <span>{isExamFinished ? 'در حال ارسال...' : 'پایان'}</span>
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
                <span>بعدی</span>
                <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
