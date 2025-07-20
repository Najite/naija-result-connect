import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
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
import AddStudentDialog from '@/components/admin/AddCourseDialog';
import AddResultDialog from '@/components/admin/AddResultDialog';
import AddCourseDialog from '@/components/admin/AddCourseDialog';
import AdminHeader from '@/components/admin/AdminHeader';
import QuickStats from '@/components/admin/QuickStats';
import DepartmentChart from '@/components/admin/DepartmentChart';
import StudentList from '@/components/admin/StudentList';
import ResultsList from '@/components/admin/ResultsList';
import CoursesList from '@/components/admin/CourseList';
import NotificationCenter from '@/components/admin/NotificationCenter';
import FeedbackTab from '@/components/admin/FeedbackTab';
import { NotificationService } from '@/services/notificationService';
import { useAdminData } from '@/hooks/useAdminData';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageSquare, Users, BookOpen, GraduationCap } from 'lucide-react';

interface StudentFull {
  cgpa: number | null;
  created_at: string;
  department: string;
  email: string;
  first_name: string;
  id: string;
  last_name: string;
  level: string;
  phone: string;
  status: string;
  student_id: string;
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

const AdminDashboard: React.FC = () => {
  const { admin, logout } = useAuth();
  const { toast } = useToast();
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkNotificationOpen, setBulkNotificationOpen] = useState(false);
  const [customNotificationOpen, setCustomNotificationOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkNotificationForm>(INITIAL_BULK_FORM);
  const [customForm, setCustomForm] = useState<CustomNotificationForm>(INITIAL_CUSTOM_FORM);

  const {
    students,
    results,
    courses,
    loading,
    refetchData
  } = useAdminData();

  const fullStudents = useMemo(() => students as StudentFull[], [students]);
  
  const departments = useMemo(() => 
    [...new Set(students.map(s => s.department))].sort(), 
    [students]
  );
  
  const levels = useMemo(() => 
    [...new Set(students.map(s => s.level))].sort(), 
    [students]
  );

  const {
    notificationLoading,
    bulkNotificationLoading,
    publishAllResults,
    sendTestNotification,
    sendCustomNotification,
    sendBulkNotification,
    sendEnrollmentConfirmations
  } = useNotifications(students, refetchData);

  const validateNotificationForm = useCallback((title: string, message: string): boolean => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both title and message.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  }, [toast]);

  // Simplified publish results - direct action
  const handlePublishResults = useCallback(async () => {
    try {
      // Show loading toast
      toast({
        title: "Publishing Results",
        description: "Publishing results and sending notifications...",
      });
  
      // Call the correct method from NotificationService
      const result = await NotificationService.publishAndNotifyResults();
      
      if (!result.success) {
        throw new Error('Failed to publish results and send notifications');
      }
  
      // Show success toast
      toast({
        title: "Success",
        description: `Results published! Notifications sent to ${result.studentsNotified} students (${result.emailsSent} emails sent)`,
      });
  
      // Refresh data
      refetchData();
  
    } catch (err) {
      console.error("Error during result publishing:", err);
      
      // Show error toast
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An unexpected error occurred during result publishing.",
        variant: "destructive",
      });
    }
  }, [toast, refetchData]);

  
  const handleBulkNotification = useCallback(async () => {
    if (!validateNotificationForm(bulkForm.title, bulkForm.message)) {
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

      await sendBulkNotification(bulkForm.title, bulkForm.message, filters);
      setBulkNotificationOpen(false);
      setBulkForm(INITIAL_BULK_FORM);
      
      toast({
        title: "Success",
        description: "Bulk notification sent successfully"
      });
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      toast({
        title: "Error",
        description: "Failed to send bulk notification",
        variant: "destructive"
      });
    }
  }, [bulkForm, sendBulkNotification, validateNotificationForm, toast]);

  const handleCustomNotification = useCallback(async () => {
    if (!validateNotificationForm(customForm.title, customForm.message)) {
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
      await sendCustomNotification(
        customForm.selectedStudents,
        customForm.title,
        customForm.message,
        customForm.notificationType
      );
      
      setCustomNotificationOpen(false);
      setCustomForm(INITIAL_CUSTOM_FORM);
      setSelectedStudents([]);
      
      toast({
        title: "Success",
        description: "Custom notification sent successfully"
      });
    } catch (error) {
      console.error('Error sending custom notification:', error);
      toast({
        title: "Error",
        description: "Failed to send custom notification",
        variant: "destructive"
      });
    }
  }, [customForm, sendCustomNotification, validateNotificationForm, toast]);

  const handlePublishResult = useCallback(async (resultId: string) => {
    try {
      const { error } = await supabase
        .from('results')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString() 
        })
        .eq('id', resultId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Result published successfully"
      });
      
      refetchData();
    } catch (error) {
      console.error('Error publishing result:', error);
      toast({
        title: "Error",
        description: "Failed to publish result",
        variant: "destructive"
      });
    }
  }, [refetchData, toast]);

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

  const handleSendEnrollmentConfirmations = useCallback(async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select students to send enrollment confirmations.",
        variant: "destructive"
      });
      return;
    }

    try {
      await sendEnrollmentConfirmations(selectedStudents);
      setSelectedStudents([]);
      
      toast({
        title: "Success",
        description: "Enrollment confirmations sent successfully"
      });
    } catch (error) {
      console.error('Error sending enrollment confirmations:', error);
      toast({
        title: "Error",
        description: "Failed to send enrollment confirmations",
        variant: "destructive"
      });
    }
  }, [selectedStudents, sendEnrollmentConfirmations, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
      <AdminHeader admin={admin} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <QuickStats students={fullStudents} results={results} courses={courses} />
            <DepartmentChart students={students} />
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Direct Publish Results Button */}
                <Button 
                  onClick={handlePublishResults}
                  disabled={notificationLoading}
                  className="flex items-center gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  {notificationLoading ? 'Publishing...' : 'Publish Results'}
                </Button>

                {/* Bulk Notification Dialog */}
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
                              {departments.map(dept => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))}
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
                              {levels.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
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
                  onClick={() => sendTestNotification(3)}
                  disabled={notificationLoading}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Test Notification
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSendEnrollmentConfirmations}
                  disabled={notificationLoading || selectedStudents.length === 0}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Send Enrollments ({selectedStudents.length})
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Students Management</h2>
                <p className="text-gray-600">Manage student records and information</p>
              </div>
              <div className="flex gap-2">
                <AddStudentDialog onStudentAdded={refetchData} />
                {selectedStudents.length > 0 && (
                  <Dialog open={customNotificationOpen} onOpenChange={setCustomNotificationOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Notify Selected ({selectedStudents.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Custom Notification</DialogTitle>
                        <DialogDescription>
                          Send notification to {selectedStudents.length} selected students.
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
                )}
              </div>
            </div>
            <StudentList 
              students={students} 
              selectedStudents={selectedStudents}
              onStudentSelect={handleStudentSelection}
              allowSelection={true}
            />
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Courses Management</h2>
                <p className="text-gray-600">Manage course catalog and curriculum</p>
              </div>
              <AddCourseDialog onCourseAdded={refetchData} />
            </div>
            <CoursesList courses={courses} />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Results Management</h2>
                <p className="text-gray-600">Add, manage and publish student results</p>
              </div>
              <AddResultDialog students={students} onResultAdded={refetchData} />
            </div>
            <ResultsList 
              results={results} 
              students={students}
              courses={courses}
              onViewResult={(resultId) => {
                console.log('View result:', resultId);
              }}
              onEditResult={(resultId) => {
                console.log('Edit result:', resultId);
              }}
              onPublishResult={handlePublishResult}
            />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationCenter
              students={students}
              onPublishResults={handlePublishResults}
              onSendTestNotification={() => sendTestNotification(5)}
              onSendBulkNotification={sendBulkNotification}
              onSendCustomNotification={sendCustomNotification}
              notificationLoading={notificationLoading}
              bulkNotificationLoading={bulkNotificationLoading}
              departments={departments}
              levels={levels}
            />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <FeedbackTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;