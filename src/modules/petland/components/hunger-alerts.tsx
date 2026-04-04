'use client';

import { useEffect, useRef } from 'react';
import type { PetlandProfile } from '../types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface HungerAlertsProps {
  profile: PetlandProfile;
  learnerId: string;
}

const hungerThresholds: { level: number; message: string; icon: string; action: string }[] = [
  { level: 80, message: "I could go for a peanut!", icon: '🥜', action: "Time for a tiny treat!" },
  { level: 70, message: "Feeling a little peckish!", icon: '🥨', action: "How about a snack?" },
  { level: 60, message: "Is that my tummy rumbling?", icon: '🍱', action: "Let's find some lunch!" },
  { level: 50, message: "Uh oh... I'm getting dizzy!", icon: '😵‍💫', action: "Feed your pet soon!" },
  { level: 40, message: "Okay, I'll eat anything!", icon: '🍕', action: "Quick! They are hungry!" },
  { level: 30, message: "Must have food! Is it getting darker?", icon: '🌫️', action: "Danger! Very low energy!" },
  { level: 20, message: "Huh?... Who turned off the lights?", icon: '🌑', action: "Critical! Your pet is fainting!" },
  { level: 10, message: "... ", icon: '🏥', action: "Emergency! Your pet needs a vet!" },
];

export function HungerAlerts({ profile, learnerId }: HungerAlertsProps) {
  const { toast } = useToast();
  const processedHpRef = useRef<number | null>(null);

  useEffect(() => {
    if (!profile || profile.hp === processedHpRef.current) return;

    const profileRef = doc(db, 'students', learnerId, 'petland', 'profile');
    const applicableAlert = hungerThresholds.find((t) => profile.hp <= t.level);

    if (applicableAlert && applicableAlert.level !== profile.lastHpAlertLevel) {
      toast({
        title: `${applicableAlert.icon} ${applicableAlert.message}`,
        description: applicableAlert.action,
        duration: 5000,
      });
      updateDoc(profileRef, { lastHpAlertLevel: applicableAlert.level }).catch(console.error);
    }

    // Reset alert level if HP recovered past the threshold
    if (!applicableAlert && profile.lastHpAlertLevel !== undefined && profile.lastHpAlertLevel !== null) {
      updateDoc(profileRef, { lastHpAlertLevel: null }).catch(console.error);
    }

    processedHpRef.current = profile.hp;
  }, [profile, learnerId, toast]);

  return null;
}
