# **App Name**: Persian QuizMaster

## Core Features:

- User Authentication: Implement user authentication using Firebase Auth, supporting admin, teacher, and student roles.
- Exam Creation: Teachers can create exams with cover images, difficulty levels (Easy/Medium/Hard), and timers. Support image uploads via Firebase Storage.
- Question Management: Teachers can add questions to exams, with support for optional images.  All exam data will be saved on Firestore.
- Exam Browser: Students can browse available exams displayed in a grid of glass cards. Exam data stored in Firestore.
- Live Exam: Implement a live exam screen with a timer, question display, and a purple progress bar. Use Firestore to store exam results.
- Results Report: Generate a glassy report card showing the score percentage and correctness after completing an exam.  Store report data using Firestore.
- History Tracking: Save exam results to a 'History' section in the student's profile, stored in Firestore.

## Style Guidelines:

- Primary color: Deep purple (#673AB7), reflecting elegance and knowledge.
- Background color: Dark gradient from #302851 to #1A162E, providing depth and sophistication (approximately 20% saturation).
- Accent color: A lighter purple (#9575CD), analogous to the primary, for highlighting key interactive elements.
- Font: 'Inter', a sans-serif font for a modern and clean user interface. Note: currently only Google Fonts are supported.
- Use modern, minimalist icons related to quizzes and learning.
- Implement a right-to-left (RTL) layout to support the Persian language.
- Apply glassmorphism with high blur and 30px rounded corners to all cards and UI elements.
- Use smooth transitions and subtle animations for UI feedback.