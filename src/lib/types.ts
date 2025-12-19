import { Timestamp } from "firebase/firestore";

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
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timer: number; // in minutes
  questions: Question[];
  teacherId: string; // To know who created the exam
};

export type ExamResult = {
  id: string; // examResultId
  examId: string;
  studentId: string;
  scorePercentage: number;
  correctness: number; // Renamed from correctAnswers
  totalQuestions: number;
  submissionTime: Timestamp; // Firestore Timestamp
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

// Represents a user document in Firestore
export type User = {
  id: string; // This will be the Firebase Auth UID
  nationalId: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher';
};
