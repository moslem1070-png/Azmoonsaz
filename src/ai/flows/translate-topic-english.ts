'use server';

/**
 * @fileOverview A flow that translates a topic to English.
 *
 * - translateTopicToEnglish - A function that handles the translation process.
 * - TranslateTopicToEnglishInput - The input type for the translateTopicToEnglish function.
 * - TranslateTopicToEnglishOutput - The return type for the translateTopicToEnglish function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateTopicToEnglishInputSchema = z.object({
  topic: z.string().describe('The topic to translate to English.'),
});
export type TranslateTopicToEnglishInput = z.infer<typeof TranslateTopicToEnglishInputSchema>;

const TranslateTopicToEnglishOutputSchema = z.object({
  translatedTopic: z.string().describe('The translated topic in English.'),
});
export type TranslateTopicToEnglishOutput = z.infer<typeof TranslateTopicToEnglishOutputSchema>;

export async function translateTopicToEnglish(input: TranslateTopicToEnglishInput): Promise<TranslateTopicToEnglishOutput> {
  return translateTopicToEnglishFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateTopicToEnglishPrompt',
  input: {schema: TranslateTopicToEnglishInputSchema},
  output: {schema: TranslateTopicToEnglishOutputSchema},
  prompt: `Translate the following topic to English. Return only the translated string.

Topic: {{{topic}}}
`,
});

const translateTopicToEnglishFlow = ai.defineFlow(
  {
    name: 'translateTopicToEnglishFlow',
    inputSchema: TranslateTopicToEnglishInputSchema,
    outputSchema: TranslateTopicToEnglishOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
