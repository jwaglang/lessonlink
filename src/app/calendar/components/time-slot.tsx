'use client';

import { cn } from "@/lib/utils";

interface TimeSlotProps {
  date: Date;
  time: string;
  isAvailable: boolean;
  isBooked: boolean;
  onClick: (date: Date, time: string) => void;
  onDoubleClick: (date: Date, time: string) => void;
}

export default function TimeSlot({ date, time, isAvailable, isBooked, onClick, onDoubleClick }: TimeSlotProps) {
  
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
      className={cn(
        "border-b border-r h-10 cursor-pointer transition-colors",
        isBooked 
          ? "bg-purple-200/50 dark:bg-purple-800/30 cursor-not-allowed"
          : isAvailable 
            ? "bg-green-200/50 hover:bg-green-300/50 dark:bg-green-800/30 dark:hover:bg-green-700/30"
            : "bg-card hover:bg-muted"
      )}
    >
      {/* Content for the slot can be added here if needed */}
    </div>
  );
}
