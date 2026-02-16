import type { Student } from './types';
import { calculateAge } from './dragon-levels';

export interface IncompleteField {
  field: string;
  label: string;
}

/**
 * Returns a list of required fields that are missing from a learner's profile.
 *
 * Required for all learners: name, email, birthday, gender
 * Required if under 18: primaryContact.name, primaryContact.email
 */
export function getIncompleteFields(student: Student): IncompleteField[] {
  const missing: IncompleteField[] = [];

  if (!student.name?.trim()) {
    missing.push({ field: 'name', label: 'Name' });
  }
  if (!student.email?.trim()) {
    missing.push({ field: 'email', label: 'Email' });
  }
  if (!student.birthday) {
    missing.push({ field: 'birthday', label: 'Birthday' });
  }
  if (!student.gender) {
    missing.push({ field: 'gender', label: 'Gender' });
  }

  // If birthday is set and learner is under 18, primary contact is required
  if (student.birthday) {
    const age = calculateAge(student.birthday);
    if (age < 18) {
      if (!student.primaryContact?.name?.trim()) {
        missing.push({ field: 'primaryContact.name', label: 'Primary Contact Name' });
      }
      if (!student.primaryContact?.email?.trim()) {
        missing.push({ field: 'primaryContact.email', label: 'Primary Contact Email' });
      }
    }
  }

  return missing;
}

/** Returns true if the learner's profile has all required fields filled in. */
export function isProfileComplete(student: Student): boolean {
  return getIncompleteFields(student).length === 0;
}

/** Filters a list of learners to only those with incomplete profiles. */
export function getIncompleteStudents(students: Student[]): Student[] {
  return students.filter((s) => !isProfileComplete(s));
}
