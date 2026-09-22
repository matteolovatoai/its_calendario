'use client';

import React from 'react';
import { Lesson } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, User } from 'lucide-react';

import { formatRomeDate, formatRomeTimeRange } from '@/lib/timezone';

interface LessonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
}

export default function LessonDetailModal({
  isOpen,
  onClose,
  lesson,
}: LessonDetailModalProps) {
  if (!lesson) return null;

  const timeRange = formatRomeTimeRange(lesson.start_time, lesson.end_time);
  const dateStr = formatRomeDate(lesson.start_time, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold leading-snug">
            {lesson.subject.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 py-3 text-base">
          {/* Data */}
          <div className="flex items-center gap-3 text-foreground">
            <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="font-medium">{formattedDate}</span>
          </div>

          {/* Fascia Oraria */}
          <div className="flex items-center gap-3 text-foreground">
            <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="font-semibold">{timeRange}</span>
          </div>

          {/* Aula */}
          <div className="flex items-center gap-3 text-foreground">
            <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
            <span>{lesson.room.name}</span>
          </div>

          {/* Docente (omesso se null per conformità GDPR / visitatori non autenticati) */}
          {lesson.teacher && (
            <div className="flex items-center gap-3 text-foreground">
              <User className="w-5 h-5 text-muted-foreground shrink-0" />
              <span>{lesson.teacher.name}</span>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
