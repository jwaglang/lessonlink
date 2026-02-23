'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Trash2, CalendarPlus, Loader2 } from 'lucide-react';
import type { ScheduleTemplate } from '@/lib/types';
import {
  createScheduleTemplate,
  getScheduleTemplatesByOwner,
  updateScheduleTemplate,
  deleteScheduleTemplate,
  setAvailabilityBulk,
  setLearnerAvailabilityBulk,
} from '@/lib/firestore';
import { addDays, startOfWeek, eachDayOfInterval, endOfWeek } from 'date-fns';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

function hourIndex(time: string): number {
  return parseInt(time.split(':')[0], 10);
}

interface ScheduleTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  ownerType: 'teacher' | 'learner';
  /** Called after applying so the parent can refresh availability state */
  onApplied?: () => void;
}

export default function ScheduleTemplateModal({
  open,
  onOpenChange,
  ownerId,
  ownerType,
  onApplied,
}: ScheduleTemplateModalProps) {
  // Template state
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set()); // "day-time" e.g. "1-09:00"

  // Apply state
  const [applyRange, setApplyRange] = useState<string>('1'); // weeks to apply
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ day: number; time: string } | null>(null);
  const dragTargetRef = useRef<boolean>(true);
  const isDraggingRef = useRef(false);

  // Load saved templates
  useEffect(() => {
    if (open && ownerId) {
      setLoadingTemplates(true);
      getScheduleTemplatesByOwner(ownerId)
        .then(setTemplates)
        .catch(console.error)
        .finally(() => setLoadingTemplates(false));
    }
  }, [open, ownerId]);

  // Load template into grid when selected
  useEffect(() => {
    if (selectedTemplateId) {
      const t = templates.find(t => t.id === selectedTemplateId);
      if (t) {
        setTemplateName(t.name);
        setSelectedSlots(new Set(t.slots.map(s => `${s.day}-${s.time}`)));
      }
    }
  }, [selectedTemplateId, templates]);

  // Global mouseup for drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        dragStartRef.current = null;
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // --- Grid drag handlers ---

  const handleCellMouseDown = useCallback((day: number, time: string) => {
    const key = `${day}-${time}`;
    const isSelected = selectedSlots.has(key);
    dragTargetRef.current = !isSelected;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = { day, time };

    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (dragTargetRef.current) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, [selectedSlots]);

  const handleCellMouseEnter = useCallback((day: number, time: string) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;

    const startDay = dragStartRef.current.day;
    const startRow = hourIndex(dragStartRef.current.time);
    const endDay = day;
    const endRow = hourIndex(time);

    const minDay = Math.min(startDay, endDay);
    const maxDay = Math.max(startDay, endDay);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    setSelectedSlots(prev => {
      const next = new Set(prev);
      for (let d = minDay; d <= maxDay; d++) {
        for (let r = minRow; r <= maxRow; r++) {
          const key = `${d}-${HOURS[r]}`;
          if (dragTargetRef.current) {
            next.add(key);
          } else {
            next.delete(key);
          }
        }
      }
      return next;
    });
  }, []);

  // --- Actions ---

  const handleNewTemplate = () => {
    setSelectedTemplateId('');
    setTemplateName('');
    setSelectedSlots(new Set());
  };

  const handleSave = async () => {
    if (!templateName.trim()) return;

    setIsSaving(true);
    const slotsArray = Array.from(selectedSlots).map(key => {
      const [dayStr, time] = key.split('-');
      return { day: parseInt(dayStr), time };
    });

    try {
      if (selectedTemplateId) {
        // Update existing
        await updateScheduleTemplate(selectedTemplateId, {
          name: templateName.trim(),
          slots: slotsArray,
        });
      } else {
        // Create new
        const newTemplate = await createScheduleTemplate({
          ownerId,
          ownerType,
          name: templateName.trim(),
          slots: slotsArray,
          createdAt: '',
          updatedAt: '',
        });
        setSelectedTemplateId(newTemplate.id);
      }
      // Refresh list
      const updated = await getScheduleTemplatesByOwner(ownerId);
      setTemplates(updated);
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) return;
    try {
      await deleteScheduleTemplate(selectedTemplateId);
      const updated = await getScheduleTemplatesByOwner(ownerId);
      setTemplates(updated);
      handleNewTemplate();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleApply = async () => {
    if (selectedSlots.size === 0) return;

    setIsApplying(true);

    const weeks = parseInt(applyRange);
    const today = new Date();
    const slotsArray = Array.from(selectedSlots).map(key => {
      const [dayStr, time] = key.split('-');
      return { day: parseInt(dayStr), time };
    });

    try {
      // For each week in the range, compute actual dates and batch write
      for (let w = 0; w < weeks; w++) {
        const weekOffset = w * 7;
        const weekStartDate = startOfWeek(addDays(today, weekOffset));

        const dateSlotsForWeek = slotsArray.map(s => ({
          date: addDays(weekStartDate, s.day), // day 0=Sun matches startOfWeek
          time: s.time,
        }));

        if (ownerType === 'teacher') {
          await setAvailabilityBulk(dateSlotsForWeek, true);
        } else {
          await setLearnerAvailabilityBulk(ownerId, dateSlotsForWeek, true);
        }
      }

      onApplied?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to apply template:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClearGrid = () => {
    setSelectedSlots(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Template</DialogTitle>
        </DialogHeader>

        {/* Template selector + name */}
        <div className="flex items-center gap-3 mb-4">
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={loadingTemplates ? 'Loading...' : 'Load template...'} />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="flex-1"
          />

          <Button variant="outline" size="sm" onClick={handleNewTemplate}>
            New
          </Button>
        </div>

        {/* Mini weekly grid */}
        <div className="border rounded-md overflow-hidden select-none">
          <div className="grid grid-cols-8 text-xs">
            {/* Header row */}
            <div className="border-b border-r p-1.5 font-semibold text-center text-muted-foreground bg-muted/30">
              Time
            </div>
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="border-b border-r p-1.5 font-semibold text-center bg-muted/30">
                {label}
              </div>
            ))}

            {/* Hour rows */}
            {HOURS.map(hour => (
              <React.Fragment key={hour}>
                <div className="border-b border-r p-1 text-center text-muted-foreground font-mono text-[10px]">
                  {hour}
                </div>
                {DAY_LABELS.map((_, dayIdx) => {
                  const key = `${dayIdx}-${hour}`;
                  const isSelected = selectedSlots.has(key);

                  return (
                    <div
                      key={key}
                      className={`border-b border-r h-6 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-green-200 dark:bg-green-800'
                          : 'hover:bg-muted/50'
                      }`}
                      onMouseDown={() => handleCellMouseDown(dayIdx, hour)}
                      onMouseEnter={() => handleCellMouseEnter(dayIdx, hour)}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearGrid}
          >
            Clear
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !templateName.trim()}
            className="gap-1"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>

          {selectedTemplateId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          )}

          <div className="flex-1" />

          {/* Apply range */}
          <Select value={applyRange} onValueChange={setApplyRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">This week</SelectItem>
              <SelectItem value="2">Next 2 weeks</SelectItem>
              <SelectItem value="4">Next 4 weeks</SelectItem>
              <SelectItem value="8">Next 8 weeks</SelectItem>
              <SelectItem value="12">Next 12 weeks</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleApply}
            disabled={isApplying || selectedSlots.size === 0}
            className="gap-1"
          >
            {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Apply
          </Button>
        </div>

        {selectedSlots.size > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {selectedSlots.size} slot{selectedSlots.size !== 1 ? 's' : ''} selected · Will apply to {applyRange} week{applyRange !== '1' ? 's' : ''} starting this week
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
