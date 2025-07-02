import { supabase } from '@/integrations/supabase/client';
import emailjs from '@emailjs/browser';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_3ux4e79';
const EMAILJS_TEMPLATE_ID = 'template_po1yqoo';
const EMAILJS_PUBLIC_KEY = 'iqrbya988WpE1wUcR';

interface NotificationResult {
  success: boolean;
  emailsSent: number;
  smsSent?: number;
  total?: number;
  errors: string[];
  resultsPublished: number;
  studentsNotified: number;
}

export class NotificationService {
  
  static async publishAndNotifyResults(): Promise<NotificationResult> {
    try {
      console.log('Checking for pending results...');
      
      // Check for pending results
      const { data: pendingResults, error: resultsError } = await supabase
        .from('results')
        .select(`
          *,
          students!inner(id, first_name, last_name, email, student_id),
          courses!inner(course_title, course_code)
        `)
        .eq('status', 'pending');

      if (resultsError) {
        throw new Error(`Failed to fetch pending results: ${resultsError.message}`);
      }

      if (!pendingResults || pendingResults.length === 0) {
        console.log('No pending results found');
        return {
          success: true,
          emailsSent: 0,
          smsSent: 0,
          total: 0,
          errors: [],
          resultsPublished: 0,
          studentsNotified: 0
        };
      }

      console.log(`Found ${pendingResults.length} pending results`);

      // Update results status to 'published' and set published_at timestamp
      const resultIds = pendingResults.map(result => result.id);
      const { error: updateError } = await supabase
        .from('results')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .in('id', resultIds);

      if (updateError) {
        throw new Error(`Failed to update results status: ${updateError.message}`);
      }

      console.log(`Published ${resultIds.length} results`);

      // Get unique students who have newly published results
      const uniqueStudents = pendingResults.reduce((acc, result) => {
        const studentId = result.students.id;
        if (!acc.find(s => s.id === studentId)) {
          acc.push(result.students);
        }
        return acc;
      }, [] as any[]);

      let emailsSent = 0;
      const emailErrors: string[] = [];

      // Send email notifications to affected students
      for (const student of uniqueStudents) {
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_name: `${student.first_name} ${student.last_name}`,
              to_email: student.email,
              student_id: student.student_id,
              message: 'Your latest exam results have been published! Log in to EduNotify to view your results.',
              institution: 'Moshood Abiola Polytechnic'
            },
            EMAILJS_PUBLIC_KEY
          );
          emailsSent++;
          console.log(`Email sent to ${student.first_name} ${student.last_name}`);
        } catch (emailError) {
          console.error(`Email failed for ${student.first_name} ${student.last_name}:`, emailError);
          emailErrors.push(`Email failed for ${student.first_name} ${student.last_name}`);
        }
      }

      // Store notifications in database
      const notifications = uniqueStudents.map(student => ({
        student_id: student.id,
        title: 'Results Published',
        message: 'Your latest exam results have been published! Log in to view your results.',
        type: 'result_published',
        status: 'sent',
        sent_at: new Date().toISOString()
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Failed to store notifications:', notificationError);
        emailErrors.push('Failed to store notification records');
      }

      return {
        success: true,
        resultsPublished: resultIds.length,
        studentsNotified: uniqueStudents.length,
        emailsSent,
        smsSent: 0, // SMS not implemented yet
        total: uniqueStudents.length,
        errors: emailErrors
      };

    } catch (error) {
      console.error('Notification service error:', error);
      return {
        success: false,
        resultsPublished: 0,
        studentsNotified: 0,
        emailsSent: 0,
        smsSent: 0,
        total: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  // Add the missing sendResultNotifications method (alias for publishAndNotifyResults)
  static async sendResultNotifications(): Promise<NotificationResult> {
    return this.publishAndNotifyResults();
  }

  static async sendCustomNotification(
    studentIds: string[], 
    title: string, 
    message: string
  ): Promise<NotificationResult> {
    try {
      console.log('Sending custom notifications to', studentIds.length, 'students');
      
      // Get student details
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .in('id', studentIds)
        .eq('status', 'Active');

      if (studentsError) {
        throw new Error(`Failed to fetch students: ${studentsError.message}`);
      }

      if (!students || students.length === 0) {
        return {
          success: true,
          resultsPublished: 0,
          studentsNotified: 0,
          emailsSent: 0,
          smsSent: 0,
          total: 0,
          errors: ['No active students found']
        };
      }

      let emailsSent = 0;
      const emailErrors: string[] = [];

      // Send emails
      for (const student of students) {
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
          emailsSent++;
          console.log(`Custom email sent to ${student.first_name} ${student.last_name}`);
        } catch (emailError) {
          console.error(`Custom email failed for ${student.first_name} ${student.last_name}:`, emailError);
          emailErrors.push(`Email failed for ${student.first_name} ${student.last_name}`);
        }
      }

      // Store custom notifications in database
      const notifications = students.map(student => ({
        student_id: student.id,
        title: title,
        message: message,
        type: 'custom',
        status: emailsSent > 0 ? 'sent' : 'failed',
        sent_at: new Date().toISOString()
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Failed to store custom notifications:', notificationError);
        emailErrors.push('Failed to store notification records');
      }

      return {
        success: true,
        resultsPublished: 0,
        studentsNotified: students.length,
        emailsSent,
        smsSent: 0,
        total: students.length,
        errors: emailErrors
      };

    } catch (error) {
      console.error('Custom notification service error:', error);
      return {
        success: false,
        resultsPublished: 0,
        studentsNotified: 0,
        emailsSent: 0,
        smsSent: 0,
        total: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }
}