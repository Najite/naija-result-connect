
-- Create admin_users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create students table for managing student records
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL,
  level TEXT NOT NULL,
  cgpa DECIMAL(3,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create results table for storing student results
CREATE TABLE public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  course_title TEXT NOT NULL,
  semester TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Create notifications table for tracking sent notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'result_notification',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO public.admin_users (email, password_hash, full_name, role) 
VALUES (
  'admin@edunotify.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'EduNotify Administrator',
  'super_admin'
);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (temporarily allow all access for admin operations)
CREATE POLICY "Admin full access to admin_users" ON public.admin_users FOR ALL USING (true);
CREATE POLICY "Admin full access to students" ON public.students FOR ALL USING (true);
CREATE POLICY "Admin full access to results" ON public.results FOR ALL USING (true);
CREATE POLICY "Admin full access to notifications" ON public.notifications FOR ALL USING (true);

-- Add some sample data
INSERT INTO public.students (student_id, first_name, last_name, email, phone, department, level, cgpa) VALUES
('2021/1/12345', 'John', 'Doe', 'john.doe@student.unilag.edu.ng', '+234 801 234 5678', 'Computer Science', '300 Level', 3.75),
('2021/1/12346', 'Jane', 'Smith', 'jane.smith@student.unilag.edu.ng', '+234 802 345 6789', 'Mathematics', '200 Level', 3.92),
('2020/1/11234', 'David', 'Johnson', 'david.johnson@student.unilag.edu.ng', '+234 803 456 7890', 'Physics', '400 Level', 3.68);

-- Add some sample results
INSERT INTO public.results (student_id, course_code, course_title, semester, academic_year, score, grade) VALUES
((SELECT id FROM public.students WHERE student_id = '2021/1/12345'), 'CSC 301', 'Data Structures & Algorithms', '2023/2024 First Semester', '2023/2024', 85, 'A'),
((SELECT id FROM public.students WHERE student_id = '2021/1/12346'), 'MTH 201', 'Mathematical Methods', '2023/2024 First Semester', '2023/2024', 92, 'A'),
((SELECT id FROM public.students WHERE student_id = '2020/1/11234'), 'PHY 401', 'Quantum Physics', '2023/2024 First Semester', '2023/2024', 78, 'B+');
