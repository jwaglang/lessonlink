'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logIn, signUp } from '@/lib/auth';
import { createStudent } from '@/lib/firestore';
import type { MessagingContact, ParentContact } from '@/lib/types';
import {
  GENDER_OPTIONS,
  MESSAGING_APPS,
  RELATIONSHIP_OPTIONS,
  ENGLISH_PROFICIENCY_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  calculateAge,
} from '@/lib/dragon-levels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, BookOpen, BookOpenCheck, Plus, Trash2, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { GradientIcon } from '@/components/gradient-icon';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';

// ============ SUB-COMPONENTS (must be outside LandingPage to preserve focus) ============

function StepIndicator({ signupStep, totalSteps }: { signupStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === signupStep ? 'w-8 bg-primary' : i + 1 < signupStep ? 'w-2 bg-primary/60' : 'w-2 bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

function ParentFields({
  label,
  parent,
  setter,
  updateParent,
  addParentMessaging,
  removeParentMessaging,
  updateParentMessaging,
}: {
  label: string;
  parent: ParentContact;
  setter: React.Dispatch<React.SetStateAction<ParentContact>>;
  updateParent: (
    setter: React.Dispatch<React.SetStateAction<ParentContact>>,
    parent: ParentContact,
    field: string,
    value: any,
  ) => void;
  addParentMessaging: (
    setter: React.Dispatch<React.SetStateAction<ParentContact>>,
    parent: ParentContact,
  ) => void;
  removeParentMessaging: (
    setter: React.Dispatch<React.SetStateAction<ParentContact>>,
    parent: ParentContact,
    i: number,
  ) => void;
  updateParentMessaging: (
    setter: React.Dispatch<React.SetStateAction<ParentContact>>,
    parent: ParentContact,
    i: number,
    field: keyof MessagingContact,
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Name</Label>
          <Input value={parent.name} onChange={(e) => updateParent(setter, parent, 'name', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Relationship</Label>
          <select
            value={parent.relationship}
            onChange={(e) => updateParent(setter, parent, 'relationship', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={parent.email} onChange={(e) => updateParent(setter, parent, 'email', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={parent.phone} onChange={(e) => updateParent(setter, parent, 'phone', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Country</Label>
          <Input value={parent.country ?? ''} onChange={(e) => updateParent(setter, parent, 'country', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">City</Label>
          <Input value={parent.city ?? ''} onChange={(e) => updateParent(setter, parent, 'city', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Preferred Contact</Label>
          <select
            value={parent.preferredContactMethod ?? ''}
            onChange={(e) => updateParent(setter, parent, 'preferredContactMethod', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            {CONTACT_METHOD_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Profession</Label>
          <Input value={parent.profession ?? ''} onChange={(e) => updateParent(setter, parent, 'profession', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">English Proficiency</Label>
          <select
            value={parent.englishProficiency ?? ''}
            onChange={(e) => updateParent(setter, parent, 'englishProficiency', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            {ENGLISH_PROFICIENCY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>
      {/* Parent messaging */}
      <div>
        <Label className="text-xs">Messaging</Label>
        <div className="space-y-2 mt-1">
          {(parent.messaging ?? []).map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={m.app}
                onChange={(e) => updateParentMessaging(setter, parent, i, 'app', e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm w-32"
              >
                {MESSAGING_APPS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <Input
                value={m.handle}
                onChange={(e) => updateParentMessaging(setter, parent, i, 'handle', e.target.value)}
                placeholder="Handle..."
                className="flex-1 h-9"
              />
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => removeParentMessaging(setter, parent, i)}>
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addParentMessaging(setter, parent)}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN PAGE COMPONENT ============

export default function LandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [learnerDialogOpen, setLearnerDialogOpen] = useState(false);
  const [tutorDialogOpen, setTutorDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // Signup form state — Step 1: Account
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  // Signup form state — Step 2: Learner Info
  const [signupName, setSignupName] = useState('');
  const [signupBirthday, setSignupBirthday] = useState('');
  const [signupGender, setSignupGender] = useState('');
  const [signupCustomGender, setSignupCustomGender] = useState('');
  // Signup form state — Step 3: Messaging
  const [signupMessaging, setSignupMessaging] = useState<MessagingContact[]>([]);
  // Signup form state — Step 4: Parent Info
  const [signupPrimary, setSignupPrimary] = useState<ParentContact>({
    name: '', email: '', phone: '', relationship: 'mother',
    country: '', city: '', messaging: [], preferredContactMethod: 'email',
    profession: '', englishProficiency: 'none',
  });
  const [signupSecondary, setSignupSecondary] = useState<ParentContact>({
    name: '', email: '', phone: '', relationship: 'father',
    country: '', city: '', messaging: [], preferredContactMethod: 'email',
    profession: '', englishProficiency: 'none',
  });
  // Multi-step wizard
  const [signupStep, setSignupStep] = useState(1);
  const totalSteps = 4;
  const isUnder18 = signupBirthday ? calculateAge(signupBirthday) < 18 : false;

  async function handleLogin(e: React.FormEvent, role: 'learner' | 'tutor') {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await logIn(loginEmail, loginPassword);
      const redirectPath = role === 'learner' ? '/s-portal' : '/t-portal';
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  }

  function validateStep(step: number): boolean {
    setError('');
    if (step === 1) {
      if (!signupEmail || !signupPassword || !signupConfirm || !signupName.trim()) {
        setError('All fields are required');
        return false;
      }
      if (signupPassword !== signupConfirm) {
        setError('Passwords do not match');
        return false;
      }
      if (signupPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
    }
    // Steps 2-4 have no required validation — user can skip
    return true;
  }

  function handleNext() {
    if (validateStep(signupStep)) {
      setSignupStep(signupStep + 1);
    }
  }

  function handleBack() {
    setError('');
    setSignupStep(signupStep - 1);
  }

  async function handleSignupComplete() {
    // Always validate Step 1 (name + email + password), skip validation for other steps
    if (!validateStep(1)) return;
    setLoading(true);
    setError('');
    try {
      const user = await signUp(signupEmail, signupPassword);
      const resolvedGender = signupGender === 'other' ? signupCustomGender : signupGender;
      const cleanedMessaging = signupMessaging.filter((m) => m.handle.trim());
      await createStudent(user.uid, {
        name: signupName,
        email: signupEmail,
        avatarUrl: '',
        status: 'trial',
        isNewStudent: true,
        ...(signupBirthday && { birthday: signupBirthday }),
        ...(resolvedGender && { gender: resolvedGender }),
        ...(cleanedMessaging.length > 0 && { messagingContacts: cleanedMessaging }),
        ...(signupPrimary.name && { primaryContact: signupPrimary }),
        ...(signupSecondary.name && { secondaryContact: signupSecondary }),
      });
      setLearnerDialogOpen(false);
      toast({
        title: 'Welcome to LessonLink! 🎉',
        description: 'Your account has been created successfully.',
      });
      router.push('/s-portal');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  }

  async function handleTutorSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (signupPassword !== signupConfirm) {
      setError('Passwords do not match');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signUp(signupEmail, signupPassword);
      router.push('/t-portal');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setLoginEmail('');
    setLoginPassword('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirm('');
    setSignupName('');
    setSignupBirthday('');
    setSignupGender('');
    setSignupCustomGender('');
    setSignupMessaging([]);
    setSignupPrimary({
      name: '', email: '', phone: '', relationship: 'mother',
      country: '', city: '', messaging: [], preferredContactMethod: 'email',
      profession: '', englishProficiency: 'none',
    });
    setSignupSecondary({
      name: '', email: '', phone: '', relationship: 'father',
      country: '', city: '', messaging: [], preferredContactMethod: 'email',
      profession: '', englishProficiency: 'none',
    });
    setSignupStep(1);
    setError('');
  }

  // ── Messaging helpers ──
  function addMessaging() {
    setSignupMessaging([...signupMessaging, { app: 'whatsapp', handle: '' }]);
  }

  function removeMessaging(i: number) {
    setSignupMessaging(signupMessaging.filter((_, idx) => idx !== i));
  }

  function updateMessaging(i: number, field: keyof MessagingContact, value: string) {
    const updated = [...signupMessaging];
    updated[i] = { ...updated[i], [field]: value };
    setSignupMessaging(updated);
  }

  // ── Parent helpers ──
  function updateParent(
    setter: React.Dispatch<React.SetStateAction<ParentContact>>,
    parent: ParentContact,
    field: string,
    value: any,
  ) {
    setter({ ...parent, [field]: value });
  }

  function addParentMessaging(
    setter: React.Dispatch<React.SetStateAction<ParentContact>>,
    parent: ParentContact,
  ) {
    setter({ ...parent, messaging: [...(parent.messaging ?? []), { app: 'whatsapp', handle: '' }] });
  }

  function removeParentMessaging(
    setter: React.Dispatch<React.SetStateAction<ParentContact>>,
    parent: ParentContact,
    i: number,
  ) {
    setter({ ...parent, messaging: (parent.messaging ?? []).filter((_, idx) => idx !== i) });
  }

  function updateParentMessaging(
    setter: React.Dispatch<React.SetStateAction<ParentContact>>,
    parent: ParentContact,
    i: number,
    field: keyof MessagingContact,
    value: string,
  ) {
    const msgs = [...(parent.messaging ?? [])];
    msgs[i] = { ...msgs[i], [field]: value };
    setter({ ...parent, messaging: msgs });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {/* Hero Section */}
      <div className="text-center mb-12 max-w-3xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <GradientIcon icon={BookOpenCheck} id="landing-logo" className="w-16 h-16 md:w-20 md:h-20"/>
          <h1 className="text-6xl md:text-7xl font-headline font-bold primary-gradient-text">
            LessonLink
          </h1>
        </div>
        <p className="text-xl md:text-2xl text-foreground font-body">
          Sit back and learn.
          <br />
          We'll take care of the rest.
        </p>
      </div>
      {/* Portal Buttons */}
      <div className="flex flex-col sm:flex-row gap-6">
        <Button
          variant="outline"
          size="lg"
          className="h-32 w-48 text-xl font-headline bg-transparent hover:bg-primary/10 border-2 border-primary/30 hover:border-primary transition-all duration-300"
          onClick={() => { resetForm(); setLearnerDialogOpen(true); }}
        >
          <div className="flex flex-col items-center gap-3">
            <GraduationCap className="h-10 w-10" />
            <span>Learners</span>
          </div>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-32 w-48 text-xl font-headline bg-transparent hover:bg-primary/10 border-2 border-primary/30 hover:border-primary transition-all duration-300"
          onClick={() => { resetForm(); setTutorDialogOpen(true); }}
        >
          <div className="flex flex-col items-center gap-3">
            <BookOpen className="h-10 w-10" />
            <span>Tutors</span>
          </div>
        </Button>
      </div>
      {/* ═══════ Learner Dialog ═══════ */}
      <Dialog open={learnerDialogOpen} onOpenChange={setLearnerDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-center">
              Learner Portal
            </DialogTitle>
            <DialogDescription className="text-center">
              Sign in to view your lessons and book new sessions
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="login" className="w-full" onValueChange={() => { setError(''); setSignupStep(1); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            {/* ── Login Tab ── */}
            <TabsContent value="login">
              <form onSubmit={(e) => handleLogin(e, 'learner')} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="learner-login-email">Email</Label>
                  <Input id="learner-login-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="learner-login-password">Password</Label>
                  <Input id="learner-login-password" type="password" placeholder="********" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Log In'}
                </Button>
              </form>
            </TabsContent>
            {/* ── Signup Tab (Multi-Step) ── */}
            <TabsContent value="signup">
              <div className="mt-4">
                <StepIndicator signupStep={signupStep} totalSteps={totalSteps} />
                {/* Step 1: Account */}
                {signupStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-center">Create your account</p>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" placeholder="********" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input type="password" placeholder="********" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input placeholder="Learner's full name" value={signupName} onChange={(e) => setSignupName(e.target.value)} />
                    </div>
                  </div>
                )}
                {/* Step 2: Learner Info */}
                {signupStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-center">Tell us about yourself</p>
                    <p className="text-xs text-muted-foreground text-center">You can skip this for now and fill it in later</p>
                    <div className="space-y-2">
                      <Label>Birthday</Label>
                      <Input type="date" value={signupBirthday} onChange={(e) => setSignupBirthday(e.target.value)} />
                      {signupBirthday && (
                        <p className="text-xs text-muted-foreground">
                          Age: {calculateAge(signupBirthday)}
                          {isUnder18 && ' — Parent information will be required'}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <select
                        value={signupGender === 'other' || (signupGender && !['boy', 'girl', ''].includes(signupGender)) ? 'other' : signupGender}
                        onChange={(e) => { setSignupGender(e.target.value); if (e.target.value !== 'other') setSignupCustomGender(''); }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select...</option>
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                      {(signupGender === 'other') && (
                        <Input value={signupCustomGender} onChange={(e) => setSignupCustomGender(e.target.value)} placeholder="Enter identity..." className="mt-2" />
                      )}
                    </div>
                  </div>
                )}
                {/* Step 3: Messaging */}
                {signupStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-center">How can we reach you?</p>
                    <p className="text-xs text-muted-foreground text-center">Add your messaging apps so your tutor can contact you</p>
                    <div className="space-y-3">
                      {signupMessaging.map((m, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <select
                            value={m.app}
                            onChange={(e) => updateMessaging(i, 'app', e.target.value)}
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-36"
                          >
                            {MESSAGING_APPS.map((a) => (
                              <option key={a.value} value={a.value}>{a.label}</option>
                            ))}
                          </select>
                          <Input
                            value={m.handle}
                            onChange={(e) => updateMessaging(i, 'handle', e.target.value)}
                            placeholder="Username or ID..."
                            className="flex-1"
                          />
                          <Button variant="ghost" size="sm" onClick={() => removeMessaging(i)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addMessaging} className="w-full">
                        <Plus className="mr-1 h-3 w-3" /> Add Messaging App
                      </Button>
                    </div>
                  </div>
                )}
                {/* Step 4: Parent Info */}
                {signupStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-sm font-semibold">Parent / Guardian Information</p>
                      {isUnder18 ? (
                        <p className="text-xs text-amber-600 flex items-center justify-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" /> Required — learner is under 18
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Optional for adult learners</p>
                      )}
                    </div>
                    <ParentFields 
                      label="Primary Contact" 
                      parent={signupPrimary} 
                      setter={setSignupPrimary}
                      updateParent={updateParent}
                      addParentMessaging={addParentMessaging}
                      removeParentMessaging={removeParentMessaging}
                      updateParentMessaging={updateParentMessaging}
                    />
                    <div className="border-t pt-4">
                      <ParentFields 
                        label="Secondary Contact (optional)" 
                        parent={signupSecondary} 
                        setter={setSignupSecondary}
                        updateParent={updateParent}
                        addParentMessaging={addParentMessaging}
                        removeParentMessaging={removeParentMessaging}
                        updateParentMessaging={updateParentMessaging}
                      />
                    </div>
                  </div>
                )}
                {/* Error + Navigation */}
                {error && <p className="text-sm text-destructive mt-3">{error}</p>}
                <div className="flex justify-between mt-6">
                  {signupStep > 1 ? (
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-2">
                    {signupStep > 1 && (
                      <Button variant="ghost" onClick={handleSignupComplete} disabled={loading}>
                        {loading ? 'Creating account...' : 'Skip for now'}
                      </Button>
                    )}
                    {signupStep < totalSteps ? (
                      <Button onClick={handleNext}>
                        Next <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={handleSignupComplete} disabled={loading}>
                        {loading ? 'Creating account...' : 'Complete Sign Up'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      {/* ═══════ Tutor Dialog ═══════ */}
      <Dialog open={tutorDialogOpen} onOpenChange={setTutorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-center">
              Tutor Portal
            </DialogTitle>
            <DialogDescription className="text-center">
              Sign in to manage your learners and lessons
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={(e) => handleLogin(e, 'tutor')} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="tutor-login-email">Email</Label>
                  <Input id="tutor-login-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tutor-login-password">Password</Label>
                  <Input id="tutor-login-password" type="password" placeholder="********" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Log In'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleTutorSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="tutor-signup-email">Email</Label>
                  <Input id="tutor-signup-email" type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tutor-signup-password">Password</Label>
                  <Input id="tutor-signup-password" type="password" placeholder="********" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tutor-signup-confirm">Confirm Password</Label>
                  <Input id="tutor-signup-confirm" type="password" placeholder="********" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}