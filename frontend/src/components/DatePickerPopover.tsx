'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getMondayOfRomeWeek,
  getRomeParts,
  getRomeTodayString,
  addDaysToDateStr,
  pad,
  formatRomeMonthYear,
} from '@/lib/timezone';

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

interface DatePickerPopoverProps {
  currentMonday: string;
  onSelectMonday: (mondayDateStr: string) => void;
}

export default function DatePickerPopover({
  currentMonday,
  onSelectMonday,
}: DatePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial view year and month from currentMonday in Rome
  const initialParts = getRomeParts(currentMonday);
  const [viewYear, setViewYear] = useState<number>(initialParts.year);
  const [viewMonth, setViewMonth] = useState<number>(initialParts.month); // 1 to 12

  const handleOpenChange = (open: boolean) => {
    if (open) {
      const parts = getRomeParts(currentMonday);
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
    setIsOpen(open);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Month navigation calculations
  const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
  const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
  const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();

  const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
  const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
  const firstParts = getRomeParts(`${viewYear}-${pad(viewMonth)}-01`);
  const startOffset = firstParts.dayOfWeek === 0 ? 6 : firstParts.dayOfWeek - 1; // 0 for Mon, ..., 6 for Sun

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Trailing days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    days.push({
      dateStr: `${prevYear}-${pad(prevMonth)}-${pad(dayNum)}`,
      dayNum,
      isCurrentMonth: false,
    });
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      dateStr: `${viewYear}-${pad(viewMonth)}-${pad(d)}`,
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  // Leading days for next month to complete the row
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    days.push({
      dateStr: `${nextYear}-${pad(nextMonth)}-${pad(d)}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  const todayStr = getRomeTodayString();
  const currentWeekSunday = addDaysToDateStr(currentMonday, 6);
  const currentWeekLabel = formatRomeMonthYear(currentMonday);
  const viewMonthLabel = formatRomeMonthYear(`${viewYear}-${pad(viewMonth)}-01`);

  const handleDaySelect = (dateStr: string) => {
    const targetMonday = getMondayOfRomeWeek(dateStr);
    onSelectMonday(targetMonday);
    setIsOpen(false);
  };

  const handleGoToday = () => {
    const todayMonday = getMondayOfRomeWeek();
    onSelectMonday(todayMonday);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'font-semibold text-sm sm:text-base md:text-lg capitalize flex items-center gap-1.5 hover:bg-background/80 px-2 sm:px-3 text-foreground active:translate-y-0 h-auto py-1 cursor-pointer transition-colors'
        )}
        title="Seleziona data per navigare alla settimana"
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0 hidden xs:inline" />
        <span className="truncate">{currentWeekLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </PopoverTrigger>

      <PopoverContent
        align="center"
        sideOffset={8}
        className="w-auto min-w-[280px] p-3 shadow-lg border border-border bg-popover rounded-xl select-none"
      >
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between mb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handlePrevMonth}
            className="h-7 w-7 rounded-md"
            title="Mese precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="font-semibold text-xs sm:text-sm capitalize text-foreground">
            {viewMonthLabel}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleNextMonth}
            className="h-7 w-7 rounded-md"
            title="Mese successivo"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 mb-1 text-center">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="text-[11px] font-semibold text-muted-foreground/80 py-1"
            >
              {day}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((day) => {
            const isToday = day.dateStr === todayStr;
            const isInCurrentWeek =
              day.dateStr >= currentMonday && day.dateStr <= currentWeekSunday;
            const isCurrentMonday = day.dateStr === currentMonday;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => handleDaySelect(day.dateStr)}
                className={cn(
                  'h-8 w-8 text-xs rounded-md flex items-center justify-center transition-all cursor-pointer relative',
                  day.isCurrentMonth
                    ? 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    : 'text-muted-foreground/35 hover:bg-accent/40',
                  isInCurrentWeek &&
                    !isCurrentMonday &&
                    'bg-primary/10 text-primary font-semibold',
                  isCurrentMonday &&
                    'bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90 hover:text-primary-foreground',
                  isToday && !isCurrentMonday && 'ring-1 ring-primary font-bold'
                )}
                title={`Vai alla settimana di ${day.dateStr}`}
              >
                {day.dayNum}
                {isToday && (
                  <span
                    className={cn(
                      'absolute bottom-0.5 w-1 h-1 rounded-full',
                      isCurrentMonday ? 'bg-primary-foreground' : 'bg-primary'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Popover Footer: Quick Jump to Today */}
        <div className="mt-3 pt-2 border-t border-border flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGoToday}
            className="w-full text-xs text-muted-foreground hover:text-foreground h-7"
          >
            Torna a Oggi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
