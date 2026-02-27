'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getStudentById, updateStudent } from '@/lib/firestore';
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
  Save,
  Loader2,
  User,
  MessageCircle,
  Shield,
  GraduationCap,
} from 'lucide-react';

const PROGRAM_TYPES = ['Public', 'Private', 'Homeschool', 'Other'] as const;
const RELATIONSHIPS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'] as const;
const CONTACT_METHODS = ['Email', 'Phone', 'Messaging App'] as const;
const ENGLISH_LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced', 'Native'] as const;
const MESSAGING_APPS = ['WeChat', 'WhatsApp', 'Line', 'KakaoTalk', 'Telegram', 'Signal', 'Other'] as const;

export default function StudentSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  // Age calculation for conditional required fields
  const [isUnder18, setIsUnder18] = useState(false);

  useEffect(() => {
    if (authLoading || !user?.uid) return;

    async function loadStudent() {
      const studentData = await getStudentById(user.uid);
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

  function addMessagingContact() {
    if (!newMsgHandle.trim()) return;
    const newContact: MessagingContact = {
      app: newMsgApp,
      handle: newMsgHandle.trim(),
    };
    setMessagingContacts([...messagingContacts, newContact]);
    setNewMsgHandle('');
    setMsgDialogOpen(false);
  }

  function removeMessagingContact(index: number) {
    setMessagingContacts(messagingContacts.filter((_, i) => i !== index));
  }

  function addContact(contact: ParentContact) {
    if (isPrimary) {
      setPrimaryContact(contact);
    } else {
      setSecondaryContact(contact);
    }
    setContactDialogOpen(false);
  }

  function removeContact(type: 'primary' | 'secondary') {
    if (type === 'primary') {
      setPrimaryContact(null);
    } else {
      setSecondaryContact(null);
    }
  }

  async function handleSave() {
  if (!user?.uid || !student) {
    setSaveMessage({ type: 'error', text: 'You must be logged in to save.' });
    return;
  }

  setSaving(true);
  setSaveMessage(null);

  // Determine final gender value
  const finalGender = gender === 'Other' && customGender ? customGender : gender;

  // Helper: strip undefined from ParentContact
  function cleanContact(contact: ParentContact | null): ParentContact | undefined {
    if (!contact) return undefined;
    return {
      name: contact.name,
      email: contact.email,
      ...(contact.phone && { phone: contact.phone }),
      relationship: contact.relationship,
      ...(contact.country && { country: contact.country }),
      ...(contact.city && { city: contact.city }),
      ...(contact.messaging && contact.messaging.length > 0 && { messaging: contact.messaging }),
      ...(contact.preferredContactMethod && { preferredContactMethod: contact.preferredContactMethod }),
      ...(contact.profession && { profession: contact.profession }),
      ...(contact.englishProficiency && { englishProficiency: contact.englishProficiency }),
    };
  }

  // ✅ FIX: Use conditional spread - never include undefined fields (including nested)
  const updatedData: Partial<Student> = {
    ...(name && { name }),
    ...(avatarUrl && { avatarUrl }),
    ...(birthday && { birthday }),
    ...(finalGender && { gender: finalGender }),
    ...(school && { school }),
    ...(messagingContacts.length > 0 && { messagingContacts: messagingContacts.filter(c => c.handle.trim()) }),
    ...(primaryContact && { primaryContact: cleanContact(primaryContact) }),
    ...(secondaryContact && { secondaryContact: cleanContact(secondaryContact) }),
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateStudent(user.uid, updatedData);
    setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
  } catch (error: any) {
    setSaveMessage({ type: 'error', text: error.message || 'Failed to save profile' });
  } finally {
    setSaving(false);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Settings"
          description="Manage your profile and account settings"
        />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          saveMessage.type === 'success' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {saveMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
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

      <div className="grid gap-6 lg:grid-cols-2">
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
            {!primaryContact && (
              <Button size="sm" onClick={() => { setIsPrimary(true); setContactDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
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

        {/* Secondary Contact */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Secondary Contact (Optional)</CardTitle>
            </div>
            {!secondaryContact && (
              <Button size="sm" onClick={() => { setIsPrimary(false); setContactDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPrimary: boolean;
  isUnder18: boolean;
  onAdd: (contact: ParentContact) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState('Email');
  const [profession, setProfession] = useState('');
  const [englishProficiency, setEnglishProficiency] = useState('');
  const [contactMessaging, setContactMessaging] = useState<MessagingContact[]>([]);
  const [msgApp, setMsgApp] = useState('WeChat');
  const [msgHandle, setMsgHandle] = useState('');

  function reset() {
    setName('');
    setEmail('');
    setPhone('');
    setRelationship('');
    setCountry('');
    setCity('');
    setPreferredContactMethod('Email');
    setProfession('');
    setEnglishProficiency('');
    setContactMessaging([]);
  }

  function handleAdd() {
    if (!name || !email || (!isUnder18 && !relationship)) return;

    const contact: ParentContact = {
      name,
      email,
      phone: phone || undefined,
      relationship,
      country: country || undefined,
      city: city || undefined,
      messaging: contactMessaging.length > 0 ? contactMessaging : undefined,
      preferredContactMethod,
      profession: profession || undefined,
      englishProficiency: englishProficiency || undefined,
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
            {isPrimary ? 'Primary' : 'Secondary'} Contact {isUnder18 && isPrimary && <span className="text-red-500">*</span>}
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
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
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
            <Select value={englishProficiency} onValueChange={setEnglishProficiency}>
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
            {isPrimary ? 'Add Primary Contact' : 'Add Secondary Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}