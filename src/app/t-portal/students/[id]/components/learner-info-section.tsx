'use client';

import { useState } from 'react';
import type { Student, MessagingContact } from '@/lib/types';
import { updateStudent } from '@/lib/firestore';
import { getDragonLevel, calculateAge, GENDER_OPTIONS, DRAGON_LEVELS, MESSAGING_APPS } from '@/lib/dragon-levels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Pencil, Save, X, Plus, Trash2, MessageSquare } from 'lucide-react';

interface LearnerInfoSectionProps {
  student: Student;
  studentId: string;
  isAdmin: boolean;
  onStudentUpdate?: (updated: Student) => void;
}

export default function LearnerInfoSection({ student, studentId, isAdmin, onStudentUpdate }: LearnerInfoSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields — learner info
  const [name, setName] = useState(student.name);
  const [email, setEmail] = useState(student.email);
  const [birthday, setBirthday] = useState(student.birthday ?? '');
  const [gender, setGender] = useState(student.gender ?? '');
  const [customGender, setCustomGender] = useState(
    student.gender && !['boy', 'girl'].includes(student.gender) ? student.gender : ''
  );
  const [school, setSchool] = useState(student.school ?? '');
  const [dragonLevel, setDragonLevel] = useState(student.dragonLevel ?? '');

  // Editable fields — messaging
  const [contacts, setContacts] = useState<MessagingContact[]>(student.messagingContacts ?? []);

  const age = birthday ? calculateAge(birthday) : null;
  const dragonInfo = student.dragonLevel ? getDragonLevel(student.dragonLevel) : null;

  function handleCancel() {
    setName(student.name);
    setEmail(student.email);
    setBirthday(student.birthday ?? '');
    setGender(student.gender ?? '');
    setCustomGender(student.gender && !['boy', 'girl'].includes(student.gender) ? student.gender : '');
    setSchool(student.school ?? '');
    setDragonLevel(student.dragonLevel ?? '');
    setContacts(student.messagingContacts ?? []);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const resolvedGender = gender === 'other' ? customGender : gender;
      const cleanedContacts = contacts.filter((c) => c.handle.trim() !== '');
      const updates: Partial<Student> = {
        name,
        email,
        birthday: birthday || null,
        gender: resolvedGender || null,
        school: school || null,
        dragonLevel: (dragonLevel as Student['dragonLevel']) || null,
        messagingContacts: cleanedContacts.length > 0 ? cleanedContacts : null,
      };
      const updated = await updateStudent(studentId, updates);
      onStudentUpdate?.(updated);
      setContacts(cleanedContacts);
      setEditing(false);
    } catch (err) {
      console.error('Error saving learner info:', err);
    } finally {
      setSaving(false);
    }
  }

  // Messaging helpers
  function addContact() {
    setContacts([...contacts, { app: 'whatsapp', handle: '' }]);
  }

  function removeContact(index: number) {
    setContacts(contacts.filter((_, i) => i !== index));
  }

  function updateContact(index: number, field: keyof MessagingContact, value: string) {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  }

  function getAppLabel(app: string): string {
    return MESSAGING_APPS.find((a) => a.value === app)?.label ?? app;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" />
            Learner Information
          </CardTitle>
          {isAdmin && !editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3" /> Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {editing ? (
          /* ── EDIT MODE ── */
          <div className="space-y-6">
            {/* Learner details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Birthday</label>
                <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gender</label>
                <select
                  value={gender === 'other' || (!['boy', 'girl', ''].includes(gender)) ? 'other' : gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    if (e.target.value !== 'other') setCustomGender('');
                  }}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
                {(gender === 'other' || (gender && !['boy', 'girl', ''].includes(gender))) && (
                  <Input
                    value={customGender}
                    onChange={(e) => setCustomGender(e.target.value)}
                    placeholder="Enter identity..."
                    className="mt-2"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">School</label>
                <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Optional" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dragon Level</label>
                <select
                  value={dragonLevel}
                  onChange={(e) => setDragonLevel(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Not assessed yet</option>
                  {DRAGON_LEVELS.map((d) => (
                    <option key={d.key} value={d.key}>{d.label} ({d.cefr})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Messaging contacts */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-3">
                <MessageSquare className="h-3 w-3" /> Messaging
              </p>
              <div className="space-y-3">
                {contacts.map((contact, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={contact.app}
                      onChange={(e) => updateContact(i, 'app', e.target.value)}
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-40"
                    >
                      {MESSAGING_APPS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    <Input
                      value={contact.handle}
                      onChange={(e) => updateContact(i, 'handle', e.target.value)}
                      placeholder="Handle or username..."
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeContact(i)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addContact}>
                  <Plus className="mr-1 h-3 w-3" /> Add Contact
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ── VIEW MODE ── */
          <div className="space-y-6">
            {/* Learner details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="Name" value={student.name} />
              <Field label="Email" value={student.email} />
              <Field
                label="Birthday"
                value={
                  student.birthday
                    ? `${new Date(student.birthday).toLocaleDateString()} (age ${age})`
                    : '—'
                }
              />
              <Field label="Gender" value={student.gender ? capitalize(student.gender) : '—'} />
              <Field label="School" value={student.school || '—'} />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dragon Level</p>
                {dragonInfo ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={dragonInfo.color}>{dragonInfo.label}</Badge>
                    <span className="text-xs text-muted-foreground">{dragonInfo.cefr}</span>
                  </div>
                ) : (
                  <p className="text-sm mt-1">Not assessed yet</p>
                )}
              </div>
              <Field
                label="Enrolled Since"
                value={
                  student.enrolledAt
                    ? new Date(student.enrolledAt).toLocaleDateString()
                    : student.createdAt
                      ? new Date(student.createdAt).toLocaleDateString()
                      : '—'
                }
              />
              <Field label="Status" value={capitalize(student.status)} />
            </div>

            {/* Messaging contacts */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-2">
                <MessageSquare className="h-3 w-3" /> Messaging
              </p>
              {(!student.messagingContacts || student.messagingContacts.length === 0) ? (
                <p className="text-sm text-muted-foreground">No messaging contacts added yet.</p>
              ) : (
                <div className="space-y-2">
                  {student.messagingContacts.map((contact, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
                        {getAppLabel(contact.app)}
                      </span>
                      <span className="text-sm font-semibold">{contact.handle}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
