
'use client';

import { useEffect, useState } from 'react';
import {
  getTeacherProfileByEmail,
  createTeacherProfile,
  updateTeacherProfile,
  isUsernameAvailable,
  getTeacherProfileByUsername,
} from '@/lib/firestore';
import { seedTeacherJonProfile } from '@/lib/seed-teacher-profile';
import { seedTeacherJonReviews } from '@/lib/seed-reviews';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  ExternalLink,
  Save,
  Eye,
  Loader2,
  Download,
} from 'lucide-react';
import type { TeacherProfile, TeacherCertificate, TeacherExperience } from '@/lib/types';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

// Admin email for special fallbacks
const ADMIN_EMAIL = 'jwag.lang@gmail.com';

// Default empty profile structure
const emptyProfile: Omit<TeacherProfile, 'id' | 'createdAt' | 'updatedAt' | 'email'> = {
  username: '',
  name: '',
  headline: '',
  avatarUrl: '',
  coverImageUrl: '',
  videoUrl: '',
  aboutMe: '',
  teachingPhilosophy: '',
  lessonStyle: '',
  teachingMaterials: [],
  nativeLanguage: 'English',
  otherLanguages: [],
  specialties: [],
  interests: [],
  countryFrom: '',
  cityLiving: '',
  timezone: '',
  teachingSince: '',
  certificates: [],
  experience: [],
  stats: {
    rating: 5.0,
    totalStudents: 0,
    totalLessons: 0,
    attendanceRate: 100,
    responseRate: 100,
  },
  isOnline: false,
  isPublished: false,
};

export default function ProfileEditorPage() {
  const { user, loading: authLoading } = useAuth();
  if (!user) return null;
  const currentUser = user;

  const [profile, setProfile] = useState<Omit<TeacherProfile, 'id' | 'createdAt' | 'updatedAt'>>({ ...emptyProfile, email: '' });
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | 'idle'>('idle');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dialog states
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [newCert, setNewCert] = useState<TeacherCertificate>({ title: '', issuer: '', year: '', description: '', verified: false });
  const [newExp, setNewExp] = useState<TeacherExperience>({ title: '', organization: '', location: '', startYear: '', endYear: '', description: '' });

  // Array input states (comma-separated)
  const [materialsInput, setMaterialsInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [interestsInput, setInterestsInput] = useState('');

  useEffect(() => {
    if (authLoading || !user?.email) {
      return;
    }

    async function loadProfile() {
      let existingProfile = await getTeacherProfileByEmail(currentUser.email!);

      // Fallback for admin user to load the main teacher profile by username
      if (!existingProfile && currentUser.email === ADMIN_EMAIL) {
        console.log('Admin user detected, attempting to load profile by username "teacherjon"');
        existingProfile = await getTeacherProfileByUsername('teacherjon');
      }
      
      if (existingProfile) {
        setProfileId(existingProfile.id);
        const { id, createdAt, updatedAt, ...profileData } = existingProfile;
        setProfile(profileData);
        
        // Set array inputs from loaded profile
        setMaterialsInput(profileData.teachingMaterials?.join(', ') || '');
        setLanguagesInput(profileData.otherLanguages?.join(', ') || '');
        setSpecialtiesInput(profileData.specialties?.join(', ') || '');
        setInterestsInput(profileData.interests?.join(', ') || '');
      } else {
        setProfile({ ...emptyProfile, email: currentUser.email! });
      }
      
      setLoading(false);
    }

    loadProfile();
  }, [user, authLoading]);

  // Check username availability with debounce
  useEffect(() => {
    if (!profile.username || profile.username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    if (!user?.email) return;

    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      const available = await isUsernameAvailable(profile.username);
      
      if (profileId) {
        const existingProfile = await getTeacherProfileByEmail(user.email!);
        if (existingProfile?.username === profile.username) {
          setUsernameStatus('available');
          return;
        }
      }
      
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);

    return () => clearTimeout(timer);
  }, [profile.username, profileId, user]);

  function updateField<K extends keyof typeof profile>(field: K, value: typeof profile[K]) {
    setProfile(prev => ({ ...prev, [field]: value }));
  }

  function parseArrayInput(input: string): string[] {
    return input.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  const [seeding, setSeeding] = useState(false);

  async function handleSeedFromItalki() {
    setSeeding(true);
    setSaveMessage(null);
    
    try {
      const seededProfile = await seedTeacherJonProfile();
      
      // Update local state with seeded data
      const { id, createdAt, updatedAt, ...profileData } = seededProfile;
      setProfileId(id);
      setProfile(profileData);
      
      // Update array inputs
      setMaterialsInput(profileData.teachingMaterials?.join(', ') || '');
      setLanguagesInput(profileData.otherLanguages?.join(', ') || '');
      setSpecialtiesInput(profileData.specialties?.join(', ') || '');
      setInterestsInput(profileData.interests?.join(', ') || '');
      
      setSaveMessage({ type: 'success', text: 'Profile seeded from iTalki data!' });
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || 'Failed to seed profile' });
    } finally {
      setSeeding(false);
    }
  }

  const [seedingReviews, setSeedingReviews] = useState(false);

  async function handleSeedReviews() {
    setSeedingReviews(true);
    setSaveMessage(null);
    
    try {
      const count = await seedTeacherJonReviews();
      setSaveMessage({ type: 'success', text: `Seeded ${count} reviews from iTalki!` });
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || 'Failed to seed reviews' });
    } finally {
      setSeedingReviews(false);
    }
  }

  async function handleSave() {
    if (!user?.email) {
      setSaveMessage({ type: 'error', text: 'You must be logged in to save.' });
      return;
    }
    // Validate
    if (!profile.username || profile.username.length < 3) {
      setSaveMessage({ type: 'error', text: 'Username must be at least 3 characters' });
      return;
    }
    if (usernameStatus === 'taken') {
      setSaveMessage({ type: 'error', text: 'Username is already taken' });
      return;
    }
    if (!profile.name) {
      setSaveMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    // Parse array inputs
    const profileData = {
      ...profile,
      email: user.email,
      username: profile.username.toLowerCase(),
      teachingMaterials: parseArrayInput(materialsInput),
      otherLanguages: parseArrayInput(languagesInput),
      specialties: parseArrayInput(specialtiesInput),
      interests: parseArrayInput(interestsInput),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      let savedProfile: TeacherProfile;
      if (profileId) {
        savedProfile = await updateTeacherProfile(profileId, profileData);
        setSaveMessage({ type: 'success', text: 'Profile saved!' });
      } else {
        savedProfile = await createTeacherProfile(profileData);
        setSaveMessage({ type: 'success', text: 'Profile created!' });
      }

      // Deconstruct to get the ID and the rest of the data for the profile state
      const { id, createdAt, updatedAt, ...profileStateData } = savedProfile;

      // Update the component's state to trigger a re-render
      setProfileId(id);
      setProfile(profileStateData);
      
      // Also update the array input fields to match the newly saved (and cleaned) data
      setMaterialsInput(savedProfile.teachingMaterials?.join(', ') || '');
      setLanguagesInput(savedProfile.otherLanguages?.join(', ') || '');
      setSpecialtiesInput(savedProfile.specialties?.join(', ') || '');
      setInterestsInput(savedProfile.interests?.join(', ') || '');

    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  }

  function addCertificate() {
    if (!newCert.title || !newCert.issuer || !newCert.year) return;
    setProfile(prev => ({
      ...prev,
      certificates: [...(prev.certificates || []), newCert],
    }));
    setNewCert({ title: '', issuer: '', year: '', description: '', verified: false });
    setCertDialogOpen(false);
  }

  function removeCertificate(index: number) {
    setProfile(prev => ({
      ...prev,
      certificates: prev.certificates?.filter((_, i) => i !== index),
    }));
  }

  function addExperience() {
    if (!newExp.title || !newExp.organization || !newExp.startYear) return;
    setProfile(prev => ({
      ...prev,
      experience: [...(prev.experience || []), newExp],
    }));
    setNewExp({ title: '', organization: '', location: '', startYear: '', endYear: '', description: '' });
    setExpDialogOpen(false);
  }

  function removeExperience(index: number) {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience?.filter((_, i) => i !== index),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Edit Profile"
          description="Set up your public teacher profile."
        />
        <div className="flex items-center gap-2">
          {profileId && profile.isPublished && (
            <Link href={`/t/${profile.username}`} target="_blank">
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Profile
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          )}
          <Button variant="outline" onClick={handleSeedFromItalki} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Seed Profile
          </Button>
          <Button variant="outline" onClick={handleSeedReviews} disabled={seedingReviews || !profileId}>
            {seedingReviews ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Seed Reviews (86)
          </Button>
          <Button onClick={handleSave} disabled={saving || usernameStatus === 'taken'}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {saveMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {saveMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {saveMessage.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Your public profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/t/</span>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => updateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-username"
                />
                {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
                {usernameStatus === 'available' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {usernameStatus === 'taken' && <AlertCircle className="h-4 w-4 text-red-500" />}
              </div>
              {usernameStatus === 'taken' && (
                <p className="text-sm text-red-500">This username is already taken</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name *</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="👨🏫 Teacher Jon 🎓"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={profile.headline}
                onChange={(e) => updateField('headline', e.target.value)}
                placeholder="🌟 Fluency Specialist for All Ages 🌟"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                value={profile.avatarUrl}
                onChange={(e) => updateField('avatarUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImageUrl">Cover Image URL</Label>
              <Input
                id="coverImageUrl"
                value={profile.coverImageUrl}
                onChange={(e) => updateField('coverImageUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">YouTube Intro Video URL</Label>
              <Input
                id="videoUrl"
                value={profile.videoUrl}
                onChange={(e) => updateField('videoUrl', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Languages */}
        <Card>
          <CardHeader>
            <CardTitle>Location & Languages</CardTitle>
            <CardDescription>Where you're from and what you speak</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="countryFrom">Country From</Label>
              <Input
                id="countryFrom"
                value={profile.countryFrom}
                onChange={(e) => updateField('countryFrom', e.target.value)}
                placeholder="United States"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cityLiving">City Living In</Label>
              <Input
                id="cityLiving"
                value={profile.cityLiving}
                onChange={(e) => updateField('cityLiving', e.target.value)}
                placeholder="Lisbon, Portugal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={profile.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
                placeholder="Europe/Lisbon"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nativeLanguage">Native Language</Label>
              <Input
                id="nativeLanguage"
                value={profile.nativeLanguage}
                onChange={(e) => updateField('nativeLanguage', e.target.value)}
                placeholder="English"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otherLanguages">Other Languages (comma-separated)</Label>
              <Input
                id="otherLanguages"
                value={languagesInput}
                onChange={(e) => setLanguagesInput(e.target.value)}
                placeholder="Portuguese, Chinese (Mandarin)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teachingSince">Teaching Since</Label>
              <Input
                id="teachingSince"
                value={profile.teachingSince}
                onChange={(e) => updateField('teachingSince', e.target.value)}
                placeholder="Mar 16, 2013"
              />
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>About You</CardTitle>
            <CardDescription>Tell students about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aboutMe">About Me *</Label>
              <Textarea
                id="aboutMe"
                value={profile.aboutMe}
                onChange={(e) => updateField('aboutMe', e.target.value)}
                placeholder="Tell students about your background, experience, and why you teach..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teachingPhilosophy">Me as a Teacher</Label>
              <Textarea
                id="teachingPhilosophy"
                value={profile.teachingPhilosophy}
                onChange={(e) => updateField('teachingPhilosophy', e.target.value)}
                placeholder="Describe your teaching philosophy and approach..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lessonStyle">My Lessons & Teaching Style</Label>
              <Textarea
                id="lessonStyle"
                value={profile.lessonStyle}
                onChange={(e) => updateField('lessonStyle', e.target.value)}
                placeholder="Describe what students can expect in your lessons..."
                rows={4}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialties">Specialties (comma-separated)</Label>
                <Input
                  id="specialties"
                  value={specialtiesInput}
                  onChange={(e) => setSpecialtiesInput(e.target.value)}
                  placeholder="Test Preparation, Kids, Business English"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests">Interests (comma-separated)</Label>
                <Input
                  id="interests"
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                  placeholder="Gaming, Films & TV Series, Pets"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teachingMaterials">Teaching Materials (comma-separated)</Label>
              <Input
                id="teachingMaterials"
                value={materialsInput}
                onChange={(e) => setMaterialsInput(e.target.value)}
                placeholder="Presentation slides, Flashcards, Video files, Quizzes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Certificates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Certificates</CardTitle>
              <CardDescription>Your qualifications and certifications</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCertDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {profile.certificates && profile.certificates.length > 0 ? (
              <div className="space-y-3">
                {profile.certificates.map((cert, i) => (
                  <div key={i} className="flex items-start justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{cert.title}</p>
                      <p className="text-sm text-muted-foreground">{cert.issuer} - {cert.year}</p>
                      {cert.verified && (
                        <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeCertificate(i)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No certificates added yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Experience</CardTitle>
              <CardDescription>Your teaching and work history</CardDescription>
            </div>
            <Button size="sm" onClick={() => setExpDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {profile.experience && profile.experience.length > 0 ? (
              <div className="space-y-3">
                {profile.experience.map((exp, i) => (
                  <div key={i} className="flex items-start justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{exp.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {exp.organization} {exp.location && `- ${exp.location}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exp.startYear} - {exp.endYear || 'Present'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeExperience(i)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No experience added yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Stats & Publishing */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stats & Publishing</CardTitle>
            <CardDescription>Your profile statistics and visibility</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="rating">Rating (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={profile.stats.rating}
                  onChange={(e) => updateField('stats', { ...profile.stats, rating: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalStudents">Total Students</Label>
                <Input
                  id="totalStudents"
                  type="number"
                  min="0"
                  value={profile.stats.totalStudents}
                  onChange={(e) => updateField('stats', { ...profile.stats, totalStudents: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalLessons">Total Lessons</Label>
                <Input
                  id="totalLessons"
                  type="number"
                  min="0"
                  value={profile.stats.totalLessons}
                  onChange={(e) => updateField('stats', { ...profile.stats, totalLessons: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendanceRate">Attendance %</Label>
                <Input
                  id="attendanceRate"
                  type="number"
                  min="0"
                  max="100"
                  value={profile.stats.attendanceRate}
                  onChange={(e) => updateField('stats', { ...profile.stats, attendanceRate: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responseRate">Response %</Label>
                <Input
                  id="responseRate"
                  type="number"
                  min="0"
                  max="100"
                  value={profile.stats.responseRate}
                  onChange={(e) => updateField('stats', { ...profile.stats, responseRate: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Publish Profile</p>
                <p className="text-sm text-muted-foreground">
                  Make your profile visible at /t/{profile.username || 'username'}
                </p>
              </div>
              <Switch
                checked={profile.isPublished}
                onCheckedChange={(checked) => updateField('isPublished', checked)}
                disabled={!profileId}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Certificate Dialog */}
      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Certificate</DialogTitle>
            <DialogDescription>Add a certification or qualification</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="certTitle">Title *</Label>
              <Input
                id="certTitle"
                value={newCert.title}
                onChange={(e) => setNewCert(prev => ({ ...prev, title: e.target.value }))}
                placeholder="TESOL Certification"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certIssuer">Issuer *</Label>
              <Input
                id="certIssuer"
                value={newCert.issuer}
                onChange={(e) => setNewCert(prev => ({ ...prev, issuer: e.target.value }))}
                placeholder="Trinity College London"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certYear">Year *</Label>
              <Input
                id="certYear"
                value={newCert.year}
                onChange={(e) => setNewCert(prev => ({ ...prev, year: e.target.value }))}
                placeholder="2021"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certDescription">Description</Label>
              <Textarea
                id="certDescription"
                value={newCert.description}
                onChange={(e) => setNewCert(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the certification..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newCert.verified}
                onCheckedChange={(checked) => setNewCert(prev => ({ ...prev, verified: checked }))}
              />
              <Label>Verified</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertDialogOpen(false)}>Cancel</Button>
            <Button onClick={addCertificate}>Add Certificate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Experience Dialog */}
      <Dialog open={expDialogOpen} onOpenChange={setExpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Experience</DialogTitle>
            <DialogDescription>Add teaching or work experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expTitle">Title *</Label>
              <Input
                id="expTitle"
                value={newExp.title}
                onChange={(e) => setNewExp(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Online English Teacher"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expOrg">Organization *</Label>
              <Input
                id="expOrg"
                value={newExp.organization}
                onChange={(e) => setNewExp(prev => ({ ...prev, organization: e.target.value }))}
                placeholder="iTalki"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expLocation">Location</Label>
              <Input
                id="expLocation"
                value={newExp.location}
                onChange={(e) => setNewExp(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Remote"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expStart">Start Year *</Label>
                <Input
                  id="expStart"
                  value={newExp.startYear}
                  onChange={(e) => setNewExp(prev => ({ ...prev, startYear: e.target.value }))}
                  placeholder="2010"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expEnd">End Year (blank = Present)</Label>
                <Input
                  id="expEnd"
                  value={newExp.endYear}
                  onChange={(e) => setNewExp(prev => ({ ...prev, endYear: e.target.value }))}
                  placeholder="2024"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expDescription">Description</Label>
              <Textarea
                id="expDescription"
                value={newExp.description}
                onChange={(e) => setNewExp(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your role..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpDialogOpen(false)}>Cancel</Button>
            <Button onClick={addExperience}>Add Experience</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
