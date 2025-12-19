'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, FileQuestion, Users, X, Check, Award } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

import GlassCard from '@/components/glass-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { Exam } from '@/lib/types';

export default function ExamStartPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const examId = Array.isArray(params.id) ? params.id[0] : params.id;

  const examRef = useMemoFirebase(
    () => (firestore && examId ? doc(firestore, 'exams', examId) : null),
    [firestore, examId]
  );
  const { data: exam, isLoading: examLoading } = useDoc<Exam>(examRef);

  const [isCompleted, setIsCompleted] = useState(false);
  const [participants, setParticipants] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const checkCompletionAndParticipants = async () => {
      if (!firestore || !examId) return;

      setLoading(true);

      // Check if current user has completed the exam
      if (user) {
        const resultDocRef = doc(firestore, 'users', user.uid, 'examResults', examId);
        const resultSnap = await getDoc(resultDocRef);
        setIsCompleted(resultSnap.exists());
      }
      
      // Count total participants for this exam
      const allUsersResultsQuery = query(
        collection(firestore, 'users'),
      );
      
      const usersSnapshot = await getDocs(allUsersResultsQuery);
      let participantCount = 0;
      
      const participantPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userExamResultRef = doc(firestore, 'users', userDoc.id, 'examResults', examId);
        const userExamResultSnap = await getDoc(userExamResultRef);
        if (userExamResultSnap.exists()) {
          return 1;
        }
        return 0;
      });
      
      const results = await Promise.all(participantPromises);
      participantCount = results.reduce((sum, current) => sum + current, 0);

      setParticipants(participantCount);
      setLoading(false);
    };

    checkCompletionAndParticipants();
  }, [examId, user, firestore]);

  const getPlaceholderImage = (id: string) => {
    return PlaceHolderImages.find((img) => img.id === id)?.imageUrl ?? 'https://picsum.photos/seed/1/600/400';
  };
  
  const getImageHint = (id: string) => {
    const image = PlaceHolderImages.find((img) => img.id === id);
    return image ? image.imageHint : 'quiz education';
  }

  const handleStart = () => {
    if (isCompleted) {
      router.push(`/exam/${params.id}/results`);
    } else {
      router.push(`/exam/${params.id}`);
    }
  };

  if (isUserLoading || examLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">آزمون یافت نشد.</h1>
      </div>
    );
  }
  
  const difficultyMap = {
    'Easy': 'آسان',
    'Medium': 'متوسط',
    'Hard': 'سخت',
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#302851] to-[#1A162E]">
      <GlassCard className="w-full max-w-2xl overflow-hidden">
        <div className="relative h-48 sm:h-60 w-full">
          <Image
            src={getPlaceholderImage(exam.coverImageId)}
            alt={exam.title}
            fill
            className="object-cover"
            data-ai-hint={getImageHint(exam.coverImageId)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{exam.title}</h1>
          </div>
          <Badge
            variant={exam.difficulty === 'Easy' ? 'secondary' : exam.difficulty === 'Medium' ? 'default' : 'destructive'}
            className="absolute top-4 left-4 text-sm px-3 py-1"
          >
            {difficultyMap[exam.difficulty] || exam.difficulty}
          </Badge>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-muted-foreground text-right mb-6 leading-relaxed">
            {exam.description || 'توضیحاتی برای این آزمون ارائه نشده است.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 text-center">
            <GlassCard className="p-4">
              <Clock className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="font-bold text-lg">{exam.timer} دقیقه</p>
              <p className="text-sm text-muted-foreground">زمان آزمون</p>
            </GlassCard>
            <GlassCard className="p-4">
              <FileQuestion className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="font-bold text-lg">{exam.questions?.length || 0} سوال</p>
              <p className="text-sm text-muted-foreground">تعداد سوالات</p>
            </GlassCard>
            <GlassCard className="p-4">
              <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="font-bold text-lg">{participants}</p>
              <p className="text-sm text-muted-foreground">شرکت کننده</p>
            </GlassCard>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="outline" size="lg" className="w-full sm:w-1/2" onClick={() => router.push('/dashboard')}>
              <X className="w-5 h-5 ml-2" />
              انصراف
            </Button>
            <Button size="lg" className="w-full sm:w-1/2 bg-primary/80 hover:bg-primary" onClick={handleStart}>
              {isCompleted ? 'مشاهده نتایج' : 'شروع آزمون'}
              {isCompleted ? <Award className="w-5 h-5 mr-2" /> : <Check className="w-5 h-5 mr-2" />}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
