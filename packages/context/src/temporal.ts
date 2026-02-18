export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
export type DayType = "weekday" | "weekend";
export type Season = "spring" | "summer" | "fall" | "winter";

export interface HolidayStatus {
  isHoliday: boolean;
  name?: string;
}

export interface InteractionTimeDelta {
  minutes: number;
  hours: number;
  days: number;
  humanReadable: string;
}

function pluralize(value: number, singular: string, plural: string): string {
  return value === 1 ? singular : plural;
}

function isNthWeekdayOfMonth(date: Date, weekday: number, occurrence: number): boolean {
  if (date.getDay() !== weekday) {
    return false;
  }

  return Math.ceil(date.getDate() / 7) === occurrence;
}

function isLastWeekdayOfMonth(date: Date, weekday: number): boolean {
  if (date.getDay() !== weekday) {
    return false;
  }

  const nextWeek = new Date(date);
  nextWeek.setDate(date.getDate() + 7);
  return nextWeek.getMonth() !== date.getMonth();
}

function getHumanReadableDuration(minutes: number, hours: number, days: number): string {
  if (minutes <= 0) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} ${pluralize(minutes, "minute", "minutes")} ago`;
  }

  if (hours < 24) {
    const hourValue = Math.floor(hours);
    return `${hourValue} ${pluralize(hourValue, "hour", "hours")} ago`;
  }

  if (days < 30) {
    const dayValue = Math.floor(days);
    return `${dayValue} ${pluralize(dayValue, "day", "days")} ago`;
  }

  if (days < 365) {
    const monthValue = Math.floor(days / 30);
    return `${monthValue} ${pluralize(monthValue, "month", "months")} ago`;
  }

  const yearValue = Math.floor(days / 365);
  return `${yearValue} ${pluralize(yearValue, "year", "years")} ago`;
}

export function getTimeOfDay(time: Date = new Date()): TimeOfDay {
  const hour = time.getHours();

  if (hour >= 6 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }

  if (hour >= 17 && hour < 21) {
    return "evening";
  }

  return "night";
}

export function getDayType(time: Date = new Date()): DayType {
  const day = time.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function getSeason(time: Date = new Date()): Season {
  const month = time.getMonth();

  if (month >= 2 && month <= 4) {
    return "spring";
  }

  if (month >= 5 && month <= 7) {
    return "summer";
  }

  if (month >= 8 && month <= 10) {
    return "fall";
  }

  return "winter";
}

export function isHoliday(time: Date = new Date()): HolidayStatus {
  const month = time.getMonth();
  const day = time.getDate();

  if (month === 0 && day === 1) {
    return { isHoliday: true, name: "New Year's Day" };
  }

  if (month === 6 && day === 4) {
    return { isHoliday: true, name: "Independence Day" };
  }

  if (month === 11 && day === 25) {
    return { isHoliday: true, name: "Christmas Day" };
  }

  if (month === 0 && isNthWeekdayOfMonth(time, 1, 3)) {
    return { isHoliday: true, name: "Martin Luther King Jr. Day" };
  }

  if (month === 1 && isNthWeekdayOfMonth(time, 1, 3)) {
    return { isHoliday: true, name: "Presidents' Day" };
  }

  if (month === 4 && isLastWeekdayOfMonth(time, 1)) {
    return { isHoliday: true, name: "Memorial Day" };
  }

  if (month === 8 && isNthWeekdayOfMonth(time, 1, 1)) {
    return { isHoliday: true, name: "Labor Day" };
  }

  if (month === 10 && isNthWeekdayOfMonth(time, 4, 4)) {
    return { isHoliday: true, name: "Thanksgiving Day" };
  }

  return { isHoliday: false };
}

export function getTimeSinceLastInteraction(lastInteractionTime: Date): InteractionTimeDelta {
  const elapsedMs = Math.max(0, Date.now() - lastInteractionTime.getTime());
  const minutes = Math.round(elapsedMs / 60000);
  const hours = Number((minutes / 60).toFixed(2));
  const days = Number((hours / 24).toFixed(3));

  return {
    minutes,
    hours,
    days,
    humanReadable: getHumanReadableDuration(minutes, hours, days),
  };
}
