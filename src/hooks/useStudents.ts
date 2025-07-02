import { useState, useCallback } from 'react';
import { StudentService } from '@/services/studentService';
import { Tables, TablesInsert, TablesUpdate } from '@/types/database';

export const useStudents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStudent = useCallback(async (studentData: TablesInsert<'students'>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if student ID already exists
      const studentIdExists = await StudentService.checkStudentIdExists(studentData.student_id);
      if (studentIdExists) {
        throw new Error('Student ID already exists');
      }

      // Check if email already exists
      const emailExists = await StudentService.checkEmailExists(studentData.email);
      if (emailExists) {
        throw new Error('Email address already exists');
      }

      const newStudent = await StudentService.createStudent(studentData);
      return newStudent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add student';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStudent = useCallback(async (id: string, updates: TablesUpdate<'students'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedStudent = await StudentService.updateStudent(id, updates);
      return updatedStudent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update student';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await StudentService.deleteStudent(id);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete student';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchStudents = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const students = await StudentService.searchStudents(query);
      return students;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search students';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentsByDepartment = useCallback(async (department: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const students = await StudentService.getStudentsByDepartment(department);
      return students;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch students by department';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentsByLevel = useCallback(async (level: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const students = await StudentService.getStudentsByLevel(level);
      return students;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch students by level';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStudentCGPA = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedStudent = await StudentService.updateStudentCGPA(studentId);
      return updatedStudent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update student CGPA';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    searchStudents,
    getStudentsByDepartment,
    getStudentsByLevel,
    updateStudentCGPA,
    clearError,
  };
};