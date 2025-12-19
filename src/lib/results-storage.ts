// This is a simple client-side storage using localStorage.
// In a real application, you would likely use a database.

const RESULTS_KEY = 'examResults';

type Answers = Record<number, number>;
type AllResults = Record<string, Answers>;

export const saveExamResult = (examId: string, answers: Answers) => {
  if (typeof window === 'undefined') return;
  try {
    const allResults = getCompletedExams();
    allResults[examId] = answers;
    localStorage.setItem(RESULTS_KEY, JSON.stringify(allResults));
  } catch (error) {
    console.error("Failed to save exam results to localStorage", error);
  }
};

export const getExamResult = (examId: string): Answers | null => {
  if (typeof window === 'undefined') return null;
  try {
    const allResults = getCompletedExams();
    return allResults[examId] || null;
  } catch (error) {
    console.error("Failed to get exam result from localStorage", error);
    return null;
  }
};

export const getCompletedExams = (): AllResults => {
  if (typeof window === 'undefined') return {};
  try {
    const resultsJson = localStorage.getItem(RESULTS_KEY);
    return resultsJson ? JSON.parse(resultsJson) : {};
  } catch (error) {
    console.error("Failed to get completed exams from localStorage", error);
    return {};
  }
};
