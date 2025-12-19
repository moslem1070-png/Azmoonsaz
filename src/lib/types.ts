import { Timestamp } from "firebase/firestore";

export type Question = {
  id: string; 
  text: string;
  options: string[];
  correctAnswer: string; 
  imageURL?: string;
  examId: string;
};

export type Exam = {
  id: string;
  title: string;
  description?: string;
  coverImageURL?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timer: number; // in minutes
  teacherId: string; // To know who created the exam
};

export type ExamResult = {
  id: string; // examResultId
  examId: string;
  studentId: string;
  scorePercentage: number;
  correctness: number; 
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
  rank?: number; 
};

// Represents a user document in Firestore
export type User = {
  id: string; // This will be the Firebase Auth UID
  nationalId: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher';
};
