'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { saveUserSettings, getUserSettings } from '@/lib/firestore';

// Common timezones grouped by region
const TIMEZONE_OPTIONS = [
  { group: 'Americas', zones: [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Buenos_Aires',
  ]},
  { group: 'Europe', zones: [
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Rome',
    'Europe/Amsterdam',
    'Europe/Brussels',
    'Europe/Lisbon',
    'Europe/Warsaw',
    'Europe/Moscow',
  ]},
  { group: 'Asia', zones: [
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Singapore',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Jakarta',
  ]},
  { group: 'Pacific', zones: [
    'Pacific/Auckland',
    'Pacific/Sydney',
    'Australia/Melbourne',
    'Australia/Perth',
  ]},
  { group: 'Africa', zones: [
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Africa/Lagos',
    'Africa/Nairobi',
  ]},
];

interface TimezonePromptProps {
  userIdOrEmail: string;
  userType: 'teacher' | 'student';
  onTimezoneSet: (timezone: string) => void;
}

export default function TimezonePrompt({ userIdOrEmail, userType, onTimezoneSet }: TimezonePromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function checkTimezone() {
      // Check if user already has timezone set
      const settings = await getUserSettings(userIdOrEmail, userType);
      
      if (settings?.timezoneConfirmed) {
        // Already set, no need to prompt
        onTimezoneSet(settings.timezone);
        setIsLoading(false);
        return;
      }

      // Detect browser timezone
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedTimezone(detected);
      setSelectedTimezone(detected);
      
      // Show prompt
      setIsOpen(true);
      setIsLoading(false);
    }

    if (userIdOrEmail) {
      checkTimezone();
    }
  }, [userIdOrEmail, userType, onTimezoneSet]);

  async function handleConfirm() {
    setIsSaving(true);
    
    await saveUserSettings(userIdOrEmail, {
      userType,
      timezone: selectedTimezone,
      timezoneConfirmed: true,
    });
    
    setIsSaving(false);
    setIsOpen(false);
    onTimezoneSet(selectedTimezone);
  }

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Confirm Your Timezone
          </DialogTitle>
          <DialogDescription>
            We detected your timezone as <strong>{detectedTimezone}</strong>. 
            Please confirm or select a different one.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">Your Timezone</label>
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {TIMEZONE_OPTIONS.map(group => (
                <div key={group.group}>
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    {group.group}
                  </div>
                  {group.zones.map(zone => (
                    <SelectItem key={zone} value={zone}>
                      {zone.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            This is used for scheduling and deadline calculations.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Confirm Timezone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
