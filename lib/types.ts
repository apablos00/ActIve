export type Step = "onboarding" | "library" | "session" | "summary";

export type MentorId = "coach" | "founder" | "scientist";

export const MENTORS: Record<MentorId, { name: string; style: string; accent: string }> = {
  coach: { name: "Coach", style: "Football coach before a final. High energy.", accent: "#22d3ee" },
  founder: { name: "Founder", style: "Impatient founder. “So what? Who pays?”", accent: "#f59e0b" },
  scientist: { name: "Scientist", style: "Calm researcher. “How would you test that?”", accent: "#a78bfa" },
};

export type StudentProfile = {
  name: string;
  course: string;
  hobbies: string[];
  careerGoal: string;
  mentor: MentorId;
  challenge: 1 | 2 | 3; // 1 gentle, 3 relentless
};

export type Concept = {
  id: string; // "c1"
  name: string;
  explanation: string; // max 60 words, source only
  pages: number[];
  misconception: string; // real trap
  bridge: string; // analogy from hobby or career
};

export type ConceptMap = {
  id: string;
  title: string;
  mainIdeas: string[]; // 3
  concepts: Concept[]; // 5-8
  source?: "canvas"; // set by the mocked Canvas import
};

export type SessionResult = {
  mastery: Record<string, 0 | 1 | 2 | 3>;
  review: string[];
  flagged: string[];
  answerRequests: number;
  ownExplanations: number;
  thinkingScore: number;
};
