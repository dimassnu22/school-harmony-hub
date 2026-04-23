-- Enum status absensi
CREATE TYPE public.attendance_status AS ENUM ('hadir', 'izin', 'sakit', 'alpha');

-- Sesi absensi (per jadwal per tanggal)
CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  date date NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, date)
);

-- Record absensi per siswa
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'hadir',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

-- Indexes
CREATE INDEX idx_att_sessions_schedule ON public.attendance_sessions(schedule_id);
CREATE INDEX idx_att_sessions_date ON public.attendance_sessions(date);
CREATE INDEX idx_att_records_session ON public.attendance_records(session_id);
CREATE INDEX idx_att_records_student ON public.attendance_records(student_id);

-- Triggers updated_at
CREATE TRIGGER trg_att_sessions_updated
  BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_att_records_updated
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Staff/guru view sessions"
  ON public.attendance_sessions FOR SELECT TO authenticated
  USING (public.is_admin_or_staff(auth.uid()) OR public.has_role(auth.uid(), 'guru'));

CREATE POLICY "Staff/guru insert sessions"
  ON public.attendance_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff(auth.uid()) OR public.has_role(auth.uid(), 'guru'));

CREATE POLICY "Staff/guru update sessions"
  ON public.attendance_sessions FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff(auth.uid()) OR public.has_role(auth.uid(), 'guru'));

CREATE POLICY "Staff/guru delete sessions"
  ON public.attendance_sessions FOR DELETE TO authenticated
  USING (public.is_admin_or_staff(auth.uid()) OR public.has_role(auth.uid(), 'guru'));

-- Records policies
CREATE POLICY "Staff/guru view records"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (public.is_admin_or_staff(auth.uid()) OR public.has_role(auth.uid(), 'guru'));

CREATE POLICY "Parent view child records"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (public.is_parent_of(auth.uid(), student_id));

CREATE POLICY "Staff/guru insert records"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff(auth.uid()) OR public.has_role(auth.uid(), 'guru'));

CREATE POLICY "Staff/guru update records"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff(auth.uid()) OR public.has_role(auth.uid(), 'guru'));

CREATE POLICY "Staff/guru delete records"
  ON public.attendance_records FOR DELETE TO authenticated
  USING (public.is_admin_or_staff(auth.uid()) OR public.has_role(auth.uid(), 'guru'));