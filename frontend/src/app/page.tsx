import { cookies } from 'next/headers';
import { auth } from '@/auth';
import CalendarContainer from '@/components/CalendarContainer';
import { getMondayOfRomeWeek, getWeekBoundsUtc, isValidDateStr } from '@/lib/timezone';
import { CLASS_COOKIE_NAME, pickSelectedClassId } from '@/lib/classPreference';
import { Entity, Lesson } from '@/types';

interface PageProps {
  searchParams: Promise<{ week?: string; classe?: string }>;
}

const apiUrl =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

async function getClasses(): Promise<Entity[]> {
  try {
    const res = await fetch(`${apiUrl}/api/classes`, { cache: 'no-store' });
    if (res.ok) {
      return ((await res.json()) as Entity[]) || [];
    }
  } catch (err) {
    console.warn('[Server Classes Fetch] Impossibile contattare il backend:', err);
  }
  return [];
}

async function getLessons(
  monday: string,
  classId: string | null,
  token?: string | null
): Promise<Lesson[]> {
  const { startUtc, endUtc } = getWeekBoundsUtc(monday);
  const params = new URLSearchParams({
    start_date: startUtc,
    end_date: endUtc,
  });
  if (classId) {
    params.set('class_id', classId);
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${apiUrl}/api/lessons?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return (data as Lesson[]) || [];
    }
  } catch (err) {
    console.warn('[Server Lessons Fetch] Impossibile contattare il backend:', err);
  }
  return [];
}

export default async function HomePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const weekParam = searchParams?.week;
  const classParam = searchParams?.classe;

  const monday = isValidDateStr(weekParam)
    ? getMondayOfRomeWeek(weekParam)
    : getMondayOfRomeWeek();

  const session = await auth();
  const token = (session as unknown as { accessToken?: string })?.accessToken || null;

  const classes = await getClasses();
  const savedClassId = (await cookies()).get(CLASS_COOKIE_NAME)?.value ?? null;
  // Link (?classe=) > classe salvata nel cookie > prima in ordine alfabetico
  const selectedClassId = pickSelectedClassId(
    classes.map((c) => c.id),
    classParam,
    savedClassId
  );

  // Se le classi non sono disponibili (backend non aggiornato o errore temporaneo)
  // si ricade sul comportamento precedente: tutte le lezioni della settimana.
  const initialLessons = await getLessons(monday, selectedClassId, token);

  return (
    <main className="p-2 sm:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col h-screen">
      <CalendarContainer
        initialMonday={monday}
        initialLessons={initialLessons}
        classes={classes}
        selectedClassId={selectedClassId}
      />
    </main>
  );
}
