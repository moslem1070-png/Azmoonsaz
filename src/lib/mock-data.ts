import type { Exam, HistoryItem } from '@/lib/types';

export const exams: Exam[] = [
  {
    id: '1',
    title: 'آزمون اطلاعات عمومی',
    description: 'دانش خود را در موضوعات مختلف از جمله تاریخ، جغرافیا و علوم بسنجید.',
    coverImageId: 'exam-cover-1',
    difficulty: 'متوسط',
    timeLimitMinutes: 10,
    questions: [
      { id: 1, text: 'پایتخت کشور فرانسه کدام شهر است؟', options: ['برلین', 'مادرید', 'پاریس', 'رم'], correctAnswerIndex: 2 },
      { id: 2, text: 'بلندترین قله جهان کدام است؟', options: ['کی۲', 'کانگچنجونگا', 'اورست', 'لوتسه'], correctAnswerIndex: 2, imageId: 'question-image-1' },
      { id: 3, text: 'کدام سیاره به "سیاره سرخ" معروف است؟', options: ['زهره', 'مریخ', 'مشتری', 'زحل'], correctAnswerIndex: 1 },
      { id: 4, text: 'چه کسی "مونالیزا" را نقاشی کرده است؟', options: ['ونسان ونگوگ', 'پابلو پیکاسو', 'لئوناردو داوینچی', 'میکل‌آنژ'], correctAnswerIndex: 2 },
      { id: 5, text: 'بزرگترین اقیانوس جهان کدام است؟', options: ['اطلس', 'هند', 'شمالی', 'آرام'], correctAnswerIndex: 3 },
    ],
  },
  {
    id: '2',
    title: 'آزمون علوم',
    description: 'یک آزمون چالش برانگیز برای دوستداران علوم و فناوری.',
    coverImageId: 'exam-cover-2',
    difficulty: 'سخت',
    timeLimitMinutes: 15,
    questions: [
      { id: 1, text: 'فرمول شیمیایی آب چیست؟', options: ['O2', 'H2O', 'CO2', 'NaCl'], correctAnswerIndex: 1 },
      { id: 2, text: 'واحد اصلی حیات چیست؟', options: ['اتم', 'مولکول', 'سلول', 'ارگان'], correctAnswerIndex: 2 },
    ],
  },
  {
    id: '3',
    title: 'آزمون تاریخ ایران',
    description: 'سفری در زمان به تاریخ غنی و پرفراز و نشیب ایران زمین.',
    coverImageId: 'exam-cover-3',
    difficulty: 'متوسط',
    timeLimitMinutes: 12,
    questions: [
      { id: 1, text: 'بنیان‌گذار سلسله هخامنشیان که بود؟', options: ['داریوش بزرگ', 'اردشیر اول', 'کوروش بزرگ', 'خشایارشا'], correctAnswerIndex: 2 },
      { id: 2, text: 'کدام شهر پایتخت دولت صفویه بود؟', options: ['تبریز', 'اصفهان', 'شیراز', 'قزوین'], correctAnswerIndex: 1 },
    ],
  },
   {
    id: '4',
    title: 'آزمون ریاضیات پایه',
    description: 'مهارت‌های پایه‌ای ریاضی خود را با این آزمون محک بزنید.',
    coverImageId: 'exam-cover-4',
    difficulty: 'آسان',
    timeLimitMinutes: 8,
    questions: [
      { id: 1, text: 'حاصل 7 ضربدر 8 چیست؟', options: ['54', '56', '63', '64'], correctAnswerIndex: 1 },
      { id: 2, text: 'ریشه دوم عدد ۸۱ کدام است؟', options: ['۷', '۸', '۹', '۱۰'], correctAnswerIndex: 2 },
    ],
  },
];

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
