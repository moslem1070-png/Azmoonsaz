import { config } from 'dotenv';
config();

import '@/ai/flows/translate-questions-farsi.ts';
import '@/ai/flows/generate-exam-questions.ts';
import '@/ai/flows/find-relevant-image.ts';
import '@/ai/flows/translate-topic-english.ts';
