'use client';

import { useState } from 'react';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import LessonFormModal from '@/components/LessonFormModal';
import { Button } from '@/components/ui/button';
import { Lesson } from '@/types';
import { signIn } from 'next-auth/react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { isAuthenticated, isAdmin, logout } = useAuth();

  const handleAddLesson = () => {
    if (!isAdmin) return;
    setSelectedLesson(null);
    setModalOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    if (!isAdmin) return;
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
              {isAdmin && <Button onClick={handleAddLesson}>+ Nuova Lezione</Button>}
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <Button onClick={() => signIn('google')}>Accedi</Button>
          )}
        </div>
      </div>

      <WeeklyCalendar onLessonEdit={handleEditLesson} refreshTrigger={refreshTrigger} />

      <footer className="mt-2 py-1 text-center text-xs text-muted-foreground shrink-0 flex justify-center items-center gap-3">
        <span>ITS Digital Academy</span>
        <span>•</span>
        <Link href="/privacy" className="hover:underline hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
      </footer>

      {isAdmin && (
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
