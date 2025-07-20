import { useState, useCallback, useEffect } from 'react';
import { SMSService } from '@/services/smsService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  department: string;
  level: string;
  status: string;
}

interface SMSRecord {
  id: string;
  student_id: string;
  phone_number: string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'retry';
  attempts: number;
  last_attempt: string;
  error_message?: string;
  sid?: string;
  created_at: string;
  students?: {
    first_name: string;
    last_name: string;
    student_id: string;
  };
}

interface SMSStatistics {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  retry: number;
  successRate: number;
}

export const useSMSManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [smsRecords, setSmsRecords] = useState<SMSRecord[]>([]);
  const [statistics, setStatistics] = useState<SMSStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // Load students
  const loadStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'Active')
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students');
    }
  }, []);

  // Load SMS records
  const loadSMSRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sms_records')
        .select(`
          *,
          students!inner(first_name, last_name, student_id)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setSmsRecords(data || []);
    } catch (err) {
      console.error('Error loading SMS records:', err);
      setError('Failed to load SMS records');
    }
  }, []);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await SMSService.getSMSStatistics();
      if (stats) {
        const successRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;
        setStatistics({
          ...stats,
          successRate: Math.round(successRate * 100) / 100
        });
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  }, []);

  // Send SMS to single student
  const sendSMSToStudent = useCallback(async (
    studentId: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const student = students.find(s => s.id === studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      const result = await SMSService.sendSMSToStudent(
        studentId,
        student.phone,
        message
      );

      if (result.success) {
        toast({
          title: "SMS Sent",
          description: `SMS sent successfully to ${student.first_name} ${student.last_name}`,
        });
        await loadSMSRecords();
        await loadStatistics();
      } else {
        toast({
          title: "SMS Failed",
          description: result.error || "Failed to send SMS",
          variant: "destructive"
        });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [students, toast, loadSMSRecords, loadStatistics]);

  // Send bulk SMS
  const sendBulkSMS = useCallback(async (
    studentIds: string[],
    message: string,
    onProgress?: (progress: { current: number; total: number; student: string }) => void
  ) => {
    setLoading(true);
    setError(null);

    try {
      const targetStudents = students.filter(s => studentIds.includes(s.id));
      
      if (targetStudents.length === 0) {
        throw new Error('No valid students selected');
      }

      const result = await SMSService.sendBulkSMS(
        targetStudents,
        message,
        onProgress
      );

      toast({
        title: "Bulk SMS Complete",
        description: `Sent ${result.sent} SMS, ${result.failed} failed out of ${result.total} total`,
        variant: result.failed > 0 ? "destructive" : "default"
      });

      await loadSMSRecords();
      await loadStatistics();

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [students, toast, loadSMSRecords, loadStatistics]);

  // Retry failed SMS
  const retrySMS = useCallback(async (recordId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await SMSService.retrySMS(recordId);
      
      if (result.success) {
        toast({
          title: "SMS Retry Successful",
          description: "SMS has been resent successfully",
        });
        await loadSMSRecords();
        await loadStatistics();
      } else {
        toast({
          title: "SMS Retry Failed",
          description: result.error || "Failed to retry SMS",
          variant: "destructive"
        });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast, loadSMSRecords, loadStatistics]);

  // Retry all failed SMS
  const retryAllFailedSMS = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const failedRecords = await SMSService.getFailedSMSRecords();
      
      if (failedRecords.length === 0) {
        toast({
          title: "No Failed SMS",
          description: "No failed SMS records found to retry",
        });
        return { total: 0, successful: 0, failed: 0, errors: [] };
      }

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const record of failedRecords) {
        const result = await SMSService.retrySMS(record.id);
        if (result.success) {
          successful++;
        } else {
          failed++;
          if (result.error) {
            errors.push(result.error);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast({
        title: "Retry Complete",
        description: `Retried ${failedRecords.length} SMS: ${successful} successful, ${failed} failed`,
        variant: failed > 0 ? "destructive" : "default"
      });

      await loadSMSRecords();
      await loadStatistics();

      return { total: failedRecords.length, successful, failed, errors };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast, loadSMSRecords, loadStatistics]);

  // Test SMS
  const testSMS = useCallback(async (phoneNumber: string, message: string) => {
    setLoading(true);
    setError(null);

    try {
      const formattedPhone = SMSService.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Invalid phone number format');
      }

      const result = await SMSService.sendSMS(formattedPhone, message);
      
      if (result.success) {
        toast({
          title: "Test SMS Sent",
          description: `SMS sent successfully to ${phoneNumber}`,
        });
      } else {
        toast({
          title: "Test SMS Failed",
          description: result.error || "Failed to send test SMS",
          variant: "destructive"
        });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Get SMS records for a specific student
  const getStudentSMSRecords = useCallback(async (studentId: string) => {
    try {
      return await SMSService.getStudentSMSRecords(studentId);
    } catch (err) {
      console.error('Error getting student SMS records:', err);
      return [];
    }
  }, []);

  // Initialize data loading
  useEffect(() => {
    loadStudents();
    loadSMSRecords();
    loadStatistics();
  }, [loadStudents, loadSMSRecords, loadStatistics]);

  // Set up real-time subscriptions
  useEffect(() => {
    const subscription = supabase
      .channel('sms_records_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sms_records' },
        () => {
          loadSMSRecords();
          loadStatistics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [loadSMSRecords, loadStatistics]);

  return {
    students,
    smsRecords,
    statistics,
    loading,
    error,
    sendSMSToStudent,
    sendBulkSMS,
    retrySMS,
    retryAllFailedSMS,
    testSMS,
    getStudentSMSRecords,
    loadStudents,
    loadSMSRecords,
    loadStatistics,
    clearError: () => setError(null)
  };
};