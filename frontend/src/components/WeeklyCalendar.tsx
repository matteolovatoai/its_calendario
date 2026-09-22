'use client';

import React, { useEffect, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson } from '@/types';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import LessonDetailModal from '@/components/LessonDetailModal';
import DatePickerPopover from '@/components/DatePickerPopover';
import { cn } from '@/lib/utils';
import {
  getMondayOfRomeWeek,
  addDaysToDateStr,
  getWeekBoundsUtc,
  getRomeTodayString,
  getRomeParts,
  formatRomeTimeRange,
  getLessonGridPosition,
} from '@/lib/timezone';

const START_HOUR = 8;
const END_HOUR = 18;
const SLOTS_PER_HOUR = 4;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const DAY_INITIALS = ['L', 'M', 'M', 'G', 'V'];

export interface WeeklyCalendarProps {
  initialLessons?: Lesson[];
  initialMonday?: string;
  onLessonEdit?: (lesson: Lesson) => void;
  refreshTrigger?: number;
}

export default function WeeklyCalendar({
  initialLessons,
  initialMonday,
  onLessonEdit,
  refreshTrigger = 0,
}: WeeklyCalendarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const baseMonday = initialMonday || getMondayOfRomeWeek();
  const [currentMonday, setCurrentMonday] = useState<string>(baseMonday);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons || []);
  const [loading, setLoading] = useState<boolean>(!initialLessons);
  const [selectedDetailLesson, setSelectedDetailLesson] = useState<Lesson | null>(null);
  const { isAdmin, token, isAuthenticated } = useAuth();

  // Sync state when server delivers new props (via RSC navigation or router.refresh)
  const [prevServerProps, setPrevServerProps] = useState({
    monday: initialMonday,
    lessons: initialLessons,
  });

  if (
    initialMonday !== prevServerProps.monday ||
    initialLessons !== prevServerProps.lessons
  ) {
    setPrevServerProps({ monday: initialMonday, lessons: initialLessons });
    if (initialMonday) {
      setCurrentMonday(initialMonday);
    }
    if (initialLessons) {
      setLessons(initialLessons);
    }
    setLoading(false);
  }

  const initialMountRef = useRef(true);

  useEffect(() => {
    // If we have initialLessons from SSR and it's the initial mount, skip client fetch
    if (initialMountRef.current) {
      initialMountRef.current = false;
      if (initialLessons !== undefined) {
        return;
      }
    }

    let isMounted = true;
    const { startUtc: queryStart, endUtc: queryEnd } = getWeekBoundsUtc(currentMonday);

    const fetchLessons = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          start_date: queryStart,
          end_date: queryEnd,
        });
        const data = await fetchApi(`/api/lessons?${params.toString()}`);
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
  }, [currentMonday, refreshTrigger, token, isAuthenticated, initialLessons]);

  const { startUtc, endUtc } = getWeekBoundsUtc(currentMonday);
  const weekStartMs = new Date(startUtc).getTime();
  const weekEndMs = new Date(endUtc).getTime();

  const weekLessons = lessons.filter((l) => {
    const startMs = new Date(l.start_time).getTime();
    const endMs = new Date(l.end_time).getTime();
    return startMs <= weekEndMs && endMs >= weekStartMs;
  });

  const navigateToWeek = (targetMonday: string) => {
    setCurrentMonday(targetMonday);
    startTransition(() => {
      router.push(`/?week=${targetMonday}`, { scroll: false });
    });
  };

  const goPrevWeek = () => {
    navigateToWeek(addDaysToDateStr(currentMonday, -7));
  };

  const goNextWeek = () => {
    navigateToWeek(addDaysToDateStr(currentMonday, 7));
  };

  const todayRomeStr = getRomeTodayString();
  const daysOfWeek = Array.from({ length: 5 }).map((_, i) => {
    const dateStr = addDaysToDateStr(currentMonday, i);
    const dayNumber = getRomeParts(dateStr).day;
    const isToday = dateStr === todayRomeStr;
    return { dateStr, dayNumber, isToday };
  });

  return (
    <>
      <div className="flex flex-col border border-border rounded-xl bg-card shadow-sm text-card-foreground w-full">
        {/* Navbar Settimana */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-muted/50 rounded-t-xl gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrevWeek}
            disabled={isPending || loading}
            className="px-2 sm:px-3 text-xs sm:text-sm"
            title="Settimana precedente"
          >
            &larr; <span className="hidden sm:inline ml-1">Precedente</span>
          </Button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <DatePickerPopover
              currentMonday={currentMonday}
              onSelectMonday={navigateToWeek}
            />
            {(isPending || loading) && (
              <span className="text-[11px] text-muted-foreground animate-pulse hidden sm:inline">
                Caricamento...
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goNextWeek}
            disabled={isPending || loading}
            className="px-2 sm:px-3 text-xs sm:text-sm"
            title="Settimana successiva"
          >
            <span className="hidden sm:inline mr-1">Successiva</span> &rarr;
          </Button>
        </div>

        {/* Griglia Calendario (visibile per intero senza scroll orizzontale) */}
        <div className={cn("w-full transition-opacity duration-200", (isPending || loading) && "opacity-60")}>
          {/* Header Giorni */}
          <div className="grid grid-cols-[42px_repeat(5,1fr)] sm:grid-cols-[60px_repeat(5,1fr)] border-b border-border bg-muted/50">
            <div className="p-1 sm:p-2 border-r border-border flex items-center justify-center text-[10px] sm:text-xs font-semibold text-muted-foreground">
              Ora
            </div>
            {daysOfWeek.map((day, i) => (
              <div
                key={day.dateStr}
                className={`p-1.5 sm:p-2 text-center border-r border-border last:border-r-0 flex flex-col items-center justify-center ${
                  day.isToday ? 'bg-primary/5 dark:bg-primary/10' : ''
                }`}
              >
                <span className={`text-xs sm:text-sm font-semibold hidden sm:block ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                  {DAY_NAMES[i]} {day.dayNumber}
                </span>
                <span className={`text-xs sm:text-sm font-semibold sm:hidden ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                  {DAY_INITIALS[i]} {day.dayNumber}
                </span>
              </div>
            ))}
          </div>

          {/* Body Calendario */}
          <div className="flex h-[calc(100vh-220px)] min-h-[440px] max-h-[850px] py-2 sm:py-4">
            {/* Etichette Orarie */}
            <div className="w-[42px] sm:w-[60px] shrink-0 border-r border-border bg-card relative">
              {HOURS.slice(0, -1).map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute w-full text-[10px] sm:text-xs text-muted-foreground text-center -translate-y-1/2"
                  style={{ top: `${(idx / (HOURS.length - 1)) * 100}%` }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
              <div
                className="absolute w-full text-[10px] sm:text-xs text-muted-foreground text-center -translate-y-1/2"
                style={{ top: '100%' }}
              >
                {END_HOUR.toString().padStart(2, '0')}:00
              </div>
            </div>

            {/* Griglia Lezioni (5 colonne a larghezza proporzionale) */}
            <div
              className="flex-1 grid grid-cols-5 relative"
              style={{
                gridTemplateRows: `repeat(${TOTAL_SLOTS}, 1fr)`,
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
                const pos = getLessonGridPosition(lesson, START_HOUR);
                if (!pos) return null;

                const timeRange = formatRomeTimeRange(lesson.start_time, lesson.end_time);

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
                    className="m-0.5 p-1 sm:p-2 rounded-md border overflow-hidden flex flex-col shadow-sm transition-all cursor-pointer hover:ring-1 hover:ring-primary/40 hover:shadow-md bg-blue-50/90 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100"
                    style={{
                      gridRowStart: pos.gridRowStart,
                      gridRowEnd: pos.gridRowEnd,
                      gridColumn: pos.gridColumn,
                      zIndex: 5,
                    }}
                  >
                    {/* Aula in evidenza (a tutta larghezza su mobile, con orario visibile solo su schermi grandi) */}
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 font-bold tracking-tight mb-0.5 shrink-0">
                      <span className="truncate">{lesson.room.name}</span>
                      <span className="hidden md:inline font-normal text-muted-foreground text-[10px] ml-1 shrink-0">
                        {timeRange}
                      </span>
                    </div>

                    {/* Materia: Titolo chiaro e leggibile con line-clamp-2 */}
                    <div className="font-bold text-[11px] sm:text-xs text-foreground leading-tight line-clamp-2">
                      {lesson.subject.name}
                    </div>

                    {/* Docente: mostrato se presente (GDPR) */}
                    {lesson.teacher && (
                      <div className="text-[9px] sm:text-[11px] text-muted-foreground font-medium truncate mt-0.5">
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

      {/* Modale dettagli sola lettura per visitatori e studenti (mostra orario completo, docente, aula e materia) */}
      <LessonDetailModal
        isOpen={!!selectedDetailLesson}
        onClose={() => setSelectedDetailLesson(null)}
        lesson={selectedDetailLesson}
      />
    </>
  );
}
