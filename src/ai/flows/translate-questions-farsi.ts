'use server';

/**
 * @fileOverview A flow that translates exam questions to Farsi.
 *
 * - translateQuestionsToFarsi - A function that handles the translation process.
 * - TranslateQuestionsToFarsiInput - The input type for the translateQuestionsToFarsi function.
 * - TranslateQuestionsToFarsiOutput - The return type for the translateQuestionsToFarsi function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateQuestionsToFarsiInputSchema = z.object({
  questions: z.array(
    z.object({
      text: z.string().describe('The question text to translate.'),
      imageUrl: z.string().optional().describe('Optional image URL associated with the question.'),
    })
  ).describe('An array of questions to translate to Farsi.'),
});
export type TranslateQuestionsToFarsiInput = z.infer<typeof TranslateQuestionsToFarsiInputSchema>;

const TranslateQuestionsToFarsiOutputSchema = z.object({
  translatedQuestions: z.array(
    z.object({
      text: z.string().describe('The translated question text in Farsi.'),
      imageUrl: z.string().optional().describe('Optional image URL associated with the question.'),
    })
  ).describe('An array of translated questions in Farsi.'),
});
export type TranslateQuestionsToFarsiOutput = z.infer<typeof TranslateQuestionsToFarsiOutputSchema>;

export async function translateQuestionsToFarsi(input: TranslateQuestionsToFarsiInput): Promise<TranslateQuestionsToFarsiOutput> {
  return translateQuestionsToFarsiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateQuestionsToFarsiPrompt',
  input: {schema: TranslateQuestionsToFarsiInputSchema},
  output: {schema: TranslateQuestionsToFarsiOutputSchema},
  prompt: `You are a translation expert specializing in translating exam questions to Farsi.

  Translate the following questions to Farsi. Retain any provided image URLs.

  {{#each questions}}
  Question:
  Text: {{{this.text}}}
  Image URL: {{{this.imageUrl}}}
  {{/each}}

  Ensure the translated questions are accurate and culturally appropriate for a Persian-speaking audience.
  Return the translated questions in the same structure as the input.
  `,
});

const translateQuestionsToFarsiFlow = ai.defineFlow(
  {
    name: 'translateQuestionsToFarsiFlow',
    inputSchema: TranslateQuestionsToFarsiInputSchema,
    outputSchema: TranslateQuestionsToFarsiOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
