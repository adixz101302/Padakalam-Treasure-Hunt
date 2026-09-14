import { describe, it, expect } from "vitest";
import {
  normalizeString,
  validateAnswer,
  validateAllSubQuestions,
  applyClueTransformation,
  SubQuestion,
} from "../lib/answer-validator";

describe("Answer Validation & Normalization Tests", () => {
  it("should normalize strings with whitespace, casing, and punctuation", () => {
    expect(normalizeString("  Thermometer! ")).toBe("thermometer");
    expect(normalizeString("Campus Garden   ")).toBe("campus garden");
    expect(normalizeString("P.A.R.K.")).toBe("park");
  });

  it("should validate accepted answers case-insensitively and with trimmed spacing", () => {
    const accepted = ["thermometer", "temperature meter", "temperature gauge"];

    expect(validateAnswer("thermometer", accepted)).toBe(true);
    expect(validateAnswer("  THERMOMETER  ", accepted)).toBe(true);
    expect(validateAnswer("Temperature Meter", accepted)).toBe(true);
    expect(validateAnswer("barometer", accepted)).toBe(false);
    expect(validateAnswer("", accepted)).toBe(false);
  });

  it("should validate all 4 sub-questions for Round 3 strictly", () => {
    const questions: SubQuestion[] = [
      { id: 1, question: "Bench plaque?", acceptedAnswers: ["founding batch", "batch 2020"] },
      { id: 2, question: "Lantern count?", acceptedAnswers: ["4", "four"] },
      { id: 3, question: "Archway color?", acceptedAnswers: ["green", "emerald"] },
      { id: 4, question: "Plaque number?", acceptedAnswers: ["2026", "1947"] },
    ];

    // All correct
    const validAnswers = {
      1: "founding batch",
      2: "4",
      3: "emerald",
      4: "2026",
    };
    const resultValid = validateAllSubQuestions(validAnswers, questions);
    expect(resultValid.isValid).toBe(true);
    expect(resultValid.correctCount).toBe(4);

    // 3 correct, 1 wrong
    const partialAnswers = {
      1: "founding batch",
      2: "4",
      3: "red", // wrong
      4: "2026",
    };
    const resultPartial = validateAllSubQuestions(partialAnswers, questions);
    expect(resultPartial.isValid).toBe(false);
    expect(resultPartial.correctCount).toBe(3);
  });

  it("should apply clue transformations correctly", () => {
    const original = "TREASURE";
    const mirrored = applyClueTransformation(original, "MIRRORED");
    expect(mirrored).toBe("ERUSAERT");

    const normal = applyClueTransformation(original, "NORMAL");
    expect(normal).toBe("TREASURE");
  });
});
