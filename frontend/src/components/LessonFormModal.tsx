'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lesson, Entity } from '@/types';
import { fetchApi } from '@/lib/api';

function CreatableCombobox({
  items,
  value,
  onSelect,
  onCreate,
  placeholder,
  emptyMessage,
}: {
  items: Entity[];
  value: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  placeholder: string;
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const selectedItem = items.find((item) => item.id === value);
  const exactMatch = items.some((item) => item.name.toLowerCase() === inputValue.toLowerCase());

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger 
          className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between font-normal active:translate-y-0")}
        >
          {selectedItem ? selectedItem.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="p-0" style={{ width: 'var(--anchor-width)' }} align="start">
          <Command>
            <CommandInput 
              placeholder={placeholder} 
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                {emptyMessage}
                {inputValue && !exactMatch && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start mt-2 px-2 h-auto py-1.5"
                    onClick={() => {
                      onCreate(inputValue);
                      setOpen(false);
                      setInputValue("");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crea "{inputValue}"
                  </Button>
                )}
              </CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.name}
                    onSelect={() => {
                      onSelect(item.id);
                      setOpen(false);
                      setInputValue("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              {inputValue && !exactMatch && (
                <CommandGroup>
                  <CommandItem
                    value={inputValue}
                    onSelect={() => {
                      onCreate(inputValue);
                      setOpen(false);
                      setInputValue("");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crea "{inputValue}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface LessonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson?: Lesson | null;
  onSuccess: () => void;
}

export default function LessonFormModal({ isOpen, onClose, lesson, onSuccess }: LessonFormModalProps) {
  const [formData, setFormData] = useState<Partial<Lesson>>({
    subject_id: '',
    teacher_id: '',
    room_id: '',
    start_time: '',
    end_time: '',
  });

  const [loading, setLoading] = useState(false);
  
  const [teachers, setTeachers] = useState<Entity[]>([]);
  const [subjects, setSubjects] = useState<Entity[]>([]);
  const [rooms, setRooms] = useState<Entity[]>([]);

  const loadEntities = async () => {
    try {
      const [t, s, r] = await Promise.all([
        fetchApi('/api/teachers'),
        fetchApi('/api/subjects'),
        fetchApi('/api/rooms'),
      ]);
      setTeachers(t || []);
      setSubjects(s || []);
      setRooms(r || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEntities();
    }
  }, [isOpen]);

  useEffect(() => {
    if (lesson) {
      const formatForInput = (isoString: string) => {
        const date = new Date(isoString);
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
        subject_id: '',
        teacher_id: '',
        room_id: '',
        start_time: '',
        end_time: '',
      });
    }
  }, [lesson, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateEntity = async (type: 'teachers' | 'subjects' | 'rooms', name: string) => {
    try {
      const created = await fetchApi(`/api/${type}`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      if (created) {
        await loadEntities();
        if (type === 'teachers') setFormData(prev => ({...prev, teacher_id: created.id}));
        if (type === 'subjects') setFormData(prev => ({...prev, subject_id: created.id}));
        if (type === 'rooms') setFormData(prev => ({...prev, room_id: created.id}));
      }
    } catch(e) {
      alert("Errore nella creazione");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject_id || !formData.teacher_id || !formData.room_id) {
        alert("Per favore compila tutti i campi!");
        return;
    }

    setLoading(true);

    try {
      const payload = {
        subject_id: formData.subject_id,
        teacher_id: formData.teacher_id,
        room_id: formData.room_id,
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal>
      <DialogContent className="sm:max-w-[425px] md:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{lesson ? 'Modifica Lezione' : 'Nuova Lezione'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Materia</Label>
            <CreatableCombobox
              items={subjects}
              value={formData.subject_id || ''}
              onSelect={(val) => setFormData({ ...formData, subject_id: val })}
              onCreate={(name) => handleCreateEntity('subjects', name)}
              placeholder="Seleziona materia o scrivi per creare..."
              emptyMessage="Nessuna materia trovata."
            />
          </div>
          
          <div className="space-y-2">
            <Label>Docente</Label>
            <CreatableCombobox
              items={teachers}
              value={formData.teacher_id || ''}
              onSelect={(val) => setFormData({ ...formData, teacher_id: val })}
              onCreate={(name) => handleCreateEntity('teachers', name)}
              placeholder="Seleziona docente o scrivi per creare..."
              emptyMessage="Nessun docente trovato."
            />
          </div>

          <div className="space-y-2">
            <Label>Aula</Label>
            <CreatableCombobox
              items={rooms}
              value={formData.room_id || ''}
              onSelect={(val) => setFormData({ ...formData, room_id: val })}
              onCreate={(name) => handleCreateEntity('rooms', name)}
              placeholder="Seleziona aula o scrivi per creare..."
              emptyMessage="Nessuna aula trovata."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Inizio</Label>
              <Input type="datetime-local" id="start_time" name="start_time" value={formData.start_time || ''} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fine</Label>
              <Input type="datetime-local" id="end_time" name="end_time" value={formData.end_time || ''} onChange={handleChange} required />
            </div>
          </div>

          <DialogFooter className="mt-6 flex-row justify-between sm:justify-between">
            {lesson ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                Elimina
              </Button>
            ) : (
              <div /> /* Empty div to keep flex-between spacing if no lesson */
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Annulla
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
