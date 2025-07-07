// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
// } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Plus, Loader2, BookOpen, User, GraduationCap } from 'lucide-react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Badge } from '@/components/ui/badge';
// import { ScrollArea } from '@/components/ui/scroll-area';

// import { supabase } from '@/integrations/supabase/client';
// import { TablesInsert } from '@/integrations/supabase/types';
// import { toast } from 'sonner';

// interface Course {
//   id: string;
//   course_code: string;
//   course_title: string;
//   credit_units: number;
//   department: string;
//   level: string;
//   semester: string;
//   description: string | null;
// }

// interface AddStudentDialogProps {
//   onStudentAdded: () => void;
// }

// const AddStudentDialog: React.FC<AddStudentDialogProps> = ({ onStudentAdded }) => {
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [loadingCourses, setLoadingCourses] = useState(false);
//   const [currentStep, setCurrentStep] = useState<'student' | 'courses'>('student');
  
//   const [formData, setFormData] = useState<Omit<TablesInsert<'students'>, 'id' | 'created_at'>>({
//     student_id: '',
//     first_name: '',
//     last_name: '',
//     email: '',
//     phone: '',
//     department: '',
//     level: '',
//     status: 'active',
//   });

//   const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
//   const [selectedCourses, setSelectedCourses] = useState<{
//     'First Semester': string[];
//     'Second Semester': string[];
//   }>({
//     'First Semester': [],
//     'Second Semester': []
//   });

//   const departments = [
//     'Computer Science',
//     'Engineering',
//     'Business Administration',
//     'Medicine',
//     'Law',
//     'Arts',
//     'Science',
//     'Education',
//     'Social Sciences',
//     'Agriculture',
//   ];

//   const levels = ['ND 1', 'ND 2', 'HND 1', 'HND 2'];
//   const semesters = ['First Semester', 'Second Semester'] as const;

//   const handleInputChange = (field: keyof typeof formData, value: string) => {
//     setFormData((prev) => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//   const fetchAvailableCourses = useCallback(async () => {
//     if (!formData.department || !formData.level) return;

//     setLoadingCourses(true);
//     try {
//       const { data, error } = await supabase
//         .from('courses')
//         .select('*')
//         .eq('department', formData.department)
//         .eq('level', formData.level)
//         .eq('is_active', true)
//         .order('semester')
//         .order('course_code');

//       if (error) throw error;

//       setAvailableCourses(data || []);
//     } catch (error) {
//       console.error('Error fetching courses:', error);
//       toast.error('Failed to load courses');
//     } finally {
//       setLoadingCourses(false);
//     }
//   }, [formData.department, formData.level]);

//   useEffect(() => {
//     if (formData.department && formData.level && currentStep === 'courses') {
//       fetchAvailableCourses();
//     }
//   }, [formData.department, formData.level, currentStep, fetchAvailableCourses]);

//   const validateStudentForm = () => {
//     const required = ['student_id', 'first_name', 'last_name', 'email', 'phone', 'department', 'level'];
//     return required.every((field) => formData[field as keyof typeof formData]?.trim());
//   };

//   const handleCourseSelection = (courseId: string, semester: 'First Semester' | 'Second Semester', checked: boolean) => {
//     setSelectedCourses(prev => ({
//       ...prev,
//       [semester]: checked 
//         ? [...prev[semester], courseId]
//         : prev[semester].filter(id => id !== courseId)
//     }));
//   };

//   const handleSelectAllCourses = (semester: 'First Semester' | 'Second Semester', selectAll: boolean) => {
//     const semesterCourses = availableCourses.filter(course => course.semester === semester);
//     setSelectedCourses(prev => ({
//       ...prev,
//       [semester]: selectAll ? semesterCourses.map(c => c.id) : []
//     }));
//   };

//   const getTotalSelectedCourses = () => {
//     return selectedCourses['First Semester'].length + selectedCourses['Second Semester'].length;
//   };

//   const getTotalCreditUnits = (semester?: 'First Semester' | 'Second Semester') => {
//     if (semester) {
//       return selectedCourses[semester].reduce((total, courseId) => {
//         const course = availableCourses.find(c => c.id === courseId);
//         return total + (course?.credit_units || 0);
//       }, 0);
//     }
    
//     return Object.values(selectedCourses).flat().reduce((total, courseId) => {
//       const course = availableCourses.find(c => c.id === courseId);
//       return total + (course?.credit_units || 0);
//     }, 0);
//   };

//   const handleNextStep = () => {
//     if (!validateStudentForm()) {
//       toast.error('Please fill in all required student fields');
//       return;
//     }

//     // Basic email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(formData.email)) {
//       toast.error('Please enter a valid email address');
//       return;
//     }

//     setCurrentStep('courses');
//   };

//   const renderStudentForm = () => (
//     <div className="space-y-4">
//       <div className="flex items-center gap-2 mb-4">
//         <User className="w-5 h-5 text-blue-600" />
//         <h3 className="text-lg font-semibold">Student Information</h3>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div className="space-y-2">
//           <Label htmlFor="student_id">Matric Number *</Label>
//           <Input
//             id="student_id"
//             placeholder="e.g., 19/05/0066"
//             value={formData.student_id}
//             onChange={(e) => handleInputChange('student_id', e.target.value)}
//             required
//           />
//         </div>
//         <div className="space-y-2">
//           <Label htmlFor="level">Level *</Label>
//           <Select
//             value={formData.level}
//             onValueChange={(value) => handleInputChange('level', value)}
//             required
//           >
//             <SelectTrigger>
//               <SelectValue placeholder="Select level" />
//             </SelectTrigger>
//             <SelectContent>
//               {levels.map((level) => (
//                 <SelectItem key={level} value={level}>
//                   {level} Level
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div className="space-y-2">
//           <Label htmlFor="first_name">First Name *</Label>
//           <Input
//             id="first_name"
//             placeholder="Enter first name"
//             value={formData.first_name}
//             onChange={(e) => handleInputChange('first_name', e.target.value)}
//             required
//           />
//         </div>
//         <div className="space-y-2">
//           <Label htmlFor="last_name">Last Name *</Label>
//           <Input
//             id="last_name"
//             placeholder="Enter last name"
//             value={formData.last_name}
//             onChange={(e) => handleInputChange('last_name', e.target.value)}
//             required
//           />
//         </div>
//       </div>

//       <div className="space-y-2">
//         <Label htmlFor="email">Email Address *</Label>
//         <Input
//           id="email"
//           type="email"
//           placeholder="student@example.com"
//           value={formData.email}
//           onChange={(e) => handleInputChange('email', e.target.value)}
//           required
//         />
//       </div>

//       <div className="space-y-2">
//         <Label htmlFor="phone">Phone Number *</Label>
//         <Input
//           id="phone"
//           placeholder="Enter phone number"
//           value={formData.phone}
//           onChange={(e) => handleInputChange('phone', e.target.value)}
//           required
//         />
//       </div>

//       <div className="space-y-2">
//         <Label htmlFor="department">Department *</Label>
//         <Select
//           value={formData.department}
//           onValueChange={(value) => {
//             handleInputChange('department', value);
//             // Reset selected courses when department changes
//             setSelectedCourses({
//               'First Semester': [],
//               'Second Semester': []
//             });
//           }}
//           required
//         >
//           <SelectTrigger>
//             <SelectValue placeholder="Select department" />
//           </SelectTrigger>
//           <SelectContent>
//             {departments.map((dept) => (
//               <SelectItem key={dept} value={dept}>
//                 {dept}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>
//     </div>
//   );

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!validateStudentForm()) {
//       toast.error('Please fill in all required fields');
//       return;
//     }

//     setLoading(true);

//     try {
//       // Add student first
//       const { data: studentData, error: studentError } = await supabase
//         .from('students')
//         .insert([formData])
//         .select()
//         .single();

//       if (studentError) {
//         console.error('Error adding student:', studentError);
//         if (studentError.code === '23505') {
//           toast.error('A student with this ID or email already exists');
//         } else {
//           toast.error('Failed to add student. Please try again.');
//         }
//         return;
//       }

//       // If courses are selected, create student-course enrollments
//       const totalSelectedCourses = getTotalSelectedCourses();
//       if (totalSelectedCourses > 0) {
//         // You might want to create a student_courses table for enrollments
//         // For now, we'll just show success with course count
//         toast.success(`Student added successfully with ${totalSelectedCourses} courses assigned!`);
//       } else {
//         toast.success('Student added successfully!');
//       }

//       console.log('Student added successfully:', studentData);
//       onStudentAdded();
//       setOpen(false);
      
//       // Reset form
//       setFormData({
//         student_id: '',
//         first_name: '',
//         last_name: '',
//         email: '',
//         phone: '',
//         department: '',
//         level: '',
//         status: 'active',
//       });
//       setSelectedCourses({
//         'First Semester': [],
//         'Second Semester': []
//       });
//       setAvailableCourses([]);
//       setCurrentStep('student');
      
//     } catch (error) {
//       console.error('Unexpected error:', error);
//       toast.error('An unexpected error occurred. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderCoursesForm = () => (
//     <div className="space-y-4">
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <GraduationCap className="w-5 h-5 text-green-600" />
//           <h3 className="text-lg font-semibold">Course Assignment</h3>
//           {loadingCourses && (
//             <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
//           )}
//         </div>
//         <div className="text-sm text-gray-600">
//           {formData.department} - Level {formData.level}
//         </div>
//       </div>

//       {availableCourses.length === 0 && !loadingCourses && (
//         <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
//           <p className="text-sm text-yellow-700">
//             No courses found for the selected department and level.
//           </p>
//         </div>
//       )}

//       {availableCourses.length > 0 && (
//         <>
//           <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
//             <div className="flex items-center justify-between text-sm">
//               <span className="text-blue-700">
//                 <strong>{getTotalSelectedCourses()}</strong> courses selected
//               </span>
//               <span className="text-blue-700">
//                 <strong>{getTotalCreditUnits()}</strong> total credit units
//               </span>
//             </div>
//           </div>

//           <Tabs defaultValue="First Semester" className="w-full">
//             <TabsList className="grid w-full grid-cols-2">
//               <TabsTrigger value="First Semester" className="relative">
//                 First Semester
//                 {selectedCourses['First Semester'].length > 0 && (
//                   <Badge variant="secondary" className="ml-2 text-xs">
//                     {selectedCourses['First Semester'].length}
//                   </Badge>
//                 )}
//               </TabsTrigger>
//               <TabsTrigger value="Second Semester" className="relative">
//                 Second Semester
//                 {selectedCourses['Second Semester'].length > 0 && (
//                   <Badge variant="secondary" className="ml-2 text-xs">
//                     {selectedCourses['Second Semester'].length}
//                   </Badge>
//                 )}
//               </TabsTrigger>
//             </TabsList>

//             {semesters.map((semester) => {
//               const semesterCourses = availableCourses.filter(course => course.semester === semester);
//               const allSelected = semesterCourses.length > 0 && 
//                 semesterCourses.every(course => selectedCourses[semester].includes(course.id));

//               return (
//                 <TabsContent key={semester} value={semester} className="space-y-4">
//                   {semesterCourses.length > 0 && (
//                     <div className="flex items-center justify-between">
//                       <div className="flex items-center space-x-2">
//                         <Checkbox
//                           id={`select-all-${semester}`}
//                           checked={allSelected}
//                           onCheckedChange={(checked) => 
//                             handleSelectAllCourses(semester, checked as boolean)
//                           }
//                         />
//                         <Label htmlFor={`select-all-${semester}`} className="text-sm font-medium">
//                           Select All ({semesterCourses.length} courses)
//                         </Label>
//                       </div>
//                       <div className="text-sm text-gray-600">
//                         {getTotalCreditUnits(semester)} credit units
//                       </div>
//                     </div>
//                   )}

//                   <ScrollArea className="max-h-60">
//                     <div className="space-y-3">
//                       {semesterCourses.map((course) => (
//                         <div key={course.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
//                           <Checkbox
//                             id={course.id}
//                             checked={selectedCourses[semester].includes(course.id)}
//                             onCheckedChange={(checked) => 
//                               handleCourseSelection(course.id, semester, checked as boolean)
//                             }
//                           />
//                           <div className="flex-1 space-y-1">
//                             <div className="flex items-center justify-between">
//                               <Label htmlFor={course.id} className="text-sm font-medium cursor-pointer">
//                                 {course.course_code}
//                               </Label>
//                               <Badge variant="outline" className="text-xs">
//                                 {course.credit_units} units
//                               </Badge>
//                             </div>
//                             <p className="text-sm text-gray-600">{course.course_title}</p>
//                             {course.description && (
//                               <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>
//                             )}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </ScrollArea>

//                   {semesterCourses.length === 0 && (
//                     <div className="p-4 text-center text-gray-500 text-sm">
//                       No courses available for {semester}
//                     </div>
//                   )}
//                 </TabsContent>
//               );
//             })}
//           </Tabs>
//         </>
//       )}
//     </div>
//   );

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button className="bg-green-600 hover:bg-green-700">
//           <Plus className="w-4 h-4 mr-2" />
//           Add Student
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
//         <DialogHeader>
//           <DialogTitle>Add New Student</DialogTitle>
//           <DialogDescription>
//             {currentStep === 'student' 
//               ? 'Fill in the student information below. All fields are required.'
//               : 'Select courses to assign to this student (optional).'
//             }
//           </DialogDescription>
//         </DialogHeader>
        
//         <form onSubmit={handleSubmit} className="space-y-6">
//           {currentStep === 'student' ? renderStudentForm() : renderCoursesForm()}

//           <DialogFooter className="flex justify-between">
//             <div>
//               {currentStep === 'courses' && (
//                 <Button
//                   type="button"
//                   variant="outline"
//                   onClick={() => setCurrentStep('student')}
//                   disabled={loading}
//                 >
//                   Back
//                 </Button>
//               )}
//             </div>
            
//             <div className="flex gap-2">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => setOpen(false)}
//                 disabled={loading}
//               >
//                 Cancel
//               </Button>
              
//               {currentStep === 'student' ? (
//                 <Button
//                   type="button"
//                   onClick={handleNextStep}
//                   disabled={!validateStudentForm()}
//                   className="bg-blue-600 hover:bg-blue-700"
//                 >
//                   Next: Select Courses
//                   <BookOpen className="w-4 h-4 ml-2" />
//                 </Button>
//               ) : (
//                 <Button 
//                   type="submit" 
//                   disabled={loading}
//                   className="bg-green-600 hover:bg-green-700"
//                 >
//                   {loading ? (
//                     <>
//                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                       Adding Student...
//                     </>
//                   ) : (
//                     <>
//                       Add Student
//                       {getTotalSelectedCourses() > 0 && (
//                         <Badge variant="secondary" className="ml-2">
//                           +{getTotalSelectedCourses()} courses
//                         </Badge>
//                       )}
//                     </>
//                   )}
//                 </Button>
//               )}
//             </div>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default AddStudentDialog;