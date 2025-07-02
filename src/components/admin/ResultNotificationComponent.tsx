import React, { useState } from 'react';
import { Send, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

// EmailJS configuration - replace with your actual values
const EMAILJS_CONFIG = {
  serviceId: 'your_service_id',
  templateId: 'your_template_id',
  publicKey: 'your_public_key'
};

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  department: string;
  level: string;
}

interface Course {
  id: string;
  course_code: string;
  course_title: string;
  department: string;
  level: string;
  semester: string;
}

interface Result {
  id: string;
  student_id: string;
  course_id: string;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  grade: string | null;
  grade_point: number | null;
  semester: string;
  academic_year: string;
  status: 'draft' | 'published';
  published_at: string | null;
}

interface ResultNotificationProps {
  students: Student[];
  courses: Course[];
  results: Result[];
  onNotificationSent?: (studentIds: string[], resultIds: string[]) => void;
}

interface NotificationTemplate {
  subject: string;
  message: string;
}

const ResultNotificationComponent: React.FC<ResultNotificationProps> = ({
  students,
  courses,
  results,
  onNotificationSent
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [notificationMode, setNotificationMode] = useState<'individual' | 'bulk'>('individual');
  const [filterBy, setFilterBy] = useState<'department' | 'level' | 'semester' | 'custom'>('custom');
  const [filterValue, setFilterValue] = useState('');
  const [template, setTemplate] = useState<NotificationTemplate>({
    subject: 'Your Academic Results Are Now Available',
    message: `Dear {{student_name}},

We are pleased to inform you that your academic results for {{semester}} {{academic_year}} are now available.

Course Details:
{{course_details}}

Result Summary:
{{result_summary}}

Please log into your student portal to view your complete results.

If you have any questions or concerns about your results, please don't hesitate to contact the academic office.

Best regards,
Academic Affairs Office`
  });

  // Get published results only
  const publishedResults = results.filter(result => result.status === 'published');

  // Get unique values for filters
  const departments = [...new Set(students.map(s => s.department))].sort();
  const levels = [...new Set(students.map(s => s.level))].sort();
  const semesters = [...new Set(publishedResults.map(r => r.semester))].sort();

  // Filter students based on selected criteria
  const getFilteredStudents = () => {
    let filtered = students;
    
    if (filterBy === 'department' && filterValue) {
      filtered = filtered.filter(s => s.department === filterValue);
    } else if (filterBy === 'level' && filterValue) {
      filtered = filtered.filter(s => s.level === filterValue);
    } else if (filterBy === 'semester' && filterValue) {
      // Get students who have results in the selected semester
      const studentIdsWithResults = publishedResults
        .filter(r => r.semester === filterValue)
        .map(r => r.student_id);
      filtered = filtered.filter(s => studentIdsWithResults.includes(s.id));
    }
    
    return filtered;
  };

  // Get results for selected students
  const getStudentResults = (studentId: string) => {
    return publishedResults
      .filter(result => result.student_id === studentId)
      .filter(result => selectedResults.length === 0 || selectedResults.includes(result.id));
  };

  // Format result data for email template
  const formatResultsForEmail = (studentResults: Result[], studentData: Student) => {
    const courseDetails = studentResults.map(result => {
      const course = courses.find(c => c.id === result.course_id);
      return `- ${course?.course_code || 'N/A'}: ${course?.course_title || 'N/A'}`;
    }).join('\n');

    const resultSummary = studentResults.map(result => {
      const course = courses.find(c => c.id === result.course_id);
      return `- ${course?.course_code || 'N/A'}: ${result.total_score || 0}/100 (Grade: ${result.grade || 'N/A'})`;
    }).join('\n');

    return template.message
      .replace(/{{student_name}}/g, `${studentData.first_name} ${studentData.last_name}`)
      .replace(/{{semester}}/g, studentResults[0]?.semester || '')
      .replace(/{{academic_year}}/g, studentResults[0]?.academic_year || '')
      .replace(/{{course_details}}/g, courseDetails)
      .replace(/{{result_summary}}/g, resultSummary);
  };

  // Send email using EmailJS
  const sendEmailNotification = async (student: Student, formattedMessage: string) => {
    try {
      // Import EmailJS dynamically to avoid SSR issues
      const emailjs = (await import('@emailjs/browser')).default;
      
      const templateParams = {
        to_email: student.email,
        to_name: `${student.first_name} ${student.last_name}`,
        student_id: student.student_id,
        subject: template.subject,
        message: formattedMessage,
        from_name: 'Academic Affairs Office'
      };

      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        templateParams,
        EMAILJS_CONFIG.publicKey
      );

      return { success: true, student: student };
    } catch (error) {
      console.error(`Failed to send email to ${student.email}:`, error);
      return { success: false, student: student, error };
    }
  };

  // Handle sending notifications
  const handleSendNotifications = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student to send notifications to.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const results = [];
    const targetStudents = students.filter(s => selectedStudents.includes(s.id));

    try {
      for (const student of targetStudents) {
        const studentResults = getStudentResults(student.id);
        
        if (studentResults.length === 0) {
          results.push({
            success: false,
            student,
            error: 'No published results found for this student'
          });
          continue;
        }

        const formattedMessage = formatResultsForEmail(studentResults, student);
        const result = await sendEmailNotification(student, formattedMessage);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: "Notifications Sent",
          description: `Successfully sent ${successCount} notification(s). ${failureCount > 0 ? `${failureCount} failed.` : ''}`,
          variant: successCount === results.length ? "default" : "destructive"
        });

        // Callback to parent component
        if (onNotificationSent) {
          const sentStudentIds = results.filter(r => r.success).map(r => r.student.id);
          const sentResultIds = selectedResults.length > 0 
            ? selectedResults 
            : publishedResults.filter(r => sentStudentIds.includes(r.student_id)).map(r => r.id);
          onNotificationSent(sentStudentIds, sentResultIds);
        }

        // Reset form
        setSelectedStudents([]);
        setSelectedResults([]);
        setIsOpen(false);
      } else {
        toast({
          title: "Failed to Send Notifications",
          description: "All notification attempts failed. Please check your EmailJS configuration.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending notifications.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle student selection
  const handleStudentSelection = (studentId: string, checked: boolean) => {
    setSelectedStudents(prev => 
      checked 
        ? [...prev, studentId]
        : prev.filter(id => id !== studentId)
    );
  };

  // Handle bulk selection
  const handleBulkSelection = () => {
    const filteredStudents = getFilteredStudents();
    const allSelected = filteredStudents.every(s => selectedStudents.includes(s.id));
    
    if (allSelected) {
      // Deselect all filtered students
      setSelectedStudents(prev => prev.filter(id => !filteredStudents.some(s => s.id === id)));
    } else {
      // Select all filtered students
      const newSelections = filteredStudents.map(s => s.id);
      setSelectedStudents(prev => [...new Set([...prev, ...newSelections])]);
    }
  };

  const filteredStudents = getFilteredStudents();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Send Result Notifications
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Result Notifications
          </DialogTitle>
          <DialogDescription>
            Send email notifications to students about their published results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filter Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filterBy">Filter Students By</Label>
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Selection</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="level">Level</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterBy !== 'custom' && (
              <div>
                <Label htmlFor="filterValue">
                  {filterBy === 'department' ? 'Department' : 
                   filterBy === 'level' ? 'Level' : 'Semester'}
                </Label>
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${filterBy}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterBy === 'department' && departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                    {filterBy === 'level' && levels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                    {filterBy === 'semester' && semesters.map(semester => (
                      <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Email Template Section */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Email Template</h4>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={template.subject}
                onChange={(e) => setTemplate(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="message">Message Template</Label>
              <Textarea
                id="message"
                value={template.message}
                onChange={(e) => setTemplate(prev => ({ ...prev, message: e.target.value }))}
                rows={8}
                placeholder="Email message template"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available placeholders: {{student_name}}, {{semester}}, {{academic_year}}, {{course_details}}, {{result_summary}}
              </p>
            </div>
          </div>

          {/* Student Selection */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                Select Students ({selectedStudents.length} selected)
              </h4>
              {filteredStudents.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkSelection}
                >
                  {filteredStudents.every(s => selectedStudents.includes(s.id)) ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-md p-4">
              {filteredStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No students match the current filter criteria.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map(student => {
                    const studentResults = getStudentResults(student.id);
                    const hasResults = studentResults.length > 0;
                    
                    return (
                      <div key={student.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) => handleStudentSelection(student.id, checked as boolean)}
                          disabled={!hasResults}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {student.first_name} {student.last_name}
                            </p>
                            {hasResults ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {student.student_id} | {student.email} | {student.department}
                          </p>
                          <p className="text-xs text-gray-400">
                            {hasResults ? `${studentResults.length} result(s) available` : 'No published results'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-gray-500">
              {selectedStudents.length} student(s) selected for notification
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendNotifications} 
                disabled={isLoading || selectedStudents.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Notifications
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResultNotificationComponent;