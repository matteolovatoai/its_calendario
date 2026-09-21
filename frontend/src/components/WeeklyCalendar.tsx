'use client';

import React, { useEffect, useState } from 'react';
import { Lesson } from '@/types';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import LessonDetailModal from '@/components/LessonDetailModal';

const START_HOUR = 8;
const END_HOUR = 18;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const DAY_INITIALS = ['L', 'M', 'M', 'G', 'V'];

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function WeeklyCalendar({
  onLessonEdit,
  refreshTrigger = 0,
}: {
  onLessonEdit?: (lesson: Lesson) => void;
  refreshTrigger?: number;
}) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailLesson, setSelectedDetailLesson] = useState<Lesson | null>(null);
  const { isAdmin, token, isAuthenticated } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));

  useEffect(() => {
    let isMounted = true;
    const fetchLessons = async () => {
      try {
        const data = await fetchApi('/api/lessons');
        if (isMounted) {
          setLessons(data || []);
        }
      } catch (error) {
        console.error('Failed to load lessons', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLessons();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger, token, isAuthenticated]);

  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);

  const weekLessons = lessons.filter((l) => {
    const d = new Date(l.start_time);
    return d >= currentWeekStart && d <= currentWeekEnd;
  });

  const goPrevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToday = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  const daysOfWeek = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const monthName = currentWeekStart.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  });

  const getGridPosition = (lesson: Lesson) => {
    const start = new Date(lesson.start_time);
    const end = new Date(lesson.end_time);

    const dayOfWeek = start.getDay();
    if (dayOfWeek < 1 || dayOfWeek > 5) return null;

    const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
    const endMinutes = (end.getHours() - START_HOUR) * 60 + end.getMinutes();

    const gridRowStart = startMinutes + 1;
    const gridRowEnd = endMinutes + 1;
    const gridColumn = dayOfWeek;

    return { gridRowStart, gridRowEnd, gridColumn };
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Caricamento calendario...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col border border-border rounded-xl bg-card shadow-sm text-card-foreground">
        {/* Navbar Settimana */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50 rounded-t-xl">
          <Button variant="outline" size="sm" onClick={goPrevWeek}>
            &larr; Precedente
          </Button>
          <span
            onClick={goToday}
            className="font-semibold text-lg capitalize cursor-pointer hover:text-primary transition-colors hover:underline decoration-primary/50 underline-offset-4"
            title="Torna a oggi"
          >
            {monthName}
          </span>
          <Button variant="outline" size="sm" onClick={goNextWeek}>
            Successiva &rarr;
          </Button>
        </div>

        {/* Contenitore con scroll orizzontale per mobile */}
        <div className="overflow-x-auto">
          <div className="min-w-[350px]">
            {/* Header Giorni */}
            <div className="grid grid-cols-[50px_1fr_1fr_1fr_1fr_1fr] sm:grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] border-b border-border bg-muted/50">
              <div className="p-1 sm:p-2 border-r border-border flex items-center justify-center text-[10px] sm:text-xs font-semibold text-muted-foreground">
                Ora
              </div>
              {daysOfWeek.map((date, i) => (
                <div
                  key={i}
                  className="p-2 text-center border-r border-border last:border-r-0 flex flex-col items-center justify-center"
                >
                  <span className="text-sm font-semibold text-foreground hidden sm:block">
                    {DAY_NAMES[i]} {date.getDate()}
                  </span>
                  <span className="text-sm font-semibold text-foreground sm:hidden">
                    {DAY_INITIALS[i]} {date.getDate()}
                  </span>
                </div>
              ))}
            </div>

            {/* Body Calendario */}
            <div className="flex h-[calc(100vh-200px)] min-h-[400px] max-h-[800px] py-4">
              {/* Etichette Orarie */}
              <div className="w-[50px] sm:w-[60px] shrink-0 border-r border-border bg-card relative">
                {HOURS.slice(0, -1).map((hour, idx) => (
                  <div
                    key={hour}
                    className="absolute w-full text-xs text-muted-foreground text-center -translate-y-1/2"
                    style={{ top: `${(idx / (HOURS.length - 1)) * 100}%` }}
                  >
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
                <div
                  className="absolute w-full text-xs text-muted-foreground text-center -translate-y-1/2"
                  style={{ top: '100%' }}
                >
                  {END_HOUR.toString().padStart(2, '0')}:00
                </div>
              </div>

              {/* Griglia Lezioni */}
              <div
                className="flex-1 grid grid-cols-5 relative"
                style={{
                  gridTemplateRows: `repeat(${(END_HOUR - START_HOUR) * 60}, 1fr)`,
                }}
              >
                {/* Linee verticali */}
                <div className="absolute inset-0 grid grid-cols-5 pointer-events-none">
                  {DAY_NAMES.map((_, i) => (
                    <div
                      key={`col-${i}`}
                      className="border-r border-border last:border-r-0 h-full"
                    />
                  ))}
                </div>

                {/* Linee orizzontali */}
                <div
                  className="absolute inset-0 grid pointer-events-none"
                  style={{
                    gridTemplateRows: `repeat(${END_HOUR - START_HOUR}, 1fr)`,
                  }}
                >
                  {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                    <div
                      key={`row-${i}`}
                      className={`border-b border-border/50 w-full ${i === 0 ? 'border-t' : ''}`}
                    />
                  ))}
                </div>

                {/* Blocchi Lezioni */}
                {weekLessons.map((lesson) => {
                  const pos = getGridPosition(lesson);
                  if (!pos) return null;

                  const start = new Date(lesson.start_time);
                  const end = new Date(lesson.end_time);
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  const timeRange = `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        if (isAdmin) {
                          onLessonEdit?.(lesson);
                        } else {
                          setSelectedDetailLesson(lesson);
                        }
                      }}
                      className="m-0.5 p-1.5 sm:p-2 rounded-md border text-xs overflow-hidden flex flex-col shadow-sm transition-all cursor-pointer hover:ring-1 hover:ring-primary/40 hover:shadow-md bg-blue-50/90 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100"
                      style={{
                        gridRowStart: pos.gridRowStart,
                        gridRowEnd: pos.gridRowEnd,
                        gridColumn: pos.gridColumn,
                        zIndex: 5,
                      }}
                    >
                      {/* Testata: Fascia oraria e Aula */}
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-blue-700 dark:text-blue-300 font-medium tracking-tight mb-0.5 shrink-0">
                        <span>{timeRange}</span>
                        <span className="truncate ml-1 font-semibold">{lesson.room.name}</span>
                      </div>

                      {/* Materia: Titolo in grassetto con supporto a 2 righe (line-clamp-2) */}
                      <div className="font-bold text-xs sm:text-sm text-foreground leading-snug line-clamp-2">
                        {lesson.subject.name}
                      </div>

                      {/* Docente: mostrato solo se presente (omesso silenziosamente se null per GDPR) */}
                      {lesson.teacher && (
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {lesson.teacher.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale dettagli sola lettura per visitatori e studenti */}
      <LessonDetailModal
        isOpen={!!selectedDetailLesson}
        onClose={() => setSelectedDetailLesson(null)}
        lesson={selectedDetailLesson}
      />
    </>
  );
}
