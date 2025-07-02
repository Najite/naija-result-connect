
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Send, Users } from 'lucide-react';

interface QuickActionsProps {
  onPublishResults: () => void;
  onSendTestNotification: () => void;
  notificationLoading: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({ 
  onPublishResults, 
  onSendTestNotification, 
  notificationLoading 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common administrative tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 flex-wrap">
          <Button 
            onClick={onPublishResults} 
            disabled={notificationLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {notificationLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Publishing...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Publish All Results & Notify
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={onSendTestNotification}
            disabled={notificationLoading}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Test Notification
          </Button>
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Export Student Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
