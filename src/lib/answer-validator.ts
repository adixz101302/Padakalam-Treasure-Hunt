export interface SubQuestion {
  id: number;
  question: string;
  acceptedAnswers: string[];
}

/**
 * Normalizes input for robust comparison
 */
export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
}

/**
 * Checks if user input matches any accepted answer
 */
export function validateAnswer(
  userInput: string,
  acceptedAnswers: string[]
): boolean {
  if (!userInput || !acceptedAnswers || acceptedAnswers.length === 0) {
    return false;
  }

  const normalizedInput = normalizeString(userInput);

  return acceptedAnswers.some((accepted) => {
    const normalizedAccepted = normalizeString(accepted);
    return normalizedInput === normalizedAccepted;
  });
}

/**
 * Validates all 4 sub-questions (e.g. for Round 3)
 */
export function validateAllSubQuestions(
  userAnswers: Record<string | number, string>,
  questions: SubQuestion[]
): { isValid: boolean; results: Record<number, boolean>; correctCount: number; totalCount: number } {
  if (!questions || questions.length === 0) {
    return { isValid: true, results: {}, correctCount: 0, totalCount: 0 };
  }

  const results: Record<number, boolean> = {};
  let correctCount = 0;

  for (const q of questions) {
    const ans = userAnswers[q.id] || "";
    const isCorrect = validateAnswer(ans, q.acceptedAnswers);
    results[q.id] = isCorrect;
    if (isCorrect) correctCount++;
  }

  return {
    isValid: correctCount === questions.length,
    results,
    correctCount,
    totalCount: questions.length,
  };
}

/**
 * Applies deterministic clue transformations for Round 2
 */
export function applyClueTransformation(
  text: string,
  transform: "NORMAL" | "MIRRORED" | "JUMBLED" | "MIRRORED_JUMBLED" | string
): string {
  if (!text) return "";

  switch (transform) {
    case "MIRRORED":
      return text.split("").reverse().join("");

    case "JUMBLED": {
      // Jumble each word while keeping structure
      const words = text.split(" ");
      const jumbledWords = words.map((w) => {
        if (w.length <= 2) return w;
        const chars = w.split("");
        // Deterministic jumble based on char codes
        return chars
          .sort((a, b) => (a.charCodeAt(0) % 3) - (b.charCodeAt(0) % 3))
          .join("");
      });
      return jumbledWords.join(" ");
    }

    case "MIRRORED_JUMBLED": {
      const words = text.split(" ");
      const jumbledWords = words.map((w) => {
        if (w.length <= 2) return w;
        const chars = w.split("");
        return chars
          .sort((a, b) => (a.charCodeAt(0) % 3) - (b.charCodeAt(0) % 3))
          .join("");
      });
      return jumbledWords.join(" ").split("").reverse().join("");
    }

    case "NORMAL":
    default:
      return text;
  }
}
