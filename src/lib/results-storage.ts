'use client';

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Exam, ExamResult } from './types';

// This file now uses Firestore instead of localStorage.

type Answers = Record<string, string>; // { questionId: selectedOptionText }

// We only need one instance of firestore, so we can initialize it once here.
let firestore: Firestore;
try {
  firestore = initializeFirebase().firestore;
} catch (e) {
  console.error("Could not initialize Firestore in results-storage:", e);
}


/**
 * Calculates the score and saves the exam result to Firestore.
 * @param userId - The ID of the user who took the exam.
 * @param exam - The full exam object, including its questions.
 * @param userAnswers - A map of question IDs to the selected answer text.
 */
export const saveExamResult = async (userId: string, exam: Exam, userAnswers: Answers) => {
  if (!firestore) {
    throw new Error("Firestore is not initialized.");
  }
  if (!userId) {
    throw new Error("User is not authenticated.");
  }
  if (!exam.questions) {
    throw new Error("Exam object does not contain questions.");
  }

  let correctAnswersCount = 0;
  exam.questions.forEach(question => {
    // Check if the user answered and if the answer is correct
    if (userAnswers[question.id] && userAnswers[question.id] === question.correctAnswer) {
      correctAnswersCount++;
    }
  });

  const totalQuestions = exam.questions.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;

  const resultData: Omit<ExamResult, 'id'> = {
    examId: exam.id,
    studentId: userId,
    scorePercentage,
    correctness: correctAnswersCount, // Using the new field name from backend.json
    totalQuestions,
    submissionTime: serverTimestamp(),
    userAnswers,
  };

  // The result document ID will be the same as the exam ID for simplicity and to prevent re-takes.
  const resultDocRef = doc(firestore, 'users', userId, 'examResults', exam.id);
  
  // Use a non-blocking write with error handling
  return setDoc(resultDocRef, resultData)
    .catch((serverError) => {
      console.error("Failed to save exam results to Firestore", serverError);
      const permissionError = new FirestorePermissionError({
        path: resultDocRef.path,
        operation: 'create',
        requestResourceData: resultData,
      });
      // Emit the error for global handling (e.g., showing a toast or dev overlay)
      errorEmitter.emit('permission-error', permissionError);
      // Re-throw to allow the calling function to know about the failure
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
