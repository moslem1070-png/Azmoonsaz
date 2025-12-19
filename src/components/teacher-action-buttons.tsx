
'use client';

import { Button } from '@/components/ui/button';
import { FilePlus, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TeacherActionButtons() {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
      <Button onClick={() => {/* router.push('/dashboard/teacher/create-exam') */}} className="bg-primary/80 hover:bg-primary">
        <FilePlus className="ml-2 h-4 w-4" />
        ایجاد آزمون جدید
      </Button>
      <Button variant="outline" onClick={() => {/* router.push('/dashboard/teacher/manage-exams') */}}>
        <Settings className="ml-2 h-4 w-4" />
        مدیریت آزمون‌ها
      </Button>
    </div>
  );
}
