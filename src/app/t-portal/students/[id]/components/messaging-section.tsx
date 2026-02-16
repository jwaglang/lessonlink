'use client';

import { useState } from 'react';
import type { Student, MessagingContact } from '@/lib/types';
import { updateStudent } from '@/lib/firestore';
import { MESSAGING_APPS } from '@/lib/dragon-levels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Pencil, Save, X, Plus, Trash2 } from 'lucide-react';

interface MessagingSectionProps {
  student: Student;
  studentId: string;
  isAdmin: boolean;
  onStudentUpdate?: (updated: Student) => void;
}

export default function MessagingSection({ student, studentId, isAdmin, onStudentUpdate }: MessagingSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<MessagingContact[]>(student.messagingContacts ?? []);

  function handleCancel() {
    setContacts(student.messagingContacts ?? []);
    setEditing(false);
  }

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

  async function handleSave() {
    setSaving(true);
    try {
      // Filter out contacts with empty handles
      const cleaned = contacts.filter((c) => c.handle.trim() !== '');
      const updated = await updateStudent(studentId, { messagingContacts: cleaned });
      onStudentUpdate?.(updated);
      setContacts(cleaned);
      setEditing(false);
    } catch (err) {
      console.error('Error saving messaging contacts:', err);
    } finally {
      setSaving(false);
    }
  }

  function getAppLabel(app: string): string {
    return MESSAGING_APPS.find((a) => a.value === app)?.label ?? app;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5" />
            Messaging
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
        ) : (
          /* ── VIEW MODE ── */
          <div>
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
        )}
      </CardContent>
    </Card>
  );
}
