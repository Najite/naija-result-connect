import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type Student = Tables<'students'>;
type Course = Tables<'courses'>;
type Result = Tables<'results'>;

interface ResultWithDetails extends Result {
  student: {
    first_name: string;
    last_name: string;
    student_id: string;
    department: string;
  };
  course: {
    course_code: string;
    course_title: string;
    credit_units: number;
  };
}

interface AdminDataState {
  students: Student[];
  results: ResultWithDetails[];
  courses: Course[];
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

interface AdminStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalCourses: number;
  activeCourses: number;
  publishedResults: number;
  pendingResults: number;
  confirmedResults: number;
  averageCGPA: number;
  departmentCounts: Record<string, number>;
  levelCounts: Record<string, number>;
}

export const useAdminData = () => {
  const [state, setState] = useState<AdminDataState>({
    students: [],
    results: [],
    courses: [],
    loading: true,
    error: null,
    lastFetch: null
  });
  
  const { toast } = useToast();

  const fetchStudents = async (): Promise<Student[]> => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to fetch students:', error);
      throw new Error(`Failed to fetch students: ${error.message}`);
    }
  };

  const fetchResults = async (): Promise<ResultWithDetails[]> => {
    try {
      const { data, error } = await supabase
        .from('results')
        .select(`
          *,
          student:students!results_student_id_fkey(
            first_name,
            last_name,
            student_id,
            department
          ),
          course:courses!results_course_id_fkey(
            course_code,
            course_title,
            credit_units
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform and validate the data
      return (data || [])
        .filter((result: any) => result.student && result.course) // Filter out invalid relations
        .map((result: any) => ({
          ...result,
          student: result.student,
          course: result.course
        })) as ResultWithDetails[];
    } catch (error: any) {
      console.error('Failed to fetch results:', error);
      throw new Error(`Failed to fetch results: ${error.message}`);
    }
  };

  const fetchCourses = async (): Promise<Course[]> => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('course_code', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to fetch courses:', error);
      throw new Error(`Failed to fetch courses: ${error.message}`);
    }
  };

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }
    
    try {
      const [students, results, courses] = await Promise.all([
        fetchStudents(),
        fetchResults(),
        fetchCourses()
      ]);

      setState({
        students,
        results,
        courses,
        loading: false,
        error: null,
        lastFetch: new Date()
      });

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch dashboard data';
      console.error('Failed to fetch admin data:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Individual update functions for better performance
  const updateStudent = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();
      
      if (error) throw error;
      
      setState(prev => ({
        ...prev,
        students: prev.students.map(student => 
          student.id === studentId ? data : student
        )
      }));
    } catch (error: any) {
      console.error('Failed to update student data:', error);
      toast({
        title: 'Error',
        description: 'Failed to update student data',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const addStudent = useCallback((newStudent: Student) => {
    setState(prev => ({
      ...prev,
      students: [newStudent, ...prev.students]
    }));
  }, []);

  const addCourse = useCallback((newCourse: Course) => {
    setState(prev => ({
      ...prev,
      courses: [newCourse, ...prev.courses]
    }));
  }, []);

  const addResult = useCallback(async (newResult: Result) => {
    // Fetch the complete result with relations
    try {
      const { data, error } = await supabase
        .from('results')
        .select(`
          *,
          student:students!results_student_id_fkey(
            first_name,
            last_name,
            student_id,
            department
          ),
          course:courses!results_course_id_fkey(
            course_code,
            course_title,
            credit_units
          )
        `)
        .eq('id', newResult.id)
        .single();
      
      if (error) throw error;
      
      const resultWithDetails = {
        ...data,
        student: data.student,
        course: data.course
      } as ResultWithDetails;
      
      setState(prev => ({
        ...prev,
        results: [resultWithDetails, ...prev.results]
      }));
    } catch (error: any) {
      console.error('Failed to fetch new result details:', error);
      // Fallback to refetching all data
      fetchData(false);
    }
  }, [fetchData]);

  // Publish result function
  const publishResult = useCallback(async (resultId: string) => {
    try {
      const { error } = await supabase
        .from('results')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', resultId);
      
      if (error) throw error;
      
      // Update local state
      setState(prev => ({
        ...prev,
        results: prev.results.map(result =>
          result.id === resultId
            ? { ...result, status: 'published', published_at: new Date().toISOString() }
            : result
        )
      }));
      
      toast({
        title: 'Success',
        description: 'Result published successfully'
      });
    } catch (error: any) {
      console.error('Failed to publish result:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish result',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Bulk publish results
  const publishAllResults = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('results')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('status', 'pending');
      
      if (error) throw error;
      
      await fetchData(false);
      
      toast({
        title: 'Success',
        description: 'All pending results published successfully'
      });
    } catch (error: any) {
      console.error('Failed to publish all results:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish results',
        variant: 'destructive'
      });
    }
  }, [fetchData, toast]);

  // Calculate comprehensive stats
  const stats: AdminStats = {
    totalStudents: state.students.length,
    activeStudents: state.students.filter(s => s.status === 'active').length,
    inactiveStudents: state.students.filter(s => s.status !== 'active').length,
    totalCourses: state.courses.length,
    activeCourses: state.courses.filter(c => c.is_active).length,
    publishedResults: state.results.filter(r => r.status === 'published').length,
    pendingResults: state.results.filter(r => r.status === 'pending').length,
    confirmedResults: state.results.filter(r => r.status === 'confirmed').length,
    averageCGPA: state.students.reduce((sum, student) => sum + (student.cgpa || 0), 0) / (state.students.length || 1),
    departmentCounts: state.students.reduce((acc, student) => {
      acc[student.department] = (acc[student.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    levelCounts: state.students.reduce((acc, student) => {
      acc[student.level] = (acc[student.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  // Set up real-time subscriptions with debouncing
  useEffect(() => {
    fetchData();

    let timeoutId: NodeJS.Timeout;
    
    const debouncedRefetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchData(false);
      }, 1000); // Debounce for 1 second
    };

    // Subscribe to real-time changes
    const studentsSubscription = supabase
      .channel('students_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        debouncedRefetch
      )
      .subscribe();

    const resultsSubscription = supabase
      .channel('results_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results' },
        debouncedRefetch
      )
      .subscribe();

    const coursesSubscription = supabase
      .channel('courses_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        debouncedRefetch
      )
      .subscribe();

    // Cleanup subscriptions and timeout
    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(studentsSubscription);
      supabase.removeChannel(resultsSubscription);
      supabase.removeChannel(coursesSubscription);
    };
  }, [fetchData]);

  return {
    ...state,
    stats,
    refetchData: fetchData,
    updateStudent,
    addStudent,
    addCourse,
    addResult,
    publishResult,
    publishAllResults,
  };
};