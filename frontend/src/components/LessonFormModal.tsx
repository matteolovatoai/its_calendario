'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lesson } from '@/types';
import { fetchApi } from '@/lib/api';

interface LessonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson?: Lesson | null;
  onSuccess: () => void;
}

export default function LessonFormModal({ isOpen, onClose, lesson, onSuccess }: LessonFormModalProps) {
  const [formData, setFormData] = useState<Partial<Lesson>>({
    subject: '',
    teacher: '',
    room: '',
    start_time: '',
    end_time: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lesson) {
      // Formatta la data per gli input type="datetime-local" (YYYY-MM-DDTHH:MM)
      const formatForInput = (isoString: string) => {
        const date = new Date(isoString);
        // compensiamo la timezone locale per mostrare l'ora corretta nell'input
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
      };

      setFormData({
        ...lesson,
        start_time: formatForInput(lesson.start_time),
        end_time: formatForInput(lesson.end_time),
      });
    } else {
      setFormData({
        subject: '',
        teacher: '',
        room: '',
        start_time: '',
        end_time: '',
      });
    }
  }, [lesson, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        // Converte in UTC string se necessario per il backend
        start_time: new Date(formData.start_time!).toISOString(),
        end_time: new Date(formData.end_time!).toISOString(),
      };

      if (lesson?.id) {
        await fetchApi(`/api/lessons/${lesson.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/lessons', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save lesson', error);
      alert('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lesson?.id || !confirm('Sei sicuro di voler eliminare questa lezione?')) return;
    
    setLoading(true);
    try {
      await fetchApi(`/api/lessons/${lesson.id}`, { method: 'DELETE' });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to delete lesson', error);
      alert('Errore durante l\'eliminazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lesson ? 'Modifica Lezione' : 'Nuova Lezione'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Materia</Label>
            <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="teacher">Docente</Label>
            <Input id="teacher" name="teacher" value={formData.teacher} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Aula</Label>
            <Input id="room" name="room" value={formData.room} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Inizio</Label>
              <Input type="datetime-local" id="start_time" name="start_time" value={formData.start_time} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fine</Label>
              <Input type="datetime-local" id="end_time" name="end_time" value={formData.end_time} onChange={handleChange} required />
            </div>
          </div>

          <DialogFooter className="mt-6">
            {lesson && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                Elimina
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
