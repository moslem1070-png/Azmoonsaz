'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, FileQuestion, Users, X, Check, Award, Medal, BrainCircuit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';

import GlassCard from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { Exam, User as AppUser, ExamResult } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


interface LeaderboardEntry {
  studentName: string;
  score: number;
}

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
  const [questionCount, setQuestionCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!isUserLoading) {
      const role = localStorage.getItem('userRole');
      if (!user) {
        router.push('/');
      } else if (role === 'teacher') {
        router.push('/dashboard/teacher');
      }
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
      
      // Fetch all users to get their names
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const usersMap = new Map(usersSnapshot.docs.map(d => [d.id, d.data() as AppUser]));

      // Fetch all results for the leaderboard
      const allResults: (ExamResult & {studentId: string})[] = [];
      for (const userDoc of usersSnapshot.docs) {
          const userExamResultRef = doc(firestore, 'users', userDoc.id, 'examResults', examId);
          const userExamResultSnap = await getDoc(userExamResultRef);
          if(userExamResultSnap.exists()) {
            allResults.push({ ...userExamResultSnap.data(), studentId: userDoc.id } as ExamResult & {studentId: string});
          }
      }

      setParticipants(allResults.length);
      
      // Create leaderboard
      const sortedResults = allResults.sort((a, b) => b.scorePercentage - a.scorePercentage);
      const topThree: LeaderboardEntry[] = sortedResults.slice(0, 3).map(result => {
        const studentInfo = usersMap.get(result.studentId);
        return {
          studentName: studentInfo ? `${studentInfo.firstName} ${studentInfo.lastName}` : 'کاربر ناشناس',
          score: result.scorePercentage,
        }
      });
      setLeaderboard(topThree);

      // Get question count from subcollection
      const questionsCollectionRef = collection(firestore, 'exams', examId, 'questions');
      const questionsSnapshot = await getDocs(questionsCollectionRef);
      setQuestionCount(questionsSnapshot.size);

      setLoading(false);
    };

    if (exam) {
        checkCompletionAndParticipants();
    }
  }, [examId, user, firestore, exam]);


  const handleStart = () => {
    if (isCompleted) {
      router.push(`/exam/${params.id}/results`);
    } else {
      router.push(`/exam/${params.id}`);
    }
  };

  const rankColors = [
    'text-yellow-400', // Gold
    'text-gray-400',   // Silver
    'text-yellow-600', // Bronze
  ];

  if (isUserLoading || examLoading || loading) {
    return <LoadingAnimation />;
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
            src={exam.coverImageURL || 'https://picsum.photos/seed/1/600/400'}
            alt={exam.title}
            fill
            className="object-cover"
            data-ai-hint="quiz education"
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
              <p className="font-bold text-lg">{questionCount} سوال</p>
              <p className="text-sm text-muted-foreground">تعداد سوالات</p>
            </GlassCard>
            <GlassCard className="p-4">
              <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="font-bold text-lg">{participants}</p>
              <p className="text-sm text-muted-foreground">شرکت کننده</p>
            </GlassCard>
          </div>

            {leaderboard.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-right mb-4">نفرات برتر</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {leaderboard.map((entry, index) => (
                        <GlassCard key={index} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Medal className={`w-6 h-6 ${rankColors[index] || 'text-muted-foreground'}`} />
                                <span className="font-semibold">{entry.studentName}</span>
                            </div>
                            <Badge variant="secondary">{entry.score}%</Badge>
                        </GlassCard>
                        ))}
                    </div>
                </div>
            )}


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
