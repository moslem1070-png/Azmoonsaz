'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowRight, User as UserIcon, Award, Fingerprint, Calendar, CheckCircle } from 'lucide-react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import Header from '@/components/header';
import GlassCard from '@/components/glass-card';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { User as AppUser, ExamResult, Exam } from '@/lib/types';

interface EnrichedExamResult extends ExamResult {
  examTitle?: string;
  rank?: number;
  totalParticipants?: number;
}

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { user: teacherUser, isUserLoading: teacherLoading } = useUser();
  const firestore = useFirestore();

  const [enrichedResults, setEnrichedResults] = useState<EnrichedExamResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);

  // Fetch the target user's profile
  const userDocRef = useMemoFirebase(() => (firestore && userId ? doc(firestore, 'users', userId) : null), [firestore, userId]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<AppUser>(userDocRef);

  // Fetch the target user's exam results
  const examResultsCollectionRef = useMemoFirebase(() => (firestore && userId ? collection(firestore, `users/${userId}/examResults`) : null), [firestore, userId]);
  const { data: examResults } = useCollection<ExamResult>(examResultsCollectionRef);

  useEffect(() => {
    if (!teacherLoading) {
      const role = localStorage.getItem('userRole');
      if (!teacherUser || role !== 'teacher') {
        router.push('/dashboard');
      }
    }
  }, [teacherUser, teacherLoading, router]);

  useEffect(() => {
    const fetchExamDetailsAndRank = async () => {
      if (!examResults || !firestore) {
        if (!examResults) setResultsLoading(false);
        return;
      }
      setResultsLoading(true);

      // 1. Fetch all users once to avoid refetching in loop
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const studentUsers = usersSnapshot.docs.filter(doc => (doc.data() as AppUser).role === 'student');

      const promises = examResults.map(async (result) => {
        const examDocRef = doc(firestore, 'exams', result.examId);
        const examSnap = await getDoc(examDocRef);
        const examTitle = examSnap.exists() ? (examSnap.data() as Exam).title : 'آزمون حذف شده';

        // 2. Fetch all results for this specific exam
        const allResultsForExam: ExamResult[] = [];
        for (const studentDoc of studentUsers) {
          const studentResultRef = doc(firestore, `users/${studentDoc.id}/examResults/${result.examId}`);
          const studentResultSnap = await getDoc(studentResultRef);
          if (studentResultSnap.exists()) {
            allResultsForExam.push(studentResultSnap.data() as ExamResult);
          }
        }
        
        // 3. Calculate rank
        allResultsForExam.sort((a, b) => b.scorePercentage - a.scorePercentage);
        const currentUserRank = allResultsForExam.findIndex(r => r.studentId === userId) + 1;
        
        return {
          ...result,
          examTitle,
          rank: currentUserRank > 0 ? currentUserRank : undefined,
          totalParticipants: allResultsForExam.length,
        };
      });

      const resultsWithDetails = await Promise.all(promises);
      setEnrichedResults(resultsWithDetails.sort((a,b) => b.submissionTime.toMillis() - a.submissionTime.toMillis()));
      setResultsLoading(false);
    };

    fetchExamDetailsAndRank();
  }, [examResults, firestore, userId]);

  const isLoading = teacherLoading || profileLoading;
  
  const getRoleText = (role: 'student' | 'teacher') => {
    return role === 'teacher' ? 'معلم' : 'دانش‌آموز';
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری اطلاعات کاربر...</div>;
  }

  if (!userProfile) {
    return <div className="flex items-center justify-center min-h-screen">کاربر مورد نظر یافت نشد.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-right">جزئیات کاربر</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/teacher/manage-users')}>
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به لیست
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <GlassCard className="p-6 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4 border-2 border-primary">
                <AvatarFallback className="bg-primary/20 text-primary text-4xl">
                  {userProfile.firstName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">{`${userProfile.firstName} ${userProfile.lastName}`}</h2>
              <Badge className="mt-2">{getRoleText(userProfile.role)}</Badge>

              <div className="text-right space-y-4 mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-muted-foreground" />
                  <span>{userProfile.lastName}, {userProfile.firstName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-muted-foreground" />
                  <span>{userProfile.nationalId}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-2">
            <GlassCard className="p-6">
              <h3 className="text-xl font-bold text-right mb-4">تاریخچه آزمون‌ها</h3>
              {resultsLoading ? (
                 <p className="text-center text-muted-foreground py-8">در حال بارگذاری نتایج...</p>
              ) : enrichedResults.length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">عنوان آزمون</TableHead>
                            <TableHead className="text-center">امتیاز</TableHead>
                            <TableHead className="text-center">رتبه در آزمون</TableHead>
                            <TableHead className="text-center hidden sm:table-cell">تاریخ</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {enrichedResults.map((result) => (
                            <TableRow key={result.id}>
                            <TableCell className="font-medium text-right">{result.examTitle}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={result.scorePercentage > 50 ? "secondary" : "destructive"}>
                                {result.scorePercentage}%
                                </Badge>
                            </TableCell>
                             <TableCell className="text-center font-semibold">
                                {result.rank && result.totalParticipants ? (
                                    <span>{result.rank} <span className="text-xs text-muted-foreground">از {result.totalParticipants}</span></span>
                                ) : (
                                    '-'
                                )}
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell text-muted-foreground text-xs">
                                {result.submissionTime.toDate().toLocaleDateString('fa-IR')}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">این کاربر هنوز در هیچ آزمونی شرکت نکرده است.</p>
              )}
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}
