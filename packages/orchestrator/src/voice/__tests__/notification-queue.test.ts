import { describe, expect, test } from "bun:test"
import { NotificationQueue } from "../notification-queue"

describe("NotificationQueue", () => {
  test("enqueue marks queue as pending", () => {
    const queue = new NotificationQueue()

    queue.enqueue("Dispatch completed")

    expect(queue.hasPending()).toBe(true)
  })

  test("drain returns all items and clears queue", () => {
    const queue = new NotificationQueue()
    queue.enqueue("First")
    queue.enqueue("Second")

    expect(queue.drain()).toEqual(["First", "Second"])
    expect(queue.hasPending()).toBe(false)
  })

  test("drain on empty queue returns empty array", () => {
    const queue = new NotificationQueue()

    expect(queue.drain()).toEqual([])
    expect(queue.hasPending()).toBe(false)
  })
})
