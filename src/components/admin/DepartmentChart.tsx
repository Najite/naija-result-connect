
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Student {
  department: string;
}

interface DepartmentChartProps {
  students: Student[];
}

const DepartmentChart: React.FC<DepartmentChartProps> = ({ students }) => {
  const departmentStats = students.reduce((acc, student) => {
    acc[student.department] = (acc[student.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(departmentStats).map(([department, count]) => ({
    department,
    students: count
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students by Department</CardTitle>
        <CardDescription>Distribution of students across departments</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="students" fill="#22C55E" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DepartmentChart;
