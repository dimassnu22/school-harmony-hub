-- Schedules table
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedules_class_day ON public.schedules(class_id, day_of_week);
CREATE INDEX idx_schedules_teacher_day ON public.schedules(teacher_id, day_of_week);

-- Validation trigger: end > start, and detect conflicts
CREATE OR REPLACE FUNCTION public.validate_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Jam selesai harus setelah jam mulai';
  END IF;

  -- class conflict
  IF EXISTS (
    SELECT 1 FROM public.schedules s
    WHERE s.class_id = NEW.class_id
      AND s.day_of_week = NEW.day_of_week
      AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND s.start_time < NEW.end_time
      AND s.end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Bentrok: kelas ini sudah punya jadwal di jam tersebut';
  END IF;

  -- teacher conflict
  IF EXISTS (
    SELECT 1 FROM public.schedules s
    WHERE s.teacher_id = NEW.teacher_id
      AND s.day_of_week = NEW.day_of_week
      AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND s.start_time < NEW.end_time
      AND s.end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Bentrok: guru sudah mengajar di kelas lain pada jam tersebut';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_schedule
BEFORE INSERT OR UPDATE ON public.schedules
FOR EACH ROW EXECUTE FUNCTION public.validate_schedule();

-- updated_at trigger
CREATE TRIGGER trg_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "All authenticated can view schedules"
ON public.schedules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin/staff insert schedules"
ON public.schedules FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin/staff update schedules"
ON public.schedules FOR UPDATE
TO authenticated
USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin/staff delete schedules"
ON public.schedules FOR DELETE
TO authenticated
USING (is_admin_or_staff(auth.uid()));