import { describe, expect, it } from "bun:test";
import {
  addRelationship,
  getRelationships,
  mentionDetected,
  updateRelationship,
} from "../relationships.js";

describe("relationships", () => {
  it("starts with Samantha and Scarlett pre-seeded", () => {
    const relationships = getRelationships();
    const samantha = relationships.find((entry) => entry.name === "Samantha");
    const scarlett = relationships.find((entry) => entry.name === "Scarlett");

    expect(samantha).toBeDefined();
    expect(samantha?.relationship).toBe("wife");
    expect(scarlett).toBeDefined();
    expect(scarlett?.relationship).toBe("daughter");
  });

  it("adds a new relationship", () => {
    const beforeCount = getRelationships().length;

    addRelationship("Jordan", "friend", "Neighbor and tennis partner");

    const relationships = getRelationships();
    const jordan = relationships.find((entry) => entry.name === "Jordan");

    expect(relationships).toHaveLength(beforeCount + 1);
    expect(jordan).toBeDefined();
    expect(jordan?.notes).toBe("Neighbor and tennis partner");
  });

  it("updates an existing relationship", () => {
    addRelationship("Taylor", "mentor", "Met through work");
    updateRelationship("Taylor", {
      relationship: "trusted mentor",
      notes: "Monthly coffee catch-up",
    });

    const taylor = getRelationships().find((entry) => entry.name === "Taylor");

    expect(taylor).toBeDefined();
    expect(taylor?.relationship).toBe("trusted mentor");
    expect(taylor?.notes).toBe("Monthly coffee catch-up");
  });

  it("updates lastMentioned when mentionDetected is called", () => {
    const beforeMention = Date.now();
    mentionDetected("Scarlett");

    const scarlett = getRelationships().find((entry) => entry.name === "Scarlett");

    expect(scarlett?.lastMentioned).toBeDefined();
    expect(scarlett?.lastMentioned?.getTime()).toBeGreaterThanOrEqual(beforeMention);
  });
});
