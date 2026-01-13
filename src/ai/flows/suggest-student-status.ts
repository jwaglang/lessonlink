'use server';

/**
 * @fileOverview A student status suggestion AI agent.
 *
 * - suggestStudentStatus - A function that suggests the status of a student based on their payment and enrollment history.
 * - SuggestStudentStatusInput - The input type for the suggestStudentStatus function.
 * - SuggestStudentStatusOutput - The return type for the suggestStudentStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestStudentStatusInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  enrollmentStatus: z.string().describe('The current enrollment status of the student.'),
  paymentStatus: z.string().describe('The payment status of the student (paid or unpaid).'),
  packageBalance: z.number().describe('The remaining balance of the student\'s prepaid package.'),
  lessonsAttended: z.number().describe('The number of lessons the student has attended.'),
  goalMet: z.boolean().describe('Whether the student has met their learning goals.'),
});
export type SuggestStudentStatusInput = z.infer<typeof SuggestStudentStatusInputSchema>;

const SuggestStudentStatusOutputSchema = z.object({
  suggestedStatus: z.string().describe('The suggested status of the student (currently enrolled, unenrolled (package over), unenrolled (goal met), MIA).'),
  reason: z.string().describe('The reason for the suggested status.'),
});
export type SuggestStudentStatusOutput = z.infer<typeof SuggestStudentStatusOutputSchema>;

export async function suggestStudentStatus(input: SuggestStudentStatusInput): Promise<SuggestStudentStatusOutput> {
  return suggestStudentStatusFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestStudentStatusPrompt',
  input: {schema: SuggestStudentStatusInputSchema},
  output: {schema: SuggestStudentStatusOutputSchema},
  prompt: `You are an AI assistant helping tutors manage their student roster. Based on the student's information, suggest an appropriate status for the student from the following options: "currently enrolled", "unenrolled (package over)", "unenrolled (goal met)", "MIA". Explain your reasoning for the suggestion.

Student Name: {{{studentName}}}
Current Enrollment Status: {{{enrollmentStatus}}}
Payment Status: {{{paymentStatus}}}
Package Balance: {{{packageBalance}}}
Lessons Attended: {{{lessonsAttended}}}
Goal Met: {{#if goalMet}}Yes{{else}}No{{/if}}`,
});

const suggestStudentStatusFlow = ai.defineFlow(
  {
    name: 'suggestStudentStatusFlow',
    inputSchema: SuggestStudentStatusInputSchema,
    outputSchema: SuggestStudentStatusOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
