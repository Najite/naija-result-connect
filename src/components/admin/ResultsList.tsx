import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, BookOpen, Clock, CheckCircle, AlertCircle, User, TrendingUp } from 'lucide-react';

interface Course {
  id: string;
  course_code: string;
  course_title: string;
  credit_units: number;
  department: string;
  level: string;
  semester: string;
}

interface Result {
  id: string;
  academic_year: string;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  grade: string | null;
  grade_point: number | null;
  semester: string;
  status: string;
  published_at: string | null;
  student: {
    first_name: string;
    last_name: string;
    student_id: string;
  };
  course: Course;
}

interface StudentResults {
  student: {
    first_name: string;
    last_name: string;
    student_id: string;
  };
  results: Result[];
  totalCourses: number;
  publishedCount: number;
  pendingCount: number;
  averageScore: number;
  totalCreditUnits: number;
  gpa: number;
}

const GRADE_COLORS = {
  'A': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'B': 'bg-blue-100 text-blue-800 border-blue-200',
  'C': 'bg-amber-100 text-amber-800 border-amber-200',
  'D': 'bg-orange-100 text-orange-800 border-orange-200',
  'E': 'bg-red-100 text-red-800 border-red-200',
  'F': 'bg-red-200 text-red-900 border-red-300'
};

const ResultsList: React.FC<{ results: Result[] }> = ({ results }) => {
  const groupedResults = React.useMemo(() => {
    if (!results || !Array.isArray(results)) {
      return [];
    }
    
    const grouped = results.reduce((acc, result) => {
      const key = result.student.student_id;
      
      if (!acc[key]) {
        acc[key] = {
          student: result.student,
          results: [],
          totalCourses: 0,
          publishedCount: 0,
          pendingCount: 0,
          averageScore: 0,
          totalCreditUnits: 0,
          gpa: 0
        };
      }
      
      acc[key].results.push(result);
      return acc;
    }, {} as Record<string, StudentResults>);

    // Calculate statistics
    Object.values(grouped).forEach(data => {
      data.totalCourses = data.results.length;
      data.publishedCount = data.results.filter(r => r.published_at).length;
      data.pendingCount = data.totalCourses - data.publishedCount;
      
      const validScores = data.results
        .map(r => r.total_score || (r.ca_score || 0) + (r.exam_score || 0))
        .filter(score => score > 0);
      
      data.averageScore = validScores.length > 0 
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
        : 0;
      
      data.totalCreditUnits = data.results.reduce((sum, r) => sum + r.course.credit_units, 0);
      
      const validGrades = data.results.filter(r => r.grade_point !== null);
      if (validGrades.length > 0) {
        const totalWeighted = validGrades.reduce((sum, r) => sum + (r.grade_point! * r.course.credit_units), 0);
        const totalCredits = validGrades.reduce((sum, r) => sum + r.course.credit_units, 0);
        data.gpa = totalCredits > 0 ? totalWeighted / totalCredits : 0;
      }
    });

    return Object.values(grouped);
  }, [results]);

  const getGradeColor = (grade: string | null) => 
    grade ? GRADE_COLORS[grade as keyof typeof GRADE_COLORS] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';

  const getStatusColor = (published: boolean) => 
    published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200';

  const formatScore = (score: number | null) => score?.toFixed(1) || 'N/A';

  if (!results || results.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-gray-400" />
          </div>
          <CardTitle className="text-xl text-gray-900">No Results Found</CardTitle>
          <CardDescription className="text-gray-600">
            No student results are available at this time.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalPublished = results?.filter(r => r.published_at).length || 0;
  const totalPending = (results?.length || 0) - totalPublished;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Summary Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-gray-900">Academic Results Dashboard</CardTitle>
              <CardDescription className="text-gray-600">
                Comprehensive view of student academic performance
              </CardDescription>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { icon: User, label: 'Students', value: groupedResults.length, color: 'blue' },
              { icon: BookOpen, label: 'Total Results', value: results?.length || 0, color: 'green' },
              { icon: CheckCircle, label: 'Published', value: totalPublished, color: 'emerald' },
              { icon: Clock, label: 'Pending', value: totalPending, color: 'amber' }
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/50">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                  <span className="text-sm font-medium text-gray-600">{label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>
      
      {/* Student Results */}
      <div className="space-y-6">
        {groupedResults.map((studentData) => (
          <Card key={studentData.student.student_id} className="overflow-hidden shadow-lg">
            {/* Student Header */}
            <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50 border-b">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-900">
                      {studentData.student.first_name} {studentData.student.last_name}
                    </CardTitle>
                    <CardDescription>
                      ID: {studentData.student.student_id} • {studentData.totalCreditUnits} Credit Units
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 flex items-center gap-1">
                      <TrendingUp className="w-5 h-5" />
                      {studentData.averageScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Average Score</div>
                  </div>
                  {studentData.gpa > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-600">
                        {studentData.gpa.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">GPA</div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Statistics */}
            <div className="bg-gray-50/50 px-6 py-4 border-b">
              <div className="grid grid-cols-3 gap-6">
                {[
                  { icon: BookOpen, label: 'Total Courses', value: studentData.totalCourses, color: 'gray' },
                  { icon: CheckCircle, label: 'Published', value: studentData.publishedCount, color: 'green' },
                  { icon: AlertCircle, label: 'Pending', value: studentData.pendingCount, color: 'amber' }
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 text-${color}-600`} />
                      <span className="text-sm font-medium text-gray-600">{label}</span>
                    </div>
                    <div className={`text-xl font-bold text-${color}-600`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Results */}
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-gray-700" />
                <h4 className="font-semibold text-gray-900 text-lg">Course Results</h4>
              </div>
              
              <div className="grid gap-4">
                {studentData.results
                  .sort((a, b) => {
                    const semesterCompare = (a.semester || '').localeCompare(b.semester || '');
                    return semesterCompare !== 0 ? semesterCompare : 
                           (a.course.course_code || '').localeCompare(b.course.course_code || '');
                  })
                  .map((result) => (
                    <div key={result.id} className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        {/* Course Info */}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-lg">
                            {result.course.course_code}
                          </div>
                          <div className="text-gray-700 font-medium">
                            {result.course.course_title}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>{result.semester} - {result.academic_year}</span>
                            <span>{result.course.credit_units} Units</span>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {result.course.department}
                            </span>
                          </div>
                        </div>
                        
                        {/* Scores and Grade */}
                        <div className="flex flex-col md:flex-row gap-4 md:items-center">
                          <div className="flex gap-3 text-sm">
                            {result.ca_score !== null && (
                              <div className="text-center bg-blue-50 px-3 py-2 rounded-lg">
                                <div className="font-semibold text-blue-900">{formatScore(result.ca_score)}</div>
                                <div className="text-xs text-blue-600">CA</div>
                              </div>
                            )}
                            {result.exam_score !== null && (
                              <div className="text-center bg-green-50 px-3 py-2 rounded-lg">
                                <div className="font-semibold text-green-900">{formatScore(result.exam_score)}</div>
                                <div className="text-xs text-green-600">Exam</div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900">
                                {formatScore(result.total_score || (result.ca_score || 0) + (result.exam_score || 0))}%
                              </div>
                              <div className="text-xs text-gray-600">Total</div>
                            </div>
                            <Badge className={`${getGradeColor(result.grade)} border font-semibold px-3 py-1`}>
                              {result.grade || 'N/A'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status */}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t">
                        <Badge variant="outline" className={`${getStatusColor(!!result.published_at)} border`}>
                          {result.published_at ? (
                            <><CheckCircle className="w-3 h-3 mr-1" />Published</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" />Pending</>
                          )}
                        </Badge>
                        
                        {result.grade_point !== null && (
                          <div className="text-sm text-gray-600">
                            Grade Point: <span className="font-semibold">{result.grade_point.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ResultsList;