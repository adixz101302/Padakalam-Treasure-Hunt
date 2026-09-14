import { describe, it, expect, beforeAll } from "vitest";
import prisma from "../lib/db";
import {
  validateSubmissionEligibility,
  advanceTeamRound,
} from "../lib/state-machine";

describe("State Machine & Game Flow Tests", () => {
  beforeAll(async () => {
    // Ensure test team exists in fresh initial state
    await prisma.team.upsert({
      where: { teamId: "TEST_SM_01" },
      update: {
        isDisqualified: false,
        isActive: true,
        progress: {
          upsert: {
            create: { state: "QUALIFIER_ACTIVE", currentRound: 0 },
            update: { state: "QUALIFIER_ACTIVE", currentRound: 0 },
          },
        },
      },
      create: {
        teamId: "TEST_SM_01",
        teamName: "State Machine Test Team",
        progress: {
          create: { state: "QUALIFIER_ACTIVE", currentRound: 0 },
        },
      },
    });

    await prisma.event.upsert({
      where: { id: "test-event-id" },
      update: { status: "ACTIVE", isLocked: false },
      create: { id: "test-event-id", name: "Test Event", status: "ACTIVE" },
    });
  });

  it("should allow submission for current active round (Round 0)", async () => {
    const check = await validateSubmissionEligibility("TEST_SM_01", 0);
    expect(check.allowed).toBe(true);
  });

  it("should block submission for out-of-order rounds (Round 3 when on Round 0)", async () => {
    const check = await validateSubmissionEligibility("TEST_SM_01", 3);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Out of sequence");
  });

  it("should advance from Qualifier (0) to Round 1 (1)", async () => {
    const result = await advanceTeamRound("TEST_SM_01", 0);
    expect(result.success).toBe(true);
    expect(result.nextRound).toBe(1);
    expect(result.state).toBe("ROUND_1_ACTIVE");

    const progress = await prisma.teamProgress.findUnique({
      where: { teamId: "TEST_SM_01" },
    });
    expect(progress?.currentRound).toBe(1);
    expect(progress?.state).toBe("ROUND_1_ACTIVE");
    expect(progress?.qualifierCompletedAt).not.toBeNull();
  });

  it("should block submissions when the event is PAUSED by admin", async () => {
    await prisma.event.updateMany({ data: { status: "PAUSED" } });

    const check = await validateSubmissionEligibility("TEST_SM_01", 1);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("PAUSED");

    // Restore event status to ACTIVE
    await prisma.event.updateMany({ data: { status: "ACTIVE" } });
  });
});
