import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./test-utils.js";

describe("health endpoints", () => {
  it("returns a stable health envelope", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe("matria-api");
    expect(response.body.requestId).toBeTruthy();
  });

  it("returns a stable unknown route error", async () => {
    const response = await request(app).get("/missing-route").expect(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
