import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Plus, Loader2, Trash2, BookOpen } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
type Student = Database['public']['Tables']['students']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];

interface CourseResult {
  id: string;
  course_id: string;
  ca_score: string;
  exam_score: string;
}

interface AddResultDialogProps {
  students: Student[];
  onResultAdded: () => void;
}

// Grading scale and helpers
const gradeScale = [
  { min: 70, letter: 'A', points: 5.0 },
  { min: 60, letter: 'B', points: 4.0 },
  { min: 50, letter: 'C', points: 3.0 },
  { min: 45, letter: 'D', points: 2.0 },
  { min: 40, letter: 'E', points: 1.0 },
  { min: 0,  letter: 'F', points: 0.0 },
] as const;

function getGrade(total: number) {
  return gradeScale.find(g => total >= g.min)!;
}

const thisYear = new Date().getFullYear();
const academicYears = [
  `${thisYear - 2}/${thisYear - 1}`,
  `${thisYear - 1}/${thisYear}`,
  `${thisYear}/${thisYear + 1}`,
];
const semesters = ['First Semester', 'Second Semester'];

const AddResultDialog: React.FC<AddResultDialogProps> = ({
  students,
  onResultAdded
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    semester: '',
    academic_year: '',
  });
  const [courses, setCourses] = useState<CourseResult[]>([
    { id: '1', course_id: '', ca_score: '', exam_score: '' }
  ]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);

  const selectedStudent = useMemo(
    () => students.find(s => s.id === formData.student_id),
    [formData.student_id, students]
  );

  useEffect(() => {
    if (formData.student_id && formData.semester) {
      fetchCourses();
    }
  }, [formData.student_id, formData.semester]);

  async function fetchCourses() {
    if (!selectedStudent) return;
    setLoadingCourses(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('department', selectedStudent.department)
      .eq('level', selectedStudent.level)
      .eq('semester', formData.semester)
      .eq('is_active', true);

    if (error) {
      console.error('Fetch courses error:', error);
      setAvailableCourses([]);
    } else {
      setAvailableCourses(data);
    }
    setLoadingCourses(false);
  }

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'student_id' || field === 'semester') {
      setCourses([{ id: Date.now().toString(), course_id: '', ca_score: '', exam_score: '' }]);
    }
  };

  const handleCourseChange = (id: string, field: keyof CourseResult, value: string) => {
    setCourses(cs => cs.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addCourseRow = () => {
    setCourses(cs => [...cs, { id: Date.now().toString(), course_id: '', ca_score: '', exam_score: '' }]);
  };

  const removeCourseRow = (id: string) => {
    setCourses(cs => cs.length > 1 ? cs.filter(c => c.id !== id) : cs);
  };

  function validate(): boolean {
    if (!formData.student_id || !formData.semester || !formData.academic_year) {
      alert('Fill student, semester & academic year');
      return false;
    }
    const entries = courses.filter(c => c.course_id && c.ca_score && c.exam_score);
    if (entries.length === 0) {
      alert('Add at least one complete course entry');
      return false;
    }
    const ids = entries.map(e => e.course_id);
    if (new Set(ids).size !== ids.length) {
      alert('Duplicate course detected');
      return false;
    }
    for (const e of entries) {
      const ca = parseFloat(e.ca_score);
      const ex = parseFloat(e.exam_score);
      const total = ca + ex;
      const course = availableCourses.find(c => c.id === e.course_id);
      if (isNaN(ca) || ca < 0 || ca > 30) {
        alert(`CA score invalid for ${course?.course_code}`);
        return false;
      }
      if (isNaN(ex) || ex < 0 || ex > 70) {
        alert(`Exam score invalid for ${course?.course_code}`);
        return false;
      }
      if (total > 100) {
        alert(`Total exceeds 100 for ${course?.course_code}`);
        return false;
      }
    }
    return true;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const entries = courses.filter(c => c.course_id && c.ca_score && c.exam_score);
      const payload = entries.map(e => {
        const ca = parseFloat(e.ca_score);
        const ex = parseFloat(e.exam_score);
        const total = ca + ex;
        const { letter, points } = getGrade(total);
        return {
          student_id: formData.student_id,
          course_id: e.course_id,
          ca_score: ca,
          exam_score: ex,
          total_score: total,
          grade: letter,
          grade_point: points,
          academic_year: formData.academic_year,
          semester: formData.semester,
        };
      });

      const { error: insertErr } = await supabase.from('results').insert(payload);
      if (insertErr) throw insertErr;

      const { error: rpcErr } = await supabase.rpc('calculate_student_cgpa', {
        student_uuid: formData.student_id
      });
      if (rpcErr) console.warn('CGPA update failed:', rpcErr);

      alert(`Added ${payload.length} result(s)!`);
      onResultAdded();
      setOpen(false);
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(err.message ?? 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const used = useMemo(() => new Set(courses.map(c => c.course_id).filter(Boolean)), [courses]);
  const readyCount = courses.filter(c => c.course_id && c.ca_score && c.exam_score).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Results
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Add Semester Results</DialogTitle>
          <DialogDescription>Enter CA/Exam marks for selected student & semester</DialogDescription>
        </DialogHeader>
        
        {/* Student / Semester / Year */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label>Student</Label>
            <Select value={formData.student_id} onValueChange={v => handleFormChange('student_id', v)}>
              <SelectTrigger><SelectValue placeholder="Pick student" /></SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Semester</Label>
            <Select value={formData.semester} onValueChange={v => handleFormChange('semester', v)}>
              <SelectTrigger><SelectValue placeholder="Pick semester" /></SelectTrigger>
              <SelectContent>
                {semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Academic Year</Label>
            <Select value={formData.academic_year} onValueChange={v => handleFormChange('academic_year', v)}>
              <SelectTrigger><SelectValue placeholder="Pick year" /></SelectTrigger>
              <SelectContent>
                {academicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Courses */}
        {formData.student_id && formData.semester && (
          <div className="space-y-4 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="flex items-center gap-2"><BookOpen /> Course Results</h3>
              <Button onClick={addCourseRow} disabled={!availableCourses.length}>
                <Plus className="mr-1 h-4 w-4" /> Add Course
              </Button>
            </div>
            {loadingCourses && <Loader2 className="animate-spin" />}
            {availableCourses.length === 0 && !loadingCourses && <p>No courses found.</p>}

            {courses.map((row, i) => {
              const courseInfo = availableCourses.find(c => c.id === row.course_id);
              const caNum = parseFloat(row.ca_score) || 0;
              const exNum = parseFloat(row.exam_score) || 0;
              const total = caNum + exNum;
              const gradeLetter = total ? getGrade(total).letter : '—';
              return (
                <div key={row.id} className="border p-4 rounded space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Course {i + 1}</span>
                    {courses.length > 1 && <Button variant="ghost" onClick={() => removeCourseRow(row.id)}><Trash2 /></Button>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <Select value={row.course_id} onValueChange={v => handleCourseChange(row.id, 'course_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {availableCourses
                          .filter(c => c.id === row.course_id || !used.has(c.id))
                          .map(c => <SelectItem key={c.id} value={c.id}>{c.course_code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="CA" value={row.ca_score} onChange={e => handleCourseChange(row.id, 'ca_score', e.target.value)} min="0" max="30" />
                    <Input type="number" placeholder="Exam" value={row.exam_score} onChange={e => handleCourseChange(row.id, 'exam_score', e.target.value)} min="0" max="70" />
                    <div className="flex justify-center items-center">{total ? total.toFixed(1) : '—'}</div>
                    <div className="flex justify-center items-center">{gradeLetter}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || readyCount === 0}>
            {loading && <Loader2 className="mr-2 animate-spin" />} Submit {readyCount} Result{readyCount !== 1 && 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddResultDialog;
