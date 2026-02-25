/**
 * Star Trek Alert System
 *
 * Three tiers:
 *   RED ALERT    — immediate action required
 *   YELLOW ALERT — elevated caution / watch
 *   BLUE ALERT   — informational / low priority
 */

import type {
  Student,
  StudentPackage,
  StudentCredit,
  SessionInstance,
  ApprovalRequest,
  StudentProgress,
  StudentRewards,
} from './types';
import { differenceInDays, parseISO } from 'date-fns';
import { getIncompleteFields } from './profile-completeness';

// ── Types ──

export type AlertLevel = 'red' | 'yellow' | 'blue';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  link?: string;
  studentId?: string;
  timestamp: string; // ISO string
}

// ── Alert level priority (lower = higher priority) ──

const LEVEL_PRIORITY: Record<AlertLevel, number> = {
  red: 0,
  yellow: 1,
  blue: 2,
};

// ── Styling config ──

export function getAlertConfig(level: AlertLevel) {
  switch (level) {
    case 'red':
      return {
        label: 'RED ALERT',
        borderColor: 'border-l-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/10',
        textColor: 'text-red-800 dark:text-red-300',
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      };
    case 'yellow':
      return {
        label: 'YELLOW ALERT',
        borderColor: 'border-l-amber-500',
        bgColor: 'bg-amber-50 dark:bg-amber-900/10',
        textColor: 'text-amber-800 dark:text-amber-300',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      };
    case 'blue':
      return {
        label: 'BLUE ALERT',
        borderColor: 'border-l-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/10',
        textColor: 'text-blue-800 dark:text-blue-300',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      };
  }
}

// ── Sorting helper ──

function sortAlerts(alerts: Alert[]): Alert[] {
  return alerts.sort((a, b) => {
    const levelDiff = LEVEL_PRIORITY[a.level] - LEVEL_PRIORITY[b.level];
    if (levelDiff !== 0) return levelDiff;
    // Within the same level, newest first
    return b.timestamp.localeCompare(a.timestamp);
  });
}

// ── Tutor Alerts ──

export function generateTutorAlerts(
  students: Student[],
  packages: StudentPackage[],
  _credits: StudentCredit[],
  sessions: SessionInstance[],
  approvals: ApprovalRequest[]
): Alert[] {
  const now = new Date().toISOString();
  const alerts: Alert[] = [];

  // === RED ALERTS ===

  // Package expired
  for (const pkg of packages) {
    if (pkg.status === 'expired') {
      const student = students.find((s) => s.id === pkg.studentId);
      alerts.push({
        id: `red-pkg-expired-${pkg.id}`,
        level: 'red',
        title: 'Package Expired',
        description: `${student?.name ?? 'Unknown'}'s "${(pkg as any).packageName || pkg.courseTitle}" package has expired.`,
        link: `/t-portal/students/${pkg.studentId}`,
        studentId: pkg.studentId,
        timestamp: pkg.expiresAt || now,
      });
    }
  }

  // Learner churned
  for (const s of students) {
    if (s.status === 'churned') {
      alerts.push({
        id: `red-churned-${s.id}`,
        level: 'red',
        title: 'Learner Churned',
        description: `${s.name} has churned. Reach out to re-engage.`,
        link: `/t-portal/students/${s.id}`,
        studentId: s.id,
        timestamp: now,
      });
    }
  }

  // === YELLOW ALERTS ===

  // Package expiring within 14 days
  for (const pkg of packages) {
    if (pkg.status !== 'active' || !pkg.expiresAt) continue;
    const daysLeft = differenceInDays(parseISO(pkg.expiresAt), new Date());
    if (daysLeft >= 0 && daysLeft <= 14) {
      const student = students.find((s) => s.id === pkg.studentId);
      alerts.push({
        id: `yellow-pkg-expiring-${pkg.id}`,
        level: 'yellow',
        title: 'Package Expiring Soon',
        description: `${student?.name ?? 'Unknown'}'s "${(pkg as any).packageName || pkg.courseTitle}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
        link: `/t-portal/students/${pkg.studentId}`,
        studentId: pkg.studentId,
        timestamp: pkg.expiresAt,
      });
    }
  }

  // Incomplete learner profiles
  for (const s of students) {
    const missing = getIncompleteFields(s);
    if (missing.length > 0) {
      alerts.push({
        id: `yellow-incomplete-${s.id}`,
        level: 'yellow',
        title: 'Incomplete Profile',
        description: `${s.name} is missing: ${missing.map((m) => m.label).join(', ')}.`,
        link: `/t-portal/students/${s.id}`,
        studentId: s.id,
        timestamp: now,
      });
    }
  }

  // Learner paused
  for (const s of students) {
    if (s.status === 'paused') {
      alerts.push({
        id: `yellow-paused-${s.id}`,
        level: 'yellow',
        title: 'Learner Paused',
        description: `${s.name} is currently paused.`,
        link: `/t-portal/students/${s.id}`,
        studentId: s.id,
        timestamp: now,
      });
    }
  }

  // Low hours remaining (under 2h on active package)
  for (const pkg of packages) {
    if (pkg.status !== 'active') continue;
    if (pkg.hoursRemaining < 2) {
      const student = students.find((s) => s.id === pkg.studentId);
      alerts.push({
        id: `yellow-low-hours-${pkg.id}`,
        level: 'yellow',
        title: 'Low Hours Remaining',
        description: `${student?.name ?? 'Unknown'} has only ${pkg.hoursRemaining.toFixed(1)}h left on "${(pkg as any).packageName || pkg.courseTitle}".`,
        link: `/t-portal/students/${pkg.studentId}`,
        studentId: pkg.studentId,
        timestamp: now,
      });
    }
  }

  // === BLUE ALERTS ===

  // Pending approval requests
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  if (pendingApprovals.length > 0) {
    alerts.push({
      id: 'blue-pending-approvals',
      level: 'blue',
      title: 'Pending Approvals',
      description: `${pendingApprovals.length} approval request${pendingApprovals.length !== 1 ? 's' : ''} awaiting your review.`,
      link: '/t-portal/approvals',
      timestamp: pendingApprovals[0]?.createdAt || now,
    });
  }

  // Session cancelled recently (within last 7 days)
  const recentCancelled = sessions.filter((s) => {
    const anyS = s as any;
    if (anyS.status !== 'cancelled') return false;
    const dateStr = anyS.lessonDate || anyS.date || '';
    if (!dateStr) return false;
    return differenceInDays(new Date(), parseISO(dateStr)) <= 7;
  });
  if (recentCancelled.length > 0) {
    alerts.push({
      id: 'blue-recent-cancellations',
      level: 'blue',
      title: 'Recent Cancellations',
      description: `${recentCancelled.length} session${recentCancelled.length !== 1 ? 's were' : ' was'} cancelled in the last 7 days.`,
      link: '/t-portal/calendar',
      timestamp: now,
    });
  }

  // New learner enrolled (no sessions yet)
  for (const s of students) {
    if (s.status === 'trial') {
      const hasSessions = sessions.some((sess) => (sess as any).studentId === s.id);
      if (!hasSessions) {
        alerts.push({
          id: `blue-new-learner-${s.id}`,
          level: 'blue',
          title: 'New Learner',
          description: `${s.name} has enrolled but has no sessions yet.`,
          link: `/t-portal/students/${s.id}`,
          studentId: s.id,
          timestamp: now,
        });
      }
    }
  }

  return sortAlerts(alerts);
}

// ── Learner Alerts ──

export function generateLearnerAlerts(
  packages: StudentPackage[],
  credits: StudentCredit[],
  progress: StudentProgress[],
  _rewards: StudentRewards | null,
  student?: Student | null
): Alert[] {
  const now = new Date().toISOString();
  const alerts: Alert[] = [];

  // === YELLOW ALERT: Incomplete profile ===
  if (student) {
    const incomplete = getIncompleteFields(student);
    if (incomplete.length > 0) {
      const missingLabels = incomplete.map(f => f.label).join(', ');
      alerts.push({
        id: 'yellow-profile-incomplete',
        level: 'yellow',
        title: 'Complete Your Profile',
        description: `Please fill in: ${missingLabels}. You must complete your profile before booking sessions.`,
        link: '/s-portal/settings',
        timestamp: now,
      });
    }
  }

  // === RED ALERTS ===

  // Package expired
  for (const pkg of packages) {
    if (pkg.status === 'expired') {
      alerts.push({
        id: `red-pkg-expired-${pkg.id}`,
        level: 'red',
        title: 'Package Expired',
        description: `Your "${(pkg as any).packageName || pkg.courseTitle}" package has expired. Contact your tutor to renew.`,
        link: '/s-portal/packages',
        timestamp: pkg.expiresAt || now,
      });
    }
  }

  // === YELLOW ALERTS ===

  // Package expiring within 14 days
  for (const pkg of packages) {
    if (pkg.status !== 'active' || !pkg.expiresAt) continue;
    const daysLeft = differenceInDays(parseISO(pkg.expiresAt), new Date());
    if (daysLeft >= 0 && daysLeft <= 14) {
      alerts.push({
        id: `yellow-pkg-expiring-${pkg.id}`,
        level: 'yellow',
        title: 'Package Expiring Soon',
        description: `Your "${(pkg as any).packageName || pkg.courseTitle}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Book your remaining sessions!`,
        link: '/s-portal/packages',
        timestamp: pkg.expiresAt,
      });
    }
  }

  // Low hours remaining
  for (const pkg of packages) {
    if (pkg.status !== 'active') continue;
    if (pkg.hoursRemaining < 2) {
      alerts.push({
        id: `yellow-low-hours-${pkg.id}`,
        level: 'yellow',
        title: 'Low Hours',
        description: `Only ${pkg.hoursRemaining.toFixed(1)}h remaining on "${(pkg as any).packageName || pkg.courseTitle}". Consider purchasing more.`,
        link: '/s-portal/packages',
        timestamp: now,
      });
    }
  }

  // Package paused
  for (const pkg of packages) {
    if (pkg.isPaused) {
      alerts.push({
        id: `yellow-paused-${pkg.id}`,
        level: 'yellow',
        title: 'Package Paused',
        description: `Your "${(pkg as any).packageName || pkg.courseTitle}" is paused.${pkg.pauseReason ? ` Reason: ${pkg.pauseReason}` : ''}`,
        link: '/s-portal/packages',
        timestamp: pkg.pausedAt || now,
      });
    }
  }

  // === BLUE ALERTS ===

  // No progress yet (enrolled but 0% complete)
  if (packages.length > 0 && progress.length === 0) {
    alerts.push({
      id: 'blue-no-progress',
      level: 'blue',
      title: 'Get Started',
      description: 'You have a package but no course progress yet. Book a session to begin!',
      link: '/s-portal/calendar',
      timestamp: now,
    });
  }

  // No credits at all — prompt to top up
  const totalUncommitted = credits.reduce((sum, c) => sum + (c.uncommittedHours ?? 0), 0);
  const totalCommitted = credits.reduce((sum, c) => sum + (c.committedHours ?? 0), 0);
  if (credits.length === 0 || (totalUncommitted === 0 && totalCommitted === 0)) {
    alerts.push({
      id: 'blue-no-credits',
      level: 'blue',
      title: 'Add Credit to Get Started',
      description: 'Purchase a package to start booking sessions with your tutor.',
      link: '/s-portal/top-up',
      timestamp: now,
    });
  }

  return sortAlerts(alerts);
}
