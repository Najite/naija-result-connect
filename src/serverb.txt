const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper function to format phone number for Nigeria
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Nigerian phone numbers
  if (cleaned.startsWith('0')) {
    // Replace leading 0 with +234
    cleaned = '+234' + cleaned.substring(1);
  } else if (cleaned.startsWith('234')) {
    // Add + if missing
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+234')) {
    // Assume it's a Nigerian number without country code
    cleaned = '+234' + cleaned;
  }
  
  return cleaned;
}

// API endpoint to send result notifications
app.post('/api/notify-results', async (req, res) => {
  try {
    console.log('Processing result notifications...');
    
    // Check for pending results
    const { data: pendingResults, error: resultsError } = await supabase
      .from('results')
      .select(`
        *,
        students!inner(id, first_name, last_name, email, phone, student_id),
        courses!inner(course_title, course_code)
      `)
      .eq('status', 'pending');

    if (resultsError) {
      throw new Error(`Failed to fetch pending results: ${resultsError.message}`);
    }

    if (!pendingResults || pendingResults.length === 0) {
      return res.json({
        success: true,
        emailsSent: 0,
        smsSent: 0,
        total: 0,
        errors: [],
        resultsPublished: 0,
        studentsNotified: 0
      });
    }

    console.log(`Found ${pendingResults.length} pending results`);

    // Update results status to 'published'
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

    // Get unique students
    const uniqueStudents = pendingResults.reduce((acc, result) => {
      const studentId = result.students.id;
      if (!acc.find(s => s.id === studentId)) {
        acc.push(result.students);
      }
      return acc;
    }, []);

    let smsSent = 0;
    const smsErrors = [];
    const smsResults = [];

    // Send SMS notifications
    for (const student of uniqueStudents) {
      try {
        const phoneNumber = formatPhoneNumber(student.phone);
        
        if (!phoneNumber) {
          smsErrors.push(`No valid phone number for ${student.first_name} ${student.last_name}`);
          continue;
        }

        const message = `Hello ${student.first_name}, your latest exam results have been published! Log in to EduNotify to view your results. - Moshood Abiola Polytechnic`;

        const smsResult = await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });

        smsSent++;
        smsResults.push({
          student: `${student.first_name} ${student.last_name}`,
          phone: phoneNumber,
          sid: smsResult.sid,
          status: smsResult.status
        });

        console.log(`SMS sent to ${student.first_name} ${student.last_name} (${phoneNumber})`);
        
      } catch (smsError) {
        console.error(`SMS failed for ${student.first_name} ${student.last_name}:`, smsError.message);
        smsErrors.push(`SMS failed for ${student.first_name} ${student.last_name}: ${smsError.message}`);
      }
    }

    // Store notifications in database
    const notifications = uniqueStudents.map(student => ({
      student_id: student.id,
      title: 'Results Published',
      message: 'Your latest exam results have been published! Log in to view your results.',
      type: 'result_published',
      status: 'sent',
      sent_at: new Date().toISOString(),
      sms_sent: uniqueStudents.find(s => s.id === student.id) ? true : false
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Failed to store notifications:', notificationError);
      smsErrors.push('Failed to store notification records');
    }

    const response = {
      success: true,
      resultsPublished: resultIds.length,
      studentsNotified: uniqueStudents.length,
      emailsSent: 0, // Email will be handled by frontend
      smsSent,
      total: uniqueStudents.length,
      errors: smsErrors,
      smsResults: smsResults
    };

    console.log('Notification results:', response);
    res.json(response);

  } catch (error) {
    console.error('Notification service error:', error);
    res.status(500).json({
      success: false,
      resultsPublished: 0,
      studentsNotified: 0,
      emailsSent: 0,
      smsSent: 0,
      total: 0,
      errors: [error.message || 'Unknown error occurred']
    });
  }
});

// API endpoint to send custom notifications
app.post('/api/notify-custom', async (req, res) => {
  try {
    const { studentIds, title, message } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        errors: ['Student IDs are required']
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        errors: ['Title and message are required']
      });
    }

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
      return res.json({
        success: true,
        resultsPublished: 0,
        studentsNotified: 0,
        emailsSent: 0,
        smsSent: 0,
        total: 0,
        errors: ['No active students found']
      });
    }

    let smsSent = 0;
    const smsErrors = [];

    // Send SMS notifications
    for (const student of students) {
      try {
        const phoneNumber = formatPhoneNumber(student.phone);
        
        if (!phoneNumber) {
          smsErrors.push(`No valid phone number for ${student.first_name} ${student.last_name}`);
          continue;
        }

        const smsMessage = `Hello ${student.first_name}, ${message} - Moshood Abiola Polytechnic`;

        await twilioClient.messages.create({
          body: smsMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });

        smsSent++;
        console.log(`Custom SMS sent to ${student.first_name} ${student.last_name}`);
        
      } catch (smsError) {
        console.error(`Custom SMS failed for ${student.first_name} ${student.last_name}:`, smsError.message);
        smsErrors.push(`SMS failed for ${student.first_name} ${student.last_name}: ${smsError.message}`);
      }
    }

    // Store custom notifications in database
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

    res.json({
      success: true,
      resultsPublished: 0,
      studentsNotified: students.length,
      emailsSent: 0, // Email handled by frontend
      smsSent,
      total: students.length,
      errors: smsErrors
    });

  } catch (error) {
    console.error('Custom notification service error:', error);
    res.status(500).json({
      success: false,
      resultsPublished: 0,
      studentsNotified: 0,
      emailsSent: 0,
      smsSent: 0,
      total: 0,
      errors: [error.message || 'Unknown error occurred']
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'EduNotify SMS Service'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    errors: ['Internal server error']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`EduNotify SMS Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});