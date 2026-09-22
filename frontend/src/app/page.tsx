import { auth } from '@/auth';
import CalendarContainer from '@/components/CalendarContainer';
import { getMondayOfRomeWeek, getWeekBoundsUtc, isValidDateStr } from '@/lib/timezone';
import { Lesson } from '@/types';

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

async function getLessons(monday: string, token?: string | null): Promise<Lesson[]> {
  const apiUrl =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8000';

  const { startUtc, endUtc } = getWeekBoundsUtc(monday);
  const params = new URLSearchParams({
    start_date: startUtc,
    end_date: endUtc,
  });

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

  const monday = isValidDateStr(weekParam)
    ? getMondayOfRomeWeek(weekParam)
    : getMondayOfRomeWeek();

  const session = await auth();
  const token = (session as unknown as { accessToken?: string })?.accessToken || null;

  const initialLessons = await getLessons(monday, token);

  return (
    <main className="p-2 sm:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col h-screen">
      <CalendarContainer
        initialMonday={monday}
        initialLessons={initialLessons}
      />
    </main>
  );
}
