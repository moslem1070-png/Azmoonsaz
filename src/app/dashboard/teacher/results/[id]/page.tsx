'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ArrowRight, Trophy, BarChart, Users, Percent, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';

import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ExamResult, User as AppUser, Exam } from '@/lib/types';


interface RankedResult {
  studentId: string;
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

export default function ExamLeaderboardPage() {
  const router = useRouter();
  const params = useParams();
  const examId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [leaderboard, setLeaderboard] = useState<RankedResult[]>([]);
  const [stats, setStats] = useState<{ participants: number; averageScore: number; }>({
    participants: 0,
    averageScore: 0,
  });

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!isUserLoading && (!user || role !== 'teacher')) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!firestore || !examId) return;

    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const examDocRef = doc(firestore, 'exams', examId);
        const examSnap = await getDoc(examDocRef);
        if (!examSnap.exists()) {
          router.push('/dashboard/teacher/results');
          return;
        }
        setExam(examSnap.data() as Exam);

        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(d => [d.id, d.data() as AppUser]));
        
        let allResults: RankedResult[] = [];
        for (const [userId, userData] of usersMap.entries()) {
          if (userData.role === 'student') {
            const resultDocRef = doc(firestore, `users/${userId}/examResults/${examId}`);
            const resultSnap = await getDoc(resultDocRef);
            if (resultSnap.exists()) {
              const resultData = resultSnap.data() as ExamResult;
              allResults.push({
                studentId: userId,
                studentName: `${userData.firstName} ${userData.lastName}`,
                score: resultData.scorePercentage,
              });
            }
          }
        }
        
        const totalParticipants = allResults.length;
        const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
        const average = totalParticipants > 0 ? Math.round(totalScore / totalParticipants) : 0;
        
        setStats({ participants: totalParticipants, averageScore: average });
        setLeaderboard(allResults.sort((a, b) => b.score - a.score).slice(0, 3));
        
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [firestore, examId, router]);
  
  const rankColors = [
    "bg-yellow-500/80 border-yellow-400", // Gold
    "bg-gray-400/80 border-gray-300", // Silver
    "bg-yellow-800/80 border-yellow-700", // Bronze
  ];

  if (isUserLoading || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
          <LoadingAnimation />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-right">نفرات برتر آزمون</h1>
            <p className="text-muted-foreground mt-1 text-right">{exam?.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/teacher/results')}>
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به گزارش کلی
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <GlassCard className="p-6 flex items-center gap-4">
                <Users className="w-8 h-8 text-primary"/>
                <div>
                    <p className="text-2xl font-bold">{stats.participants}</p>
                    <p className="text-sm text-muted-foreground">تعداد کل شرکت‌کنندگان</p>
                </div>
            </GlassCard>
            <GlassCard className="p-6 flex items-center gap-4">
                <Percent className="w-8 h-8 text-primary"/>
                <div>
                    <p className="text-2xl font-bold">{stats.averageScore}%</p>
                    <p className="text-sm text-muted-foreground">میانگین نمره آزمون</p>
                </div>
            </GlassCard>
        </div>

        {leaderboard.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {leaderboard.map((result, index) => (
              <GlassCard key={result.studentId} className={`p-6 border-2 ${rankColors[index] || 'border-white/10'}`}>
                <div className={`relative w-20 h-20 mx-auto mb-4 border-4 rounded-full ${rankColors[index] || 'border-primary'}`}>
                    <Avatar className="h-full w-full">
                        <AvatarFallback className="bg-transparent text-3xl font-bold">
                            {result.studentName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background px-2 rounded-full border-2 border-current">
                        <Trophy className={`w-6 h-6 ${ index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-yellow-700' }`} />
                    </div>
                </div>
                
                <h3 className="text-xl font-bold">{result.studentName}</h3>
                <p className="text-sm text-muted-foreground mb-4">رتبه {index + 1}</p>
                <Badge variant="secondary" className="text-lg">{result.score}%</Badge>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="py-12 text-center">
            <p className="text-muted-foreground">هنوز هیچ شرکت‌کننده‌ای برای این آزمون وجود ندارد.</p>
          </GlassCard>
        )}
      </main>
    </div>
  );
}
