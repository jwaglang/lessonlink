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
  { level: 80, message: "Psst... I'm a little hungry.", icon: '🥜', action: "Play a round to feed your pet!" },
  { level: 70, message: "My tummy is making weird noises.", icon: '🥨', action: "Don't forget to review your words!" },
  { level: 60, message: "Okay I'm properly hungry now.", icon: '🍱', action: "Your pet needs feeding today!" },
  { level: 50, message: "I'm so hungry I can't think straight.", icon: '😵‍💫', action: "Play Memory Match — your pet is starving!" },
  { level: 40, message: "I would eat a shoe right now. No joke.", icon: '🍕', action: "Your pet is very hungry. Feed them!" },
  { level: 30, message: "Everything is spinning... is this what hungry feels like?", icon: '🌫️', action: "Critical! Your pet needs food NOW!" },
  { level: 20, message: "I can't feel my legs. Tell my family I love them.", icon: '🌑', action: "Your pet is about to faint!" },
  { level: 10, message: "......", icon: '🏥', action: "Your pet is dying. Feed them immediately!" },
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
