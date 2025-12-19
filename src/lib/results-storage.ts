// This is a simple client-side storage using localStorage.
// In a real application, you would likely use a database.

const RESULTS_KEY = 'examResults';

type Answers = Record<number, number>;
// Structure for a single user's results: { [examId]: Answers }
type UserResults = Record<string, Answers>;
// Structure for all results: { [userId]: UserResults }
type AllUsersResults = Record<string, UserResults>;


const getAllUsersResults = (): AllUsersResults => {
  if (typeof window === 'undefined') return {};
  try {
    const resultsJson = localStorage.getItem(RESULTS_KEY);
    return resultsJson ? JSON.parse(resultsJson) : {};
  } catch (error) {
    console.error("Failed to get all results from localStorage", error);
    return {};
  }
};

export const saveExamResult = (userId: string, examId: string, answers: Answers) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const allUsersResults = getAllUsersResults();
    if (!allUsersResults[userId]) {
      allUsersResults[userId] = {};
    }
    allUsersResults[userId][examId] = answers;
    localStorage.setItem(RESULTS_KEY, JSON.stringify(allUsersResults));
  } catch (error) {
    console.error("Failed to save exam results to localStorage", error);
  }
};

export const getExamResult = (userId: string, examId: string): Answers | null => {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const userResults = getCompletedExams(userId);
    return userResults[examId] || null;
  } catch (error) {
    console.error("Failed to get exam result from localStorage", error);
    return null;
  }
};

export const getCompletedExams = (userId: string): UserResults => {
  if (typeof window === 'undefined' || !userId) return {};
  try {
    const allUsersResults = getAllUsersResults();
    return allUsersResults[userId] || {};
  } catch (error) {
    console.error("Failed to get completed exams from localStorage", error);
    return {};
  }
};
