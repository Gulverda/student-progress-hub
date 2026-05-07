import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const DIFF_GE: Record<string, string> = {
  easy: "იოლი",
  medium: "საშუალო",
  hard: "რთული",
  complex: "კომპლექსური",
};

export interface GeneratedTask {
  title: string;
  description: string;
  difficulty: string;
  hint: string;
}

export const generateCatchupTasks = async (params: {
  studentName: string;
  courseTitle: string;
  difficulty: string;
  weakTopics: string[];
  currentWeek: number;
  missedHw: number;
  exampleTasks: { title: string; description: string }[];
}): Promise<GeneratedTask[]> => {
  const {
    studentName,
    courseTitle,
    difficulty,
    weakTopics,
    currentWeek,
    missedHw,
    exampleTasks,
  } = params;

  const examplesText = exampleTasks
    .map((t, i) => `${i + 1}. "${t.title}" — ${t.description}`)
    .join("\n");

  const prompt = `
შენ ხარ უნივერსიტეტის სასწავლო დამხმარე სისტემა.

სტუდენტის მონაცემები:
- სახელი: ${studentName}
- კურსი: ${courseTitle}
- მიმდინარე კვირა: ${currentWeek}
- გამოტოვებული დავალებები: ${missedHw}
- სუსტი თემები: ${weakTopics.length > 0 ? weakTopics.join(", ") : "ზოგადი"}
- რეკომენდებული სირთულე: ${DIFF_GE[difficulty]} (${difficulty})

გავლილი დავალებების მაგალითები:
${examplesText}

დაწერე 3 პერსონალიზებული Catch-up დავალება.
დავალებები უნდა შეესაბამებოდეს "${DIFF_GE[difficulty]}" სირთულეს და ეფუძნებოდეს გავლილ მასალას.

უპასუხე ᲛᲮᲝᲚᲝᲓ JSON-ით, სხვა ტექსტი არ დაამატო:
[
  {
    "title": "დავალების სათაური",
    "description": "დეტალური პირობა",
    "difficulty": "${difficulty}",
    "hint": "მინიშნება სტუდენტისთვის"
  }
]`;

  const result = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const text = result.choices[0].message.content ?? "";
  const clean = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const tasks: GeneratedTask[] = JSON.parse(clean);
    return tasks.slice(0, 3);
  } catch {
    console.error("GROQ_PARSE_ERROR:", clean);
    throw new Error("Groq-ის პასუხი ვერ დაპარსდა");
  }
};
