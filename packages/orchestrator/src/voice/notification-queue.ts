export class NotificationQueue {
  private queue: string[] = []

  enqueue(notification: string): void {
    this.queue.push(notification)
  }

  drain(): string[] {
    const items = [...this.queue]
    this.queue.length = 0
    return items
  }

  hasPending(): boolean {
    return this.queue.length > 0
  }
}
