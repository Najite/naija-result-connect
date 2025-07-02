import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, BookOpen, Users, Clock, X } from 'lucide-react';

interface Course {
  id: string;
  course_code: string;
  course_title: string;
  credit_units: number;
  department: string;
  level: string;
  semester: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface CoursesListProps {
  courses: Course[];
}

const CoursesList: React.FC<CoursesListProps> = ({ courses = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  // Get unique values for filters
  const departments = [...new Set(courses.map(course => course.department))].sort();
  const levels = [...new Set(courses.map(course => course.level))].sort();
  const semesters = [...new Set(courses.map(course => course.semester))].sort();

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDepartment = !filterDepartment || filterDepartment === 'all' || course.department === filterDepartment;
    const matchesLevel = !filterLevel || filterLevel === 'all' || course.level === filterLevel;
    const matchesSemester = !filterSemester || filterSemester === 'all' || course.semester === filterSemester;

    return matchesSearch && matchesDepartment && matchesLevel && matchesSemester;
  });

  const activeCoursesCount = courses.filter(course => course.is_active).length;
  const totalCreditUnits = courses.reduce((sum, course) => sum + course.credit_units, 0);

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterDepartment('');
    setFilterLevel('');
    setFilterSemester('');
  };

  const hasActiveFilters = searchTerm || (filterDepartment && filterDepartment !== 'all') || (filterLevel && filterLevel !== 'all') || (filterSemester && filterSemester !== 'all');

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                <p className="text-sm text-gray-600">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeCoursesCount}</p>
                <p className="text-sm text-gray-600">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCreditUnits}</p>
                <p className="text-sm text-gray-600">Total Credit Units</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Department Filter */}
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
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

            {/* Level Filter */}
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
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

            {/* Semester Filter */}
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger>
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map((semester) => (
                  <SelectItem key={semester} value={semester}>
                    {semester}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">
                Showing {filteredCourses.length} of {courses.length} courses
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>
            {filteredCourses.length === 0 
              ? 'No courses found matching your criteria'
              : `${filteredCourses.length} course(s) found`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No courses found
                </h3>
                <p className="text-gray-600 mb-6">
                  {courses.length === 0 
                    ? 'Get started by adding your first course.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearAllFilters} variant="outline">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              filteredCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Course Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {course.course_code}
                          </h3>
                          <p className="text-gray-600 font-medium">
                            {course.course_title}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={course.is_active ? "default" : "secondary"}
                            className={course.is_active ? "bg-green-100 text-green-800" : ""}
                          >
                            {course.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">
                            {course.credit_units} Unit{course.credit_units !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>

                      {/* Course Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium">Department:</span>
                          <span className="ml-2">{course.department}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium">Level:</span>
                          <span className="ml-2">{course.level}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium">Semester:</span>
                          <span className="ml-2">{course.semester}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {course.description && (
                        <div className="pt-2 border-t">
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {course.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoursesList;