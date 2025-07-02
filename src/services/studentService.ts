import { supabase } from '@/integrations/supabase/client';
import { TablesInsert, TablesUpdate, Tables } from '@/integrations/supabase/types';

export class StudentService {
  // Create a new student
  static async createStudent(studentData: TablesInsert<'students'>) {
    try {
      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select()
        .single();

      if (error) {
        console.error('Error creating student:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating student:', error);
      throw error;
    }
  }

  // Get all students
  static async getAllStudents(): Promise<Tables<'students'>[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching students:', error);
      throw error;
    }
  }

  // Get student by ID
  static async getStudentById(id: string): Promise<Tables<'students'> | null> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('Error fetching student:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching student:', error);
      throw error;
    }
  }

  // Get student by student_id
  static async getStudentByStudentId(studentId: string): Promise<Tables<'students'> | null> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('Error fetching student by student_id:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching student by student_id:', error);
      throw error;
    }
  }

  // Update student
  static async updateStudent(id: string, updates: TablesUpdate<'students'>) {
    try {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating student:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating student:', error);
      throw error;
    }
  }

  // Delete student
  static async deleteStudent(id: string) {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting student:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting student:', error);
      throw error;
    }
  }

  // Get students by department
  static async getStudentsByDepartment(department: string): Promise<Tables<'students'>[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('department', department)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students by department:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching students by department:', error);
      throw error;
    }
  }

  // Get students by level
  static async getStudentsByLevel(level: string): Promise<Tables<'students'>[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('level', level)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students by level:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching students by level:', error);
      throw error;
    }
  }

  // Search students
  static async searchStudents(query: string): Promise<Tables<'students'>[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,student_id.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching students:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error searching students:', error);
      throw error;
    }
  }

  // Check if student ID exists
  static async checkStudentIdExists(studentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', studentId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking student ID:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Unexpected error checking student ID:', error);
      throw error;
    }
  }

  // Check if email exists
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking email:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Unexpected error checking email:', error);
      throw error;
    }
  }

  // Update student CGPA (calculate from results)
  static async updateStudentCGPA(studentId: string) {
    try {
      // Get all results for the student
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select('score')
        .eq('student_id', studentId);

      if (resultsError) {
        console.error('Error fetching results for CGPA calculation:', resultsError);
        throw resultsError;
      }

      if (!results || results.length === 0) {
        return null; // No results to calculate CGPA
      }

      // Calculate CGPA (simple average for now)
      const totalScore = results.reduce((sum, result) => sum + result.score, 0);
      const cgpa = totalScore / results.length / 20; // Assuming 100 is max score, converting to 5.0 scale

      // Update student record
      const { data, error } = await supabase
        .from('students')
        .update({ cgpa: parseFloat(cgpa.toFixed(2)) })
        .eq('id', studentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating CGPA:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating CGPA:', error);
      throw error;
    }
  }
}