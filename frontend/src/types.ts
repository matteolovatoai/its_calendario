export interface Entity {
  id: string;
  name: string;
}

export interface Lesson {
  id: string;
  start_time: string;
  end_time: string;
  teacher_id: string | null;
  subject_id: string;
  room_id: string;
  teacher: Entity | null;
  subject: Entity;
  room: Entity;
}
