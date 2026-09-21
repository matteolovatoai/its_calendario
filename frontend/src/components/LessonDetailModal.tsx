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

  const start = new Date(lesson.start_time);
  const end = new Date(lesson.end_time);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeRange = `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;

  const dateStr = start.toLocaleDateString('it-IT', {
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
          <DialogTitle className="text-lg sm:text-xl font-bold leading-snug">
            {lesson.subject.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2 text-sm">
          {/* Data */}
          <div className="flex items-center gap-2.5 text-foreground">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{formattedDate}</span>
          </div>

          {/* Fascia Oraria */}
          <div className="flex items-center gap-2.5 text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium">{timeRange}</span>
          </div>

          {/* Aula */}
          <div className="flex items-center gap-2.5 text-foreground">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{lesson.room.name}</span>
          </div>

          {/* Docente (omesso se null per conformità GDPR / visitatori non autenticati) */}
          {lesson.teacher && (
            <div className="flex items-center gap-2.5 text-foreground">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
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
