'use server';

/**
 * @fileOverview Generates exam questions based on a topic and difficulty level using AI.
 *
 * - generateExamQuestions - A function that handles the exam question generation process.
 * - GenerateExamQuestionsInput - The input type for the generateExamQuestions function.
 * - GenerateExamQuestionsOutput - The return type for the generateExamQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateExamQuestionsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate exam questions.'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe('The difficulty level of the exam questions.'),
  numberOfQuestions: z.number().int().min(1).max(20).default(10).describe('The number of questions to generate.  Must be between 1 and 20.'),
});
export type GenerateExamQuestionsInput = z.infer<typeof GenerateExamQuestionsInputSchema>;

const GenerateExamQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The exam question.'),
      options: z.array(z.string()).describe('The possible answer options for the question.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
    })
  ).describe('The generated exam questions.'),
});
export type GenerateExamQuestionsOutput = z.infer<typeof GenerateExamQuestionsOutputSchema>;

export async function generateExamQuestions(input: GenerateExamQuestionsInput): Promise<GenerateExamQuestionsOutput> {
  return generateExamQuestionsFlow(input);
}

const generateExamQuestionsPrompt = ai.definePrompt({
  name: 'generateExamQuestionsPrompt',
  input: {schema: GenerateExamQuestionsInputSchema},
  output: {schema: GenerateExamQuestionsOutputSchema},
  prompt: `You are an expert exam question generator. Generate {{numberOfQuestions}} exam questions on the topic of {{{topic}}} with a difficulty level of {{{difficulty}}}.

Each question should have multiple choice options, with one correct answer. Provide the questions in JSON format, with a "questions" array containing objects with "question", "options", and "correctAnswer" fields.

Example:
{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["Berlin", "Paris", "Madrid", "Rome"],
      "correctAnswer": "Paris"
    },
    {
      "question": "What is the highest mountain in the world?",
      "options": ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"],
      "correctAnswer": "Mount Everest"
    }
  ]
}`,
});

const generateExamQuestionsFlow = ai.defineFlow(
  {
    name: 'generateExamQuestionsFlow',
    inputSchema: GenerateExamQuestionsInputSchema,
    outputSchema: GenerateExamQuestionsOutputSchema,
  },
  async input => {
    const {output} = await generateExamQuestionsPrompt(input);
    return output!;
  }
);
