import { useState, useCallback, useEffect } from 'react';
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
  formName: string;
  sheetRange: string;
  autoRefresh: boolean;
  refreshInterval: number; // in minutes
}

const defaultSettings: FeedbackSettings = {
  googleFormUrl: '',
  spreadsheetId: '',
  apiKey: '',
  formName: '',
  sheetRange: 'Form Responses 1!A:G',
  autoRefresh: false,
  refreshInterval: 5
};

export const useFeedback = () => {
  const [feedbackData, setFeedbackData] = useState<FeedbackResponse[]>(mockFeedbackData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [settings, setSettings] = useState<FeedbackSettings>(defaultSettings);
  const [isConfigured, setIsConfigured] = useState(false);
  
  const { toast } = useToast();

  // Load settings from localStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Check if settings are properly configured
  useEffect(() => {
    const configured = !!(
      settings.spreadsheetId?.trim() && 
      settings.apiKey?.trim() && 
      settings.sheetRange?.trim()
    );
    setIsConfigured(configured);
  }, [settings]);

  // Load settings from localStorage
  const loadSettings = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('feedbackSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
        console.log('Loaded settings:', parsed);
      }
    } catch (error) {
      console.error('Error loading feedback settings:', error);
      setSettings(defaultSettings);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<FeedbackSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      localStorage.setItem('feedbackSettings', JSON.stringify(updatedSettings));
      
      console.log('Saved settings:', updatedSettings);
      
      toast({
        title: "Settings Saved",
        description: "Feedback settings have been saved successfully."
      });

      return true;
    } catch (error) {
      console.error('Error saving feedback settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive"
      });
      return false;
    }
  }, [settings, toast]);

  // Validate current settings
  const validateSettings = useCallback(() => {
    const errors = [];
    
    if (!settings.spreadsheetId?.trim()) {
      errors.push('Spreadsheet ID is required');
    } else if (!GoogleSheetsService.validateSpreadsheetId(settings.spreadsheetId)) {
      errors.push('Invalid Spreadsheet ID format');
    }
    
    if (!settings.apiKey?.trim()) {
      errors.push('API Key is required');
    } else if (!GoogleSheetsService.validateApiKey(settings.apiKey)) {
      errors.push('Invalid API Key format');
    }
    
    if (!settings.sheetRange?.trim()) {
      errors.push('Sheet Range is required');
    }
    
    return errors;
  }, [settings]);

  // Fetch available sheets
  const fetchAvailableSheets = useCallback(async () => {
    const validationErrors = validateSettings();
    if (validationErrors.length > 0) {
      console.log('Cannot fetch sheets - validation errors:', validationErrors);
      return;
    }

    try {
      setLoading(true);
      const sheets = await GoogleSheetsService.getAvailableSheets(
        settings.spreadsheetId,
        settings.apiKey
      );
      setAvailableSheets(sheets);
      console.log('Available sheets:', sheets);
      
      toast({
        title: "Sheets Loaded",
        description: `Found ${sheets.length} sheet(s) in the spreadsheet.`
      });
    } catch (error) {
      console.error('Error fetching available sheets:', error);
      setAvailableSheets([]);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch sheets.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [settings.spreadsheetId, settings.apiKey, validateSettings, toast]);

  // Fetch feedback data from Google Sheets
  const fetchFeedbackData = useCallback(async (showToast: boolean = true) => {
    console.log('Attempting to fetch feedback data...');
    console.log('Current settings:', settings);
    console.log('Is configured:', isConfigured);

    // Validate settings first
    const validationErrors = validateSettings();
    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors);
      if (showToast) {
        toast({
          title: "Configuration Required",
          description: `Please configure: ${validationErrors.join(', ')}`,
          variant: "destructive"
        });
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching from Google Sheets with:', {
        spreadsheetId: settings.spreadsheetId,
        range: settings.sheetRange,
        formName: settings.formName
      });

      const data = await GoogleSheetsService.fetchFeedbackResponses(
        settings.spreadsheetId,
        settings.apiKey,
        settings.sheetRange,
        settings.formName
      );
      
      console.log('Fetched data:', data);
      setFeedbackData(data);
      
      if (showToast) {
        toast({
          title: "Feedback Updated",
          description: `Successfully fetched ${data.length} feedback responses.`
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feedback data';
      console.error('Fetch error:', err);
      setError(errorMessage);
      
      // Keep existing data on error
      if (showToast) {
        toast({
          title: "Error Fetching Data",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [settings, isConfigured, validateSettings, toast]);

  // Test Google Sheets connection
  const testConnection = useCallback(async () => {
    console.log('Testing connection...');
    
    const validationErrors = validateSettings();
    if (validationErrors.length > 0) {
      toast({
        title: "Configuration Incomplete",
        description: `Please provide: ${validationErrors.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }

    setLoading(true);
    
    try {
      console.log('Testing connection with:', {
        spreadsheetId: settings.spreadsheetId,
        apiKey: settings.apiKey.substring(0, 10) + '...',
        range: settings.sheetRange
      });

      const isConnected = await GoogleSheetsService.testConnection(
        settings.spreadsheetId,
        settings.apiKey,
        settings.sheetRange
      );
      
      if (isConnected) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Google Sheets."
        });
        
        // Fetch available sheets after successful connection
        await fetchAvailableSheets();
        return true;
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect to Google Sheets. Please check your credentials and permissions.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "An error occurred while testing the connection.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [settings, validateSettings, toast, fetchAvailableSheets]);

  // Create new Google Form
  const createNewForm = useCallback(async (title: string, description: string) => {
    try {
      // Generate template URL with pre-filled fields
      const templateUrl = GoogleSheetsService.generateFormTemplate(title, description);
      
      // Open the template URL in a new tab
      window.open(templateUrl, '_blank');
      
      toast({
        title: "Form Template Opened",
        description: "A new tab has opened with a Google Form template. Please customize and save it, then link it to a spreadsheet.",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create form template.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

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

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem('feedbackSettings');
    setAvailableSheets([]);
    setIsConfigured(false);
    toast({
      title: "Settings Reset",
      description: "All feedback settings have been reset to defaults."
    });
  }, [toast]);

  return {
    feedbackData,
    loading,
    error,
    settings,
    availableSheets,
    isConfigured,
    loadSettings,
    saveSettings,
    fetchFeedbackData,
    fetchAvailableSheets,
    testConnection,
    createNewForm,
    updateFeedbackStatus,
    getStatistics,
    filterFeedback,
    getCategories,
    validateSettings,
    clearError,
    resetSettings
  };
};