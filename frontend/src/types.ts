export interface Entity {
  id: string;
  name: string;
}

export interface Lesson {
  id: string;
  start_time: string;
  end_time: string;
  teacher_id: string;
  subject_id: string;
  room_id: string;
  teacher: Entity;
  subject: Entity;
  room: Entity;
}
