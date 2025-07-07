import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Users, GraduationCap } from 'lucide-react';
import { Tables } from '@/types/database';

interface EnhancedStudentListProps {
  students: Tables<'students'>[];
  loading?: boolean;
}

const EnhancedStudentList: React.FC<EnhancedStudentListProps> = ({ 
  students, 
  loading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get unique departments and levels from students
  const { departments, levels } = useMemo(() => {
    const depts = [...new Set(students.map(s => s.department))].sort();
    const lvls = [...new Set(students.map(s => s.level))].sort();
    return { departments: depts, levels: lvls };
  }, [students]);

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = searchTerm === '' || 
        student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = departmentFilter === 'all' || 
        student.department === departmentFilter;

      const matchesLevel = levelFilter === 'all' || 
        student.level === levelFilter;

      const matchesStatus = statusFilter === 'all' || 
        student.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesLevel && matchesStatus;
    });
  }, [students, searchTerm, departmentFilter, levelFilter, statusFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setLevelFilter('all');
    setStatusFilter('all');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'graduated':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-600" />
            <CardTitle>Students ({filteredStudents.length})</CardTitle>
          </div>
          <div className="text-sm text-gray-500">
            Total: {students.length} students
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, student ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={searchTerm === '' && departmentFilter === 'all' && levelFilter === 'all' && statusFilter === 'all'}
            >
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {levels.map((level) => (
                    <SelectItem key={level} value={level}>
                      Level {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Students Table */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || departmentFilter !== 'all' || levelFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding a new student.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matric No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.student_id}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.phone}
                      </div>
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.department}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {student.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {student.cgpa ? (
                        <span className="font-mono">
                          {student.cgpa.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(student.status)}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(student.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedStudentList;