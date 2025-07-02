
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Bell, User, BookOpen, TrendingUp, Search, Filter, Download, Eye } from "lucide-react";

const StudentDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data
  const studentInfo = {
    name: "John Doe",
    studentId: "2021/1/12345",
    department: "Computer Science",
    level: "300 Level",
    cgpa: 3.75,
    institution: "University of Lagos"
  };

  const results = [
    {
      id: 1,
      semester: "2023/2024 First Semester",
      course: "CSC 301",
      title: "Data Structures & Algorithms",
      score: 85,
      grade: "A",
      units: 3,
      date: "2024-01-15",
      status: "Published"
    },
    {
      id: 2,
      semester: "2023/2024 First Semester", 
      course: "CSC 302",
      title: "Operating Systems",
      score: 78,
      grade: "B+",
      units: 3,
      date: "2024-01-15",
      status: "Published"
    },
    {
      id: 3,
      semester: "2023/2024 First Semester",
      course: "CSC 303", 
      title: "Database Systems",
      score: 92,
      grade: "A",
      units: 3,
      date: "2024-01-15",
      status: "Published"
    },
    {
      id: 4,
      semester: "2023/2024 Second Semester",
      course: "CSC 304",
      title: "Software Engineering",
      score: 0,
      grade: "Pending",
      units: 3,
      date: "Pending",
      status: "Pending"
    }
  ];

  const performanceData = [
    { semester: "2021/2022 1st", gpa: 3.2, cgpa: 3.2 },
    { semester: "2021/2022 2nd", gpa: 3.5, cgpa: 3.35 },
    { semester: "2022/2023 1st", gpa: 3.8, cgpa: 3.5 },
    { semester: "2022/2023 2nd", gpa: 3.6, cgpa: 3.53 },
    { semester: "2023/2024 1st", gpa: 3.9, cgpa: 3.6 }
  ];

  const notifications = [
    {
      id: 1,
      title: "New Results Published",
      message: "Your CSC 301 result has been published",
      date: "2024-01-15",
      type: "result",
      read: false
    },
    {
      id: 2,
      title: "CGPA Update",
      message: "Your CGPA has been updated to 3.75",
      date: "2024-01-14",
      type: "update",
      read: true
    }
  ];

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-100 text-green-800";
      case "B+": return "bg-blue-100 text-blue-800";
      case "B": return "bg-yellow-100 text-yellow-800";
      case "C": return "bg-orange-100 text-orange-800";
      case "F": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredResults = results.filter(result =>
    result.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Student Portal</h1>
                <p className="text-sm text-gray-600">Welcome back, {studentInfo.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current CGPA</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{studentInfo.cgpa}</div>
                  <p className="text-xs text-muted-foreground">+0.15 from last semester</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Level</CardTitle>
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{studentInfo.level}</div>
                  <p className="text-xs text-muted-foreground">{studentInfo.department}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{results.length}</div>
                  <p className="text-xs text-muted-foreground">This semester</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Results</CardTitle>
                  <Bell className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {results.filter(r => r.status === "Pending").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Awaiting publication</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Academic Performance</CardTitle>
                  <CardDescription>GPA and CGPA trend over semesters</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semester" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 4]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="gpa" stroke="#22C55E" strokeWidth={2} />
                      <Line type="monotone" dataKey="cgpa" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Results</CardTitle>
                  <CardDescription>Your latest published results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {results.filter(r => r.status === "Published").slice(0, 3).map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{result.course}</p>
                        <p className="text-sm text-gray-600">{result.title}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getGradeColor(result.grade)}>
                          {result.grade}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">{result.score}%</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Academic Results</CardTitle>
                    <CardDescription>View all your published and pending results</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-6">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                <div className="space-y-4">
                  {filteredResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{result.course}</h3>
                            <Badge variant={result.status === "Published" ? "default" : "secondary"}>
                              {result.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-1">{result.title}</p>
                          <p className="text-sm text-gray-500">{result.semester}</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {result.status === "Published" ? (
                            <>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">{result.score}%</p>
                                <Badge className={getGradeColor(result.grade)}>
                                  {result.grade}
                                </Badge>
                              </div>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </>
                          ) : (
                            <div className="text-center">
                              <p className="text-gray-500">Awaiting Publication</p>
                              <p className="text-sm text-gray-400">You'll be notified</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Profile</CardTitle>
                <CardDescription>Manage your personal and academic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Personal Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <p className="text-gray-900">{studentInfo.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Student ID</label>
                        <p className="text-gray-900">{studentInfo.studentId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="text-gray-900">john.doe@student.unilag.edu.ng</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                        <p className="text-gray-900">+234 801 234 5678</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Academic Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Institution</label>
                        <p className="text-gray-900">{studentInfo.institution}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Department</label>
                        <p className="text-gray-900">{studentInfo.department}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Current Level</label>
                        <p className="text-gray-900">{studentInfo.level}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Current CGPA</label>
                        <p className="text-gray-900 font-semibold text-green-600">{studentInfo.cgpa}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Edit Profile
                  </Button>
                  <Button variant="outline">
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Stay updated with your academic progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                          <p className="text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-sm text-gray-500 mt-2">{notification.date}</p>
                        </div>
                        {!notification.read && (
                          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
