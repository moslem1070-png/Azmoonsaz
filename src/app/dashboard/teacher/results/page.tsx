'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc } from 'firebase/firestore';
import { BarChart, Users, FileText, Percent } from 'lucide-react';

import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ExamResult, User as AppUser, Exam } from '@/lib/types';


interface AggregatedExamData {
  examId: string;
  examTitle: string;
  participants: number;
  averageScore: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export default function OverallResultsPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{ totalTaken: number; averageScore: number; uniqueStudents: number; totalExams: number; }>({
    totalTaken: 0,
    averageScore: 0,
    uniqueStudents: 0,
    totalExams: 0,
  });
  const [aggregatedExams, setAggregatedExams] = useState<AggregatedExamData[]>([]);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!isUserLoading && (!user || role !== 'teacher')) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!firestore || !user) return;

    const fetchData = async () => {
      setIsLoading(true);

      try {
        // 1. Fetch all exams
        const examsCollectionRef = collection(firestore, 'exams');
        const examsSnapshot = await getDocs(examsCollectionRef);
        const examsData = examsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Exam[];
        const examsMap = new Map(examsData.map(exam => [exam.id, exam]));
        
        // 2. Fetch all users
        const usersCollectionRef = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersCollectionRef);
        const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as AppUser[];

        let allResults: (ExamResult & { examId: string })[] = [];
        let studentIds = new Set<string>();

        // 3. Fetch all examResults for all users
        for (const u of usersData) {
          if (u.role === 'student') {
            const resultsCollectionRef = collection(firestore, `users/${u.id}/examResults`);
            const resultsSnapshot = await getDocs(resultsCollectionRef);
            if (!resultsSnapshot.empty) {
                studentIds.add(u.id);
            }
            resultsSnapshot.forEach(doc => {
              allResults.push({ ...(doc.data() as ExamResult), id: doc.id });
            });
          }
        }
        
        // 4. Aggregate data
        const totalTaken = allResults.length;
        const totalScore = allResults.reduce((sum, result) => sum + result.scorePercentage, 0);
        const averageScore = totalTaken > 0 ? Math.round(totalScore / totalTaken) : 0;
        
        const examAggregation: { [examId: string]: { scores: number[]; count: number } } = {};
        allResults.forEach(result => {
          if (!examAggregation[result.examId]) {
            examAggregation[result.examId] = { scores: [], count: 0 };
          }
          examAggregation[result.examId].scores.push(result.scorePercentage);
          examAggregation[result.examId].count++;
        });

        const aggregatedExamsData: AggregatedExamData[] = Object.keys(examAggregation).map(examId => {
          const examInfo = examsMap.get(examId);
          if (!examInfo) return null;
          
          const scores = examAggregation[examId].scores;
          const count = examAggregation[examId].count;
          const avg = scores.reduce((a, b) => a + b, 0) / count;
          
          return {
            examId: examId,
            examTitle: examInfo.title,
            participants: count,
            averageScore: Math.round(avg),
            difficulty: examInfo.difficulty,
          };
        }).filter((item): item is AggregatedExamData => item !== null)
          .sort((a,b) => b.participants - a.participants);

        setAggregatedExams(aggregatedExamsData);
        setStats({
          totalTaken,
          averageScore,
          uniqueStudents: studentIds.size,
          totalExams: examsData.length,
        });

      } catch (error) {
        console.error("Error fetching overall results:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, user]);

  const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) => (
    <GlassCard className="p-4 sm:p-6 text-right">
      <div className="flex items-start justify-end gap-4">
        <div className="flex-1">
          <p className="text-2xl sm:text-3xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <div className="p-3 bg-primary/20 rounded-lg text-primary">{icon}</div>
      </div>
    </GlassCard>
  );

  const difficultyMap = {
    'Easy': 'آسان',
    'Medium': 'متوسط',
    'Hard': 'سخت',
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
          <p>در حال بارگذاری گزارش کلی...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-right">گزارش و نتایج کلی</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={<FileText className="w-7 h-7" />} value={stats.totalExams} label="تعداد کل آزمون‌ها" />
          <StatCard icon={<BarChart className="w-7 h-7" />} value={stats.totalTaken} label="تعداد کل آزمون‌های داده شده" />
          <StatCard icon={<Users className="w-7 h-7" />} value={stats.uniqueStudents} label="دانش‌آموزان شرکت‌کننده" />
          <StatCard icon={<Percent className="w-7 h-7" />} value={`${stats.averageScore}%`} label="میانگین نمرات کل" />
        </div>
        
        <GlassCard className="p-4 sm:p-6">
           <h2 className="text-xl font-bold text-right mb-4">آمار تفکیکی آزمون‌ها</h2>
           {aggregatedExams.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">عنوان آزمون</TableHead>
                        <TableHead className="text-center">سطح دشواری</TableHead>
                        <TableHead className="text-center">تعداد شرکت‌کنندگان</TableHead>
                        <TableHead className="text-center">میانگین نمره</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {aggregatedExams.map((exam) => (
                        <TableRow key={exam.examId}>
                        <TableCell className="font-medium text-right">{exam.examTitle}</TableCell>
                        <TableCell className="text-center">
                             <Badge variant={exam.difficulty === 'Easy' ? 'secondary' : exam.difficulty === 'Medium' ? 'default' : 'destructive'}>
                                {difficultyMap[exam.difficulty] || exam.difficulty}
                             </Badge>
                        </TableCell>
                        <TableCell className="text-center">{exam.participants}</TableCell>
                        <TableCell className="text-center font-semibold">{exam.averageScore}%</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </div>
           ) : (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">هنوز هیچ آزمونی توسط دانش‌آموزان انجام نشده است.</p>
                </div>
           )}
        </GlassCard>
      </main>
    </div>
  );
}
