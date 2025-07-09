import { supabase } from '@/integrations/supabase/client';
import emailjs from '@emailjs/browser';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_3ux4e79';
const EMAILJS_TEMPLATE_ID = 'template_po1yqoo';
const EMAILJS_PUBLIC_KEY = 'iqrbya988WpE1wUcR';

interface NotificationResult {
  success: boolean;
  emailsSent: number;
  smsSent: number;
  total: number;
  resultsPublished: number;
  studentsNotified: number;
  successDetails?: any[];
  failureDetails?: any[];
  errors: string[];
  message?: string;
}

interface StudentResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  cgpa: number | null;
  results: Array<{
    course_code: string;
    course_title: string;
    ca_score: number | null;
    exam_score: number | null;
    total_score: number | null;
    grade: string | null;
    grade_point: number | null;
    credit_units: number;
    academic_year: string;
    semester: string;
  }>;
}

export class NotificationService {
  private static readonly SMS_SERVICE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://naija-result-connect.vercel.app' 
    : 'http://localhost:3001';

  // Initialize EmailJS (call this once in your app)
  static initEmailJS() {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  // Main method to publish results and send notifications
  static async publishAndNotifyResults(): Promise<NotificationResult> {
    try {
      console.log('📢 Publishing results and sending notifications...');
      
      // Get all results (both pending and published) for notification
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select(`
          *,
          students!inner(id, first_name, last_name, email, student_id, cgpa),
          courses!inner(course_title, course_code, credit_units)
        `)
        .in('status', ['pending', 'published'])
        .not('students.email', 'is', null); // Ensure students have email addresses

      if (resultsError) {
        throw new Error(`Failed to fetch results: ${resultsError.message}`);
      }

      if (!results || results.length === 0) {
        console.log('No results found for notification');
        return this.createEmptyResult();
      }

      // Filter out students with invalid email addresses
      const validResults = results.filter(result => 
        result.students?.email && 
        this.isValidEmail(result.students.email)
      );

      if (validResults.length === 0) {
        return {
          ...this.createEmptyResult(),
          errors: ['No students with valid email addresses found']
        };
      }

      // Separate pending and published results
      const pendingResults = validResults.filter(r => r.status === 'pending');
      const publishedResults = validResults.filter(r => r.status === 'published');

      console.log(`Found ${pendingResults.length} pending and ${publishedResults.length} published results`);

      // Update pending results to published
      let publishedCount = 0;
      if (pendingResults.length > 0) {
        const pendingIds = pendingResults.map(r => r.id);
        const { error: updateError } = await supabase
          .from('results')
          .update({ 
            status: 'published',
            published_at: new Date().toISOString()
          })
          .in('id', pendingIds);

        if (updateError) {
          throw new Error(`Failed to update results status: ${updateError.message}`);
        }
        publishedCount = pendingIds.length;
        console.log(`Published ${publishedCount} results`);
      }

      // Group results by student
      const studentResults = this.groupResultsByStudent(validResults);
      
      // Send detailed notifications
      const notificationResults = await this.sendDetailedNotifications(studentResults);

      // Store notification records
      await this.storeNotifications(studentResults.map(sr => sr), notificationResults.errors);

      return {
        success: true,
        resultsPublished: publishedCount,
        studentsNotified: studentResults.length,
        emailsSent: notificationResults.emailsSent,
        smsSent: notificationResults.smsSent,
        total: studentResults.length,
        successDetails: notificationResults.successDetails,
        failureDetails: notificationResults.failureDetails,
        errors: notificationResults.errors,
        message: `Processed ${results.length} results, notified ${studentResults.length} students`
      };

    } catch (error) {
      console.error('❌ Notification service error:', error);
      return this.createErrorResult(error);
    }
  }

  // Send custom notifications to selected students
  static async sendCustomNotification(
    studentIds: string[], 
    title: string, 
    message: string
  ): Promise<NotificationResult> {
    try {
      console.log(`📱 Sending custom notifications to ${studentIds.length} students`);
      
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .in('id', studentIds)
        .eq('status', 'Active')
        .not('email', 'is', null);

      if (studentsError) {
        throw new Error(`Failed to fetch students: ${studentsError.message}`);
      }

      if (!students || students.length === 0) {
        return {
          ...this.createEmptyResult(),
          errors: ['No active students with email addresses found']
        };
      }

      // Filter students with valid email addresses
      const validStudents = students.filter(student => 
        student.email && this.isValidEmail(student.email)
      );

      if (validStudents.length === 0) {
        return {
          ...this.createEmptyResult(),
          errors: ['No students with valid email addresses found']
        };
      }

      // Send notifications
      const notificationResults = await this.sendNotifications(validStudents, title, message);

      // Store custom notifications
      await this.storeCustomNotifications(validStudents, title, message, notificationResults.errors);

      return {
        success: true,
        resultsPublished: 0,
        studentsNotified: validStudents.length,
        emailsSent: notificationResults.emailsSent,
        smsSent: notificationResults.smsSent,
        total: validStudents.length,
        successDetails: notificationResults.successDetails,
        failureDetails: notificationResults.failureDetails,
        errors: notificationResults.errors
      };

    } catch (error) {
      console.error('❌ Custom notification error:', error);
      return this.createErrorResult(error);
    }
  }

  // Test email functionality
  static async testEmail(email: string, studentName: string): Promise<boolean> {
    try {
      if (!this.isValidEmail(email)) {
        console.error('❌ Invalid email format:', email);
        return false;
      }

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_name: studentName,
          to_email: email,
          student_id: 'TEST123',
          message: 'This is a test email from EduNotify system.',
          institution: 'Moshood Abiola Polytechnic',
          subject: 'Test Email - EduNotify System'
        },
        EMAILJS_PUBLIC_KEY
      );

      console.log('✅ Test email sent successfully to:', email);
      return true;
    } catch (error) {
      console.error('❌ Test email error:', error);
      return false;
    }
  }

  // Test SMS functionality
  static async testSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.SMS_SERVICE_URL}/api/test-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, message })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('❌ Test SMS error:', error);
      return false;
    }
  }

  // Get notification history
  static async getNotificationHistory(limit: number = 50) {
    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select(`
          *,
          students(first_name, last_name, student_id, email)
        `)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return notifications || [];
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      return [];
    }
  }

  // Check if SMS service is running
  static async checkSMSServiceHealth(): Promise<boolean> {
    try {
      console.log('🔍 Checking SMS service health...');
      const response = await fetch(`${this.SMS_SERVICE_URL}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        credentials: 'include'
      });
      
      if (response.ok) {
        const health = await response.json();
        console.log('✅ SMS service is healthy:', health);
        return true;
      } else {
        console.warn('⚠️ SMS service health check failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ SMS service health check failed:', error);
      return false;
    }
  }

  // Validate email format
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Alias for backward compatibility
  static async sendResultNotifications(): Promise<NotificationResult> {
    return this.publishAndNotifyResults();
  }

  // Private helper methods
  private static groupResultsByStudent(results: any[]): StudentResult[] {
    const studentMap = new Map<string, StudentResult>();

    results.forEach(result => {
      const student = result.students;
      const course = result.courses;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          student_id: student.student_id,
          cgpa: student.cgpa,
          results: []
        });
      }

      studentMap.get(student.id)!.results.push({
        course_code: course.course_code,
        course_title: course.course_title,
        ca_score: result.ca_score,
        exam_score: result.exam_score,
        total_score: result.total_score,
        grade: result.grade,
        grade_point: result.grade_point,
        credit_units: course.credit_units,
        academic_year: result.academic_year,
        semester: result.semester
      });
    });

    return Array.from(studentMap.values());
  }

  private static formatDetailedEmailMessage(student: StudentResult): string {
    const fullName = `${student.first_name} ${student.last_name}`;
    const cgpa = student.cgpa ? student.cgpa.toFixed(2) : 'N/A';
    
    // Group results by academic year and semester
    const groupedResults = new Map<string, any[]>();
    
    student.results.forEach(result => {
      const key = `${result.academic_year} - ${result.semester}`;
      if (!groupedResults.has(key)) {
        groupedResults.set(key, []);
      }
      groupedResults.get(key)!.push(result);
    });

    let courseResultsText = '';
    
    for (const [period, results] of groupedResults) {
      courseResultsText += `${period}:\n`;
      courseResultsText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      results.forEach(result => {
        courseResultsText += `${result.course_code} - ${result.course_title}\n`;
        courseResultsText += `  Continuous Assessment: ${result.ca_score || 'N/A'}\n`;
        courseResultsText += `  Examination Score: ${result.exam_score || 'N/A'}\n`;
        courseResultsText += `  Total Score: ${result.total_score || 'N/A'}\n`;
        courseResultsText += `  Grade: ${result.grade || 'N/A'}\n`;
        courseResultsText += `  Grade Point: ${result.grade_point || 'N/A'}\n`;
        courseResultsText += `  Credit Units: ${result.credit_units}\n\n`;
      });
    }

    return `Dear ${fullName},

We are pleased to inform you that your academic results have been published and are now available for your review.

STUDENT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Student ID: ${student.student_id}
Current CGPA: ${cgpa}

ACADEMIC RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${courseResultsText}

 STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Log in to your EduNotify student portal for detailed information
2. Download your official transcript if needed
3. Contact the Academic Affairs Office if you have any questions

CONTACT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Academic Affairs Office: +234-XXX-XXX-XXXX
Email: academic.affairs@edunotify
Student Help Desk: Available Monday-Friday, 8AM-5PM

Best regards,

Academic Affairs Department
Moshood Abiola Polytechnic


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This message was sent to ${student.email}
Sent on ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

This is an official communication from Moshood Abiola Polytechnic.
Please add academic.affairs@edunotify to your contacts to ensure delivery.`;
  }

  private static async sendDetailedNotifications(
    studentResults: StudentResult[]
  ): Promise<{
    emailsSent: number;
    smsSent: number;
    successDetails: any[];
    failureDetails: any[];
    errors: string[];
  }> {
    let emailsSent = 0;
    let smsSent = 0;
    const successDetails: any[] = [];
    const failureDetails: any[] = [];
    const errors: string[] = [];

    console.log(`📧 Sending detailed email notifications to ${studentResults.length} students...`);

    // Send detailed email notifications with retry logic
    for (const student of studentResults) {
      const maxRetries = 3;
      let retryCount = 0;
      let emailSent = false;

      while (retryCount < maxRetries && !emailSent) {
        try {
          const detailedMessage = this.formatDetailedEmailMessage(student);
          
          console.log(`📧 Attempting to send email to ${student.email} (${student.first_name} ${student.last_name}), attempt ${retryCount + 1}`);
          
          const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_name: `${student.first_name} ${student.last_name}`,
              to_email: student.email,
              student_id: student.student_id,
              message: detailedMessage,
              institution: 'Moshood Abiola Polytechnic',
              subject: 'Academic Results Published - Moshood Abiola Polytechnic',
              from_name: 'Academic Affairs Department',
              from_email: 'academic.affairs@edunotify',
              reply_to: 'academic.affairs@edunotify'
            },
            EMAILJS_PUBLIC_KEY
          );
          
          emailsSent++;
          emailSent = true;
          successDetails.push({
            type: 'email',
            student: `${student.first_name} ${student.last_name}`,
            contact: student.email,
            student_id: student.student_id
          });
          console.log(`✅ Email successfully sent to ${student.email}`);
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (emailError: any) {
          retryCount++;
          console.error(`❌ Email attempt ${retryCount} failed for ${student.email}:`, emailError);
          
          if (retryCount >= maxRetries) {
            const errorMsg = `Email failed for ${student.first_name} ${student.last_name} (${student.email}) after ${maxRetries} attempts`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
            failureDetails.push({
              type: 'email',
              student: `${student.first_name} ${student.last_name}`,
              contact: student.email,
              student_id: student.student_id,
              error: emailError.message || 'Unknown error',
              attempts: maxRetries
            });
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
    }

    // Send SMS notifications if service is available
    const isSMSHealthy = await this.checkSMSServiceHealth();
    if (isSMSHealthy) {
      try {
        console.log(`📱 Sending SMS notifications to ${studentResults.length} students...`);
        
        const response = await fetch(`${this.SMS_SERVICE_URL}/api/notify-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            studentIds: studentResults.map(s => s.id), 
            title: 'Results Published', 
            message: 'Your exam results have been published! Check your email for details or log in to EduNotify to view your results.' 
          })
        });

        if (response.ok) {
          const smsResult = await response.json();
          smsSent = smsResult.smsSent || 0;
          if (smsResult.successDetails) successDetails.push(...smsResult.successDetails);
          if (smsResult.failureDetails) failureDetails.push(...smsResult.failureDetails);
          console.log(`✅ SMS sent to ${smsSent} students`);
        } else {
          console.error('❌ SMS service request failed:', response.status);
          errors.push('SMS service request failed');
        }
      } catch (smsError) {
        console.error('❌ SMS service error:', smsError);
        errors.push('SMS service unavailable');
      }
    } else {
      console.warn('⚠️ SMS service not available, skipping SMS notifications');
    }

    return { emailsSent, smsSent, successDetails, failureDetails, errors };
  }

  private static async sendNotifications(
    students: any[], 
    customTitle?: string, 
    customMessage?: string
  ): Promise<{
    emailsSent: number;
    smsSent: number;
    successDetails: any[];
    failureDetails: any[];
    errors: string[];
  }> {
    let emailsSent = 0;
    let smsSent = 0;
    const successDetails: any[] = [];
    const failureDetails: any[] = [];
    const errors: string[] = [];

    const title = customTitle || 'Results Published';
    const message = customMessage || 'Your latest exam results have been published! Log in to EduNotify to view your results.';

    console.log(`📧 Sending custom email notifications to ${students.length} students...`);

    // Send email notifications
    for (const student of students) {
      try {
        console.log(`📧 Sending email to ${student.email} (${student.first_name} ${student.last_name})`);
        
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_name: `${student.first_name} ${student.last_name}`,
            to_email: student.email,
            student_id: student.student_id,
            message: message,
            institution: 'Moshood Abiola Polytechnic',
            subject: title,
            from_name: 'academic.affairs@edunotify',
            from_email: 'academic.affairs@edunotify',
            reply_to: 'academic.affairs@edunotify'
          },
          EMAILJS_PUBLIC_KEY
        );
        
        emailsSent++;
        successDetails.push({
          type: 'email',
          student: `${student.first_name} ${student.last_name}`,
          contact: student.email,
          student_id: student.student_id
        });
        console.log(`✅ Email sent to ${student.email}`);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (emailError: any) {
        const errorMsg = `Email failed for ${student.first_name} ${student.last_name} (${student.email})`;
        console.error(`❌ ${errorMsg}:`, emailError);
        errors.push(errorMsg);
        failureDetails.push({
          type: 'email',
          student: `${student.first_name} ${student.last_name}`,
          contact: student.email,
          student_id: student.student_id,
          error: emailError.message || 'Unknown error'
        });
      }
    }

    // Send SMS notifications if service is available
    const isSMSHealthy = await this.checkSMSServiceHealth();
    if (isSMSHealthy) {
      try {
        const response = await fetch(`${this.SMS_SERVICE_URL}/api/notify-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            studentIds: students.map(s => s.id), 
            title, 
            message 
          })
        });

        if (response.ok) {
          const smsResult = await response.json();
          smsSent = smsResult.smsSent || 0;
          if (smsResult.successDetails) successDetails.push(...smsResult.successDetails);
          if (smsResult.failureDetails) failureDetails.push(...smsResult.failureDetails);
          console.log(`✅ SMS sent to ${smsSent} students`);
        } else {
          errors.push('SMS service request failed');
        }
      } catch (smsError) {
        console.error('❌ SMS service error:', smsError);
        errors.push('SMS service unavailable');
      }
    } else {
      console.warn('⚠️ SMS service not available, skipping SMS notifications');
    }

    return { emailsSent, smsSent, successDetails, failureDetails, errors };
  }

  private static async storeNotifications(students: any[], errors: string[]): Promise<void> {
    const notifications = students.map(student => ({
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
      console.error('❌ Failed to store notifications:', notificationError);
      errors.push('Failed to store notification records');
    }
  }

  private static async storeCustomNotifications(
    students: any[], 
    title: string, 
    message: string, 
    errors: string[]
  ): Promise<void> {
    const notifications = students.map(student => ({
      student_id: student.id,
      title: title,
      message: message,
      type: 'custom',
      status: 'sent',
      sent_at: new Date().toISOString()
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('❌ Failed to store custom notifications:', notificationError);
      errors.push('Failed to store notification records');
    }
  }

  private static createEmptyResult(): NotificationResult {
    return {
      success: true,
      emailsSent: 0,
      smsSent: 0,
      total: 0,
      resultsPublished: 0,
      studentsNotified: 0,
      errors: []
    };
  }

  private static createErrorResult(error: unknown): NotificationResult {
    let errorMessage = 'Unknown error';
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      errorMessage = 'Cannot connect to SMS service. Please ensure the backend server is running on port 3001.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      resultsPublished: 0,
      studentsNotified: 0,
      emailsSent: 0,
      smsSent: 0,
      total: 0,
      errors: [errorMessage]
    };
  }
}