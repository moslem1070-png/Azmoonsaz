import { Timestamp } from "firebase/firestore";

export type Question = {
  id: string; 
  text: string;
  options: string[];
  correctAnswer: string; 
  imageURL?: string; // Now holds the public URL of the uploaded image
  examId: string;
};

export type Exam = {
  id: string;
  title: string;
  description?: string;
  coverImageURL?: string; // Now holds the public URL of the uploaded image
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timer: number; // in minutes
  teacherId: string; // To know who created the exam
  // Questions are now a subcollection, so they are not stored directly on the exam document.
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
