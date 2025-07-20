import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  MessageSquare, 
  Users, 
  BookOpen, 
  GraduationCap,
  Phone,
  Mail,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useSMSManagement } from '@/hooks/useSMSManagement';
import { useToast } from '@/hooks/use-toast';
import SMSManagement from './SMSManagement';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  level: string;
  status: string;
  phone: string;
}

interface EnhancedNotificationCenterProps {
  students?: Student[];
  onPublishResults?: () => void;
  onSendTestNotification?: () => void;
  onSendBulkNotification?: (title: string, message: string, filters: any) => Promise<void>;
  onSendCustomNotification?: (studentIds: string[], title: string, message: string, type: string) => Promise<void>;
  notificationLoading?: boolean;
  bulkNotificationLoading?: boolean;
  departments?: string[];
  levels?: string[];
}

interface BulkNotificationForm {
  title: string;
  message: string;
  department: string;
  level: string;
  targetType: 'all' | 'department' | 'level' | 'custom';
  notificationType: 'email' | 'sms' | 'both';
}

interface CustomNotificationForm {
  title: string;
  message: string;
  selectedStudents: string[];
  notificationType: 'email' | 'sms' | 'both';
  messageType: 'general' | 'result' | 'enrollment' | 'announcement';
}

const INITIAL_BULK_FORM: BulkNotificationForm = {
  title: '',
  message: '',
  department: '',
  level: '',
  targetType: 'all',
  notificationType: 'both'
};

const INITIAL_CUSTOM_FORM: CustomNotificationForm = {
  title: '',
  message: '',
  selectedStudents: [],
  notificationType: 'both',
  messageType: 'general'
};

const EnhancedNotificationCenter: React.FC<EnhancedNotificationCenterProps> = ({
  students = [],
  onPublishResults = () => console.log('Publish results'),
  onSendTestNotification = () => console.log('Send test notification'),
  onSendBulkNotification = async () => console.log('Send bulk notification'),
  onSendCustomNotification = async () => console.log('Send custom notification'),
  notificationLoading = false,
  bulkNotificationLoading = false,
  departments = [],
  levels = []
}) => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkNotificationOpen, setBulkNotificationOpen] = useState(false);
  const [customNotificationOpen, setCustomNotificationOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkNotificationForm>(INITIAL_BULK_FORM);
  const [customForm, setCustomForm] = useState<CustomNotificationForm>(INITIAL_CUSTOM_FORM);
  const [progress, setProgress] = useState<{ current: number; total: number; student: string } | null>(null);

  const { 
    sendBulkSMS, 
    sendSMSToStudent, 
    retrySMS, 
    testSMS,
    statistics,
    loading: smsLoading 
  } = useSMSManagement();
  
  const { toast } = useToast();

  const handleBulkNotification = async () => {
    if (!bulkForm.title.trim() || !bulkForm.message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both title and message.",
        variant: "destructive"
      });
      return;
    }

    try {
      const filters: { department?: string; level?: string; status?: string } = { status: 'Active' };
      
      if (bulkForm.targetType === 'department' && bulkForm.department) {
        filters.department = bulkForm.department;
      } else if (bulkForm.targetType === 'level' && bulkForm.level) {
        filters.level = bulkForm.level;
      } else if (bulkForm.targetType === 'custom' && bulkForm.department && bulkForm.level) {
        filters.department = bulkForm.department;
        filters.level = bulkForm.level;
      }

      // Filter students based on criteria
      const targetStudents = students.filter(student => {
        if (filters.department && student.department !== filters.department) return false;
        if (filters.level && student.level !== filters.level) return false;
        if (filters.status && student.status !== filters.status) return false;
        return true;
      });

      if (targetStudents.length === 0) {
        toast({
          title: "No Students Found",
          description: "No students match the specified criteria.",
          variant: "destructive"
        });
        return;
      }

      // Send notifications based on type
      if (bulkForm.notificationType === 'email' || bulkForm.notificationType === 'both') {
        await onSendBulkNotification(bulkForm.title, bulkForm.message, filters);
      }

      if (bulkForm.notificationType === 'sms' || bulkForm.notificationType === 'both') {
        const studentIds = targetStudents.map(s => s.id);
        await sendBulkSMS(studentIds, bulkForm.message, setProgress);
      }

      setBulkNotificationOpen(false);
      setBulkForm(INITIAL_BULK_FORM);
      setProgress(null);
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      toast({
        title: "Error",
        description: "Failed to send bulk notification",
        variant: "destructive"
      });
    }
  };

  const handleCustomNotification = async () => {
    if (!customForm.title.trim() || !customForm.message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both title and message.",
        variant: "destructive"
      });
      return;
    }

    if (customForm.selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Send notifications based on type
      if (customForm.notificationType === 'email' || customForm.notificationType === 'both') {
        await onSendCustomNotification(
          customForm.selectedStudents,
          customForm.title,
          customForm.message,
          customForm.messageType
        );
      }

      if (customForm.notificationType === 'sms' || customForm.notificationType === 'both') {
        await sendBulkSMS(customForm.selectedStudents, customForm.message, setProgress);
      }
      
      setCustomNotificationOpen(false);
      setCustomForm(INITIAL_CUSTOM_FORM);
      setSelectedStudents([]);
      setProgress(null);
    } catch (error) {
      console.error('Error sending custom notification:', error);
      toast({
        title: "Error",
        description: "Failed to send custom notification",
        variant: "destructive"
      });
    }
  };

  const handleStudentSelection = (studentId: string, checked: boolean) => {
    setSelectedStudents(prev => {
      if (checked) {
        return [...prev, studentId];
      } else {
        return prev.filter(id => id !== studentId);
      }
    });

    setCustomForm(prev => ({
      ...prev,
      selectedStudents: checked 
        ? [...prev.selectedStudents, studentId]
        : prev.selectedStudents.filter(id => id !== studentId)
    }));
  };

  const handleTestSMS = async () => {
    const testPhone = '+234 XXX XXX XXXX'; // You can make this configurable
    const testMessage = 'This is a test SMS from EduNotify system.';
    
    await testSMS(testPhone, testMessage);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Notification Center</h2>
          <p className="text-gray-600">Manage email and SMS notifications to students</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Notifications</p>
                <p className="text-2xl font-bold">{statistics?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Sent Successfully</p>
                <p className="text-2xl font-bold">{statistics?.sent || 0}</p>
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
                <p className="text-2xl font-bold">{statistics?.failed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{statistics?.successRate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send">Send Notifications</TabsTrigger>
          <TabsTrigger value="sms">SMS Management</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Send notifications and publish results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  onClick={onPublishResults}
                  disabled={notificationLoading}
                  className="flex items-center gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  Publish Results
                </Button>

                <Dialog open={bulkNotificationOpen} onOpenChange={setBulkNotificationOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2" disabled={bulkNotificationLoading}>
                      <Users className="h-4 w-4" />
                      Bulk Notification
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Send Bulk Notification</DialogTitle>
                      <DialogDescription>
                        Send notifications to multiple students at once.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={bulkForm.title}
                          onChange={(e) => setBulkForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Notification title"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={bulkForm.message}
                          onChange={(e) => setBulkForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Your message here..."
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label htmlFor="notificationType">Notification Type</Label>
                        <Select 
                          value={bulkForm.notificationType} 
                          onValueChange={(value: 'email' | 'sms' | 'both') => 
                            setBulkForm(prev => ({ ...prev, notificationType: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Email + SMS</SelectItem>
                            <SelectItem value="email">Email Only</SelectItem>
                            <SelectItem value="sms">SMS Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="targetType">Target</Label>
                        <Select 
                          value={bulkForm.targetType} 
                          onValueChange={(value: BulkNotificationForm['targetType']) => 
                            setBulkForm(prev => ({ ...prev, targetType: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Active Students</SelectItem>
                            <SelectItem value="department">By Department</SelectItem>
                            <SelectItem value="level">By Level</SelectItem>
                            <SelectItem value="custom">Department + Level</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {(bulkForm.targetType === 'department' || bulkForm.targetType === 'custom') && (
                        <div>
                          <Label htmlFor="department">Department</Label>
                          <Select 
                            value={bulkForm.department} 
                            onValueChange={(value) => 
                              setBulkForm(prev => ({ ...prev, department: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.length > 0 ? departments.map(dept => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              )) : (
                                <SelectItem value="" disabled>No departments available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {(bulkForm.targetType === 'level' || bulkForm.targetType === 'custom') && (
                        <div>
                          <Label htmlFor="level">Level</Label>
                          <Select 
                            value={bulkForm.level} 
                            onValueChange={(value) => 
                              setBulkForm(prev => ({ ...prev, level: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              {levels.length > 0 ? levels.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              )) : (
                                <SelectItem value="" disabled>No levels available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {progress && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Sending notifications...</span>
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
                      <Button variant="outline" onClick={() => setBulkNotificationOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkNotification} disabled={bulkNotificationLoading || smsLoading}>
                        {(bulkNotificationLoading || smsLoading) ? 'Sending...' : 'Send Notification'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={handleTestSMS}
                  disabled={notificationLoading || smsLoading}
                  className="flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Test SMS
                </Button>

                <Dialog open={customNotificationOpen} onOpenChange={setCustomNotificationOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Custom Notification
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Send Custom Notification</DialogTitle>
                      <DialogDescription>
                        Send notification to selected students.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="customTitle">Title</Label>
                        <Input
                          id="customTitle"
                          value={customForm.title}
                          onChange={(e) => setCustomForm(prev => ({ 
                            ...prev, 
                            title: e.target.value
                          }))}
                          placeholder="Notification title"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="customMessage">Message</Label>
                        <Textarea
                          id="customMessage"
                          value={customForm.message}
                          onChange={(e) => setCustomForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Your message here..."
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="customNotificationType">Notification Type</Label>
                          <Select 
                            value={customForm.notificationType} 
                            onValueChange={(value: 'email' | 'sms' | 'both') => 
                              setCustomForm(prev => ({ ...prev, notificationType: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="both">Email + SMS</SelectItem>
                              <SelectItem value="email">Email Only</SelectItem>
                              <SelectItem value="sms">SMS Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="messageType">Message Type</Label>
                          <Select 
                            value={customForm.messageType} 
                            onValueChange={(value: CustomNotificationForm['messageType']) => 
                              setCustomForm(prev => ({ ...prev, messageType: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="announcement">Announcement</SelectItem>
                              <SelectItem value="enrollment">Enrollment</SelectItem>
                              <SelectItem value="result">Result</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Select Students ({selectedStudents.length} selected)</Label>
                        {students.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                            {students.slice(0, 20).map(student => (
                              <div key={student.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={student.id}
                                  checked={selectedStudents.includes(student.id)}
                                  onCheckedChange={(checked) => 
                                    handleStudentSelection(student.id, checked as boolean)
                                  }
                                />
                                <Label htmlFor={student.id} className="text-sm cursor-pointer">
                                  {student.first_name} {student.last_name} ({student.student_id})
                                </Label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border rounded p-4 text-center text-gray-500">
                            No students available
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedStudents.length} students selected
                        </p>
                      </div>

                      {progress && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Sending notifications...</span>
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
                      <Button variant="outline" onClick={() => setCustomNotificationOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCustomNotification} disabled={notificationLoading || smsLoading}>
                        {(notificationLoading || smsLoading) ? 'Sending...' : 'Send Notification'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-6">
          <SMSManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedNotificationCenter;