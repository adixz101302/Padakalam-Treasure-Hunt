import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess, checkRateLimit } from "@/lib/security";
import { validateSubmissionEligibility } from "@/lib/state-machine";
import { validateAnswer } from "@/lib/answer-validator";

export async function POST(req: NextRequest) {
  try {
    const session = getTeamFromRequest(req);
    if (!session) {
      return jsonError("Unauthorized. Please log in.", 401);
    }

    const body = await req.json();
    const roundNumber = Number(body.roundNumber);
    const locationInput = typeof body.locationInput === "string" ? body.locationInput.trim() : "";

    if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 4) {
      return jsonError("Invalid round number for location verification.", 400);
    }

    if (!locationInput) {
      return jsonError("Please enter target location answer.", 400);
    }

    // Rate Limiting per team
    const rateLimit = checkRateLimit(`loc_verify_${session.teamId}`, 20, 30000);
    if (!rateLimit.allowed) {
      return jsonError("Too many attempts. Please wait a moment before trying again.", 429);
    }

    // State machine eligibility check
    const eligibility = await validateSubmissionEligibility(session.teamId, roundNumber);
    if (!eligibility.allowed) {
      return jsonError(eligibility.reason || "Verification not allowed.", 400);
    }

    // Fetch round config (team override or default)
    let config = await withRetry(() =>
      prisma.roundConfig.findFirst({
        where: { teamId: session.teamId, roundNumber },
      })
    );

    if (!config) {
      config = await withRetry(() =>
        prisma.roundConfig.findFirst({
          where: { teamId: null, roundNumber },
        })
      );
    }

    if (!config) {
      return jsonError("Round configuration not found.", 404);
    }

    let validLocationAnswers: string[] = [];
    try {
      validLocationAnswers = JSON.parse(config.locationAnswers || "[]");
    } catch {
      validLocationAnswers = [];
    }

    // Fallback if locationAnswers is empty: check against locationText or title keywords
    if (validLocationAnswers.length === 0 && config.locationText) {
      validLocationAnswers = [config.locationText];
    }

    const isCorrect = validateAnswer(locationInput, validLocationAnswers);

    // Record submission attempt for audit log
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    await withRetry(() =>
      prisma.submissionAttempt.create({
        data: {
          teamId: session.teamId,
          roundNumber,
          stepNumber: 0, // Step 0 = Location Step
          rawInput: `[LOCATION_STEP]: ${locationInput}`,
          isCorrect,
          ipAddress,
        },
      })
    );

    if (!isCorrect) {
      return jsonSuccess({
        isCorrect: false,
        message: "Incorrect target location. Decode the location clue carefully.",
      });
    }

    // Mark Location Step as Verified (currentStep = 1)
    await withRetry(() =>
      prisma.teamProgress.update({
        where: { teamId: session.teamId },
        data: {
          currentStep: 1,
          lastActivityAt: new Date(),
        },
      })
    );

    return jsonSuccess({
      isCorrect: true,
      currentStep: 1,
      message: "TARGET LOCATION VERIFIED! Object Reconnaissance Clue unlocked.",
    });
  } catch (error) {
    console.error("Location verification error:", error);
    return jsonError("Server error verifying location. Please try again.", 500);
  }
}
