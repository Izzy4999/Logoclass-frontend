/**
 * Dummy analytics data — replace with real API calls once the backend
 * implements the analytics endpoints listed at the bottom of this file.
 */

// ─── Monthly labels (last 7 months) ──────────────────────────────────────────
export const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

// ─── Attendance trend ─────────────────────────────────────────────────────────
export const attendanceTrend = [
  { month: "Sep", rate: 82, present: 410, absent: 90 },
  { month: "Oct", rate: 87, present: 435, absent: 65 },
  { month: "Nov", rate: 79, present: 395, absent: 105 },
  { month: "Dec", rate: 91, present: 455, absent: 45 },
  { month: "Jan", rate: 85, present: 425, absent: 75 },
  { month: "Feb", rate: 88, present: 440, absent: 60 },
  { month: "Mar", rate: 93, present: 465, absent: 35 },
];

// ─── Enrollment growth ────────────────────────────────────────────────────────
export const enrollmentTrend = [
  { month: "Sep", students: 310, teachers: 28 },
  { month: "Oct", students: 342, teachers: 30 },
  { month: "Nov", students: 358, teachers: 31 },
  { month: "Dec", students: 365, teachers: 31 },
  { month: "Jan", students: 390, teachers: 33 },
  { month: "Feb", students: 418, teachers: 35 },
  { month: "Mar", students: 445, teachers: 36 },
];

// ─── Payment collection ───────────────────────────────────────────────────────
export const paymentTrend = [
  { month: "Sep", collected: 420000,  outstanding: 80000  },
  { month: "Oct", collected: 510000,  outstanding: 60000  },
  { month: "Nov", collected: 390000,  outstanding: 110000 },
  { month: "Dec", collected: 620000,  outstanding: 40000  },
  { month: "Jan", collected: 580000,  outstanding: 70000  },
  { month: "Feb", collected: 710000,  outstanding: 50000  },
  { month: "Mar", collected: 760000,  outstanding: 35000  },
];

// ─── Assignment submission by class ──────────────────────────────────────────
export const assignmentCompletion = [
  { class: "JSS 1A", submitted: 28, total: 30, rate: 93 },
  { class: "JSS 2B", submitted: 24, total: 30, rate: 80 },
  { class: "SS 1A",  submitted: 27, total: 30, rate: 90 },
  { class: "SS 2B",  submitted: 20, total: 30, rate: 67 },
  { class: "SS 3A",  submitted: 29, total: 30, rate: 97 },
  { class: "JSS 3C", submitted: 22, total: 30, rate: 73 },
];

// ─── User role distribution (pie) ────────────────────────────────────────────
export const roleDistribution = [
  { name: "Students", value: 445, color: "#6366f1" },
  { name: "Teachers", value: 36,  color: "#22c55e" },
  { name: "Parents",  value: 210, color: "#f97316" },
  { name: "Admins",   value: 8,   color: "#1e40af" },
];

// ─── Quiz / Exam performance ──────────────────────────────────────────────────
export const quizPerformance = [
  { name: "Mathematics Q1", avg: 72, passRate: 68 },
  { name: "English Q2",     avg: 81, passRate: 85 },
  { name: "Physics Q1",     avg: 64, passRate: 55 },
  { name: "Chemistry Q2",   avg: 69, passRate: 61 },
  { name: "Biology Q1",     avg: 78, passRate: 80 },
];

// ─── Overview stats ───────────────────────────────────────────────────────────
export const overviewStats = {
  totalUsers:        699,
  totalClasses:      18,
  avgAttendanceRate: 86,
  totalAssignments:  124,
  revenueCollected:  3_990_000,
  liveClassesHeld:   47,
  activeAnnouncements: 12,
  pendingAssignments:  31,
};

// ─── Super admin platform stats ───────────────────────────────────────────────
export const platformStats = {
  totalSchools:   24,
  activeSchools:  18,
  pendingSchools:  4,
  suspendedSchools: 2,
  totalUsers:    12840,
  newThisMonth:     3,
};

export const schoolRegistrationTrend = [
  { month: "Sep", registrations: 2, active: 14 },
  { month: "Oct", registrations: 3, active: 15 },
  { month: "Nov", registrations: 1, active: 16 },
  { month: "Dec", registrations: 4, active: 18 },
  { month: "Jan", registrations: 2, active: 19 },
  { month: "Feb", registrations: 3, active: 21 },
  { month: "Mar", registrations: 3, active: 24 },
];

export const platformSchoolStatus = [
  { name: "Active",    value: 18, color: "#22c55e" },
  { name: "Pending",   value:  4, color: "#f59e0b" },
  { name: "Suspended", value:  2, color: "#f97316" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSED API ENDPOINTS (for backend implementation)
// Replace the dummy data above with real calls to these endpoints:
//
// GET /analytics/overview
//   → { totalUsers, totalClasses, avgAttendanceRate, totalAssignments,
//       revenueCollected, liveClassesHeld, activeAnnouncements, pendingAssignments }
//
// GET /analytics/attendance-trend
//   → { data: [{ month, rate, present, absent }] }
//
// GET /analytics/enrollment-trend
//   → { data: [{ month, students, teachers }] }
//
// GET /analytics/payment-trend
//   → { data: [{ month, collected, outstanding }] }
//
// GET /analytics/assignment-completion
//   → { data: [{ class, submitted, total, rate }] }
//
// GET /analytics/role-distribution
//   → { data: [{ name, value }] }
//
// GET /analytics/quiz-performance
//   → { data: [{ name, avg, passRate }] }
//
// ── Super Admin ──────────────────────────────────────────────────────────────
//
// GET /analytics/platform/overview
//   → { totalSchools, activeSchools, pendingSchools, suspendedSchools,
//       totalUsers, newThisMonth }
//
// GET /analytics/platform/school-registrations
//   → { data: [{ month, registrations, active }] }
//
// GET /analytics/platform/school-status
//   → { data: [{ name, value }] }
// ─────────────────────────────────────────────────────────────────────────────
