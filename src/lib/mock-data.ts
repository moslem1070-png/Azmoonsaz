import type { HistoryItem } from '@/lib/types';

// exams data is now fetched from Firestore. This file is kept for history mock data.

export const history: HistoryItem[] = [
    {
        id: 'hist1',
        examId: '2',
        title: 'آزمون علوم',
        date: '۱۴۰۳/۰۴/۱۰',
        score: 85,
        correctAnswers: 17,
        totalQuestions: 20,
        rank: 3,
    },
    {
        id: 'hist2',
        examId: '3',
        title: 'آزمون تاریخ ایران',
        date: '۱۴۰۳/۰۴/۰۵',
        score: 92,
        correctAnswers: 23,
        totalQuestions: 25,
        rank: 1,
    },
    {
        id: 'hist3',
        examId: '1',
        title: 'آزمون اطلاعات عمومی',
        date: '۱۴۰۳/۰۳/۲۸',
        score: 70,
        correctAnswers: 14,
        totalQuestions: 20,
        rank: 12,
    }
];
