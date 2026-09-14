import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess, checkRateLimit } from "@/lib/security";
import {
  validateSubmissionEligibility,
  advanceTeamRound,
} from "@/lib/state-machine";
import {
  validateAnswer,
  validateAllSubQuestions,
  SubQuestion,
} from "@/lib/answer-validator";

export async function POST(req: NextRequest) {
  try {
    const session = getTeamFromRequest(req);
    if (!session) {
      return jsonError("Unauthorized. Please log in.", 401);
    }

    const body = await req.json();
    const roundNumber = Number(body.roundNumber);
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    const subAnswers = body.subAnswers || {};

    if (isNaN(roundNumber) || roundNumber < 0 || roundNumber > 4) {
      return jsonError("Invalid round number.", 400);
    }

    // Rate Limiting per team
    const rateLimit = checkRateLimit(`submit_${session.teamId}`, 20, 30000);
    if (!rateLimit.allowed) {
      return jsonError("Too many attempts. Please slow down and try again in a few moments.", 429);
    }

    // State machine eligibility check
    const eligibility = await validateSubmissionEligibility(session.teamId, roundNumber);
    if (!eligibility.allowed) {
      return jsonError(eligibility.reason || "Submission not allowed.", 400);
    }

    // Fetch round config (team override or default)
    let config = await prisma.roundConfig.findFirst({
      where: { teamId: session.teamId, roundNumber },
    });

    if (!config) {
      config = await prisma.roundConfig.findFirst({
        where: { teamId: null, roundNumber },
      });
    }

    if (!config) {
      return jsonError("Round configuration not found.", 404);
    }

    let isCorrect = false;
    let acceptedAnswersList: string[] = [];

    try {
      acceptedAnswersList = JSON.parse(config.acceptedAnswers || "[]");
    } catch {
      acceptedAnswersList = [];
    }

    // Round 3 or Multi-subQuestion validation
    if (roundNumber === 3 || config.subQuestions) {
      let questions: SubQuestion[] = [];
      try {
        questions = JSON.parse(config.subQuestions || "[]");
      } catch {
        questions = [];
      }

      if (questions.length > 0) {
        const subResult = validateAllSubQuestions(subAnswers, questions);
        isCorrect = subResult.isValid;
      } else {
        isCorrect = validateAnswer(answer, acceptedAnswersList);
      }
    } else {
      isCorrect = validateAnswer(answer, acceptedAnswersList);
    }

    // Record submission attempt
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const requestId = crypto.randomUUID();

    await prisma.submissionAttempt.create({
      data: {
        teamId: session.teamId,
        roundNumber,
        rawInput: answer || JSON.stringify(subAnswers),
        isCorrect,
        requestId,
        ipAddress,
      },
    });

    // Update attempts count
    await prisma.teamProgress.update({
      where: { teamId: session.teamId },
      data: {
        totalAttempts: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    if (!isCorrect) {
      return jsonSuccess({
        isCorrect: false,
        message: "Incorrect answer. Check the clue and physical surroundings carefully.",
      });
    }

    // ADVANCE STATE
    const transition = await advanceTeamRound(session.teamId, roundNumber);

    return jsonSuccess({
      isCorrect: true,
      message: "Mission accomplished! Stage completed.",
      transition,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return jsonError("Server error processing your answer. Please try again.", 500);
  }
}
