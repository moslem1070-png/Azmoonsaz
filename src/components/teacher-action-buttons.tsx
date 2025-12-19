
'use client';

import { Button } from '@/components/ui/button';
import { FilePlus, Settings, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Role = 'student' | 'teacher' | 'manager';

export default function TeacherActionButtons({ role }: { role: Role | null }) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
      {role === 'manager' && (
        <Button onClick={() => router.push('/dashboard/teacher/create-user')} variant="outline">
          <UserPlus className="ml-2 h-4 w-4" />
          ایجاد کاربر
        </Button>
      )}
      <Button onClick={() => {/* router.push('/dashboard/teacher/manage-exams') */}} variant="outline">
        <Settings className="ml-2 h-4 w-4" />
        مدیریت آزمون‌ها
      </Button>
       <Button onClick={() => {/* router.push('/dashboard/teacher/create-exam') */}} className="bg-primary/80 hover:bg-primary">
        <FilePlus className="ml-2 h-4 w-4" />
        ایجاد آزمون جدید
      </Button>
    </div>
  );
}
