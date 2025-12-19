export type Question = {
  id: string; // Changed from number to string for Firestore compatibility
  text: string;
  options: string[];
  correctAnswer: string; // Storing the answer text directly
  imageURL?: string;
};

export type Exam = {
  id: string;
  title: string;
  description: string;
  coverImageId: string;
  difficulty: 'آسان' | 'متوسط' | 'سخت';
  timeLimitMinutes: number;
  questions: Question[];
  teacherId: string; // To know who created the exam
};

export type ExamResult = {
  id: string; // examResultId
  examId: string;
  studentId: string;
  scorePercentage: number;
  correctAnswers: number;
  totalQuestions: number;
  submissionTime: any; // Firestore Timestamp
  userAnswers: Record<string, string>; // { questionId: selectedOption }
};


export type HistoryItem = {
  id: string; // examResultId
  examId: string;
  title: string;
  date: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  rank?: number; // Rank is complex, making it optional for now
};

export type UserRole = 'student' | 'teacher' | 'admin' | 'manager';

export type User = {
  id: string;
  fullName: string;
  nationalId: string;
  role: 'student' | 'teacher' | 'manager';
};
