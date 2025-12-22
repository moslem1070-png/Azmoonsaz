'use client';

import { examCategories } from '@/lib/exam-icons';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';

interface ExamCoverVectorProps {
  category: string;
  className?: string;
}

const ExamCoverVector = ({ category, className }: ExamCoverVectorProps) => {
  const Icon = examCategories[category]?.icon || HelpCircle;

  return (
    <div
      className={cn(
        'flex items-center justify-center text-accent',
        className
      )}
    >
      <Icon className="w-full h-full" />
    </div>
  );
};

export default ExamCoverVector;
