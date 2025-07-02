import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import emailjs from '@emailjs/browser';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_3ux4e79';
const EMAILJS_TEMPLATE_ID = 'template_po1yqoo';
const EMAILJS_PUBLIC_KEY = 'iqrbya988WpE1wUcR';

interface Student {
  id: string;
  student_id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  department: string;
  level: string;
  status: string;
}

interface NotificationFilters {
  semester?: string;
  academicYear?: string;
  department?: string;
  level?: string;
  status?: string;
}

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  student_id: string | null;
}

interface NotificationResult {
  success: boolean;
  emailsSent: number;
  smsSent: number;
  errors: string[];
  total: number;
}

interface EdgeFunctionResponse {
  results?: {
    smsSent: number;
    errors: string[];
  };
}

export const useNotifications = (students: Student[], refetchData: () => void) => {
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [bulkNotificationLoading, setBulkNotificationLoading] = useState(false);
  const { toast } = useToast();

  // Create notification record in database
  const createNotification = async (
    studentId: string | null,
    title: string,
    message: string,
    type: string = 'general'
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          student_id: studentId,
          title,
          message,
          type,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  };

  // Update notification status
  const updateNotificationStatus = async (
    notificationId: string,
    status: 'sent' | 'failed',
    sentAt?: string
  ): Promise<void> => {
    try {
      await supabase
        .from('notifications')
        .update({
          status,
          sent_at: sentAt || new Date().toISOString(),
        })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  };

  // Send email using EmailJS
  const sendEmail = async (
    student: Student,
    title: string,
    message: string
  ): Promise<boolean> => {
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_name: `${student.first_name} ${student.last_name}`,
          to_email: student.email,
          student_id: student.student_id,
          message: message,
          institution: 'Moshood Abiola Polytechnic'
        },
        EMAILJS_PUBLIC_KEY
      );
      return true;
    } catch (error) {
      console.error(`Email failed for ${student.first_name} ${student.last_name}:`, error);
      return false;
    }
  };

  // Send SMS using edge function
  const sendSMS = async (
    studentIds: string[],
    title: string,
    message: string,
    type: string = 'custom'
  ): Promise<EdgeFunctionResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-notifications', {
        body: {
          type,
          studentIds,
          title,
          message
        }
      });

      if (error) {
        console.error('SMS notification error:', error);
        return { results: { smsSent: 0, errors: [error.message] } };
      }

      return data as EdgeFunctionResponse;
    } catch (error) {
      console.error('SMS edge function error:', error);
      return { results: { smsSent: 0, errors: [error instanceof Error ? error.message : 'SMS failed'] } };
    }
  };

  // Send notification to single student
  const sendSingleNotification = async (
    student: Student,
    title: string,
    message: string,
    type: string = 'general'
  ): Promise<boolean> => {
    const notificationId = await createNotification(student.id, title, message, type);
    if (!notificationId) return false;

    const fullName = `${student.first_name} ${student.last_name}`;
    const personalizedMessage = message.replace('{student_name}', fullName);
    const personalizedTitle = title.replace('{student_name}', fullName);

    // Send both SMS and Email
    const [smsResult, emailSuccess] = await Promise.all([
      sendSMS([student.id], personalizedTitle, personalizedMessage, type),
      sendEmail(student, personalizedTitle, personalizedMessage),
    ]);

    const smsSuccess = (smsResult?.results?.smsSent || 0) > 0;
    const success = smsSuccess || emailSuccess;

    // Update notification status based on success
    await updateNotificationStatus(
      notificationId,
      success ? 'sent' : 'failed',
      success ? new Date().toISOString() : undefined
    );

    return success;
  };

  // Filter students based on criteria
  const filterStudents = useCallback((filters: NotificationFilters): Student[] => {
    return students.filter(student => {
      if (filters.department && student.department !== filters.department) return false;
      if (filters.level && student.level !== filters.level) return false;
      if (filters.status && student.status !== filters.status) return false;
      return true;
    });
  }, [students]);

  // Send bulk notifications
  const sendBulkNotification = useCallback(async (
    title: string,
    message: string,
    filters: NotificationFilters = { status: 'Active' }
  ): Promise<void> => {
    setBulkNotificationLoading(true);
    
    try {
      const targetStudents = filterStudents(filters);
      
      if (targetStudents.length === 0) {
        toast({
          title: "No Students Found",
          description: "No students match the specified criteria.",
          variant: "destructive"
        });
        return;
      }

      const studentIds = targetStudents.map(s => s.id);
      
      // Send SMS notifications via edge function
      const smsResult = await sendSMS(studentIds, title, message, 'bulk');
      
      // Send email notifications
      let emailsSent = 0;
      const emailErrors: string[] = [];

      const emailResults = await Promise.allSettled(
        targetStudents.map(student => sendEmail(student, title, message))
      );

      emailResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          emailsSent++;
        } else {
          emailErrors.push(`Email failed for ${targetStudents[index].first_name} ${targetStudents[index].last_name}`);
        }
      });

      // Create notification records
      await Promise.all(
        targetStudents.map(student => createNotification(student.id, title, message, 'bulk'))
      );

      const smsSent = smsResult?.results?.smsSent || 0;
      const totalSent = emailsSent + smsSent;
      const totalErrors = emailErrors.length + (smsResult?.results?.errors?.length || 0);

      toast({
        title: "Bulk Notification Complete",
        description: `Sent ${totalSent} notifications (${emailsSent} emails, ${smsSent} SMS). ${totalErrors > 0 ? `${totalErrors} failed.` : ''}`,
        variant: totalErrors > 0 ? "destructive" : "default"
      });

    } catch (error) {
      console.error('Bulk notification error:', error);
      toast({
        title: "Error",
        description: "Failed to send bulk notifications",
        variant: "destructive"
      });
    } finally {
      setBulkNotificationLoading(false);
    }
  }, [filterStudents, toast]);

  // Send custom notification to specific students
  const sendCustomNotification = useCallback(async (
    studentIds: string[],
    title: string,
    message: string,
    type: string = 'general'
  ): Promise<void> => {
    setNotificationLoading(true);
    
    try {
      const targetStudents = students.filter(student => studentIds.includes(student.id));
      
      if (targetStudents.length === 0) {
        toast({
          title: "No Students Selected",
          description: "Please select at least one student.",
          variant: "destructive"
        });
        return;
      }

      // Send SMS notifications via edge function
      const smsResult = await sendSMS(studentIds, title, message, type);
      
      // Send email notifications
      let emailsSent = 0;
      const emailErrors: string[] = [];

      const emailResults = await Promise.allSettled(
        targetStudents.map(student => sendEmail(student, title, message))
      );

      emailResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          emailsSent++;
        } else {
          emailErrors.push(`Email failed for ${targetStudents[index].first_name} ${targetStudents[index].last_name}`);
        }
      });

      // Create notification records
      await Promise.all(
        targetStudents.map(student => createNotification(student.id, title, message, type))
      );

      const smsSent = smsResult?.results?.smsSent || 0;
      const totalSent = emailsSent + smsSent;
      const totalErrors = emailErrors.length + (smsResult?.results?.errors?.length || 0);

      toast({
        title: "Custom Notification Complete",
        description: `Sent ${totalSent} notifications (${emailsSent} emails, ${smsSent} SMS). ${totalErrors > 0 ? `${totalErrors} failed.` : ''}`,
        variant: totalErrors > 0 ? "destructive" : "default"
      });

    } catch (error) {
      console.error('Custom notification error:', error);
      toast({
        title: "Error",
        description: "Failed to send custom notifications",
        variant: "destructive"
      });
    } finally {
      setNotificationLoading(false);
    }
  }, [students, toast]);

  // Send test notification
  const sendTestNotification = useCallback(async (count: number = 1): Promise<void> => {
    setNotificationLoading(true);
    
    try {
      const activeStudents = students.filter(s => s.status === 'Active');
      const testStudents = activeStudents.slice(0, count);
      
      if (testStudents.length === 0) {
        toast({
          title: "No Active Students",
          description: "No active students found for test notification.",
          variant: "destructive"
        });
        return;
      }

      const title = "Test Notification";
      const message = "This is a test notification from the University System. Please ignore if received.";
      const studentIds = testStudents.map(s => s.id);

      // Send via both SMS and email
      const smsResult = await sendSMS(studentIds, title, message, 'test');
      
      const emailResults = await Promise.allSettled(
        testStudents.map(student => sendEmail(student, title, message))
      );

      const emailsSent = emailResults.filter(r => r.status === 'fulfilled').length;
      const smsSent = smsResult?.results?.smsSent || 0;
      
      // Create notification records
      await Promise.all(
        testStudents.map(student => createNotification(student.id, title, message, 'test'))
      );
      
      toast({
        title: "Test Complete",
        description: `Test notification sent to ${emailsSent + smsSent} students (${emailsSent} emails, ${smsSent} SMS).`,
      });

    } catch (error) {
      console.error('Test notification error:', error);
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive"
      });
    } finally {
      setNotificationLoading(false);
    }
  }, [students, toast]);

  // Send enrollment confirmations
  const sendEnrollmentConfirmations = useCallback(async (studentIds: string[]): Promise<void> => {
    setNotificationLoading(true);
    
    try {
      const targetStudents = students.filter(student => studentIds.includes(student.id));
      
      if (targetStudents.length === 0) {
        toast({
          title: "No Students Selected",
          description: "Please select students for enrollment confirmation.",
          variant: "destructive"
        });
        return;
      }

      const title = "Enrollment Confirmation";
      const message = `Dear {student_name},\n\nYour enrollment has been confirmed for the current academic session.\n\nDepartment: ${targetStudents[0]?.department}\nLevel: ${targetStudents[0]?.level}\n\nWelcome to the university!\n\nBest regards,\nAcademic Office`;

      // Send via both SMS and email
      const smsResult = await sendSMS(studentIds, title, message, 'enrollment');
      
      const emailResults = await Promise.allSettled(
        targetStudents.map(student => {
          const personalizedMessage = message.replace('{student_name}', `${student.first_name} ${student.last_name}`);
          return sendEmail(student, title, personalizedMessage);
        })
      );

      const emailsSent = emailResults.filter(r => r.status === 'fulfilled').length;
      const smsSent = smsResult?.results?.smsSent || 0;
      
      // Create notification records
      await Promise.all(
        targetStudents.map(student => createNotification(student.id, title, message, 'enrollment'))
      );

      const totalSent = emailsSent + smsSent;
      const totalErrors = (targetStudents.length * 2) - totalSent;

      toast({
        title: "Enrollment Confirmations Sent",
        description: `Sent ${totalSent} notifications (${emailsSent} emails, ${smsSent} SMS). ${totalErrors > 0 ? `${totalErrors} failed.` : ''}`,
        variant: totalErrors > 0 ? "destructive" : "default"
      });

    } catch (error) {
      console.error('Enrollment confirmation error:', error);
      toast({
        title: "Error",
        description: "Failed to send enrollment confirmations",
        variant: "destructive"
      });
    } finally {
      setNotificationLoading(false);
    }
  }, [students, toast]);

  // Publish all results with notifications
  const publishAllResults = useCallback(async (filters: NotificationFilters = {}): Promise<void> => {
    setNotificationLoading(true);
    
    try {
      // Get unpublished results
      let query = supabase
        .from('results')
        .select(`
          *,
          students!inner(id, student_id, first_name, last_name, email, phone, department, level),
          courses!inner(course_code, course_title)
        `)
        .eq('status', 'draft');

      // Apply filters
      if (filters.semester) {
        query = query.eq('semester', filters.semester);
      }
      if (filters.academicYear) {
        query = query.eq('academic_year', filters.academicYear);
      }
      if (filters.department) {
        query = query.eq('students.department', filters.department);
      }
      if (filters.level) {
        query = query.eq('students.level', filters.level);
      }

      const { data: results, error } = await query;
      
      if (error) throw error;
      
      if (!results || results.length === 0) {
        toast({
          title: "No Results to Publish",
          description: "No unpublished results found matching the criteria.",
          variant: "destructive"
        });
        return;
      }

      // Update results status to published
      const resultIds = results.map(r => r.id);
      const { error: updateError } = await supabase
        .from('results')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString() 
        })
        .in('id', resultIds);

      if (updateError) throw updateError;

      // Send notifications to students using the new NotificationService pattern
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-notifications', {
        body: {
          type: 'result_published'
        }
      });

      if (smsError) {
        console.error('SMS notification error:', smsError);
      }

      // Get unique students
      const uniqueStudents = new Map();
      results.forEach(result => {
        if (!uniqueStudents.has(result.students.id)) {
          uniqueStudents.set(result.students.id, result.students);
        }
      });

      const studentsArray = Array.from(uniqueStudents.values());
      
      // Send email notifications
      let emailsSent = 0;
      const emailErrors: string[] = [];

      const emailResults = await Promise.allSettled(
        studentsArray.map(student => {
          const message = `Dear ${student.first_name} ${student.last_name},\n\nYour academic results have been published and are now available for viewing.\n\nPlease log in to the student portal to check your results.\n\nBest regards,\nAcademic Office`;
          return sendEmail(student, "Results Published", message);
        })
      );

      emailResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          emailsSent++;
        } else {
          emailErrors.push(`Email failed for ${studentsArray[index].first_name} ${studentsArray[index].last_name}`);
        }
      });

      // Create notification records
      await Promise.all(
        studentsArray.map(student => createNotification(student.id, "Results Published", 
          `Dear ${student.first_name} ${student.last_name},\n\nYour academic results have been published and are now available for viewing.\n\nPlease log in to the student portal to check your results.\n\nBest regards,\nAcademic Office`, 'result'))
      );

      const smsSent = smsResult?.results?.smsSent || 0;
      const totalSent = emailsSent + smsSent;
      const totalErrors = emailErrors.length + (smsResult?.results?.errors?.length || 0);

      toast({
        title: "Results Published",
        description: `Published ${results.length} results. Sent ${totalSent} notifications (${emailsSent} emails, ${smsSent} SMS). ${totalErrors > 0 ? `${totalErrors} notifications failed.` : ''}`,
        variant: totalErrors > 0 ? "destructive" : "default"
      });

      refetchData();

    } catch (error) {
      console.error('Publish results error:', error);
      toast({
        title: "Error",
        description: "Failed to publish results",
        variant: "destructive"
      });
    } finally {
      setNotificationLoading(false);
    }
  }, [refetchData, toast]);

  // Get notifications for a student
  const getStudentNotifications = useCallback(async (studentId: string): Promise<NotificationData[]> => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching student notifications:', error);
      return [];
    }
  }, []);

  // Mark notifications as read
  const markNotificationsAsRead = useCallback(async (notificationIds: string[]): Promise<void> => {
    try {
      await supabase
        .from('notifications')
        .update({ status: 'read' })
        .in('id', notificationIds);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, []);

  return {
    notificationLoading,
    bulkNotificationLoading,
    sendBulkNotification,
    sendCustomNotification,
    sendTestNotification,
    sendEnrollmentConfirmations,
    publishAllResults,
    getStudentNotifications,
    markNotificationsAsRead,
  };
};