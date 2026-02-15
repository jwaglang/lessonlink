import { Badge } from "@/components/ui/badge";
import type { StudentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: StudentStatus;
}

const statusStyles: Record<StudentStatus, string> = {
    "active": "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800",
    "trial": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800",
    "paused": "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800",
    "completed": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800",
    "churned": "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800",
  };
  export function StatusBadge({ status }: StatusBadgeProps) {
    return (
      <Badge
        className={cn(
          "capitalize",
          statusStyles[status]
        )}
      >
        {status}
      </Badge>
    );
  }