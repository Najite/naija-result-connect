// import React, { useState } from 'react';
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
// import { Plus, Loader2 } from 'lucide-react';
// import { supabase } from '@/integrations/supabase/client';
// import { TablesInsert } from '@/integrations/supabase/types';
// interface AddStudentDialogProps {
//   onStudentAdded: () => void;
// }

// const AddStudentDialog: React.FC<AddStudentDialogProps> = ({ onStudentAdded }) => {
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
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

//   const levels = ['100', '200', '300', '400', '500'];

//   const handleInputChange = (field: keyof typeof formData, value: string) => {
//     setFormData((prev) => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//   const validateForm = () => {
//     const required = ['student_id', 'first_name', 'last_name', 'email', 'phone', 'department', 'level'];
//     return required.every((field) => formData[field as keyof typeof formData]?.trim());
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!validateForm()) {
//       alert('Please fill in all required fields');
//       return;
//     }

//     // Basic email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(formData.email)) {
//       alert('Please enter a valid email address');
//       return;
//     }

//     setLoading(true);

//     try {
//       const { data, error } = await supabase
//         .from('students')
//         .insert([formData])
//         .select();

//       if (error) {
//         console.error('Error adding student:', error);
//         if (error.code === '23505') {
//           alert('A student with this ID or email already exists');
//         } else {
//           alert('Failed to add student. Please try again.');
//         }
//         return;
//       }

//       console.log('Student added successfully:', data);
//       onStudentAdded();
//       setOpen(false);
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
//     } catch (error) {
//       console.error('Unexpected error:', error);
//       alert('An unexpected error occurred. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button className="bg-green-600 hover:bg-green-700">
//           <Plus className="w-4 h-4 mr-2" />
//           Add Student
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
//         <DialogHeader>
//           <DialogTitle>Add New Student</DialogTitle>
//           <DialogDescription>
//             Fill in the student information below. All fields are required.
//           </DialogDescription>
//         </DialogHeader>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div className="grid grid-cols-2 gap-4">
//             <div className="space-y-2">
//               <Label htmlFor="student_id">Student ID</Label>
//               <Input
//                 id="student_id"
//                 placeholder="e.g., STU2024001"
//                 value={formData.student_id}
//                 onChange={(e) => handleInputChange('student_id', e.target.value)}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="level">Level</Label>
//               <Select
//                 value={formData.level}
//                 onValueChange={(value) => handleInputChange('level', value)}
//                 required
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select level" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {levels.map((level) => (
//                     <SelectItem key={level} value={level}>
//                       {level} Level
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <div className="space-y-2">
//               <Label htmlFor="first_name">First Name</Label>
//               <Input
//                 id="first_name"
//                 placeholder="Enter first name"
//                 value={formData.first_name}
//                 onChange={(e) => handleInputChange('first_name', e.target.value)}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="last_name">Last Name</Label>
//               <Input
//                 id="last_name"
//                 placeholder="Enter last name"
//                 value={formData.last_name}
//                 onChange={(e) => handleInputChange('last_name', e.target.value)}
//                 required
//               />
//             </div>
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="email">Email Address</Label>
//             <Input
//               id="email"
//               type="email"
//               placeholder="student@example.com"
//               value={formData.email}
//               onChange={(e) => handleInputChange('email', e.target.value)}
//               required
//             />
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="phone">Phone Number</Label>
//             <Input
//               id="phone"
//               placeholder="Enter phone number"
//               value={formData.phone}
//               onChange={(e) => handleInputChange('phone', e.target.value)}
//               required
//             />
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="department">Department</Label>
//             <Select
//               value={formData.department}
//               onValueChange={(value) => handleInputChange('department', value)}
//               required
//             >
//               <SelectTrigger>
//                 <SelectValue placeholder="Select department" />
//               </SelectTrigger>
//               <SelectContent>
//                 {departments.map((dept) => (
//                   <SelectItem key={dept} value={dept}>
//                     {dept}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           <DialogFooter>
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => setOpen(false)}
//               disabled={loading}
//             >
//               Cancel
//             </Button>
//             <Button type="submit" disabled={loading || !validateForm()}>
//               {loading ? (
//                 <>
//                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                   Adding...
//                 </>
//               ) : (
//                 'Add Student'
//               )}
//             </Button>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default AddStudentDialog;