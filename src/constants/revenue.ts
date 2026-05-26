import { PeriodData } from "@/types";

export const PERIODS_MOCK: Record<string, PeriodData> = {
  today: {
    label: "Today",
    dateRange: "Sunday, 19 May 2026",
    compareLabel: "vs. last Sunday",
    metrics: {
      revenue: { value: 4200, delta: "+22%", tone: "up" },
      bookings: { value: 8, delta: "+2", tone: "up" },
      newCust: { value: 2, delta: "same", tone: "flat" },
      noShow: { value: 12.5, delta: "+5pp", tone: "down", unit: "%" },
      serviceTime: { value: 46, delta: "4m under", tone: "up", compare: "50m estimate", unit: "min" },
    },
    timing: {
      avgActualMinutes: 46,
      avgEstimatedMinutes: 50,
      completedWithTiming: 5,
      runningLate: 1,
      bestOnTimeStylist: "Anjali",
    },
    chart: {
      title: "Revenue by hour",
      data: [
        { x: "9 AM", v: 0 }, { x: "10", v: 300 }, { x: "11", v: 700 },
        { x: "12 PM", v: 700 }, { x: "1 PM", v: 0 }, { x: "2 PM", v: 80 },
        { x: "3 PM", v: 1300 }, { x: "4 PM", v: 500 }, { x: "5 PM", v: 0 },
        { x: "6 PM", v: 350 }, { x: "7 PM", v: 270 }, { x: "8 PM", v: 0 },
      ],
      highlight: 6,
    },
    topServices: [
      { name: "Hair Color", revenue: 1800, share: 43, bookings: 1, color: "teal" },
      { name: "Hair Spa", revenue: 900, share: 21, bookings: 1, color: "amber" },
      { name: "Facial", revenue: 700, share: 17, bookings: 1, color: "blue" },
      { name: "Pedicure", revenue: 500, share: 12, bookings: 1, color: "rose" },
      { name: "Manicure", revenue: 350, share: 8, bookings: 1, color: "gray" },
    ],
    topStylists: [
      { name: "Anjali", bookings: 3, revenue: 2400, share: 38, tone: "b" },
      { name: "Pooja", bookings: 2, revenue: 1100, share: 25, tone: "d" },
      { name: "Rekha", bookings: 2, revenue: 430, share: 25, tone: "e" },
      { name: "Kiran", bookings: 1, revenue: 270, share: 12, tone: "c" },
    ],
  },
  week: {
    label: "This week",
    dateRange: "13 – 19 May 2026",
    compareLabel: "vs. last week",
    metrics: {
      revenue: { value: 38420, delta: "+12%", tone: "up" },
      bookings: { value: 54, delta: "+8", tone: "up" },
      newCust: { value: 9, delta: "+3", tone: "up" },
      noShow: { value: 5.5, delta: "-1.2pp", tone: "up", unit: "%" },
      serviceTime: { value: 52, delta: "2m over", tone: "down", compare: "50m estimate", unit: "min" },
    },
    timing: {
      avgActualMinutes: 52,
      avgEstimatedMinutes: 50,
      completedWithTiming: 37,
      runningLate: 1,
      bestOnTimeStylist: "Pooja",
    },
    chart: {
      title: "Revenue by day",
      data: [
        { x: "MON", v: 4200 }, { x: "TUE", v: 2900 }, { x: "WED", v: 5400 },
        { x: "THU", v: 3700 }, { x: "FRI", v: 4900 }, { x: "SAT", v: 12120 },
        { x: "SUN", v: 5200 },
      ],
      highlight: 5,
    },
    topServices: [
      { name: "Hair Color", revenue: 14200, share: 37, bookings: 11, color: "teal" },
      { name: "Facial — Gold", revenue: 7000, share: 18, bookings: 5, color: "amber" },
      { name: "Hair Spa", revenue: 5400, share: 14, bookings: 6, color: "blue" },
      { name: "Highlights", revenue: 4200, share: 11, bookings: 3, color: "rose" },
      { name: "Bridal package", revenue: 3600, share: 9, bookings: 1, color: "gray" },
    ],
    topStylists: [
      { name: "Anjali", bookings: 26, revenue: 18400, share: 48, tone: "b" },
      { name: "Pooja", bookings: 14, revenue: 9200, share: 26, tone: "d" },
      { name: "Kiran", bookings: 9, revenue: 6300, share: 17, tone: "c" },
      { name: "Rekha", bookings: 5, revenue: 4520, share: 9, tone: "e" },
    ],
  },
  month: {
    label: "This month",
    dateRange: "1 – 19 May 2026 · so far",
    compareLabel: "vs. last month",
    metrics: {
      revenue: { value: 142800, delta: "+18%", tone: "up" },
      bookings: { value: 198, delta: "+24", tone: "up" },
      newCust: { value: 31, delta: "+9", tone: "up" },
      noShow: { value: 6.1, delta: "+0.4pp", tone: "down", unit: "%" },
      serviceTime: { value: 49, delta: "1m under", tone: "up", compare: "50m estimate", unit: "min" },
    },
    timing: {
      avgActualMinutes: 49,
      avgEstimatedMinutes: 50,
      completedWithTiming: 143,
      runningLate: 1,
      bestOnTimeStylist: "Anjali",
    },
    chart: {
      title: "Revenue by week",
      data: [
        { x: "W1", v: 28900 }, { x: "W2", v: 32400 }, { x: "W3", v: 43080 },
        { x: "W4", v: 38420 },
      ],
      highlight: 2,
    },
    topServices: [
      { name: "Hair Color", revenue: 52400, share: 37, bookings: 38, color: "teal" },
      { name: "Facial — Gold", revenue: 24800, share: 17, bookings: 18, color: "amber" },
      { name: "Hair Spa", revenue: 21600, share: 15, bookings: 24, color: "blue" },
      { name: "Highlights", revenue: 18900, share: 13, bookings: 13, color: "rose" },
      { name: "Bridal package", revenue: 12000, share: 8, bookings: 3, color: "gray" },
    ],
    topStylists: [
      { name: "Anjali", bookings: 92, revenue: 68200, share: 47, tone: "b" },
      { name: "Pooja", bookings: 48, revenue: 34600, share: 24, tone: "d" },
      { name: "Kiran", bookings: 34, revenue: 24400, share: 17, tone: "c" },
      { name: "Rekha", bookings: 24, revenue: 15600, share: 12, tone: "e" },
    ],
  },
};
