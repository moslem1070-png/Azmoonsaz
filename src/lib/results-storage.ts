'use client';

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type Firestore,
  type DocumentData,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Exam, Question, ExamResult } from './types';

let firestore: Firestore;
try {
  firestore = initializeFirebase().firestore;
} catch (e) {
  console.error("Could not initialize Firestore in results-storage:", e);
}

type Answers = Record<string, string>; // { questionId: selectedOptionText }

/**
 * Calculates the score and saves the exam result to Firestore.
 * @param userId - The ID of the user who took the exam.
 * @param exam - The full exam object.
 * @param questions - The array of question objects for the exam.
 * @param userAnswers - A map of question IDs to the selected answer text.
 */
export const saveExamResult = async (userId: string, exam: Exam, questions: Question[], userAnswers: Answers) => {
  if (!firestore) {
    throw new Error("Firestore is not initialized.");
  }
  if (!userId) {
    throw new Error("User is not authenticated.");
  }
  if (!questions) {
    throw new Error("Exam object does not contain questions.");
  }

  let correctAnswersCount = 0;
  questions.forEach(question => {
    if (userAnswers[question.id] && userAnswers[question.id] === question.correctAnswer) {
      correctAnswersCount++;
    }
  });

  const totalQuestions = questions.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;

  const resultData: Omit<ExamResult, 'id'> = {
    examId: exam.id,
    studentId: userId,
    scorePercentage,
    correctness: correctAnswersCount,
    totalQuestions,
    submissionTime: serverTimestamp(),
    userAnswers,
  };

  const resultDocRef = doc(firestore, 'users', userId, 'examResults', exam.id);
  
  return setDoc(resultDocRef, resultData)
    .catch((serverError) => {
      console.error("Failed to save exam results to Firestore", serverError);
      const permissionError = new FirestorePermissionError({
        path: resultDocRef.path,
        operation: 'create',
        requestResourceData: resultData,
      });
      errorEmitter.emit('permission-error', permissionError);
      throw serverError;
    });
};

/**
 * Retrieves a specific exam result for a user from Firestore.
 * @param userId - The ID of the user.
 * @param examId - The ID of the exam.
 * @returns The ExamResult object or null if not found.
 */
export const getExamResult = async (userId: string, examId: string): Promise<ExamResult | null> => {
  if (!firestore) {
    console.error("Firestore is not initialized.");
    return null;
  }
  if (!userId) {
     console.error("User is not authenticated.");
     return null;
  }

  try {
    const resultDocRef = doc(firestore, 'users', userId, 'examResults', examId);
    const docSnap = await getDoc(resultDocRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ExamResult;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Failed to get exam result from Firestore", error);
    return null;
  }
};
