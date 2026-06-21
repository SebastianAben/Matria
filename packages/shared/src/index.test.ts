import { describe, expect, it } from "vitest";
import { encounterCreateSchema, fail, ok, patientCreateSchema } from "./index.js";

describe("shared contracts", () => {
  it("validates patient creation payloads", () => {
    expect(
      patientCreateSchema.parse({ hospitalNumber: "MR-1", fullName: "Amina Rahman" })
    ).toMatchObject({ hospitalNumber: "MR-1" });
  });

  it("rejects incomplete encounter creation payloads", () => {
    expect(() => encounterCreateSchema.parse({ patientId: "not-a-uuid" })).toThrow();
  });

  it("creates stable response envelopes", () => {
    expect(ok({ healthy: true }, "req_1")).toEqual({
      success: true,
      data: { healthy: true },
      requestId: "req_1"
    });
    expect(fail("FORBIDDEN", "Denied", "req_2").error.code).toBe("FORBIDDEN");
  });
});
