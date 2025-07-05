const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// SMS-specific rate limiting
const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit SMS endpoints to 10 requests per minute
  message: 'SMS rate limit exceeded, please try again later.'
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use('/api/', apiLimiter);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Twilio client with error handling
let twilioClient;
try {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
} catch (error) {
  console.error('Failed to initialize Twilio client:', error.message);
}

// Enhanced SMS Templates
class EnhancedSMSTemplates {
  static getBasicResultsTemplate(studentData) {
    const { first_name, student_id_number, cgpa, newResultsCount } = studentData;
    
    return `🎓 Hi ${first_name}!

Your exam results are published:
📋 ID: ${student_id_number}
📊 CGPA: ${cgpa || 'N/A'}
📚 New: ${newResultsCount} course(s)

Check EduNotify portal for details.
- Moshood Abiola Polytechnic`;
  }

  static getDetailedResultsTemplate(studentData) {
    const { first_name, student_id_number, cgpa, topCourses, semester, academic_year } = studentData;
    
    let message = `🎓 ${first_name} - ${semester} ${academic_year} Results

📋 ID: ${student_id_number}
📊 CGPA: ${cgpa || 'N/A'}

TOP COURSES:`;

    topCourses.slice(0, 3).forEach(course => {
      message += `\n• ${course.course_code}: ${course.grade || 'N/A'}`;
    });

    if (topCourses.length > 3) {
      message += `\n+ ${topCourses.length - 3} more`;
    }

    message += `\n\nView all on EduNotify portal.
- MAP Academic Affairs`;

    return message;
  }

  static getGradeAlertTemplate(studentData) {
    const { first_name, cgpa, passedCourses, failedCourses } = studentData;
    
    let message = `🎓 ${first_name} - Grade Summary

📊 CGPA: ${cgpa || 'N/A'}
✅ Passed: ${passedCourses}`;

    if (failedCourses > 0) {
      message += `\n❌ Failed: ${failedCourses}`;
    }

    message += `\n\nFull details on EduNotify.
- MAP Academic`;

    return message;
  }

  static getCustomTemplate(studentData, customMessage) {
    const { first_name } = studentData;
    return `Hello ${first_name}, ${customMessage} - Moshood Abiola Polytechnic`;
  }
}

// Enhanced phone number formatting
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Nigerian numbers
  if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.substring(1);
  } else if (cleaned.startsWith('234')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+234') && cleaned.length >= 10) {
    cleaned = '+234' + cleaned;
  }
  
  // Validate Nigerian mobile number format
  if (cleaned.match(/^\+234[789][01]\d{8}$/)) {
    return cleaned;
  }
  
  return null; // Invalid format
}

// Enhanced student data formatting
function formatStudentDataForSMS(studentData) {
  const { first_name, student_id_number, cgpa, course_results = [] } = studentData;
  
  const passedCourses = course_results.filter(c => 
    c.grade && !['F', 'E'].includes(c.grade.toUpperCase())
  ).length;
  
  const failedCourses = course_results.filter(c => 
    c.grade && ['F', 'E'].includes(c.grade.toUpperCase())
  ).length;
  
  const topCourses = course_results
    .filter(c => c.grade && !['F', 'E'].includes(c.grade.toUpperCase()))
    .sort((a, b) => (b.grade_point || 0) - (a.grade_point || 0))
    .slice(0, 3);

  const latestSemester = course_results.length > 0 ? {
    semester: course_results[0].semester || 'Current',
    academic_year: course_results[0].academic_year || new Date().getFullYear()
  } : {};

  return {
    first_name,
    student_id_number,
    cgpa: cgpa ? parseFloat(cgpa).toFixed(2) : null,
    newResultsCount: course_results.length,
    totalCourses: course_results.length,
    passedCourses,
    failedCourses,
    topCourses,
    ...latestSemester
  };
}

// Enhanced SMS sending function with retry logic
async function sendSMSWithRetry(phoneNumber, message, maxRetries = 3) {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        attempt
      };
    } catch (error) {
      console.error(`SMS attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Enhanced result notification endpoint
app.post('/api/notify-results', smsLimiter, async (req, res) => {
  try {
    console.log('Processing result notifications...');
    
    const { templateType = 'basic', testMode = false } = req.body;

    // Fetch pending results with enhanced query
    const { data: pendingResults, error: resultsError } = await supabase
      .from('results')
      .select(`
        *,
        students!inner(
          id, first_name, last_name, email, phone, student_id,
          program, level, status
        ),
        courses!inner(course_title, course_code, credit_units)
      `)
      .eq('status', 'pending')
      .eq('students.status', 'Active')
      .order('created_at', { ascending: false });

    if (resultsError) {
      throw new Error(`Failed to fetch pending results: ${resultsError.message}`);
    }

    if (!pendingResults || pendingResults.length === 0) {
      return res.json({
        success: true,
        message: 'No pending results found',
        emailsSent: 0,
        smsSent: 0,
        total: 0,
        errors: [],
        resultsPublished: 0,
        studentsNotified: 0
      });
    }

    console.log(`Found ${pendingResults.length} pending results`);

    // Group results by student
    const studentResults = pendingResults.reduce((acc, result) => {
      const studentId = result.students.id;
      if (!acc[studentId]) {
        acc[studentId] = {
          student: result.students,
          results: []
        };
      }
      acc[studentId].results.push({
        course_code: result.courses.course_code,
        course_title: result.courses.course_title,
        grade: result.grade,
        grade_point: result.grade_point,
        semester: result.semester,
        academic_year: result.academic_year
      });
      return acc;
    }, {});

    const uniqueStudents = Object.values(studentResults);
    let smsSent = 0;
    const smsErrors = [];
    const smsResults = [];

    // Send SMS notifications to each student
    for (const { student, results } of uniqueStudents) {
      try {
        const phoneNumber = formatPhoneNumber(student.phone);
        
        if (!phoneNumber) {
          smsErrors.push(`Invalid phone number for ${student.first_name} ${student.last_name}: ${student.phone}`);
          continue;
        }

        // Format student data for SMS
        const studentData = {
          ...student,
          course_results: results,
          cgpa: student.cgpa // Assuming CGPA is stored in student record
        };

        const smsData = formatStudentDataForSMS(studentData);
        
        let message;
        switch (templateType) {
          case 'detailed':
            message = EnhancedSMSTemplates.getDetailedResultsTemplate(smsData);
            break;
          case 'grade_alert':
            message = EnhancedSMSTemplates.getGradeAlertTemplate(smsData);
            break;
          default:
            message = EnhancedSMSTemplates.getBasicResultsTemplate(smsData);
        }

        // Skip SMS sending in test mode
        if (testMode) {
          console.log(`[TEST MODE] Would send SMS to ${student.first_name} ${student.last_name}`);
          smsSent++;
          continue;
        }

        const smsResult = await sendSMSWithRetry(phoneNumber, message);
        
        smsSent++;
        smsResults.push({
          student: `${student.first_name} ${student.last_name}`,
          student_id: student.student_id,
          phone: phoneNumber,
          sid: smsResult.sid,
          status: smsResult.status,
          messageLength: message.length
        });

        console.log(`SMS sent to ${student.first_name} ${student.last_name} (${phoneNumber})`);
        
        // Rate limiting between SMS sends
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (smsError) {
        console.error(`SMS failed for ${student.first_name} ${student.last_name}:`, smsError.message);
        smsErrors.push(`SMS failed for ${student.first_name} ${student.last_name}: ${smsError.message}`);
      }
    }

    // Update results status to published (only if not in test mode)
    if (!testMode) {
      const resultIds = pendingResults.map(result => result.id);
      const { error: updateError } = await supabase
        .from('results')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .in('id', resultIds);

      if (updateError) {
        console.error('Failed to update results status:', updateError);
        smsErrors.push('Failed to update results status');
      }

      // Store notifications in database
      const notifications = uniqueStudents.map(({ student }) => ({
        student_id: student.id,
        title: 'Results Published',
        message: `Your latest exam results have been published! ${uniqueStudents.find(s => s.student.id === student.id)?.results.length || 0} new results available.`,
        type: 'result_published',
        status: 'sent',
        sent_at: new Date().toISOString(),
        sms_sent: true,
        template_used: templateType
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Failed to store notifications:', notificationError);
        smsErrors.push('Failed to store notification records');
      }
    }

    const response = {
      success: true,
      message: testMode ? 'Test mode completed successfully' : 'Notifications sent successfully',
      resultsPublished: testMode ? 0 : pendingResults.length,
      studentsNotified: uniqueStudents.length,
      emailsSent: 0,
      smsSent,
      total: uniqueStudents.length,
      errors: smsErrors,
      smsResults: smsResults.slice(0, 10), // Limit response size
      templateUsed: templateType,
      testMode
    };

    console.log('Notification results:', response);
    res.json(response);

  } catch (error) {
    console.error('Notification service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process notifications',
      resultsPublished: 0,
      studentsNotified: 0,
      emailsSent: 0,
      smsSent: 0,
      total: 0,
      errors: [error.message || 'Unknown error occurred']
    });
  }
});

// Enhanced custom notification endpoint
app.post('/api/notify-custom', smsLimiter, async (req, res) => {
  try {
    const { studentIds, title, message, testMode = false } = req.body;

    // Validation
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs are required',
        errors: ['Student IDs must be provided as an array']
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required',
        errors: ['Both title and message fields are required']
      });
    }

    // Limit batch size
    if (studentIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Batch size too large',
        errors: ['Maximum 100 students per batch']
      });
    }

    console.log(`Sending custom notifications to ${studentIds.length} students`);
    
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds)
      .eq('status', 'Active');

    if (studentsError) {
      throw new Error(`Failed to fetch students: ${studentsError.message}`);
    }

    if (!students || students.length === 0) {
      return res.json({
        success: true,
        message: 'No active students found',
        resultsPublished: 0,
        studentsNotified: 0,
        emailsSent: 0,
        smsSent: 0,
        total: 0,
        errors: []
      });
    }

    let smsSent = 0;
    const smsErrors = [];
    const smsResults = [];

    for (const student of students) {
      try {
        const phoneNumber = formatPhoneNumber(student.phone);
        
        if (!phoneNumber) {
          smsErrors.push(`Invalid phone number for ${student.first_name} ${student.last_name}: ${student.phone}`);
          continue;
        }

        const smsMessage = EnhancedSMSTemplates.getCustomTemplate(student, message);

        if (testMode) {
          console.log(`[TEST MODE] Would send custom SMS to ${student.first_name} ${student.last_name}`);
          smsSent++;
          continue;
        }

        const smsResult = await sendSMSWithRetry(phoneNumber, smsMessage);
        
        smsSent++;
        smsResults.push({
          student: `${student.first_name} ${student.last_name}`,
          student_id: student.student_id,
          phone: phoneNumber,
          sid: smsResult.sid,
          status: smsResult.status
        });

        console.log(`Custom SMS sent to ${student.first_name} ${student.last_name}`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (smsError) {
        console.error(`Custom SMS failed for ${student.first_name} ${student.last_name}:`, smsError.message);
        smsErrors.push(`SMS failed for ${student.first_name} ${student.last_name}: ${smsError.message}`);
      }
    }

    // Store notifications (only if not in test mode)
    if (!testMode) {
      const notifications = students.map(student => ({
        student_id: student.id,
        title: title,
        message: message,
        type: 'custom',
        status: 'sent',
        sent_at: new Date().toISOString(),
        sms_sent: true
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Failed to store custom notifications:', notificationError);
        smsErrors.push('Failed to store notification records');
      }
    }

    res.json({
      success: true,
      message: testMode ? 'Test mode completed successfully' : 'Custom notifications sent successfully',
      resultsPublished: 0,
      studentsNotified: students.length,
      emailsSent: 0,
      smsSent,
      total: students.length,
      errors: smsErrors,
      smsResults: smsResults.slice(0, 10), // Limit response size
      testMode
    });

  } catch (error) {
    console.error('Custom notification service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send custom notifications',
      resultsPublished: 0,
      studentsNotified: 0,
      emailsSent: 0,
      smsSent: 0,
      total: 0,
      errors: [error.message || 'Unknown error occurred']
    });
  }
});

// SMS delivery status webhook
app.post('/api/sms-status', express.raw({type: 'application/x-www-form-urlencoded'}), (req, res) => {
  try {
    const params = new URLSearchParams(req.body.toString());
    const messageSid = params.get('MessageSid');
    const messageStatus = params.get('MessageStatus');
    
    console.log(`SMS Status Update: ${messageSid} - ${messageStatus}`);
    
    // You can store this status update in your database
    // await supabase.from('sms_logs').update({ status: messageStatus }).eq('sid', messageSid);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('SMS status webhook error:', error);
    res.status(500).send('Error');
  }
});

// Health check endpoint with enhanced diagnostics
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'EduNotify SMS Service',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      twilio: !!twilioClient,
      supabase: !!supabase,
      twilioPhone: !!process.env.TWILIO_PHONE_NUMBER
    }
  };

  const isHealthy = Object.values(health.checks).every(check => check);
  
  res.status(isHealthy ? 200 : 503).json(health);
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: [isDevelopment ? err.message : 'An unexpected error occurred'],
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EduNotify SMS Service v2.0.0 running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (!twilioClient) {
    console.warn('⚠️  Warning: Twilio client not initialized - SMS features disabled');
  }
});