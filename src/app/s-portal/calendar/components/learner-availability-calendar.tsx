'use client';

import React, { useState } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
  subDays,
  parseISO,
  startOfDay,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { LearnerAvailability, SessionInstance } from '@/lib/types';
import { toggleLearnerAvailability } from '@/lib/firestore';

const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getSessionDate(instance: SessionInstance): string {
  return (instance as any).lessonDate || (instance as any).date || '';
}

interface LearnerAvailabilityCalendarProps {
  studentId: string;
  initialAvailability: LearnerAvailability[];
  sessionInstances: SessionInstance[];
}

export default function LearnerAvailabilityCalendar({
  studentId,
  initialAvailability,
  sessionInstances,
}: LearnerAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState(initialAvailability);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handleSlotClick = async (date: Date, time: string) => {
    const updatedSlot = await toggleLearnerAvailability(studentId, date, time);
    setAvailability((prev) => {
      const updatedDate = startOfDay(new Date(updatedSlot.date));
      const existingIndex = prev.findIndex(
        (a) =>
          startOfDay(new Date(a.date)).getTime() === updatedDate.getTime() &&
          a.time === updatedSlot.time
      );
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = updatedSlot;
        return next;
      }
      return [...prev, updatedSlot];
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-headline font-semibold">
            {format(weekStart, 'MMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subDays(currentDate, 7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Click a time slot to mark when you're available. Tutors can use this to find times that work for both of you.
        </p>

        <div className="grid grid-cols-8 border-t text-sm">
          <div className="border-b border-r p-2 font-semibold text-center text-muted-foreground">
            Time
          </div>
          {days.map((day) => (
            <div
              key={day.toString()}
              className="border-b border-r p-2 font-semibold text-center"
            >
              <p>{format(day, 'EEE')}</p>
              <p className="text-muted-foreground">{format(day, 'd')}</p>
            </div>
          ))}

          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div
                className="border-b border-r p-2 text-center text-muted-foreground font-mono text-xs"
                key={`${hour}-label`}
              >
                {hour}
              </div>
              {days.map((day) => {
                const bookedSession = sessionInstances.find((instance) => {
                  const dateStr = getSessionDate(instance);
                  if (!dateStr) return false;
                  try {
                    return isSameDay(parseISO(dateStr), day) && instance.startTime === hour;
                  } catch {
                    return false;
                  }
                });

                const availableSlot = availability.find(
                  (a) =>
                    isSameDay(startOfDay(parseISO(a.date)), day) && a.time === hour
                );

                const isAvailable = availableSlot?.isAvailable ?? false;
                const isBooked = !!bookedSession;

                return (
                  <div
                    key={`${day.toString()}-${hour}`}
                    className={`border-b border-r p-1 cursor-pointer transition-colors min-h-[2rem] ${
                      isBooked
                        ? 'bg-blue-100 dark:bg-blue-900 cursor-not-allowed'
                        : isAvailable
                        ? 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      if (!isBooked) handleSlotClick(day, hour);
                    }}
                    title={
                      isBooked
                        ? 'Session booked'
                        : isAvailable
                        ? 'Available — click to remove'
                        : 'Click to mark as available'
                    }
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-800" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-blue-200 dark:bg-blue-800" />
            <span>Session booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-muted border" />
            <span>Not set</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
