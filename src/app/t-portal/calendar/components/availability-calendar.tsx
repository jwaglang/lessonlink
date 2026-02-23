'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import type { Availability, SessionInstance } from '@/lib/types';
import TimeSlot from './time-slot';
import { setAvailabilityBulk } from '@/lib/firestore';

const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function getSessionDate(instance: SessionInstance): string {
  return (instance as any).lessonDate || (instance as any).date || '';
}

/** Get the hour index (0-23) from a time string like "09:00" */
function hourIndex(time: string): number {
  return parseInt(time.split(':')[0], 10);
}

/** Get the day index (0-6) within the given days array */
function dayIndex(date: Date, days: Date[]): number {
  return days.findIndex(d => isSameDay(d, date));
}

/**
 * Compute column-fill rectangle selection.
 * Every column between startCol and endCol is filled from startRow to endRow.
 */
function computeColumnFillSlots(
  startDate: Date,
  startTime: string,
  currentDate: Date,
  currentTime: string,
  days: Date[]
): Set<string> {
  const startCol = dayIndex(startDate, days);
  const endCol = dayIndex(currentDate, days);
  const startRow = hourIndex(startTime);
  const endRow = hourIndex(currentTime);

  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  const slots = new Set<string>();
  for (let col = minCol; col <= maxCol; col++) {
    if (col < 0 || col >= days.length) continue;
    for (let row = minRow; row <= maxRow; row++) {
      slots.add(`${days[col].getTime()}-${hours[row]}`);
    }
  }
  return slots;
}

interface AvailabilityCalendarProps {
  initialAvailability: Availability[];
  sessionInstances: SessionInstance[];
  onSlotDoubleClick: (date: Date, time: string) => void;
}

export default function AvailabilityCalendar({ 
  initialAvailability, 
  sessionInstances, 
  onSlotDoubleClick 
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState(initialAvailability);
  useEffect(() => { setAvailability(initialAvailability); }, [initialAvailability]);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightedSlots, setHighlightedSlots] = useState<Set<string>>(new Set());
  
  // Use refs for drag state to avoid stale closures in the global mouseup handler
  const dragStartRef = useRef<{ date: Date; time: string } | null>(null);
  const dragTargetRef = useRef<boolean>(true);
  const highlightedRef = useRef<Set<string>>(new Set());
  const isDraggingRef = useRef(false);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Keep ref in sync with state
  useEffect(() => {
    highlightedRef.current = highlightedSlots;
  }, [highlightedSlots]);

  // Global mouseup handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        commitDrag();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [availability]);

  // --- Drag handlers ---

  const handleMouseDown = useCallback((date: Date, time: string) => {
    const availableSlot = availability.find(
      a => isSameDay(startOfDay(parseISO(a.date)), date) && a.time === time
    );
    const isCurrentlyAvailable = availableSlot?.isAvailable ?? false;
    const targetValue = !isCurrentlyAvailable;

    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = { date, time };
    dragTargetRef.current = targetValue;

    const slotKey = `${date.getTime()}-${time}`;
    const newSet = new Set([slotKey]);
    setHighlightedSlots(newSet);
    highlightedRef.current = newSet;
  }, [availability]);

  const handleMouseEnter = useCallback((date: Date, time: string) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;

    // Column-fill: recompute entire rectangle from start to current
    const newSlots = computeColumnFillSlots(
      dragStartRef.current.date,
      dragStartRef.current.time,
      date,
      time,
      days
    );
    setHighlightedSlots(newSlots);
    highlightedRef.current = newSlots;
  }, [days]);

  const commitDrag = useCallback(async () => {
    const highlighted = highlightedRef.current;
    const targetValue = dragTargetRef.current;

    // Reset drag state immediately (responsive UI)
    isDraggingRef.current = false;
    setIsDragging(false);
    dragStartRef.current = null;
    setHighlightedSlots(new Set());
    highlightedRef.current = new Set();

    if (highlighted.size === 0) return;

    // Convert highlighted slot keys to { date, time } array
    const slotsToSet = Array.from(highlighted).map(key => {
      const dashIdx = key.indexOf('-');
      const timestamp = key.substring(0, dashIdx);
      const time = key.substring(dashIdx + 1);
      return { date: new Date(parseInt(timestamp)), time };
    });

    // OPTIMISTIC UI: update local state immediately
    setAvailability(prev => {
      const newAvail = [...prev];
      for (const slot of slotsToSet) {
        const slotDate = startOfDay(slot.date);
        const existingIndex = newAvail.findIndex(
          a => startOfDay(parseISO(a.date)).getTime() === slotDate.getTime() && a.time === slot.time
        );
        if (existingIndex > -1) {
          newAvail[existingIndex] = { ...newAvail[existingIndex], isAvailable: targetValue };
        } else {
          newAvail.push({
            id: `temp-${slot.date.getTime()}-${slot.time}`,
            date: slotDate.toISOString(),
            time: slot.time,
            isAvailable: targetValue,
          } as Availability);
        }
      }
      return newAvail;
    });

    // BACKGROUND: write to Firestore (single batch call)
    try {
      const updatedSlots = await setAvailabilityBulk(slotsToSet, targetValue);
      
      // Replace optimistic entries with real Firestore data
      setAvailability(prev => {
        let newAvail = [...prev];
        for (const updated of updatedSlots) {
          const updatedDate = startOfDay(new Date(updated.date));
          const existingIndex = newAvail.findIndex(
            a => startOfDay(new Date(a.date)).getTime() === updatedDate.getTime() && a.time === updated.time
          );
          if (existingIndex > -1) {
            newAvail[existingIndex] = updated;
          } else {
            newAvail.push(updated);
          }
        }
        return newAvail;
      });
    } catch (err) {
      console.error('Failed to save availability:', err);
    }
  }, []);

  // Single click is handled by mouseDown → mouseUp with 1 slot highlighted
  const handleSlotClick = useCallback(async (_date: Date, _time: string) => {
    // No-op: drag handlers cover single clicks too
  }, []);

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

        <div 
          className="grid grid-cols-8 border-t text-sm select-none"
        >
          <div className="border-b border-r p-2 font-semibold text-center text-muted-foreground">Time</div>
          {days.map((day) => (
            <div key={day.toString()} className="border-b border-r p-2 font-semibold text-center">
              <p>{format(day, 'EEE')}</p>
              <p className="text-muted-foreground">{format(day, 'd')}</p>
            </div>
          ))}
          
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="border-b border-r p-2 text-center text-muted-foreground font-mono text-xs">
                {hour}
              </div>
              {days.map(day => {
                const bookedSession = sessionInstances.find(instance => {
                  const dateStr = getSessionDate(instance);
                  if (!dateStr) return false;
                  try {
                    return isSameDay(parseISO(dateStr), day) && instance.startTime === hour;
                  } catch {
                    return false;
                  }
                });
                const availableSlot = availability.find(
                  a => isSameDay(startOfDay(parseISO(a.date)), day) && a.time === hour
                );
                
                return (
                  <TimeSlot
                    key={`${day.toString()}-${hour}`}
                    date={day}
                    time={hour}
                    isAvailable={availableSlot?.isAvailable ?? false}
                    isBooked={!!bookedSession}
                    isHighlighted={highlightedSlots.has(`${day.getTime()}-${hour}`)}
                    onClick={handleSlotClick}
                    onDoubleClick={onSlotDoubleClick}
                    onMouseDown={handleMouseDown}
                    onMouseEnter={handleMouseEnter}
                    onMouseUp={() => {}}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
