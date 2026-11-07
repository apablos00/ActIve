export type Step = "onboarding" | "library" | "session" | "summary";

export type MentorId = "stickler" | "chill" | "philosopher" | "enthusiast";

export const MENTORS: Record<MentorId, { name: string; style: string; accent: string }> = {
  stickler: { name: "The Stickler", style: "Strict and precise. “Define your terms.”", accent: "#fb7185" },
  chill: { name: "The Chill One", style: "Relaxed and warm. “No stress, walk me through it.”", accent: "#34d399" },
  philosopher: { name: "The Philosopher", style: "Slow and deep. “But why is that true?”", accent: "#a78bfa" },
  enthusiast: { name: "The Enthusiast", style: "Loves the subject. “Isn't this wild?!”", accent: "#f59e0b" },
};

// Onboarding choices. Keep them broad and few so picking is quick.
export const INTERESTS = ["Business and economics", "Politics and society", "Science and tech", "Arts and culture", "Health and psychology", "Law", "Environment"] as const;
export const HOBBIES = ["Sports", "Music", "Gaming", "Reading", "Film and series", "Food and cooking", "Travel", "Outdoors"] as const;

export const UNIVERSITIES = {
  uio: { label: "UiO", name: "University of Oslo" },
  bi: { label: "BI", name: "BI Norwegian Business School" },
  oslomet: { label: "OsloMet", name: "OsloMet, Oslo Metropolitan University" },
  kristiania: { label: "Kristiania", name: "Kristiania University of Applied Sciences" },
} as const;
export type UniversityId = keyof typeof UNIVERSITIES;

export const PROGRAMMES = ["Business", "Economics", "Law", "Computer science", "Engineering", "Psychology", "Health and nursing", "Social sciences", "Media and communication"] as const;
export const LEVELS = ["Bachelor", "Master", "PhD"] as const;
export const YEARS = ["1st", "2nd", "3rd", "4th+"] as const;

export type StudentProfile = {
  // 1. Get to know you
  firstName: string;
  lastName: string;
  interests: string[]; // from INTERESTS
  hobbies: string[]; // from HOBBIES
  // 2. Uni context ("" until picked)
  university: UniversityId | "";
  programme: string; // from PROGRAMMES
  level: string; // from LEVELS
  year: string; // from YEARS
  course: string; // free text: the course they're studying now
  // 3. Teacher
  mentor: MentorId;
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
