'use client';

import { useState } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
  subDays,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Availability } from '@/lib/types';
import TimeSlot from './time-slot';
import { toggleAvailability } from '@/lib/data';

const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

// Helper functions to handle dates without timezones messing things up
function isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function parseISO(isoString: string) {
    const [year, month, day] = isoString.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
}

export default function AvailabilityCalendar({ initialAvailability }: { initialAvailability: Availability[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState(initialAvailability);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handleSlotClick = async (date: Date, time: string) => {
    const updatedSlot = await toggleAvailability(date, time);
    setAvailability(prev => {
        const existingIndex = prev.findIndex(a => a.id === updatedSlot.id);
        if (existingIndex > -1) {
            const newAvail = [...prev];
            newAvail[existingIndex] = updatedSlot;
            return newAvail;
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
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
            >
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

        <div className="grid grid-cols-8 border-t text-sm">
          <div className="border-b border-r p-2 font-semibold text-center text-muted-foreground">Time</div>
          {days.map((day) => (
            <div key={day.toString()} className="border-b border-r p-2 font-semibold text-center">
              <p>{format(day, 'EEE')}</p>
              <p className="text-muted-foreground">{format(day, 'd')}</p>
            </div>
          ))}
          
          {hours.map(hour => (
            <>
                <div className="border-b border-r p-2 text-center text-muted-foreground font-mono text-xs" key={`${hour}-label`}>{hour}</div>
                {days.map(day => {
                    const slot = availability.find(a => isSameDay(parseISO(a.date), day) && a.time === hour);
                    return (
                        <TimeSlot
                            key={`${day.toString()}-${hour}`}
                            date={day}
                            time={hour}
                            isAvailable={slot?.isAvailable ?? false}
                            onClick={handleSlotClick}
                        />
                    )
                })}
            </>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
