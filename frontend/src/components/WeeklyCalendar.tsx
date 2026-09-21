'use client';

import React, { useEffect, useState } from 'react';
import { Lesson } from '@/types';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

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

export default function WeeklyCalendar({ onLessonEdit, refreshTrigger = 0 }: { onLessonEdit?: (lesson: Lesson) => void, refreshTrigger?: number }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));

  useEffect(() => {
    loadLessons();
  }, [refreshTrigger]);

  const loadLessons = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/api/lessons');
      setLessons(data || []);
    } catch (error) {
      console.error('Failed to load lessons', error);
    } finally {
      setLoading(false);
    }
  };

  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);

  const weekLessons = lessons.filter(l => {
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

  const monthName = currentWeekStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

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
    return <div className="p-8 text-center text-muted-foreground">Caricamento calendario...</div>;
  }

  return (
    <div className="flex flex-col border border-border rounded-xl bg-card shadow-sm text-card-foreground">
      
      {/* Navbar Settimana */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50 rounded-t-xl">
        <Button variant="outline" size="sm" onClick={goPrevWeek}>&larr; Precedente</Button>
        <span 
          onClick={goToday}
          className="font-semibold text-lg capitalize cursor-pointer hover:text-primary transition-colors hover:underline decoration-primary/50 underline-offset-4"
          title="Torna a oggi"
        >
          {monthName}
        </span>
        <Button variant="outline" size="sm" onClick={goNextWeek}>Successiva &rarr;</Button>
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
              <div key={i} className="p-2 text-center border-r border-border last:border-r-0 flex flex-col items-center justify-center">
                <span className="text-sm font-semibold text-foreground hidden sm:block">{DAY_NAMES[i]} {date.getDate()}</span>
                <span className="text-sm font-semibold text-foreground sm:hidden">{DAY_INITIALS[i]} {date.getDate()}</span>
              </div>
            ))}
          </div>

          {/* Body Calendario (Altezza responsiva per riempire lo schermo) */}
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
              style={{ gridTemplateRows: `repeat(${(END_HOUR - START_HOUR) * 60}, 1fr)` }}
            >
              {/* Linee verticali */}
              <div className="absolute inset-0 grid grid-cols-5 pointer-events-none">
                {DAY_NAMES.map((_, i) => (
                  <div key={`col-${i}`} className="border-r border-border last:border-r-0 h-full" />
                ))}
              </div>
              
              {/* Linee orizzontali */}
              <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateRows: `repeat(${END_HOUR - START_HOUR}, 1fr)` }}>
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                  <div key={`row-${i}`} className={`border-b border-border/50 w-full ${i === 0 ? 'border-t' : ''}`} />
                ))}
              </div>

              {/* Blocchi Lezioni */}
              {weekLessons.map((lesson) => {
                const pos = getGridPosition(lesson);
                if (!pos) return null;

                return (
                  <div
                    key={lesson.id}
                    onClick={() => isAdmin && onLessonEdit?.(lesson)}
                    className={`
                      m-0.5 p-1.5 sm:p-2 rounded-md border text-xs overflow-hidden flex flex-col shadow-sm transition-colors
                      ${isAdmin ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:border-blue-300 dark:hover:border-blue-600' : ''}
                      bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100
                    `}
                    style={{
                      gridRowStart: pos.gridRowStart,
                      gridRowEnd: pos.gridRowEnd,
                      gridColumn: pos.gridColumn,
                      zIndex: 5,
                    }}
                  >
                    <div className="font-bold truncate leading-tight flex items-center gap-1">
                      {lesson.teacher ? (
                        lesson.teacher.name
                      ) : (
                        <span className="flex items-center text-blue-600/80 dark:text-blue-300/80 text-[10px] sm:text-xs italic">
                          <Lock className="w-3 h-3 mr-0.5 inline-block" /> Riservato
                        </span>
                      )}
                    </div>
                    <div className="truncate mt-0.5 sm:mt-1 opacity-90">{lesson.subject.name}</div>
                    <div className="text-blue-700 dark:text-blue-300 truncate mt-auto">{lesson.room.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
