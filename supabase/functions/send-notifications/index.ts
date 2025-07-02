
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'result_published' | 'custom';
  studentIds?: string[];
  message?: string;
  title?: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function sendSMS(phoneNumber: string, message: string): Promise<any> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !twilioPhone) {
    throw new Error('Twilio credentials not configured');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const body = new URLSearchParams({
    From: twilioPhone,
    To: phoneNumber,
    Body: message,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Twilio error:', error);
    throw new Error(`Failed to send SMS: ${error}`);
  }

  return await response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, studentIds, message, title }: NotificationRequest = await req.json();

    console.log('Processing notification request:', { type, studentIds: studentIds?.length });

    let students: Student[] = [];
    let notificationTitle = title || 'New Notification';
    let notificationMessage = message || 'You have a new notification from Moshood Abiola Polytechnic.';

    if (type === 'result_published') {
      // Get all students for result publication
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'Active');

      if (studentsError) {
        throw new Error(`Failed to fetch students: ${studentsError.message}`);
      }

      students = allStudents || [];
      notificationTitle = 'New Results Available';
      notificationMessage = 'Your latest exam results have been published! Log in to EduNotify to view your results.';
    } else if (studentIds && studentIds.length > 0) {
      // Get specific students
      const { data: specificStudents, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .in('id', studentIds);

      if (studentsError) {
        throw new Error(`Failed to fetch specific students: ${studentsError.message}`);
      }

      students = specificStudents || [];
    }

    console.log(`Sending notifications to ${students.length} students`);

    const results = {
      total: students.length,
      emailsSent: 0,
      smsSent: 0,
      errors: [] as string[],
    };

    // Process notifications for each student
    for (const student of students) {
      try {
        // Create notification record
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            student_id: student.id,
            title: notificationTitle,
            message: notificationMessage,
            type: type,
            status: 'pending'
          });

        if (notificationError) {
          console.error('Failed to create notification record:', notificationError);
          results.errors.push(`Failed to create notification for ${student.first_name} ${student.last_name}`);
          continue;
        }

        // Send SMS
        try {
          const smsMessage = `${notificationTitle}\n\n${notificationMessage}\n\nMoshood Abiola Polytechnic`;
          await sendSMS(student.phone, smsMessage);
          results.smsSent++;
          console.log(`SMS sent to ${student.first_name} ${student.last_name}`);
        } catch (smsError) {
          console.error(`SMS failed for ${student.first_name} ${student.last_name}:`, smsError);
          results.errors.push(`SMS failed for ${student.first_name} ${student.last_name}`);
        }

        // Email will be handled by frontend EmailJS
        results.emailsSent++;

      } catch (error) {
        console.error(`Error processing student ${student.first_name} ${student.last_name}:`, error);
        results.errors.push(`Error processing ${student.first_name} ${student.last_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('Notification results:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
      message: `Notifications processed for ${students.length} students`
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in send-notifications function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
