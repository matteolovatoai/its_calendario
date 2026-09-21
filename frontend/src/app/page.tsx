'use client';

import { useState } from 'react';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import LessonFormModal from '@/components/LessonFormModal';
import { Button } from '@/components/ui/button';
import { Lesson } from '@/types';
import { useSession, signIn, signOut } from 'next-auth/react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const handleAddLesson = () => {
    setSelectedLesson(null);
    setModalOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <main className="p-2 sm:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col h-screen">
      <div className="flex flex-row gap-2 justify-between items-center mb-4 sm:mb-8 shrink-0">
        <h1 className="text-xl sm:text-3xl font-bold truncate">Calendario</h1>

        <div className="flex gap-2 sm:gap-4 items-center">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Button onClick={handleAddLesson}>+ Nuova Lezione</Button>
              <Button variant="outline" onClick={() => signOut()}>
                Logout
              </Button>
            </>
          ) : (
            <Button onClick={() => signIn('google')}>Accedi</Button>
          )}
        </div>
      </div>

      <WeeklyCalendar onLessonEdit={handleEditLesson} refreshTrigger={refreshTrigger} />

      {isAuthenticated && (
        <LessonFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          lesson={selectedLesson}
          onSuccess={handleSuccess}
        />
      )}
    </main>
  );
}
