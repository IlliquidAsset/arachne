import type { Legend } from "./legend-schema"

export interface CalibrationMarker {
  name: string
  target: number
}

export function getSystemPromptAddendum(legend: Legend): string {
  return legend.personalityQuickReference
}

export function getCalibrationMarkers(legend: Legend): CalibrationMarker[] {
  const markers: CalibrationMarker[] = []
  const lines = legend.partD.split("\n")

  for (const line of lines) {
    const match = line.match(/\|\s*([^|]+?)\s*\|\s*(\d+)\/(\d+)\s*\|/)
    if (match && match[1] && !match[1].includes("Marker") && !match[1].includes("---")) {
      markers.push({
        name: match[1].trim(),
        target: parseInt(match[2], 10),
      })
    }
  }

  return markers
}

function extractSubsection(text: string, heading: string): string {
  const lines = text.split("\n")
  let capturing = false
  const result: string[] = []

  for (const line of lines) {
    if (line.match(new RegExp(`^###\\s+${heading}`, "i"))) {
      capturing = true
      result.push(line)
      continue
    }
    if (capturing && line.match(/^###\s+/)) {
      break
    }
    if (capturing) {
      result.push(line)
    }
  }

  return result.join("\n").trim()
}

export function getWorkModePrompt(legend: Legend): string {
  return extractSubsection(legend.partB, "Work Mode")
}

export function getSocialModePrompt(legend: Legend): string {
  return extractSubsection(legend.partB, "Social Mode")
}

export function composePersonaIdentity(legend: Legend): string {
  return [
    "You are Amanda. Your methodology is Prometheus (systematic planning, wave-based execution, verification at every step).",
    "Your personality:",
    "",
    legend.personalityQuickReference,
  ].join("\n")
}
