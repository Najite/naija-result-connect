import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Phone,
  Users,
  BarChart3,
  Filter,
  Search
} from 'lucide-react';
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

interface SMSProgress {
  current: number;
  total: number;
  student: string;
}

const SMSManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [smsRecords, setSmsRecords] = useState<SMSRecord[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<SMSProgress | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [testSMSOpen, setTestSMSOpen] = useState(false);
  const [bulkSMSOpen, setBulkSMSOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test SMS from EduNotify system.');
  const [statistics, setStatistics] = useState<any>(null);

  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadStudents();
    loadSMSRecords();
    loadStatistics();
  }, []);

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'Active')
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive"
      });
    }
  };

  const loadSMSRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_records')
        .select(`
          *,
          students!inner(first_name, last_name, student_id)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSmsRecords(data || []);
    } catch (error) {
      console.error('Error loading SMS records:', error);
      toast({
        title: "Error",
        description: "Failed to load SMS records",
        variant: "destructive"
      });
    }
  };

  const loadStatistics = async () => {
    const stats = await SMSService.getSMSStatistics();
    setStatistics(stats);
  };

  const handleTestSMS = async () => {
    if (!testPhone || !testMessage) {
      toast({
        title: "Missing Information",
        description: "Please provide both phone number and message",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await SMSService.sendSMS(
        SMSService.formatPhoneNumber(testPhone) || testPhone,
        testMessage
      );

      if (result.success) {
        toast({
          title: "Test SMS Sent",
          description: `SMS sent successfully to ${testPhone}`,
        });
        setTestSMSOpen(false);
        setTestPhone('');
        setTestMessage('This is a test SMS from EduNotify system.');
      } else {
        toast({
          title: "Test SMS Failed",
          description: result.error || "Failed to send test SMS",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while sending test SMS",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSMS = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student",
        variant: "destructive"
      });
      return;
    }

    if (!smsMessage.trim()) {
      toast({
        title: "Missing Message",
        description: "Please provide a message to send",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: selectedStudents.length, student: '' });

    try {
      const targetStudents = students.filter(s => selectedStudents.includes(s.id));
      
      const result = await SMSService.sendBulkSMS(
        targetStudents,
        smsMessage,
        (progressData) => setProgress(progressData)
      );

      toast({
        title: "Bulk SMS Complete",
        description: `Sent ${result.sent} SMS, ${result.failed} failed out of ${result.total} total`,
        variant: result.failed > 0 ? "destructive" : "default"
      });

      setBulkSMSOpen(false);
      setSmsMessage('');
      setSelectedStudents([]);
      loadSMSRecords();
      loadStatistics();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send bulk SMS",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleRetrySMS = async (recordId: string) => {
    setLoading(true);
    try {
      const result = await SMSService.retrySMS(recordId);
      
      if (result.success) {
        toast({
          title: "SMS Retry Successful",
          description: "SMS has been resent successfully",
        });
        loadSMSRecords();
        loadStatistics();
      } else {
        toast({
          title: "SMS Retry Failed",
          description: result.error || "Failed to retry SMS",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while retrying SMS",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryAllFailed = async () => {
    setLoading(true);
    try {
      const failedRecords = await SMSService.getFailedSMSRecords();
      
      if (failedRecords.length === 0) {
        toast({
          title: "No Failed SMS",
          description: "No failed SMS records found to retry",
        });
        return;
      }

      let successful = 0;
      let failed = 0;

      for (const record of failedRecords) {
        const result = await SMSService.retrySMS(record.id);
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast({
        title: "Retry Complete",
        description: `Retried ${failedRecords.length} SMS: ${successful} successful, ${failed} failed`,
        variant: failed > 0 ? "destructive" : "default"
      });

      loadSMSRecords();
      loadStatistics();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry failed SMS",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'retry':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'retry':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = smsRecords.filter(record => {
    const matchesSearch = 
      record.students?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.students?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.students?.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.phone_number.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SMS Management</h2>
          <p className="text-gray-600">Manage SMS notifications and track delivery status</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={testSMSOpen} onOpenChange={setTestSMSOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Test SMS
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Test SMS</DialogTitle>
                <DialogDescription>
                  Send a test SMS to verify your configuration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="testPhone">Phone Number</Label>
                  <Input
                    id="testPhone"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+234 XXX XXX XXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="testMessage">Message</Label>
                  <Textarea
                    id="testMessage"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTestSMSOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTestSMS} disabled={loading}>
                  {loading ? 'Sending...' : 'Send Test SMS'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkSMSOpen} onOpenChange={setBulkSMSOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send Bulk SMS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Bulk SMS</DialogTitle>
                <DialogDescription>
                  Send SMS to multiple students at once
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="smsMessage">Message</Label>
                  <Textarea
                    id="smsMessage"
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={4}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {smsMessage.length}/160 characters
                  </p>
                </div>
                
                <div>
                  <Label>Select Students ({selectedStudents.length} selected)</Label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                    {students.slice(0, 20).map(student => (
                      <div key={student.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={student.id}
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudents(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={student.id} className="text-sm cursor-pointer">
                          {student.first_name} {student.last_name} ({student.student_id}) - {student.phone}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStudents(students.map(s => s.id))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStudents([])}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sending SMS...</span>
                      <span>{progress.current}/{progress.total}</span>
                    </div>
                    <Progress value={(progress.current / progress.total) * 100} />
                    <p className="text-sm text-gray-600">
                      Current: {progress.student}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkSMSOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleBulkSMS} disabled={loading || selectedStudents.length === 0}>
                  {loading ? 'Sending...' : `Send to ${selectedStudents.length} Students`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={handleRetryAllFailed}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry All Failed
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total SMS</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Sent</p>
                  <p className="text-2xl font-bold">{statistics.sent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold">{statistics.failed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">{statistics.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Retry</p>
                  <p className="text-2xl font-bold">{statistics.retry}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SMS Records */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Records</CardTitle>
          <CardDescription>
            Track all SMS notifications sent to students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by student name, ID, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="retry">Retry</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadSMSRecords}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last Attempt</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {record.students?.first_name} {record.students?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {record.students?.student_id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{record.phone_number}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={record.message}>
                        {record.message}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <Badge className={getStatusColor(record.status)} variant="secondary">
                          {record.status}
                        </Badge>
                      </div>
                      {record.error_message && (
                        <p className="text-xs text-red-600 mt-1" title={record.error_message}>
                          {record.error_message.substring(0, 50)}...
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{record.attempts}</TableCell>
                    <TableCell>
                      {new Date(record.last_attempt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      {record.status === 'failed' && record.attempts < 3 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetrySMS(record.id)}
                          disabled={loading}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No SMS Records Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No SMS messages have been sent yet.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SMSManagement;