import { useState, useCallback } from 'react';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';

// Mock data for demonstration
const mockFeedbackData = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00Z',
    name: 'John Doe',
    email: 'john.doe@student.edu',
    rating: 5,
    category: 'User Interface',
    message: 'The new dashboard is amazing! Very intuitive and easy to navigate.',
    status: 'new' as const
  },
  {
    id: '2',
    timestamp: '2024-01-14T14:20:00Z',
    name: 'Jane Smith',
    email: 'jane.smith@student.edu',
    rating: 4,
    category: 'Notifications',
    message: 'SMS notifications work great, but email notifications could be faster.',
    status: 'reviewed' as const
  },
  {
    id: '3',
    timestamp: '2024-01-13T09:15:00Z',
    name: 'David Johnson',
    email: 'david.j@student.edu',
    rating: 3,
    category: 'Performance',
    message: 'The system is good but sometimes loads slowly during peak hours.',
    status: 'resolved' as const
  },
  {
    id: '4',
    timestamp: '2024-01-12T16:45:00Z',
    name: 'Sarah Wilson',
    email: 'sarah.w@student.edu',
    rating: 5,
    category: 'Features',
    message: 'Love the new result tracking feature! Very helpful for monitoring progress.',
    status: 'new' as const
  },
  {
    id: '5',
    timestamp: '2024-01-11T11:30:00Z',
    name: 'Michael Brown',
    email: 'michael.b@student.edu',
    rating: 2,
    category: 'Bug Report',
    message: 'Found a bug where the CGPA calculation seems incorrect for some courses.',
    status: 'reviewed' as const
  }
];

interface FeedbackResponse {
  id: string;
  timestamp: string;
  name: string;
  email: string;
  rating: number;
  category: string;
  message: string;
  status: 'new' | 'reviewed' | 'resolved';
}

interface FeedbackSettings {
  googleFormUrl: string;
  spreadsheetId: string;
  apiKey: string;
  autoRefresh: boolean;
  refreshInterval: number; // in minutes
}

export const useFeedback = () => {
  const [feedbackData, setFeedbackData] = useState<FeedbackResponse[]>(mockFeedbackData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<FeedbackSettings>({
    googleFormUrl: '',
    spreadsheetId: '',
    apiKey: '',
    autoRefresh: false,
    refreshInterval: 5
  });
  
  const { toast } = useToast();

  // Load settings from localStorage
  const loadSettings = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('feedbackSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading feedback settings:', error);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<FeedbackSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      localStorage.setItem('feedbackSettings', JSON.stringify(updatedSettings));
      
      toast({
        title: "Settings Saved",
        description: "Feedback settings have been saved successfully."
      });
    } catch (error) {
      console.error('Error saving feedback settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive"
      });
    }
  }, [settings, toast]);

  // Fetch feedback data from Google Sheets
  const fetchFeedbackData = useCallback(async (showToast: boolean = true) => {
    if (!settings.spreadsheetId || !settings.apiKey) {
      // Use mock data when no configuration is provided
      setFeedbackData(mockFeedbackData);
      if (showToast) {
        toast({
          title: "Using Demo Data",
          description: "Configure Google Sheets integration to fetch real feedback data.",
        });
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await GoogleSheetsService.fetchFeedbackResponses(
        settings.spreadsheetId,
        settings.apiKey
      );
      
      setFeedbackData(data);
      
      if (showToast) {
        toast({
          title: "Feedback Updated",
          description: `Successfully fetched ${data.length} feedback responses.`
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feedback data';
      setError(errorMessage);
      
      // Fallback to mock data on error
      setFeedbackData(mockFeedbackData);
      
      if (showToast) {
        toast({
          title: "Error",
          description: `${errorMessage}. Using demo data.`,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [settings.spreadsheetId, settings.apiKey, toast]);

  // Test Google Sheets connection
  const testConnection = useCallback(async () => {
    if (!settings.spreadsheetId || !settings.apiKey) {
      toast({
        title: "Missing Configuration",
        description: "Please provide both Spreadsheet ID and API key.",
        variant: "destructive"
      });
      return false;
    }

    setLoading(true);
    
    try {
      const isConnected = await GoogleSheetsService.testConnection(
        settings.spreadsheetId,
        settings.apiKey
      );
      
      if (isConnected) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Google Sheets."
        });
        return true;
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect to Google Sheets. Please check your credentials.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "An error occurred while testing the connection.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [settings.spreadsheetId, settings.apiKey, toast]);

  // Update feedback status (local only - for UI purposes)
  const updateFeedbackStatus = useCallback((feedbackId: string, newStatus: 'new' | 'reviewed' | 'resolved') => {
    setFeedbackData(prev => 
      prev.map(item => 
        item.id === feedbackId 
          ? { ...item, status: newStatus }
          : item
      )
    );
    
    toast({
      title: "Status Updated",
      description: `Feedback marked as ${newStatus}.`
    });
  }, [toast]);

  // Get feedback statistics
  const getStatistics = useCallback(() => {
    const totalResponses = feedbackData.length;
    const averageRating = totalResponses > 0 
      ? feedbackData.reduce((sum, item) => sum + item.rating, 0) / totalResponses 
      : 0;
    const newFeedback = feedbackData.filter(item => item.status === 'new').length;
    const resolvedFeedback = feedbackData.filter(item => item.status === 'resolved').length;
    
    const categoryBreakdown = feedbackData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const ratingDistribution = feedbackData.reduce((acc, item) => {
      acc[item.rating] = (acc[item.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalResponses,
      averageRating,
      newFeedback,
      resolvedFeedback,
      categoryBreakdown,
      ratingDistribution
    };
  }, [feedbackData]);

  // Filter feedback data
  const filterFeedback = useCallback((
    searchTerm: string = '',
    category: string = 'all',
    rating: string = 'all',
    status: string = 'all'
  ) => {
    return feedbackData.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = category === 'all' || item.category === category;
      const matchesRating = rating === 'all' || item.rating.toString() === rating;
      const matchesStatus = status === 'all' || item.status === status;
      
      return matchesSearch && matchesCategory && matchesRating && matchesStatus;
    });
  }, [feedbackData]);

  // Get unique categories
  const getCategories = useCallback(() => {
    return [...new Set(feedbackData.map(item => item.category))];
  }, [feedbackData]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    feedbackData,
    loading,
    error,
    settings,
    loadSettings,
    saveSettings,
    fetchFeedbackData,
    testConnection,
    updateFeedbackStatus,
    getStatistics,
    filterFeedback,
    getCategories,
    clearError
  };
};