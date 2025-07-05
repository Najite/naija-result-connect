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
    ? 'https://your-production-sms-service.com' 
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

    let courseResultsHtml = '';
    
    for (const [period, results] of groupedResults) {
      courseResultsHtml += `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px;">
            ${period}
          </h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Course Code</th>
                  <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Course Title</th>
                  <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">CA Score</th>
                  <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">Exam Score</th>
                  <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">Total Score</th>
                  <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">Grade</th>
                  <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">Grade Point</th>
                  <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">Credit Units</th>
                </tr>
              </thead>
              <tbody>`;
      
      results.forEach((result, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        courseResultsHtml += `
                <tr style="background-color: ${rowBg};">
                  <td style="border: 1px solid #dee2e6; padding: 12px; font-weight: bold;">${result.course_code}</td>
                  <td style="border: 1px solid #dee2e6; padding: 12px;">${result.course_title}</td>
                  <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${result.ca_score || 'N/A'}</td>
                  <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${result.exam_score || 'N/A'}</td>
                  <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">${result.total_score || 'N/A'}</td>
                  <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold; color: ${this.getGradeColor(result.grade)};">${result.grade || 'N/A'}</td>
                  <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${result.grade_point || 'N/A'}</td>
                  <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">${result.credit_units}</td>
                </tr>`;
      });
      
      courseResultsHtml += `
              </tbody>
            </table>
          </div>
        </div>`;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exam Results - EduNotify</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #3498db;
        }
        .logo {
            color: #2c3e50;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .title {
            color: #27ae60;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .student-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #3498db;
        }
        .student-info h2 {
            color: #2c3e50;
            margin-top: 0;
            margin-bottom: 15px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .info-item {
            display: flex;
            align-items: center;
        }
        .info-label {
            font-weight: bold;
            color: #2c3e50;
            margin-right: 8px;
        }
        .info-value {
            color: #34495e;
        }
        .cgpa-highlight {
            background-color: #e8f5e8;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            margin-top: 15px;
        }
        .cgpa-value {
            font-size: 24px;
            font-weight: bold;
            color: #27ae60;
        }
        .results-section {
            margin-bottom: 30px;
        }
        .results-title {
            color: #2c3e50;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
        }
        .footer {
            background-color: #34495e;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .footer h3 {
            margin-top: 0;
            color: #ecf0f1;
        }
        .important-notes {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .important-notes h3 {
            color: #856404;
            margin-top: 0;
        }
        .contact-info {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .contact-info h3 {
            color: #155724;
            margin-top: 0;
        }
        .contact-info ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .contact-info li {
            margin-bottom: 5px;
        }
        .timestamp {
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
        }
        .disclaimer {
            text-align: center;
            color: #6c757d;
            font-size: 12px;
            font-style: italic;
            margin-top: 10px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Moshood Abiola Polytechnic</div>
            <div class="title">🎓 Exam Results Published</div>
        </div>

        <div class="student-info">
            <h2>Student Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Student ID:</span>
                    <span class="info-value">${student.student_id}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Full Name:</span>
                    <span class="info-value">${fullName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${student.email}</span>
                </div>
            </div>
            <div class="cgpa-highlight">
                <div style="font-size: 16px; margin-bottom: 5px;">Current CGPA</div>
                <div class="cgpa-value">${cgpa}</div>
            </div>
        </div>

        <div class="results-section">
            <h2 class="results-title">📊 Course Results</h2>
            ${courseResultsHtml}
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 16px; margin-bottom: 20px;">Please log in to EduNotify for more detailed information and to download your official transcript.</p>
            <a href="#" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Student Portal</a>
        </div>

        <div class="important-notes">
            <h3>📋 Important Notes</h3>
            <ul>
                <li>This email was sent to: <strong>${student.email}</strong></li>
                <li>If you have questions about your results, please contact the Academic Affairs Office</li>
                <li>Keep this email for your records</li>
            </ul>
        </div>

        <div class="contact-info">
            <h3>📞 Need Help?</h3>
            <p>If you have any questions or need assistance, please contact:</p>
            <ul>
                <li>Academic Affairs Office: <strong>[Phone Number]</strong></li>
                <li>Email: <strong>[Support Email]</strong></li>
                <li>Student Help Desk: <strong>[Help Desk Info]</strong></li>
            </ul>
        </div>

        <div class="footer">
            <h3>Best regards,</h3>
            <p><strong>Moshood Abiola Polytechnic</strong><br>
            Academic Affairs Department</p>
        </div>

        <div class="timestamp">
            Sent on ${new Date().toLocaleString()}
        </div>
        
        <div class="disclaimer">
            This is an automated message. Please do not reply directly to this email.
        </div>
    </div>
</body>
</html>`;
  }

  // Helper method to get grade color
  private static getGradeColor(grade: string | null): string {
    if (!grade) return '#6c757d';
    
    switch (grade.toUpperCase()) {
      case 'A':
        return '#28a745';
      case 'B':
        return '#17a2b8';
      case 'C':
        return '#ffc107';
      case 'D':
        return '#fd7e14';
      case 'F':
        return '#dc3545';
      default:
        return '#6c757d';
    }
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
              subject: 'Your Exam Results Have Been Published - EduNotify'
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
            subject: title
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