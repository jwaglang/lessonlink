'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logIn, signUp } from '@/lib/auth';
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
import { GraduationCap, BookOpen, BookOpenCheck } from 'lucide-react';
import { GradientIcon } from '@/components/gradient-icon';

export default function LandingPage() {
  const router = useRouter();
  const [learnerDialogOpen, setLearnerDialogOpen] = useState(false);
  const [tutorDialogOpen, setTutorDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

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

  async function handleSignup(e: React.FormEvent, role: 'learner' | 'tutor') {
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
      const redirectPath = role === 'learner' ? '/s-portal' : '/t-portal';
      router.push(redirectPath);
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
    setError('');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
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
          We took care of the rest.
        </p>
      </div>

      {/* Portal Buttons */}
      <div className="flex flex-col sm:flex-row gap-6">
        <Button
          variant="outline"
          size="lg"
          className="h-32 w-48 text-xl font-headline bg-transparent hover:bg-primary/10 border-2 border-primary/30 hover:border-primary transition-all duration-300"
          onClick={() => {
            resetForm();
            setLearnerDialogOpen(true);
          }}
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
          onClick={() => {
            resetForm();
            setTutorDialogOpen(true);
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <BookOpen className="h-10 w-10" />
            <span>Tutors</span>
          </div>
        </Button>
      </div>

      {/* Learner Dialog */}
      <Dialog open={learnerDialogOpen} onOpenChange={setLearnerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-center">
              Learner Portal
            </DialogTitle>
            <DialogDescription className="text-center">
              Sign in to view your lessons and book new sessions
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={(e) => handleLogin(e, 'learner')} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="learner-login-email">Email</Label>
                  <Input
                    id="learner-login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="learner-login-password">Password</Label>
                  <Input
                    id="learner-login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Log In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={(e) => handleSignup(e, 'learner')} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="learner-signup-email">Email</Label>
                  <Input
                    id="learner-signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="learner-signup-password">Password</Label>
                  <Input
                    id="learner-signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="learner-signup-confirm">Confirm Password</Label>
                  <Input
                    id="learner-signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    required
                  />
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

      {/* Tutor Dialog */}
      <Dialog open={tutorDialogOpen} onOpenChange={setTutorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-center">
              Tutor Portal
            </DialogTitle>
            <DialogDescription className="text-center">
              Sign in to manage your students and lessons
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
                  <Input
                    id="tutor-login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tutor-login-password">Password</Label>
                  <Input
                    id="tutor-login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Log In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={(e) => handleSignup(e, 'tutor')} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="tutor-signup-email">Email</Label>
                  <Input
                    id="tutor-signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tutor-signup-password">Password</Label>
                  <Input
                    id="tutor-signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tutor-signup-confirm">Confirm Password</Label>
                  <Input
                    id="tutor-signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    required
                  />
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