import { describe, expect, it } from "bun:test"
import {
  DEFAULT_KILL_SWITCH_PATH,
  isKillSwitchActive,
} from "../kill-switch"

describe("kill-switch", () => {
  it("checks default kill-switch path when no custom path is provided", () => {
    const lookedUpPaths: string[] = []

    const active = isKillSwitchActive({
      fileExists: path => {
        lookedUpPaths.push(path)
        return false
      },
    })

    expect(active).toBe(false)
    expect(lookedUpPaths).toEqual([DEFAULT_KILL_SWITCH_PATH])
  })

  it("returns true when kill-switch file exists", () => {
    const active = isKillSwitchActive({
      killSwitchPath: "~/.config/arachne/custom-kill-switch",
      fileExists: () => true,
    })

    expect(active).toBe(true)
  })

  it("returns false when kill-switch file does not exist", () => {
    const active = isKillSwitchActive({
      fileExists: () => false,
    })

    expect(active).toBe(false)
  })

  it("respects custom kill-switch path", () => {
    let checkedPath = ""

    isKillSwitchActive({
      killSwitchPath: "/tmp/arachne-kill-switch",
      fileExists: path => {
        checkedPath = path
        return false
      },
    })

    expect(checkedPath).toBe("/tmp/arachne-kill-switch")
  })

  it("reflects live toggle state when file appears or disappears", () => {
    let present = false

    const deps = {
      fileExists: () => present,
      killSwitchPath: "~/.config/arachne/kill-switch",
    }

    expect(isKillSwitchActive(deps)).toBe(false)

    present = true
    expect(isKillSwitchActive(deps)).toBe(true)

    present = false
    expect(isKillSwitchActive(deps)).toBe(false)
  })
})
