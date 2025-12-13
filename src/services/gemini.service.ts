import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface TaskSummary {
  date: string;
  description: string;
  hours: number;
}

export const generateWeeklyDiary = async (
  internName: string,
  weekNumber: number,
  year: number,
  tasks: TaskSummary[],
  totalHours: number
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
You are an AI assistant helping generate a professional weekly internship diary for university submission.

Intern: ${internName}
Week: ${weekNumber} of ${year}
Total Hours Worked: ${totalHours}/40 hours

Tasks Completed:
${tasks.map((task, index) => `${index + 1}. ${task.date}: ${task.description} (${task.hours} hours)`).join('\n')}

Please generate a comprehensive weekly diary entry suitable for university academic assessment that:
1. Summarizes the week's accomplishments in a professional academic tone
2. Highlights key learnings, skills developed, and practical applications of academic knowledge
3. Mentions specific tasks, their outcomes, and relevance to field of study
4. Reflects on challenges faced, problem-solving approaches, and lessons learned
5. Demonstrates professional growth and connection between theory and practice
6. Sets goals or areas for improvement aligned with learning objectives

Format the diary as a well-structured academic document with clear sections suitable for university evaluation. Keep it professional, reflective, and demonstrate learning outcomes.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating diary with Gemini AI:', error);
    throw new Error('Failed to generate weekly diary');
  }
};

export const generateSupervisorFeedback = async (
  internName: string,
  weekNumber: number,
  year: number,
  tasks: TaskSummary[],
  totalHours: number,
  diary: string
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
You are a workplace supervisor providing formal feedback to an intern for their university internship evaluation.

Intern: ${internName}
Week: ${weekNumber} of ${year}
Total Hours: ${totalHours}/40 hours

Weekly Diary Summary:
${diary}

Tasks Completed:
${tasks.map((task, index) => `${index + 1}. ${task.description} (${task.hours} hours)`).join('\n')}

Please generate professional supervisor feedback suitable for university assessment that:
1. Acknowledges specific accomplishments, work quality, and professional conduct
2. Evaluates technical skills, workplace readiness, and practical application of knowledge
3. Provides constructive feedback on areas of strength and improvement
4. Comments on work ethic, time management, and collaboration skills
5. Assesses the intern's ability to learn, adapt, and contribute to the organization
6. Offers specific recommendations for continued professional development
7. Includes an overall assessment of the intern's performance

Keep the tone professional, objective, and suitable for academic evaluation. Be specific with examples.
The feedback should be 3-4 paragraphs long, formatted as an official supervisor assessment.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating supervisor feedback with Gemini AI:', error);
    throw new Error('Failed to generate supervisor feedback');
  }
};

// Alias for backward compatibility
export const generateCEOFeedback = generateSupervisorFeedback;
