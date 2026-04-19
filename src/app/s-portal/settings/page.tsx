'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getStudentById, updateStudent, getUserSettings, saveUserSettings } from '@/lib/firestore';
import { Student, MessagingContact, ParentContact } from '@/lib/types';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Pencil,
  Save,
  Loader2,
  User,
  MessageCircle,
  Shield,
  GraduationCap,
  Globe,
} from 'lucide-react';

const TIMEZONE_OPTIONS = [
  { group: 'Americas', zones: ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto','America/Vancouver','America/Mexico_City','America/Sao_Paulo','America/Buenos_Aires'] },
  { group: 'Europe', zones: ['Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Rome','Europe/Amsterdam','Europe/Brussels','Europe/Lisbon','Europe/Warsaw','Europe/Moscow'] },
  { group: 'Asia', zones: ['Asia/Shanghai','Asia/Hong_Kong','Asia/Tokyo','Asia/Seoul','Asia/Singapore','Asia/Dubai','Asia/Kolkata','Asia/Bangkok','Asia/Jakarta'] },
  { group: 'Pacific', zones: ['Pacific/Auckland','Pacific/Sydney','Australia/Melbourne','Australia/Perth'] },
  { group: 'Africa', zones: ['Africa/Cairo','Africa/Johannesburg','Africa/Lagos','Africa/Nairobi'] },
];

const PROGRAM_TYPES = ['Public', 'Private', 'Homeschool', 'Other'] as const;
const RELATIONSHIPS = [
  { label: 'Mother', value: 'mother' },
  { label: 'Father', value: 'father' },
  { label: 'Guardian', value: 'guardian' },
  { label: 'Other', value: 'other' },
] as const;
const CONTACT_METHODS = ['Email', 'Phone', 'Messaging App'] as const;
const ENGLISH_LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced', 'Native'] as const;
const MESSAGING_APPS = ['WeChat', 'WhatsApp', 'Line', 'KakaoTalk', 'Telegram', 'Signal', 'Other'] as const;

export default function StudentSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingLearner, setSavingLearner] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [learnerSaved, setLearnerSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state mirrors
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [customGender, setCustomGender] = useState('');
  const [school, setSchool] = useState('');
  const [schoolProgram, setSchoolProgram] = useState('');
  const [schoolGrade, setSchoolGrade] = useState('');

  // Messaging contacts
  const [messagingContacts, setMessagingContacts] = useState<MessagingContact[]>([]);
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [newMsgApp, setNewMsgApp] = useState('WeChat');
  const [newMsgHandle, setNewMsgHandle] = useState('');

  // Primary contact
  const [primaryContact, setPrimaryContact] = useState<ParentContact | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [isPrimary, setIsPrimary] = useState(true);

  // Secondary contact
  const [secondaryContact, setSecondaryContact] = useState<ParentContact | null>(null);

  // Timezone
  const [timezone, setTimezone] = useState('');
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [timezoneSaved, setTimezoneSaved] = useState(false);

  // Age calculation for conditional required fields
  const [isUnder18, setIsUnder18] = useState(false);

  useEffect(() => {
    if (authLoading || !user?.uid) return;

    async function loadStudent() {
      const [studentData, userSettings] = await Promise.all([
        getStudentById(user!.uid),
        getUserSettings(user!.uid, 'student'),
      ]);
      if (userSettings?.timezone) {
        setTimezone(userSettings.timezone);
      } else {
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      if (studentData) {
        setStudent(studentData);
        setName(studentData.name || '');
        setAvatarUrl(studentData.avatarUrl || '');
        setBirthday(studentData.birthday || '');
        
        // FIX: Check if gender is a standard option or custom value
        const g = studentData.gender || '';
        if (['boy', 'girl', 'other'].includes(g.toLowerCase())) {
          setGender(g);           // Standard option
          setCustomGender('');    // No custom value
        } else if (g) {
          setGender('Other');     // Custom value like "fury"
          setCustomGender(g);     // Store it in customGender state for display
        }
        
        setSchool(studentData.school || '');
        setMessagingContacts(studentData.messagingContacts || []);
        setPrimaryContact(studentData.primaryContact || null);
        setSecondaryContact(studentData.secondaryContact || null);

        // Check age
        if (studentData.birthday) {
          const birthDate = new Date(studentData.birthday);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          setIsUnder18(age < 18);
        }
      }
      setLoading(false);
    }

    loadStudent();
  }, [user, authLoading]);

  // Update isUnder18 when birthday changes
  useEffect(() => {
    if (birthday) {
      const birthDate = new Date(birthday);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      setIsUnder18(age < 18);
    } else {
      setIsUnder18(false);
    }
  }, [birthday]);

  function calculateAge(birthdayStr: string): number | null {
    if (!birthdayStr) return null;
    const birthDate = new Date(birthdayStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  async function addMessagingContact() {
    if (!newMsgHandle.trim()) return;
    const newContact: MessagingContact = { app: newMsgApp, handle: newMsgHandle.trim() };
    const updated = [...messagingContacts, newContact];
    setMessagingContacts(updated);
    setNewMsgHandle('');
    setMsgDialogOpen(false);
    if (user?.uid) {
      try {
        await updateStudent(user.uid, { messagingContacts: updated, updatedAt: new Date().toISOString() });
      } catch (e) { console.error('Auto-save messaging failed:', e); }
    }
  }

  async function removeMessagingContact(index: number) {
    const updated = messagingContacts.filter((_, i) => i !== index);
    setMessagingContacts(updated);
    if (user?.uid) {
      try {
        await updateStudent(user.uid, { messagingContacts: updated, updatedAt: new Date().toISOString() });
      } catch (e) { console.error('Auto-save messaging failed:', e); }
    }
  }

  async function addContact(contact: ParentContact) {
    if (isPrimary) {
      setPrimaryContact(contact);
    } else {
      setSecondaryContact(contact);
    }
    setContactDialogOpen(false);
    // Auto-save immediately
    if (user?.uid) {
      try {
        await updateStudent(user.uid, {
          ...(isPrimary ? { primaryContact: contact } : { secondaryContact: contact }),
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Auto-save contact failed:', e);
      }
    }
  }

  function removeContact(type: 'primary' | 'secondary') {
    if (type === 'primary') {
      setPrimaryContact(null);
    } else {
      setSecondaryContact(null);
    }
  }

  async function saveTimezone() {
    if (!user?.uid || !timezone) return;
    setSavingTimezone(true);
    try {
      await saveUserSettings(user.uid, { userType: 'student', timezone, timezoneConfirmed: true });
      setTimezoneSaved(true);
      setTimeout(() => setTimezoneSaved(false), 2000);
    } catch (e) {
      setSaveMessage({ type: 'error', text: 'Failed to save timezone' });
    } finally {
      setSavingTimezone(false);
    }
  }

  async function saveAccountInfo() {
    if (!user?.uid) return;
    setSavingAccount(true);
    try {
      await updateStudent(user.uid, {
        ...(name && { name }),
        ...(avatarUrl && { avatarUrl }),
        updatedAt: new Date().toISOString(),
      });
      setAccountSaved(true);
      setTimeout(() => setAccountSaved(false), 2000);
    } catch (e) {
      setSaveMessage({ type: 'error', text: 'Failed to save account info' });
    } finally {
      setSavingAccount(false);
    }
  }

  async function saveLearnerDetails() {
    if (!user?.uid) return;
    setSavingLearner(true);
    const finalGender = gender === 'Other' && customGender ? customGender : gender;
    try {
      await updateStudent(user.uid, {
        ...(birthday && { birthday }),
        ...(finalGender && { gender: finalGender }),
        ...(school && { school }),
        updatedAt: new Date().toISOString(),
      });
      setLearnerSaved(true);
      setTimeout(() => setLearnerSaved(false), 2000);
    } catch (e) {
      setSaveMessage({ type: 'error', text: 'Failed to save learner details' });
    } finally {
      setSavingLearner(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const age = calculateAge(birthday);

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader
        title="Settings"
        description="Manage your profile and account settings"
      />

      {saveMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 text-red-700">
          <AlertCircle className="h-4 w-4" />
          {saveMessage.text}
        </div>
      )}

      {/* Profile Incomplete Warning */}
      {isUnder18 && !primaryContact && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-medium">Parent/Guardian Information Required</p>
            <p className="text-sm mt-1">
              Since you're under 18, we need a parent or guardian's contact information. Please add this in the Parent/Guardian section below.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Account Info</CardTitle>
            </div>
            <CardDescription>Your login and profile basics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (Read-only)</Label>
              <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Contact support to change your email</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Profile Photo URL</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
              {avatarUrl && (
                <img src={avatarUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border" />
              )}
            </div>
            <Button type="button" size="sm" onClick={saveAccountInfo} disabled={savingAccount} className="w-full mt-2">
              {savingAccount ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : accountSaved ? <CheckCircle className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {accountSaved ? 'Saved!' : name || avatarUrl ? 'Save Changes' : 'Save'}
            </Button>
          </CardContent>
        </Card>

        {/* Learner Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle>Learner Details</CardTitle>
            </div>
            <CardDescription>Personal information and school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
              {age !== null && (
                <p className="text-xs text-muted-foreground">Age: {age} years old</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boy">Boy</SelectItem>
                  <SelectItem value="girl">Girl</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {gender === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="customGender">Specify</Label>
                <Input
                  id="customGender"
                  value={customGender}
                  onChange={(e) => setCustomGender(e.target.value)}
                  placeholder="How you identify"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="school">School Name</Label>
              <Input
                id="school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="School name"
              />
              <p className="text-xs text-muted-foreground">
                📝 Note: Program type and grade fields coming soon (DB update needed)
              </p>
            </div>
            <Button type="button" size="sm" onClick={saveLearnerDetails} disabled={savingLearner} className="w-full mt-2">
              {savingLearner ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : learnerSaved ? <CheckCircle className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {learnerSaved ? 'Saved!' : birthday || gender || school ? 'Save Changes' : 'Save'}
            </Button>
          </CardContent>
        </Card>

        {/* Messaging Contacts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle>Messaging Contacts</CardTitle>
            </div>
            <Dialog open={msgDialogOpen} onOpenChange={setMsgDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Messaging Contact</DialogTitle>
                  <DialogDescription>Add a messaging app for communication</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="msgApp">App</Label>
                    <Select value={newMsgApp} onValueChange={setNewMsgApp}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MESSAGING_APPS.map(app => (
                          <SelectItem key={app} value={app}>{app}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="msgHandle">ID / Handle</Label>
                    <Input
                      id="msgHandle"
                      value={newMsgHandle}
                      onChange={(e) => setNewMsgHandle(e.target.value)}
                      placeholder="@username or phone number"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setMsgDialogOpen(false)}>Cancel</Button>
                  <Button onClick={addMessagingContact}>Add Contact</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {messagingContacts.length > 0 ? (
              <div className="space-y-2">
                {messagingContacts.map((contact, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{contact.app}</Badge>
                      <span className="text-sm">{contact.handle}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMessagingContact(i)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No messaging contacts added yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Primary Contact */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>
                Primary Contact {isUnder18 && <span className="text-red-500">*</span>}
              </CardTitle>
            </div>
            <Button size="sm" variant={primaryContact ? 'outline' : 'default'} onClick={() => { setIsPrimary(true); setContactDialogOpen(true); }}>
              {primaryContact ? <><Pencil className="h-4 w-4 mr-1" />Edit</> : <><Plus className="h-4 w-4 mr-1" />Add</>}
            </Button>
          </CardHeader>
          <CardContent>
            {primaryContact ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{primaryContact.name}</p>
                    <p className="text-sm text-muted-foreground">{primaryContact.relationship}</p>
                    <p className="text-sm text-muted-foreground">{primaryContact.email}</p>
                    {primaryContact.phone && (
                      <p className="text-sm text-muted-foreground">{primaryContact.phone}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeContact('primary')}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                {primaryContact.messaging && primaryContact.messaging.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {primaryContact.messaging.map((m, i) => (
                      <Badge key={i} variant="outline">{m.app}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {isUnder18 
                  ? 'Required for learners under 18' 
                  : 'Optional — add emergency contact if desired'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timezone */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Timezone</CardTitle>
            </div>
            <CardDescription>Used for scheduling and session times</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Your Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TIMEZONE_OPTIONS.map(group => (
                    <div key={group.group}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{group.group}</div>
                      {group.zones.map(zone => (
                        <SelectItem key={zone} value={zone}>{zone.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" onClick={saveTimezone} disabled={savingTimezone || !timezone} className="w-full mt-2">
              {savingTimezone ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : timezoneSaved ? <CheckCircle className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {timezoneSaved ? 'Saved!' : 'Save Timezone'}
            </Button>
          </CardContent>
        </Card>

        {/* Secondary Contact */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Secondary Contact (Optional)</CardTitle>
            </div>
            <Button size="sm" variant={secondaryContact ? 'outline' : 'default'} onClick={() => { setIsPrimary(false); setContactDialogOpen(true); }}>
              {secondaryContact ? <><Pencil className="h-4 w-4 mr-1" />Edit</> : <><Plus className="h-4 w-4 mr-1" />Add</>}
            </Button>
          </CardHeader>
          <CardContent>
            {secondaryContact ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{secondaryContact.name}</p>
                    <p className="text-sm text-muted-foreground">{secondaryContact.relationship}</p>
                    <p className="text-sm text-muted-foreground">{secondaryContact.email}</p>
                    {secondaryContact.phone && (
                      <p className="text-sm text-muted-foreground">{secondaryContact.phone}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeContact('secondary')}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                {secondaryContact.messaging && secondaryContact.messaging.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {secondaryContact.messaging.map((m, i) => (
                      <Badge key={i} variant="outline">{m.app}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Add a second emergency contact if desired</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parent Contact Dialog */}
      <ParentContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        isPrimary={isPrimary}
        isUnder18={isUnder18}
        onAdd={addContact}
        initialContact={isPrimary ? primaryContact : secondaryContact}
      />
    </div>
  );
}

// Separate dialog component for parent contact
function ParentContactDialog({
  open,
  onOpenChange,
  isPrimary,
  isUnder18,
  onAdd,
  initialContact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPrimary: boolean;
  isUnder18: boolean;
  onAdd: (contact: ParentContact) => void;
  initialContact?: ParentContact | null;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<ParentContact['relationship']>('guardian');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState('Email');
  const [profession, setProfession] = useState('');
  const [englishProficiency, setEnglishProficiency] = useState<ParentContact['englishProficiency']>(undefined);
  const [contactMessaging, setContactMessaging] = useState<MessagingContact[]>([]);
  const [msgApp, setMsgApp] = useState('WeChat');
  const [msgHandle, setMsgHandle] = useState('');

  // Pre-populate when dialog opens with existing contact
  useEffect(() => {
    if (open && initialContact) {
      setName(initialContact.name || '');
      setEmail(initialContact.email || '');
      setPhone(initialContact.phone || '');
      setRelationship(initialContact.relationship || 'guardian');
      setCountry(initialContact.country || '');
      setCity(initialContact.city || '');
      setPreferredContactMethod(initialContact.preferredContactMethod || 'Email');
      setProfession(initialContact.profession || '');
      setEnglishProficiency(initialContact.englishProficiency);
      setContactMessaging(initialContact.messaging || []);
    } else if (open && !initialContact) {
      reset();
    }
  }, [open]);

  function reset() {
    setName('');
    setEmail('');
    setPhone('');
    setRelationship('guardian');
    setCountry('');
    setCity('');
    setPreferredContactMethod('Email');
    setProfession('');
    setEnglishProficiency(undefined);
    setContactMessaging([]);
  }

  function handleAdd() {
    if (!name || !email) return;

    // Auto-add any pending messaging handle the user typed but didn't click +
    const finalMessaging = [...contactMessaging];
    if (msgHandle.trim()) {
      finalMessaging.push({ app: msgApp, handle: msgHandle.trim() });
    }

    const contact: ParentContact = {
      name,
      email,
      phone: phone || '',
      relationship,
      ...(country && { country }),
      ...(city && { city }),
      ...(finalMessaging.length > 0 && { messaging: finalMessaging }),
      ...(preferredContactMethod && { preferredContactMethod }),
      ...(profession && { profession }),
      ...(englishProficiency && { englishProficiency }),
    };

    onAdd(contact);
    reset();
    onOpenChange(false);
  }

  function addMessaging() {
    if (!msgHandle.trim()) return;
    setContactMessaging([...contactMessaging, { app: msgApp, handle: msgHandle.trim() }]);
    setMsgHandle('');
  }

  function removeMessaging(index: number) {
    setContactMessaging(contactMessaging.filter((_, i) => i !== index));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialContact ? 'Edit' : 'Add'} {isPrimary ? 'Primary' : 'Secondary'} Contact {isUnder18 && isPrimary && <span className="text-red-500">*</span>}
          </DialogTitle>
          <DialogDescription>
            {isUnder18 && isPrimary 
              ? 'Parent or guardian information (required for learners under 18)' 
              : 'Emergency contact information (optional)'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pc-name">Name {isUnder18 && isPrimary && '*'}</Label>
              <Input
                id="pc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required={isUnder18 && isPrimary}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc-email">Email {isUnder18 && isPrimary && '*'}</Label>
              <Input
                id="pc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required={isUnder18 && isPrimary}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pc-phone">Phone</Label>
              <Input
                id="pc-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc-relationship">Relationship {isUnder18 && isPrimary && '*'}</Label>
              <Select value={relationship} onValueChange={(v) => setRelationship(v as ParentContact['relationship'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pc-country">Country</Label>
              <Input
                id="pc-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United States"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc-city">City</Label>
              <Input
                id="pc-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pc-preferred">Preferred Contact Method</Label>
              <Select value={preferredContactMethod} onValueChange={setPreferredContactMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc-profession">Profession</Label>
              <Input
                id="pc-profession"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="Engineer"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-english">English Proficiency</Label>
            <Select value={englishProficiency || ''} onValueChange={(v) => setEnglishProficiency(v as ParentContact['englishProficiency'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {ENGLISH_LEVELS.map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Messaging Apps for Contact */}
          <div className="border-t pt-4">
            <Label className="mb-2 block">Messaging Apps</Label>
            {contactMessaging.length > 0 && (
              <div className="space-y-2 mb-3">
                {contactMessaging.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{m.app}</Badge>
                      <span className="text-sm">{m.handle}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMessaging(i)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Select value={msgApp} onValueChange={setMsgApp}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGING_APPS.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={msgHandle}
                onChange={(e) => setMsgHandle(e.target.value)}
                placeholder="Handle or number"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addMessaging}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd}>
            {initialContact ? 'Save Changes' : isPrimary ? 'Add Primary Contact' : 'Add Secondary Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}