import { supabase } from '@/integrations/supabase/client';

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
  updated_at: string;
}

interface SMSResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
}

interface BulkSMSResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    student_id: string;
    student_name: string;
    phone: string;
    success: boolean;
    error?: string;
    sid?: string;
  }>;
}

export class SMSService {
  private static readonly API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://api.sendchamp.com/api/v1'
    : 'https://api.sendchamp.com/api/v1';
  
  private static readonly SENDER_NAME = 'MAPOLY';
  private static readonly MAX_RETRIES = 3;

  // Format phone number for Nigeria
  static formatPhoneNumber(phone: string): string | null {
    if (!phone) return null;
    
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      return '234' + cleaned.substring(1);
    }
    if (cleaned.startsWith('+234')) {
      return cleaned.substring(1);
    }
    if (!cleaned.startsWith('234')) {
      return '234' + cleaned;
    }
    
    // Validate Nigerian mobile number
    if (cleaned.length === 13 && ['7', '8', '9'].includes(cleaned.charAt(3))) {
      return cleaned;
    }
    
    return null;
  }

  // Send single SMS
  static async sendSMS(phoneNumber: string, message: string): Promise<SMSResult> {
    try {
      const apiKey = import.meta.env.VITE_SENDCHAMP_API_KEY;
      
      if (!apiKey) {
        throw new Error('SendChamp API key not configured');
      }

      const response = await fetch(`${this.API_BASE_URL}/sms/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          to: [phoneNumber],
          message: message,
          sender_name: this.SENDER_NAME,
          route: 'dnd'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        sid: result.data?.id || result.id,
        status: result.data?.status || 'sent'
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create SMS record in database
  static async createSMSRecord(
    studentId: string,
    phoneNumber: string,
    message: string,
    status: 'pending' | 'sent' | 'failed' = 'pending',
    sid?: string,
    errorMessage?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('sms_records')
        .insert([{
          student_id: studentId,
          phone_number: phoneNumber,
          message: message,
          status: status,
          attempts: 1,
          last_attempt: new Date().toISOString(),
          sid: sid,
          error_message: errorMessage
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating SMS record:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating SMS record:', error);
      return null;
    }
  }

  // Update SMS record
  static async updateSMSRecord(
    recordId: string,
    status: 'sent' | 'failed' | 'retry',
    sid?: string,
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sms_records')
        .update({
          status: status,
          last_attempt: new Date().toISOString(),
          attempts: supabase.rpc('increment_attempts', { record_id: recordId }),
          sid: sid,
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating SMS record:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating SMS record:', error);
      return false;
    }
  }

  // Send SMS to student with record keeping
  static async sendSMSToStudent(
    studentId: string,
    phoneNumber: string,
    message: string,
    recordId?: string
  ): Promise<{ success: boolean; recordId?: string; error?: string }> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone) {
      const error = 'Invalid phone number format';
      if (recordId) {
        await this.updateSMSRecord(recordId, 'failed', undefined, error);
      }
      return { success: false, error };
    }

    // Create record if not exists
    let currentRecordId = recordId;
    if (!currentRecordId) {
      currentRecordId = await this.createSMSRecord(studentId, formattedPhone, message, 'pending');
    }

    // Send SMS
    const smsResult = await this.sendSMS(formattedPhone, message);

    // Update record
    if (currentRecordId) {
      await this.updateSMSRecord(
        currentRecordId,
        smsResult.success ? 'sent' : 'failed',
        smsResult.sid,
        smsResult.error
      );
    }

    return {
      success: smsResult.success,
      recordId: currentRecordId || undefined,
      error: smsResult.error
    };
  }

  // Send bulk SMS to multiple students
  static async sendBulkSMS(
    students: Array<{
      id: string;
      first_name: string;
      last_name: string;
      phone: string;
    }>,
    message: string,
    onProgress?: (progress: { current: number; total: number; student: string }) => void
  ): Promise<BulkSMSResult> {
    const results: BulkSMSResult['results'] = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const studentName = `${student.first_name} ${student.last_name}`;

      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: students.length,
          student: studentName
        });
      }

      try {
        const result = await this.sendSMSToStudent(
          student.id,
          student.phone,
          message
        );

        if (result.success) {
          sent++;
          results.push({
            student_id: student.id,
            student_name: studentName,
            phone: student.phone,
            success: true,
            sid: result.recordId
          });
        } else {
          failed++;
          results.push({
            student_id: student.id,
            student_name: studentName,
            phone: student.phone,
            success: false,
            error: result.error
          });
        }

        // Rate limiting - wait 1 second between SMS
        if (i < students.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        failed++;
        results.push({
          student_id: student.id,
          student_name: studentName,
          phone: student.phone,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      total: students.length,
      sent,
      failed,
      results
    };
  }

  // Get SMS records for a student
  static async getStudentSMSRecords(studentId: string): Promise<SMSRecord[]> {
    try {
      const { data, error } = await supabase
        .from('sms_records')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching SMS records:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching SMS records:', error);
      return [];
    }
  }

  // Get all failed SMS records
  static async getFailedSMSRecords(): Promise<SMSRecord[]> {
    try {
      const { data, error } = await supabase
        .from('sms_records')
        .select(`
          *,
          students!inner(first_name, last_name, student_id)
        `)
        .eq('status', 'failed')
        .lt('attempts', this.MAX_RETRIES)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching failed SMS records:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching failed SMS records:', error);
      return [];
    }
  }

  // Retry failed SMS
  static async retrySMS(recordId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the SMS record
      const { data: record, error: fetchError } = await supabase
        .from('sms_records')
        .select(`
          *,
          students!inner(id, first_name, last_name)
        `)
        .eq('id', recordId)
        .single();

      if (fetchError || !record) {
        return { success: false, error: 'SMS record not found' };
      }

      if (record.attempts >= this.MAX_RETRIES) {
        return { success: false, error: 'Maximum retry attempts reached' };
      }

      // Update status to retry
      await this.updateSMSRecord(recordId, 'retry');

      // Attempt to send SMS again
      const result = await this.sendSMSToStudent(
        record.student_id,
        record.phone_number,
        record.message,
        recordId
      );

      return result;
    } catch (error) {
      console.error('Error retrying SMS:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Retry all failed SMS for a student
  static async retryAllFailedSMS(studentId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const failedRecords = await this.getStudentSMSRecords(studentId);
    const retryableRecords = failedRecords.filter(
      record => record.status === 'failed' && record.attempts < this.MAX_RETRIES
    );

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const record of retryableRecords) {
      const result = await this.retrySMS(record.id);
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

    return {
      total: retryableRecords.length,
      successful,
      failed,
      errors
    };
  }

  // Get SMS statistics
  static async getSMSStatistics(dateFrom?: string, dateTo?: string) {
    try {
      let query = supabase
        .from('sms_records')
        .select('status, created_at');

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching SMS statistics:', error);
        return null;
      }

      const stats = {
        total: data?.length || 0,
        sent: data?.filter(r => r.status === 'sent').length || 0,
        failed: data?.filter(r => r.status === 'failed').length || 0,
        pending: data?.filter(r => r.status === 'pending').length || 0,
        retry: data?.filter(r => r.status === 'retry').length || 0
      };

      return stats;
    } catch (error) {
      console.error('Error calculating SMS statistics:', error);
      return null;
    }
  }
}