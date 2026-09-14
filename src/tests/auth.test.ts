import { describe, it, expect } from "vitest";
import { signTeamToken, verifyTeamToken, signAdminToken, verifyAdminToken } from "../lib/auth";

describe("Authentication System Tests", () => {
  it("should sign and verify valid team JWT tokens", () => {
    const token = signTeamToken({ teamId: "TEAM001", teamName: "Alpha Vanguard" });
    expect(token).toBeDefined();

    const verified = verifyTeamToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.teamId).toBe("TEAM001");
    expect(verified?.teamName).toBe("Alpha Vanguard");
    expect(verified?.role).toBe("team");
  });

  it("should reject tampered or invalid team tokens", () => {
    const invalidToken = "invalid.token.payload";
    const verified = verifyTeamToken(invalidToken);
    expect(verified).toBeNull();
  });

  it("should sign and verify valid admin tokens", () => {
    const token = signAdminToken("admin");
    expect(token).toBeDefined();

    const verified = verifyAdminToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.username).toBe("admin");
    expect(verified?.role).toBe("admin");
  });

  it("should not allow a team token to verify as an admin", () => {
    const teamToken = signTeamToken({ teamId: "TEAM001", teamName: "Alpha" });
    const verifiedAsAdmin = verifyAdminToken(teamToken);
    expect(verifiedAsAdmin).toBeNull();
  });
});
