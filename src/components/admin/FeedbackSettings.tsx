import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ExternalLink, 
  TestTube, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Copy,
  Eye
} from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';

const FeedbackSettings: React.FC = () => {
  const { settings, saveSettings, testConnection, loading } = useFeedback();
  const [formData, setFormData] = useState(settings);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleInputChange = (field: keyof typeof formData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Validate inputs
    if (formData.spreadsheetId && !GoogleSheetsService.validateSpreadsheetId(formData.spreadsheetId)) {
      toast({
        title: "Invalid Spreadsheet ID",
        description: "Please enter a valid Google Spreadsheet ID.",
        variant: "destructive"
      });
      return;
    }

    if (formData.apiKey && !GoogleSheetsService.validateApiKey(formData.apiKey)) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid Google Sheets API key.",
        variant: "destructive"
      });
      return;
    }

    saveSettings(formData);
  };

  const handleTest = async () => {
    setTestResult(null);
    const result = await testConnection();
    setTestResult(result ? 'success' : 'error');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard."
    });
  };

  const sampleFormStructure = `
Timestamp | Name | Email | Rating | Category | Message | Status
---------|------|-------|--------|----------|---------|--------
1/15/2024 10:30:00 | John Doe | john@email.com | 5 | UI/UX | Great interface! | new
1/14/2024 14:20:00 | Jane Smith | jane@email.com | 4 | Features | Love the new features | reviewed
  `;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Forms Integration</CardTitle>
          <CardDescription>
            Configure your Google Form and Google Sheets integration to automatically fetch feedback responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <Label htmlFor="spreadsheetId">Google Sheets ID</Label>
            <div className="flex gap-2">
              <Input
                id="spreadsheetId"
                value={formData.spreadsheetId}
                onChange={(e) => handleInputChange('spreadsheetId', e.target.value)}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
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
              The ID of the Google Sheet where form responses are stored. Found in the sheet URL.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">Google Sheets API Key</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={formData.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="AIzaSyD..."
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
              Your Google Sheets API key for accessing the spreadsheet data.
            </p>
          </div>

          {/* Auto Refresh Settings */}
          <div className="space-y-4">
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
          <div className="flex gap-2">
            <Button onClick={handleTest} disabled={loading || !formData.spreadsheetId || !formData.apiKey}>
              <TestTube className="w-4 h-4 mr-2" />
              {loading ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button onClick={handleSave} variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
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
                  : 'Connection failed. Please check your Spreadsheet ID and API key.'
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to set up Google Forms integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">1. Create Google Form</h4>
              <p className="text-sm text-gray-600">
                Create a Google Form with the following fields (in this exact order):
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside ml-4 space-y-1">
                <li><strong>Name</strong> - Short answer text</li>
                <li><strong>Email</strong> - Short answer text</li>
                <li><strong>Rating</strong> - Linear scale (1-5)</li>
                <li><strong>Category</strong> - Multiple choice (UI/UX, Features, Performance, Bug Report, etc.)</li>
                <li><strong>Message</strong> - Paragraph text</li>
                <li><strong>Status</strong> - Multiple choice (new, reviewed, resolved) - Optional</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">2. Link to Google Sheets</h4>
              <p className="text-sm text-gray-600">
                In your Google Form, click "Responses" → "Create Spreadsheet" to automatically create a linked sheet.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">3. Enable Google Sheets API</h4>
              <ol className="text-sm text-gray-600 list-decimal list-inside ml-4 space-y-1">
                <li>Go to <a href="https://console.cloud.google.com/" target="_blank" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                <li>Create a new project or select existing one</li>
                <li>Enable the Google Sheets API</li>
                <li>Create credentials (API Key)</li>
                <li>Restrict the API key to Google Sheets API only</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">4. Make Spreadsheet Public</h4>
              <p className="text-sm text-gray-600">
                Share your Google Sheet with "Anyone with the link can view" permissions.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">5. Expected Sheet Structure</h4>
              <div className="bg-gray-50 p-3 rounded-md">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">{sampleFormStructure}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackSettings;