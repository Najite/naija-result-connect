import React, { useState, useCallback, useMemo } from 'react';
import { 
  Bell, 
  Send, 
  MessageSquare, 
  Users, 
  BookOpen, 
  GraduationCap,
  Eye,
  Trash2,
  Filter,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail
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

// Types
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

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'result' | 'enrollment' | 'announcement';
  status: 'sent' | 'pending' | 'failed';
  student_id: string | null;
  created_at: string;
  sent_at: string | null;
  student?: Student;
}

interface NotificationCenterProps {
  students?: Student[];
  notifications?: Notification[];
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
}

interface CustomNotificationForm {
  title: string;
  message: string;
  selectedStudents: string[];
  notificationType: 'general' | 'result' | 'enrollment' | 'announcement';
}

const INITIAL_BULK_FORM: BulkNotificationForm = {
  title: '',
  message: '',
  department: '',
  level: '',
  targetType: 'all'
};

const INITIAL_CUSTOM_FORM: CustomNotificationForm = {
  title: '',
  message: '',
  selectedStudents: [],
  notificationType: 'general'
};

// Individual Notification Card Component
const NotificationCard: React.FC<{
  notification: Notification;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ notification, onView, onDelete }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'result': return <GraduationCap className="h-4 w-4" />;
      case 'enrollment': return <BookOpen className="h-4 w-4" />;
      case 'announcement': return <Bell className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(notification.type)}
            <CardTitle className="text-sm font-medium">
              {notification.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(notification.status)}
            <Badge variant={notification.status === 'sent' ? 'default' : 'secondary'}>
              {notification.status}
            </Badge>
          </div>
        </div>
        {notification.student && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <User className="h-3 w-3" />
            {notification.student.first_name} {notification.student.last_name} 
            ({notification.student.student_id})
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {notification.message}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            {formatDate(notification.created_at)}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(notification.id)}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(notification.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Notification Center Component
const NotificationCenter: React.FC<NotificationCenterProps> = ({
  students = [],
  notifications = [],
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
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (filterType !== 'all' && notification.type !== filterType) return false;
      if (filterStatus !== 'all' && notification.status !== filterStatus) return false;
      return true;
    });
  }, [notifications, filterType, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = notifications.length;
    const sent = notifications.filter(n => n.status === 'sent').length;
    const pending = notifications.filter(n => n.status === 'pending').length;
    const failed = notifications.filter(n => n.status === 'failed').length;
    
    return { total, sent, pending, failed };
  }, [notifications]);

  const handleBulkNotification = useCallback(async () => {
    if (!bulkForm.title.trim() || !bulkForm.message.trim()) {
      alert('Please provide both title and message.');
      return;
    }

    try {
      const filters: { department?: string; level?: string; status?: string } = { status: 'active' };
      
      if (bulkForm.targetType === 'department' && bulkForm.department) {
        filters.department = bulkForm.department;
      } else if (bulkForm.targetType === 'level' && bulkForm.level) {
        filters.level = bulkForm.level;
      } else if (bulkForm.targetType === 'custom' && bulkForm.department && bulkForm.level) {
        filters.department = bulkForm.department;
        filters.level = bulkForm.level;
      }

      await onSendBulkNotification(bulkForm.title, bulkForm.message, filters);
      setBulkNotificationOpen(false);
      setBulkForm(INITIAL_BULK_FORM);
    } catch (error) {
      console.error('Error sending bulk notification:', error);
    }
  }, [bulkForm, onSendBulkNotification]);

  const handleCustomNotification = useCallback(async () => {
    if (!customForm.title.trim() || !customForm.message.trim()) {
      alert('Please provide both title and message.');
      return;
    }

    if (customForm.selectedStudents.length === 0) {
      alert('Please select at least one student.');
      return;
    }

    try {
      await onSendCustomNotification(
        customForm.selectedStudents,
        customForm.title,
        customForm.message,
        customForm.notificationType
      );
      
      setCustomNotificationOpen(false);
      setCustomForm(INITIAL_CUSTOM_FORM);
      setSelectedStudents([]);
    } catch (error) {
      console.error('Error sending custom notification:', error);
    }
  }, [customForm, onSendCustomNotification]);

  const handleStudentSelection = useCallback((studentId: string, checked: boolean) => {
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
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Center</h2>
          <p className="text-gray-600">Manage and send notifications to students</p>
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
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-2xl font-bold">{stats.sent}</p>
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
                <p className="text-2xl font-bold">{stats.pending}</p>
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
                <p className="text-2xl font-bold">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send">Send Notifications</TabsTrigger>
          <TabsTrigger value="history">Notification History</TabsTrigger>
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkNotificationOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkNotification} disabled={bulkNotificationLoading}>
                        {bulkNotificationLoading ? 'Sending...' : 'Send Notification'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={onSendTestNotification}
                  disabled={notificationLoading}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Test Notification
                </Button>

                <Dialog open={customNotificationOpen} onOpenChange={setCustomNotificationOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Custom Notification
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
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
                      
                      <div>
                        <Label htmlFor="notificationType">Type</Label>
                        <Select 
                          value={customForm.notificationType} 
                          onValueChange={(value: CustomNotificationForm['notificationType']) => 
                            setCustomForm(prev => ({ ...prev, notificationType: value }))
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

                      <div>
                        <Label>Select Students</Label>
                        {students.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                            {students.slice(0, 10).map(student => (
                              <div key={student.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={student.id}
                                  checked={selectedStudents.includes(student.id)}
                                  onCheckedChange={(checked) => 
                                    handleStudentSelection(student.id, checked as boolean)
                                  }
                                />
                                <Label htmlFor={student.id} className="text-sm">
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCustomNotificationOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCustomNotification} disabled={notificationLoading}>
                        {notificationLoading ? 'Sending...' : 'Send Notification'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div>
                  <Label htmlFor="filterType">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="result">Result</SelectItem>
                      <SelectItem value="enrollment">Enrollment</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="filterStatus">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotifications.map(notification => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onView={(id) => console.log('View notification:', id)}
                onDelete={(id) => console.log('Delete notification:', id)}
              />
            ))}
          </div>

          {filteredNotifications.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                <p className="text-gray-600">
                  {filterType !== 'all' || filterStatus !== 'all' 
                    ? 'Try adjusting your filters to see more notifications.'
                    : 'Start by sending your first notification to students.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationCenter;