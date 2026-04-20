
-- ===== ROLES =====
create type public.app_role as enum ('admin', 'guru', 'staff', 'orang_tua');

-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ===== USER ROLES =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- ===== has_role security definer =====
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- helper: is admin or staff
create or replace function public.is_admin_or_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin','staff')
  )
$$;

-- ===== updated_at trigger fn =====
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===== handle_new_user trigger =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone'
  );
  -- default role: orang_tua (paling rendah). Admin assign later.
  insert into public.user_roles (user_id, role) values (new.id, 'orang_tua');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- ===== Profiles policies =====
create policy "Profiles viewable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "Users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Admin can update any profile"
  on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- ===== user_roles policies =====
create policy "Users can view own roles"
  on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "Admin view all roles"
  on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admin manage roles insert"
  on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "Admin manage roles update"
  on public.user_roles for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admin manage roles delete"
  on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- ===== CLASSES =====
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  grade_level text,
  homeroom_teacher_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.classes enable row level security;
create trigger update_classes_updated_at before update on public.classes
  for each row execute function public.update_updated_at_column();

-- ===== SUBJECTS =====
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subjects enable row level security;
create trigger update_subjects_updated_at before update on public.subjects
  for each row execute function public.update_updated_at_column();

-- ===== TEACHERS =====
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  nip text unique,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.teachers enable row level security;
create trigger update_teachers_updated_at before update on public.teachers
  for each row execute function public.update_updated_at_column();

-- FK for homeroom
alter table public.classes
  add constraint classes_homeroom_fk foreign key (homeroom_teacher_id)
  references public.teachers(id) on delete set null;

-- ===== STUDENTS =====
create table public.students (
  id uuid primary key default gen_random_uuid(),
  nis text unique,
  full_name text not null,
  birth_date date,
  gender text check (gender in ('L','P')),
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.students enable row level security;
create trigger update_students_updated_at before update on public.students
  for each row execute function public.update_updated_at_column();

-- ===== PARENT-STUDENT =====
create table public.parent_student (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relation text default 'orang_tua',
  created_at timestamptz not null default now(),
  unique (parent_user_id, student_id)
);
alter table public.parent_student enable row level security;

-- helper: is parent of student
create or replace function public.is_parent_of(_user_id uuid, _student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.parent_student
    where parent_user_id = _user_id and student_id = _student_id
  )
$$;

-- ===== CLASSES policies =====
create policy "All authenticated can view classes"
  on public.classes for select to authenticated using (true);
create policy "Admin/staff manage classes insert"
  on public.classes for insert to authenticated with check (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff manage classes update"
  on public.classes for update to authenticated using (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff manage classes delete"
  on public.classes for delete to authenticated using (public.is_admin_or_staff(auth.uid()));

-- ===== SUBJECTS policies =====
create policy "All authenticated can view subjects"
  on public.subjects for select to authenticated using (true);
create policy "Admin/staff manage subjects insert"
  on public.subjects for insert to authenticated with check (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff manage subjects update"
  on public.subjects for update to authenticated using (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff manage subjects delete"
  on public.subjects for delete to authenticated using (public.is_admin_or_staff(auth.uid()));

-- ===== TEACHERS policies =====
create policy "Authenticated can view teachers"
  on public.teachers for select to authenticated using (true);
create policy "Admin/staff insert teachers"
  on public.teachers for insert to authenticated with check (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff update teachers"
  on public.teachers for update to authenticated using (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff delete teachers"
  on public.teachers for delete to authenticated using (public.is_admin_or_staff(auth.uid()));

-- ===== STUDENTS policies =====
create policy "Admin/staff/guru view all students"
  on public.students for select to authenticated using (
    public.is_admin_or_staff(auth.uid()) or public.has_role(auth.uid(),'guru')
  );
create policy "Parent view own children"
  on public.students for select to authenticated using (
    public.is_parent_of(auth.uid(), id)
  );
create policy "Admin/staff insert students"
  on public.students for insert to authenticated with check (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff update students"
  on public.students for update to authenticated using (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff delete students"
  on public.students for delete to authenticated using (public.is_admin_or_staff(auth.uid()));

-- ===== PARENT_STUDENT policies =====
create policy "Admin/staff view all parent_student"
  on public.parent_student for select to authenticated using (public.is_admin_or_staff(auth.uid()));
create policy "Parent view own links"
  on public.parent_student for select to authenticated using (parent_user_id = auth.uid());
create policy "Admin/staff insert parent_student"
  on public.parent_student for insert to authenticated with check (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff update parent_student"
  on public.parent_student for update to authenticated using (public.is_admin_or_staff(auth.uid()));
create policy "Admin/staff delete parent_student"
  on public.parent_student for delete to authenticated using (public.is_admin_or_staff(auth.uid()));
