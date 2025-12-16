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

// Generate daily diary entry from tasks
export interface DailyTask {
  description: string;
  completionStatus: 'completed' | 'in-progress' | 'pending';
  timeSpent?: number;
  learningOutcomes?: string;
}

export const generateDiaryEntry = async (
  tasks: DailyTask[],
  dayOfWeek: string,
  internName: string,
  university: string,
  course: string
): Promise<string> => {
  try {
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '') {
      // Generate a basic diary entry without AI
      const taskList = tasks.map((task, index) => 
        `${index + 1}. ${task.description} (${task.completionStatus}, ${task.timeSpent || 0} hours)`
      ).join('\n');
      
      return `Internship Diary Entry - ${dayOfWeek}

Today, I completed several important tasks as part of my internship at the organization. The activities undertaken have contributed to my professional development and practical learning experience.

Tasks Completed:
${taskList}

Throughout the day, I applied theoretical knowledge from my ${course} program at ${university} to practical workplace scenarios. Each task provided valuable learning opportunities and helped me develop essential professional skills including problem-solving, time management, and technical competencies.

The experience gained today has enhanced my understanding of industry practices and strengthened my ability to contribute effectively to organizational objectives. I look forward to continuing this learning journey and applying these insights in future tasks.`;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
You are an AI assistant helping an intern write their daily diary entry for university internship documentation.

Intern: ${internName}
University: ${university}
Course: ${course}
Day: ${dayOfWeek}

Tasks Completed Today:
${tasks.map((task, index) => `
${index + 1}. ${task.description}
   Status: ${task.completionStatus}
   Time Spent: ${task.timeSpent || 'N/A'} hours
   ${task.learningOutcomes ? `Learning Outcomes: ${task.learningOutcomes}` : ''}
`).join('\n')}

Please generate a professional diary entry (150-250 words) that:
1. Describes the day's work activities in a structured, professional manner
2. Highlights technical skills applied and practical learning gained
3. Connects tasks to academic knowledge from the ${course} program
4. Reflects on challenges encountered and problem-solving approaches
5. Demonstrates professional development and workplace competencies
6. Maintains an academic tone suitable for university evaluation

Format it as a cohesive paragraph or two, written in first person, appropriate for an internship diary submission.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating diary entry with Gemini AI:', error);
    
    // Return fallback content if Gemini AI fails
    const taskList = tasks.map((task, index) => 
      `${index + 1}. ${task.description} (${task.completionStatus}, ${task.timeSpent || 0} hours)`
    ).join('\n');
    
    return `Internship Diary Entry - ${dayOfWeek}

Today, I completed several important tasks as part of my internship at the organization. The activities undertaken have contributed to my professional development and practical learning experience.

Tasks Completed:
${taskList}

Throughout the day, I applied theoretical knowledge from my ${course} program at ${university} to practical workplace scenarios. Each task provided valuable learning opportunities and helped me develop essential professional skills including problem-solving, time management, and technical competencies.

The experience gained today has enhanced my understanding of industry practices and strengthened my ability to contribute effectively to organizational objectives. I look forward to continuing this learning journey and applying these insights in future tasks.`;
  }
};

// Generate weekly supervisor feedback based on all diary entries
export interface WeeklyDiaryData {
  day: string;
  tasks: DailyTask[];
  entry: string;
}

export const generateWeeklySupervisorFeedback = async (
  weekEntries: WeeklyDiaryData[],
  internName: string,
  university: string,
  course: string,
  weekNumber: number
): Promise<string> => {
  // Calculate totals outside try block so they're accessible in catch block
  const totalTasks = weekEntries.reduce((sum, day) => sum + day.tasks.length, 0);
  const totalHours = weekEntries.reduce((sum, day) => 
    sum + day.tasks.reduce((daySum, task) => daySum + (task.timeSpent || 0), 0), 0
  );

  try {
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '') {
      // Generate basic supervisor feedback without AI
      return `SUPERVISOR WEEKLY ASSESSMENT - Week ${weekNumber}

Intern: ${internName}
Institution: ${university}
Program: ${course}
Period: Week ${weekNumber}
Total Tasks Completed: ${totalTasks}
Total Hours: ${totalHours} hours

PERFORMANCE OVERVIEW:
${internName} has demonstrated satisfactory performance during Week ${weekNumber} of the internship program. The intern completed ${totalTasks} tasks with a total of ${totalHours} working hours, showing consistent engagement with assigned responsibilities.

SKILLS & COMPETENCIES:
The intern has shown adequate technical skills and a willingness to learn. Tasks were completed with reasonable quality, and the intern demonstrated the ability to apply academic knowledge from the ${course} program to practical workplace situations. Problem-solving skills are developing progressively.

PROFESSIONAL CONDUCT:
${internName} has maintained professional behavior throughout the week, including punctuality, effective communication with team members, and adherence to workplace policies. The intern shows respect for organizational procedures and demonstrates good work ethics.

AREAS OF STRENGTH:
- Consistent task completion
- Professional attitude and conduct  
- Willingness to learn and accept feedback
- Application of academic knowledge

RECOMMENDATIONS FOR DEVELOPMENT:
Continue building on current skills while seeking opportunities to take on more challenging assignments. Focus on enhancing technical competencies and developing greater independence in task execution. Overall performance is satisfactory for this stage of the internship.

Supervisor Assessment - Week ${weekNumber}`;
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
You are a workplace supervisor providing formal weekly feedback for an intern's university evaluation.

Intern: ${internName}
University: ${university}
Course/Program: ${course}
Week Number: ${weekNumber}
Total Tasks Completed: ${totalTasks}
Total Hours: ${totalHours} hours

Daily Diary Entries:

${weekEntries.map(day => `
${day.day}:
Tasks: ${day.tasks.map(t => `- ${t.description} (${t.completionStatus}, ${t.timeSpent || 0}h)`).join('\n')}

Diary Entry:
${day.entry}
`).join('\n---\n')}

Please generate comprehensive supervisor feedback (300-400 words) suitable for university internship assessment that:

1. **Performance Overview**: Assess overall performance, work quality, and productivity for the week
2. **Skills & Competencies**: Evaluate technical skills, problem-solving abilities, and application of academic knowledge
3. **Professional Conduct**: Comment on work ethic, punctuality, teamwork, communication, and professionalism
4. **Strengths**: Highlight specific accomplishments, positive attributes, and areas where the intern excelled
5. **Areas for Development**: Provide constructive feedback on skills to improve and learning opportunities
6. **Learning Outcomes**: Acknowledge connection between academic preparation and practical work
7. **Overall Assessment**: Provide a summary rating of performance and recommendation

Format the feedback as an official supervisor assessment with clear sections. Use a professional, objective tone suitable for academic evaluation. Be specific with examples from the week's work.

Sign off as: "Supervisor Assessment - Week ${weekNumber}"
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating weekly supervisor feedback with Gemini AI:', error);
    
    // Return fallback content if Gemini AI fails
    return `SUPERVISOR WEEKLY ASSESSMENT - Week ${weekNumber}

Intern: ${internName}
Institution: ${university}
Program: ${course}
Period: Week ${weekNumber}
Total Tasks Completed: ${totalTasks}
Total Hours: ${totalHours} hours

PERFORMANCE OVERVIEW:
${internName} has demonstrated satisfactory performance during Week ${weekNumber} of the internship program. The intern completed ${totalTasks} tasks with a total of ${totalHours} working hours, showing consistent engagement with assigned responsibilities.

SKILLS & COMPETENCIES:
The intern has shown adequate technical skills and a willingness to learn. Tasks were completed with reasonable quality, and the intern demonstrated the ability to apply academic knowledge from the ${course} program to practical workplace situations. Problem-solving skills are developing progressively.

PROFESSIONAL CONDUCT:
${internName} has maintained professional behavior throughout the week, including punctuality, effective communication with team members, and adherence to workplace policies. The intern shows respect for organizational procedures and demonstrates good work ethics.

AREAS OF STRENGTH:
- Consistent task completion
- Professional attitude and conduct  
- Willingness to learn and accept feedback
- Application of academic knowledge

RECOMMENDATIONS FOR DEVELOPMENT:
Continue building on current skills while seeking opportunities to take on more challenging assignments. Focus on enhancing technical competencies and developing greater independence in task execution. Overall performance is satisfactory for this stage of the internship.

Supervisor Assessment - Week ${weekNumber}`;
  }
};
