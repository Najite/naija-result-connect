const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const serverless = require('serverless-http');


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({ 
  origin: true, 
  credentials: true 
}));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// SMS Configuration
const SENDCHAMP_BASE_URL = 'https://api.sendchamp.com/api/v1';
const SENDER_NAME = 'Schamp';

// Phone number formatter for Nigeria
const formatPhone = (phone) => {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) return '234' + cleaned.substring(1);
  if (cleaned.startsWith('+234')) return cleaned.substring(1);
  if (!cleaned.startsWith('234')) return '234' + cleaned;
  return cleaned;
};

// SMS sender function
const sendSMS = async (phoneNumber, message) => {
  try {
    const response = await axios.post(
      `${SENDCHAMP_BASE_URL}/sms/send`,
      {
        to: [phoneNumber],
        message: message,
        sender_name: SENDER_NAME,
        route: 'dnd'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.SENDCHAMP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('SMS Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// Calculate student result summary
const calculateSummary = (results) => {
  const totalUnits = results.reduce((sum, r) => sum + (r.courses?.credit_units || 0), 0);
  const totalGradePoints = results.reduce((sum, r) => {
    const gp = r.grade_point || 0;
    const units = r.courses?.credit_units || 0;
    return sum + (gp * units);
  }, 0);
  
  return {
    totalCourses: results.length,
    totalUnits,
    gpa: totalUnits > 0 ? (totalGradePoints / totalUnits).toFixed(2) : '0.00'
  };
};

// Format results for SMS
const formatResultsForSMS = (results) => {
  return results.map(r => {
    const course = r.courses?.course_code || 'N/A';
    const total = r.total_score || 0;
    const grade = r.grade || 'N/A';
    return `${course}: ${total} (${grade})`;
  }).join('\n');
};

// Main notification endpoint - checks DB and sends SMS
app.post('/api/notify-results', async (req, res) => {
  try {
    const { semester, academicYear, studentIds } = req.body;

    // Build query conditions
    let query = supabase
      .from('results')
      .select(`
        *,
        students!inner(id, first_name, last_name, phone, student_id),
        courses!inner(course_title, course_code, credit_units)
      `);

    // Add filters if provided
    if (semester) query = query.eq('semester', semester);
    if (academicYear) query = query.eq('academic_year', academicYear);
    if (studentIds && studentIds.length > 0) {
      query = query.in('student_id', studentIds);
    }

    const { data: results, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!results || results.length === 0) {
      return res.json({
        success: true,
        message: 'No results found in database',
        resultsFound: 0,
        published: 0,
        smsSent: 0
      });
    }

    console.log(`Found ${results.length} results in database`);

    // Group results by student
    const studentGroups = results.reduce((acc, result) => {
      const studentId = result.students.id;
      if (!acc[studentId]) {
        acc[studentId] = { student: result.students, results: [] };
      }
      acc[studentId].results.push(result);
      return acc;
    }, {});

    let published = 0;
    let smsSent = 0;
    const errors = [];

    // Process each student
    for (const [studentId, { student, results: studentResults }] of Object.entries(studentGroups)) {
      try {
        // Check if results need to be published
        const unpublishedResults = studentResults.filter(r => r.status !== 'published');
        
        if (unpublishedResults.length > 0) {
          // Publish results
          const { error: publishError } = await supabase
            .from('results')
            .update({ 
              status: 'published',
              published_at: new Date().toISOString()
            })
            .in('id', unpublishedResults.map(r => r.id));

          if (publishError) {
            console.error(`Failed to publish results for ${student.first_name}:`, publishError);
            errors.push(`Failed to publish results for ${student.first_name}`);
            continue;
          }

          published += unpublishedResults.length;
          console.log(`Published ${unpublishedResults.length} results for ${student.first_name}`);
        }

        // Send SMS notification
        const phoneNumber = formatPhone(student.phone);
        if (!phoneNumber) {
          errors.push(`Invalid phone number for ${student.first_name}`);
          continue;
        }

        const summary = calculateSummary(studentResults);
        const resultDetails = formatResultsForSMS(studentResults);
        
        // Create SMS message
        const smsMessage = `Hello ${student.first_name},

Your ${studentResults[0].academic_year} ${studentResults[0].semester} results:

${resultDetails}

Summary: ${summary.totalCourses} courses, ${summary.totalUnits} units, GPA: ${summary.gpa}

Moshood Abiola Polytechnic`;

        const smsResult = await sendSMS(phoneNumber, smsMessage);

        if (smsResult.success) {
          smsSent++;
          console.log(`SMS sent to ${student.first_name} ${student.last_name}`);
          
          // Store notification record
          await supabase.from('notifications').insert({
            student_id: studentId,
            title: 'Results Published',
            message: `Your ${studentResults[0].academic_year} ${studentResults[0].semester} results: ${summary.totalCourses} courses, GPA: ${summary.gpa}`,
            type: 'result_published',
            status: 'sent',
            sent_at: new Date().toISOString()
          });
        } else {
          errors.push(`SMS failed for ${student.first_name}: ${smsResult.error}`);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing ${student.first_name}:`, error);
        errors.push(`Error processing ${student.first_name}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Processed ${Object.keys(studentGroups).length} students`,
      resultsFound: results.length,
      published,
      smsSent,
      studentsProcessed: Object.keys(studentGroups).length,
      errors
    });

  } catch (error) {
    console.error('Service error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      resultsFound: 0,
      published: 0,
      smsSent: 0
    });
  }
});

// Quick result check endpoint
app.get('/check-results', async (req, res) => {
  try {
    const { semester, academicYear, studentId } = req.query;

    let query = supabase
      .from('results')
      .select('id, status, semester, academic_year, student_id, students(first_name, last_name)');

    if (semester) query = query.eq('semester', semester);
    if (academicYear) query = query.eq('academic_year', academicYear);
    if (studentId) query = query.eq('student_id', studentId);

    const { data: results, error } = await query;

    if (error) throw new Error(error.message);

    const summary = {
      total: results?.length || 0,
      published: results?.filter(r => r.status === 'published').length || 0,
      unpublished: results?.filter(r => r.status !== 'published').length || 0
    };

    res.json({ success: true, summary, results: results || [] });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test SMS endpoint
app.post('/test-sms', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Phone and message required' });
    }

    const phoneNumber = formatPhone(phone);
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    const testMessage = `Test: ${message} - Moshood Abiola Polytechnic`;
    const result = await sendSMS(phoneNumber, testMessage);

    res.json(result);

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'EduNotify Optimized SMS Service',
    features: ['Database check', 'Auto-publish', 'SMS notifications']
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// CHANGE: Export app instead of listening
module.exports = serverless(app);

// Remove or comment out the app.listen() code:
// app.listen(PORT, () => {
//   console.log(`EduNotify SMS Service running on port ${PORT}`);
//   console.log(`Health check: http://localhost:${PORT}/api/health`);
//   console.log(`Main endpoint: POST /api/notify-results`);
// });