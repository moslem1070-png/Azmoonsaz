'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Edit, Trash2, FilePlus, Eye } from 'lucide-react';
import { collection, deleteDoc, doc } from 'firebase/firestore';

import Header from '@/components/header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import GlassCard from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Exam } from '@/lib/types';


type Role = 'student' | 'teacher' | 'manager';

export default function ManageExamsPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<Role | null>(null);

  const examsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'exams') : null),
    [firestore, user]
  );
  const { data: exams, isLoading: examsLoading } = useCollection<Exam>(examsCollection);
  
  const difficultyMap = {
    'Easy': 'آسان',
    'Medium': 'متوسط',
    'Hard': 'سخت',
  };

  useEffect(() => {
    const role = localStorage.getItem('userRole') as Role;
    setUserRole(role);
    if (!isUserLoading && (!user || role === 'student')) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleDeleteExam = async (examId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'exams', examId));
      toast({
        title: 'موفق',
        description: 'آزمون با موفقیت حذف شد.',
      });
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'در حذف آزمون مشکلی پیش آمد.',
      });
    }
  };

  const isLoading = isUserLoading || examsLoading;

  if (isLoading || !user || userRole === 'student') {
    return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-right">مدیریت آزمون‌ها</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowRight className="ml-2 h-4 w-4" />
              بازگشت
            </Button>
            <Button size="sm" onClick={() => router.push('/dashboard/teacher/create-exam')}>
              <FilePlus className="ml-2 h-4 w-4" />
              ایجاد آزمون جدید
            </Button>
          </div>
        </div>

        <GlassCard className="p-4 sm:p-6">
          {exams && exams.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">عنوان آزمون</TableHead>
                    <TableHead className="text-center">سطح</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">تعداد سوالات</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">زمان (دقیقه)</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam: Exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium text-right">{exam.title}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={exam.difficulty === 'Easy' ? 'secondary' : exam.difficulty === 'Medium' ? 'default' : 'destructive'}>
                          {difficultyMap[exam.difficulty] || exam.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">{exam.questions?.length || 0}</TableCell>
                      <TableCell className="text-center hidden sm:table-cell">{exam.timer}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2 justify-end">
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push(`/exam/${exam.id}/start`)}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">مشاهده</span>
                            </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push(`/dashboard/teacher/edit-exam/${exam.id}`)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">ویرایش</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">حذف</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>آیا از حذف این آزمون مطمئن هستید؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  این عمل قابل بازگشت نیست. آزمون و تمام نتایج مرتبط با آن برای همیشه حذف خواهند شد.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteExam(exam.id)}>
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">هیچ آزمونی یافت نشد.</p>
              <Button onClick={() => router.push('/dashboard/teacher/create-exam')} className="mt-4">
                  یک آزمون جدید بسازید
              </Button>
            </div>
          )}
        </GlassCard>
      </main>
    </div>
  );
}
