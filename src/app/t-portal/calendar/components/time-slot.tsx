'use client';

import { cn } from "@/lib/utils";

interface TimeSlotProps {
  date: Date;
  time: string;
  isAvailable: boolean;
  isBooked: boolean;
  isHighlighted?: boolean;
  onClick: (date: Date, time: string) => void;
  onDoubleClick: (date: Date, time: string) => void;
  onMouseDown?: (date: Date, time: string) => void;
  onMouseEnter?: (date: Date, time: string) => void;
  onMouseUp?: () => void;
}

export default function TimeSlot({ 
  date, 
  time, 
  isAvailable, 
  isBooked, 
  isHighlighted = false,
  onClick, 
  onDoubleClick,
  onMouseDown,
  onMouseEnter,
  onMouseUp
}: TimeSlotProps) {
  
  const handleDoubleClick = () => {
    if (isBooked) return;
    onDoubleClick(date, time);
  }

  const handleClick = () => {
    if (isBooked) return;
    onClick(date, time);
  }
  
  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={() => onMouseDown?.(date, time)}
      onMouseEnter={() => onMouseEnter?.(date, time)}
      onMouseUp={() => onMouseUp?.()}
      className={cn(
        "border-b border-r h-10 cursor-pointer transition-colors",
        isHighlighted
          ? "bg-amber-200 dark:bg-amber-600"
          : isBooked 
            ? "bg-purple-200/50 dark:bg-purple-800/30 cursor-not-allowed"
            : isAvailable 
              ? "bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800"
              : "bg-card hover:bg-muted"
      )}
    >
      {/* Content for the slot can be added here if needed */}
    </div>
  );
}
