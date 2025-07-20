import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ExternalLink, 
  TestTube, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Copy,
  Eye,
  Plus,
  RefreshCw,
  FileText,
  RotateCcw,
  HelpCircle,
  Link
} from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';

const FeedbackSettings: React.FC = () => {
  const { 
    settings, 
    availableSheets, 
    isConfigured,
    saveSettings, 
    testConnection, 
    createNewForm, 
    fetchAvailableSheets,
    validateSettings,
    resetSettings,
    loading 
  } = useFeedback();
  
  const [formData, setFormData] = useState(settings);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [newFormData, setNewFormData] = useState({
    title: 'Student Feedback Form - EduNotify',
    description: 'Please provide your feedback to help us improve our educational notification system.'
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const { toast } = useToast();

  // Update form data when settings change
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Validate form data in real-time
  useEffect(() => {
    const errors = [];
    
    if (formData.spreadsheetId && !GoogleSheetsService.validateSpreadsheetId(formData.spreadsheetId)) {
      errors.push('Invalid Spreadsheet ID format');
    }
    
    if (formData.apiKey && !GoogleSheetsService.validateApiKey(formData.apiKey)) {
      errors.push('Invalid API Key format');
    }
    
    setValidationErrors(errors);
  }, [formData]);

  const handleInputChange = (field: keyof typeof formData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null); // Clear test result when settings change
  };

  const handleSave = () => {
    console.log('Saving settings:', formData);
    
    // Validate required fields
    if (!formData.spreadsheetId?.trim()) {
      toast({
        title: "Missing Spreadsheet ID",
        description: "Please enter your Google Spreadsheet ID.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.apiKey?.trim()) {
      toast({
        title: "Missing API Key",
        description: "Please enter your Google Sheets API key.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.sheetRange?.trim()) {
      toast({
        title: "Missing Sheet Range",
        description: "Please specify the sheet range (e.g., 'Form Responses 1'!A:G).",
        variant: "destructive"
      });
      return;
    }

    // Validate formats
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(', '),
        variant: "destructive"
      });
      return;
    }

    const success = saveSettings(formData);
    if (success) {
      setTestResult(null);
    }
  };

  const handleTest = async () => {
    console.log('Testing connection with current form data:', formData);
    
    // Save current form data to settings first
    const tempSettings = { ...settings, ...formData };
    
    // Validate
    const errors = [];
    if (!tempSettings.spreadsheetId?.trim()) errors.push('Spreadsheet ID');
    if (!tempSettings.apiKey?.trim()) errors.push('API Key');
    if (!tempSettings.sheetRange?.trim()) errors.push('Sheet Range');
    
    if (errors.length > 0) {
      toast({
        title: "Missing Configuration",
        description: `Please provide: ${errors.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setTestResult(null);
    
    try {
      // Test with current form data
      const isConnected = await GoogleSheetsService.testConnection(
        tempSettings.spreadsheetId,
        tempSettings.apiKey,
        tempSettings.sheetRange
      );
      
      if (isConnected) {
        setTestResult('success');
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Google Sheets!"
        });
        
        // Fetch available sheets
        try {
          const sheets = await GoogleSheetsService.getAvailableSheets(
            tempSettings.spreadsheetId,
            tempSettings.apiKey
          );
          console.log('Available sheets after test:', sheets);
        } catch (error) {
          console.error('Error fetching sheets after successful test:', error);
        }
      } else {
        setTestResult('error');
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setTestResult('error');
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Google Sheets.",
        variant: "destructive"
      });
    }
  };

  const handleCreateForm = async () => {
    const success = await createNewForm(newFormData.title, newFormData.description);
    if (success) {
      setCreateFormOpen(false);
      setNewFormData({
        title: 'Student Feedback Form - EduNotify',
        description: 'Please provide your feedback to help us improve our educational notification system.'
      });
    }
  };

  const handleFetchSheets = async () => {
    if (!formData.spreadsheetId?.trim() || !formData.apiKey?.trim()) {
      toast({
        title: "Missing Configuration",
        description: "Please provide Spreadsheet ID and API Key first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const sheets = await GoogleSheetsService.getAvailableSheets(
        formData.spreadsheetId,
        formData.apiKey
      );
      
      toast({
        title: "Sheets Refreshed",
        description: `Found ${sheets.length} sheet(s) in the spreadsheet.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch sheets.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard."
    });
  };

  const extractSpreadsheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  };

  const handleSpreadsheetUrlPaste = (url: string) => {
    const id = extractSpreadsheetId(url);
    if (id) {
      handleInputChange('spreadsheetId', id);
      toast({
        title: "Spreadsheet ID Extracted",
        description: "Spreadsheet ID has been automatically extracted from the URL."
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Card className={isConfigured ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <span className={`font-medium ${isConfigured ? 'text-green-800' : 'text-yellow-800'}`}>
              {isConfigured ? 'Google Forms integration is configured' : 'Google Forms integration needs configuration'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
          <CardDescription>
            Get started quickly with Google Forms integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dialog open={createFormOpen} onOpenChange={setCreateFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                  <Plus className="w-6 h-6" />
                  <span>Create New Form</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Feedback Form</DialogTitle>
                  <DialogDescription>
                    This will open a Google Form template that you can customize and save.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="formTitle">Form Title</Label>
                    <Input
                      id="formTitle"
                      value={newFormData.title}
                      onChange={(e) => setNewFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Student Feedback Form"
                    />
                  </div>
                  <div>
                    <Label htmlFor="formDescription">Form Description</Label>
                    <Textarea
                      id="formDescription"
                      value={newFormData.description}
                      onChange={(e) => setNewFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Please provide your feedback..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateForm}>
                    <FileText className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => window.open('https://console.cloud.google.com/apis/library/sheets.googleapis.com', '_blank')}
            >
              <Link className="w-6 h-6" />
              <span>Setup API Key</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Google Forms Configuration</CardTitle>
          <CardDescription>
            Configure your Google Form and Google Sheets integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form Name */}
          <div className="space-y-2">
            <Label htmlFor="formName">Form Name (Optional)</Label>
            <Input
              id="formName"
              value={formData.formName}
              onChange={(e) => handleInputChange('formName', e.target.value)}
              placeholder="Student Feedback Form"
            />
            <p className="text-sm text-gray-500">
              A descriptive name for your form (for reference only).
            </p>
          </div>

          {/* Google Form URL */}
          <div className="space-y-2">
            <Label htmlFor="googleFormUrl">Google Form URL</Label>
            <div className="flex gap-2">
              <Input
                id="googleFormUrl"
                value={formData.googleFormUrl}
                onChange={(e) => handleInputChange('googleFormUrl', e.target.value)}
                placeholder="https://forms.gle/your-form-id"
              />
              {formData.googleFormUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(formData.googleFormUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-500">
              The public URL of your Google Form for collecting feedback.
            </p>
          </div>

          {/* Google Sheets ID */}
          <div className="space-y-2">
            <Label htmlFor="spreadsheetId">Google Spreadsheet ID *</Label>
            <div className="flex gap-2">
              <Input
                id="spreadsheetId"
                value={formData.spreadsheetId}
                onChange={(e) => handleInputChange('spreadsheetId', e.target.value)}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  if (pastedText.includes('spreadsheets/d/')) {
                    e.preventDefault();
                    handleSpreadsheetUrlPaste(pastedText);
                  }
                }}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className={validationErrors.some(e => e.includes('Spreadsheet ID')) ? 'border-red-300' : ''}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(formData.spreadsheetId)}
                disabled={!formData.spreadsheetId}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              The ID of the Google Sheet where form responses are stored. You can paste the full spreadsheet URL here.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">Google Sheets API Key *</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={formData.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="AIzaSyD..."
                className={validationErrors.some(e => e.includes('API Key')) ? 'border-red-300' : ''}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Your Google Sheets API key. Must start with "AIza" and be 39 characters long.
            </p>
          </div>

          {/* Sheet Range */}
          <div className="space-y-2">
            <Label htmlFor="sheetRange">Sheet Range *</Label>
            <div className="flex gap-2">
              <Input
                id="sheetRange"
                value={formData.sheetRange}
                onChange={(e) => handleInputChange('sheetRange', e.target.value)}
                placeholder="'Form Responses 1'!A:G"
              />
              {availableSheets.length > 0 && (
                <Select 
                  value={formData.sheetRange.split('!')[0].replace(/'/g, '')} 
                  onValueChange={(sheetName) => {
                    const range = sheetName.includes(' ') ? `'${sheetName}'!A:G` : `${sheetName}!A:G`;
                    handleInputChange('sheetRange', range);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSheets.map(sheet => (
                      <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleFetchSheets}
                disabled={!formData.spreadsheetId || !formData.apiKey || loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              The range of cells to fetch. Common formats: 'Form Responses 1'!A:G, Sheet1!A:G
            </p>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Auto Refresh Settings */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Refresh</Label>
                <p className="text-sm text-gray-500">
                  Automatically refresh feedback data at regular intervals
                </p>
              </div>
              <Switch
                checked={formData.autoRefresh}
                onCheckedChange={(checked) => handleInputChange('autoRefresh', checked)}
              />
            </div>

            {formData.autoRefresh && (
              <div className="space-y-2">
                <Label htmlFor="refreshInterval">Refresh Interval (minutes)</Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.refreshInterval}
                  onChange={(e) => handleInputChange('refreshInterval', parseInt(e.target.value) || 5)}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleTest} 
              disabled={loading || validationErrors.length > 0}
              variant="outline"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {loading ? 'Testing...' : 'Test Connection'}
            </Button>
            
            <Button 
              onClick={handleSave} 
              disabled={validationErrors.length > 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
            
            <Button 
              onClick={resetSettings} 
              variant="destructive"
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert className={testResult === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {testResult === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={testResult === 'success' ? 'text-green-800' : 'text-red-800'}>
                {testResult === 'success' 
                  ? 'Connection successful! Your Google Sheets integration is working correctly.'
                  : 'Connection failed. Please check your configuration and try again.'
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Setup Instructions
          </CardTitle>
          <CardDescription>
            Step-by-step guide to set up Google Forms integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                Create Google Form
              </h4>
              <p className="text-sm text-gray-600 ml-8">
                Create a Google Form with these fields in exact order:
              </p>
              <div className="ml-8 bg-gray-50 p-3 rounded-md">
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong>Column A:</strong> Timestamp (automatic)</li>
                  <li><strong>Column B:</strong> Name (Short answer)</li>
                  <li><strong>Column C:</strong> Email (Short answer)</li>
                  <li><strong>Column D:</strong> Rating (Linear scale 1-5)</li>
                  <li><strong>Column E:</strong> Category (Multiple choice)</li>
                  <li><strong>Column F:</strong> Message (Paragraph)</li>
                  <li><strong>Column G:</strong> Status (Multiple choice: new, reviewed, resolved)</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                Link to Google Sheets
              </h4>
              <p className="text-sm text-gray-600 ml-8">
                In your form: Responses → Create Spreadsheet → Create new spreadsheet
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                Get API Key
              </h4>
              <div className="ml-8 space-y-2">
                <p className="text-sm text-gray-600">
                  Go to <a href="https://console.cloud.google.com/" target="_blank" className="text-blue-600 hover:underline">Google Cloud Console</a>
                </p>
                <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                  <li>Create/select project</li>
                  <li>Enable Google Sheets API</li>
                  <li>Create credentials → API Key</li>
                  <li>Restrict to Google Sheets API</li>
                </ol>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                Make Sheet Public
              </h4>
              <p className="text-sm text-gray-600 ml-8">
                Share your spreadsheet: "Anyone with the link can view"
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</span>
                Configure Above
              </h4>
              <p className="text-sm text-gray-600 ml-8">
                Enter your Form URL, Spreadsheet ID, API Key, and Range, then test the connection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackSettings;