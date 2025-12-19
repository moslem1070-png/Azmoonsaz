export type Question = {
  id: number;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  image?: string;
  imageId?: string;
};

export type Exam = {
  id: string;
  title: string;
  description: string;
  coverImageId: string;
  difficulty: 'آسان' | 'متوسط' | 'سخت';
  timeLimitMinutes: number;
  questions: Question[];
};

export type HistoryItem = {
  id: string;
  examId: string;
  title: string;
  date: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  rank: number;
};

export type UserRole = 'student' | 'teacher' | 'admin';
