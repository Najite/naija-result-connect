
import React from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, Settings, LogOut } from 'lucide-react';

interface Admin {
  full_name: string;
}

interface AdminHeaderProps {
  admin: Admin | null;
  onLogout: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ admin, onLogout }) => {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">EduNotify Admin</h1>
              <p className="text-sm text-gray-600">Welcome back, {admin?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
