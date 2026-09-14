import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getTeamFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess, checkRateLimit } from "@/lib/security";
import { validateAnswer, SubQuestion } from "@/lib/answer-validator";

export async function POST(req: NextRequest) {
  try {
    const session = getTeamFromRequest(req);
    if (!session) {
      return jsonError("Unauthorized. Please log in.", 401);
    }

    // Rate limit per team (50 checks per minute)
    const rateLimit = checkRateLimit(`check_sub_${session.teamId}`, 50, 60000);
    if (!rateLimit.allowed) {
      return jsonError("Too many checks. Please slow down.", 429);
    }

    const body = await req.json();
    const roundNumber = Number(body.roundNumber);
    const questionId = Number(body.questionId);
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";

    if (!answer) {
      return jsonSuccess({ isCorrect: false, message: "Please enter an answer." });
    }

    // Fetch round config (team-specific or global)
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

    // Parse sub-questions
    let questions: SubQuestion[] = [];
    try {
      questions = JSON.parse(config.subQuestions || "[]");
    } catch {
      questions = [];
    }

    const targetQuestion = questions.find((q) => q.id === questionId);
    if (!targetQuestion) {
      return jsonError("Question not found.", 404);
    }

    const isCorrect = validateAnswer(answer, targetQuestion.acceptedAnswers);

    return jsonSuccess({
      isCorrect,
      questionId,
      message: isCorrect
        ? "✓ Correct! Question verified."
        : "✗ Incorrect. Check the physical location again.",
    });
  } catch (error) {
    console.error("Sub-question check error:", error);
    return jsonError("Server error verifying answer.", 500);
  }
}
