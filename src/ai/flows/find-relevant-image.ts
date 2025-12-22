'use server';

/**
 * @fileOverview Finds the most relevant image hint for a given topic from a list of available hints.
 *
 * - findRelevantImage - A function that handles the image hint finding process.
 * - FindRelevantImageInput - The input type for the findRelevantImage function.
 * - FindRelevantImageOutput - The return type for the findRelevantImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindRelevantImageInputSchema = z.object({
  topic: z.string().describe('The topic for which to find a relevant image.'),
  availableHints: z.array(z.string()).describe('A list of available image hints (keywords) to choose from.'),
});
export type FindRelevantImageInput = z.infer<typeof FindRelevantImageInputSchema>;

const FindRelevantImageOutputSchema = z.object({
  bestHint: z.string().describe('The single best hint from the available hints that is most relevant to the topic.'),
});
export type FindRelevantImageOutput = z.infer<typeof FindRelevantImageOutputSchema>;

export async function findRelevantImage(input: FindRelevantImageInput): Promise<FindRelevantImageOutput> {
  return findRelevantImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findRelevantImagePrompt',
  input: {schema: FindRelevantImageInputSchema},
  output: {schema: FindRelevantImageOutputSchema},
  prompt: `You are an expert at categorizing topics and finding the most relevant image keywords.
Your task is to select the single best image hint from the provided list that matches the given topic.

Topic: {{{topic}}}

Available Hints:
{{#each availableHints}}
- {{{this}}}
{{/each}}

Analyze the topic and choose the one hint from the list that is the most semantically relevant.
Return only the selected hint in the 'bestHint' field.
`,
});

const findRelevantImageFlow = ai.defineFlow(
  {
    name: 'findRelevantImageFlow',
    inputSchema: FindRelevantImageInputSchema,
    outputSchema: FindRelevantImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
