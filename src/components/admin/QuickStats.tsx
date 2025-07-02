
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Bell } from 'lucide-react';

interface Student {
  id: string;
  status: string;
}

interface Result {
  id: string;
  published_at: string | null;
}

interface QuickStatsProps {
  students: Student[];
  results: Result[];
}

const QuickStats: React.FC<QuickStatsProps> = ({ students, results }) => {
  const publishedResults = results.filter(r => r.published_at);
  const pendingResults = results.filter(r => !r.published_at);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{students.length}</div>
          <p className="text-xs text-muted-foreground">Active registrations</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Results</CardTitle>
          <FileText className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{results.length}</div>
          <p className="text-xs text-muted-foreground">All semester results</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Published Results</CardTitle>
          <Bell className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{publishedResults.length}</div>
          <p className="text-xs text-muted-foreground">Available to students</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Results</CardTitle>
          <Bell className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingResults.length}</div>
          <p className="text-xs text-muted-foreground">Awaiting publication</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickStats;
