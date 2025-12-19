"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import { exams } from '@/lib/mock-data';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import GlassCard from '@/components/glass-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const exam = exams.find(e => e.id === params.id);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(exam ? exam.timeLimitMinutes * 60 : 0);

  useEffect(() => {
    if (!exam) return;
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
  }, [exam]);

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

  const handleAnswerSelect = (questionId: number, optionIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const finishExam = () => {
    toast({
        title: "آزمون به پایان رسید",
        description: "در حال محاسبه نتایج...",
    });
    router.push(`/exam/${exam?.id}/results`);
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">آزمون یافت نشد.</h1>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const placeholderImage = PlaceHolderImages.find(img => img.id === currentQuestion.imageId)?.imageUrl;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#302851] to-[#1A162E]">
      <GlassCard className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <div className="flex items-center gap-2 text-accent text-lg font-mono font-semibold">
              <Clock className="w-6 h-6"/>
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <Progress value={progressValue} className="w-full h-3 [&>*]:bg-primary" />
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-y-auto pr-4">
          <h2 className="text-xl font-semibold mb-4">سوال {currentQuestionIndex + 1} از {exam.questions.length}</h2>
          <p className="text-lg text-right mb-6 min-h-[60px]">{currentQuestion.text}</p>
          
          {placeholderImage && (
            <div className="relative w-full h-64 mb-6 rounded-2xl overflow-hidden">
                <Image src={placeholderImage} alt={`Question ${currentQuestion.id}`} layout="fill" objectFit="cover" data-ai-hint="question illustration" />
            </div>
          )}

          <RadioGroup
            dir="rtl"
            value={String(selectedAnswers[currentQuestion.id])}
            onValueChange={(value) => handleAnswerSelect(currentQuestion.id, Number(value))}
            className="space-y-4"
          >
            {currentQuestion.options.map((option, index) => (
              <GlassCard
                key={index}
                className={`flex items-center space-x-reverse space-x-3 p-4 transition-all duration-300 ${selectedAnswers[currentQuestion.id] === index ? 'border-primary' : ''}`}
              >
                <RadioGroupItem value={String(index)} id={`q${currentQuestion.id}-o${index}`} />
                <Label htmlFor={`q${currentQuestion.id}-o${index}`} className="flex-1 text-base cursor-pointer">
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
            <span>سوال قبلی</span>
          </Button>

          {currentQuestionIndex === exam.questions.length - 1 ? (
             <Button onClick={finishExam} className="bg-primary/80 hover:bg-primary gap-2">
                <Check className="w-4 h-4" />
                <span>پایان آزمون</span>
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={currentQuestionIndex === exam.questions.length - 1} className="gap-2">
                <span>سوال بعدی</span>
                <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
