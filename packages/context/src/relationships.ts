import { z } from "zod/v4";

export interface Relationship {
  name: string;
  relationship: string;
  notes: string;
  lastMentioned?: Date;
}

export interface RelationshipDependencies {
  upsertRelationship?: (relationship: Relationship) => void;
  updateRelationship?: (name: string, updates: Partial<Relationship>) => void;
  recordMention?: (name: string, mentionedAt: Date) => void;
}

const nameSchema = z.string().trim().min(1);
const relationshipSchema = z.string().trim().min(1);

const relationshipStore = new Map<string, Relationship>();
let dependencies: RelationshipDependencies = {};

function toKey(name: string): string {
  return name.trim().toLowerCase();
}

function cloneRelationship(value: Relationship): Relationship {
  return {
    ...value,
    lastMentioned: value.lastMentioned ? new Date(value.lastMentioned) : undefined,
  };
}

function seedRelationship(name: string, relationship: string, notes: string): void {
  relationshipStore.set(toKey(name), {
    name,
    relationship,
    notes,
  });
}

seedRelationship("Samantha", "wife", "Commander's wife");
seedRelationship("Scarlett", "daughter", "Commander's daughter");

export function setRelationshipDependencies(nextDependencies: RelationshipDependencies): void {
  dependencies = nextDependencies;
}

export function getRelationships(): Relationship[] {
  return Array.from(relationshipStore.values())
    .map((value) => cloneRelationship(value))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function addRelationship(name: string, relationship: string, notes: string = ""): void {
  const parsedName = nameSchema.parse(name);
  const parsedRelationship = relationshipSchema.parse(relationship);
  const key = toKey(parsedName);
  const existing = relationshipStore.get(key);

  const nextRecord: Relationship = {
    name: parsedName,
    relationship: parsedRelationship,
    notes: notes.trim(),
    lastMentioned: existing?.lastMentioned,
  };

  relationshipStore.set(key, nextRecord);
  dependencies.upsertRelationship?.(cloneRelationship(nextRecord));
}

export function updateRelationship(name: string, updates: Partial<Relationship>): void {
  const parsedName = nameSchema.parse(name);
  const key = toKey(parsedName);
  const existing = relationshipStore.get(key);

  if (!existing) {
    throw new Error(`Relationship not found for ${parsedName}`);
  }

  const nextRecord: Relationship = {
    ...existing,
    ...updates,
    name: existing.name,
  };

  relationshipStore.set(key, nextRecord);
  dependencies.updateRelationship?.(existing.name, cloneRelationship(nextRecord));
}

export function mentionDetected(name: string): void {
  const parsedName = nameSchema.parse(name);
  const key = toKey(parsedName);
  const existing = relationshipStore.get(key);
  const now = new Date();

  if (!existing) {
    const created: Relationship = {
      name: parsedName,
      relationship: "mentioned",
      notes: "Detected in conversation",
      lastMentioned: now,
    };
    relationshipStore.set(key, created);
    dependencies.upsertRelationship?.(cloneRelationship(created));
    dependencies.recordMention?.(created.name, now);
    return;
  }

  const updated: Relationship = {
    ...existing,
    lastMentioned: now,
  };

  relationshipStore.set(key, updated);
  dependencies.recordMention?.(updated.name, now);
}
