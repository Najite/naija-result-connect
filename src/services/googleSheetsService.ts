interface GoogleSheetsResponse {
  values?: string[][];
}

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

interface FormCreationData {
  title: string;
  description: string;
  fields: FormField[];
}

interface FormField {
  type: 'text' | 'email' | 'scale' | 'choice' | 'paragraph';
  title: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

export class GoogleSheetsService {
  private static readonly BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
  private static readonly FORMS_BASE_URL = 'https://forms.googleapis.com/v1/forms';

  /**
   * Fetch feedback responses from Google Sheets
   * @param spreadsheetId - The ID of the Google Spreadsheet
   * @param apiKey - Google Sheets API key
   * @param range - The range to fetch (e.g., 'Sheet1!A:G' or 'Form Responses 1!A:G')
   * @param sheetName - Optional sheet name for better error messages
   * @returns Promise<FeedbackResponse[]>
   */
  static async fetchFeedbackResponses(
    spreadsheetId: string,
    apiKey: string,
    range: string = 'Sheet1!A:G',
    sheetName?: string
  ): Promise<FeedbackResponse[]> {
    try {
      console.log('Fetching feedback responses with params:', {
        spreadsheetId,
        apiKey: apiKey.substring(0, 10) + '...',
        range,
        sheetName
      });

      if (!spreadsheetId || !apiKey) {
        throw new Error('Spreadsheet ID and API key are required');
      }

      // Validate inputs
      if (!this.validateSpreadsheetId(spreadsheetId)) {
        throw new Error('Invalid Spreadsheet ID format');
      }

      if (!this.validateApiKey(apiKey)) {
        throw new Error('Invalid API key format');
      }

      const url = `${this.BASE_URL}/${spreadsheetId}/values/${range}?key=${apiKey}`;
      
      console.log('Making request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || response.statusText;
        
        console.error('Google Sheets API error:', errorData);
        
        if (response.status === 403) {
          throw new Error(`Access denied. Please check: 1) API key is valid, 2) Google Sheets API is enabled, 3) Spreadsheet is publicly accessible. Error: ${errorMessage}`);
        } else if (response.status === 404) {
          throw new Error(`Spreadsheet or range not found. Please check: 1) Spreadsheet ID is correct, 2) Range "${range}" exists${sheetName ? ` in sheet "${sheetName}"` : ''}. Error: ${errorMessage}`);
        } else if (response.status === 400) {
          throw new Error(`Invalid request. Please check the range format "${range}". Error: ${errorMessage}`);
        }
        
        throw new Error(`Google Sheets API error (${response.status}): ${errorMessage}`);
      }

      const data: GoogleSheetsResponse = await response.json();
      
      console.log('Raw Google Sheets response:', data);
      
      if (!data.values || data.values.length === 0) {
        throw new Error(`No data found in range "${range}"${sheetName ? ` of sheet "${sheetName}"` : ''}. Please ensure the form has responses and the range is correct.`);
      }

      // Skip header row and convert to FeedbackResponse objects
      const rows = data.values.slice(1);
      
      console.log('Processing rows:', rows);
      
      const processedData = rows.map((row, index) => ({
        id: (index + 1).toString(),
        timestamp: row[0] || new Date().toISOString(),
        name: row[1] || 'Anonymous',
        email: row[2] || '',
        rating: parseInt(row[3]) || 0,
        category: row[4] || 'General',
        message: row[5] || '',
        status: (row[6] as 'new' | 'reviewed' | 'resolved') || 'new'
      })).filter(item => item.name !== 'Anonymous' || item.message);
      
      console.log('Processed feedback data:', processedData);
      
      return processedData;

    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      throw error;
    }
  }

  /**
   * Test connection to Google Sheets
   * @param spreadsheetId - The ID of the Google Spreadsheet
   * @param apiKey - Google Sheets API key
   * @param range - Optional range to test
   * @returns Promise<boolean>
   */
  static async testConnection(spreadsheetId: string, apiKey: string, range?: string): Promise<boolean> {
    try {
      console.log('Testing connection with:', {
        spreadsheetId,
        apiKey: apiKey.substring(0, 10) + '...',
        range
      });
      // First test basic spreadsheet access
      let url = `${this.BASE_URL}/${spreadsheetId}?key=${apiKey}&fields=properties.title,sheets.properties`;
      
      let response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Basic spreadsheet access failed:', errorData);
        console.error('Spreadsheet access test failed:', errorData);
        return false;
      }

      // If range is provided, test range access
      if (range) {
        url = `${this.BASE_URL}/${spreadsheetId}/values/${range}?key=${apiKey}`;
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Range access failed:', errorData);
          console.error('Range access test failed:', await response.json());
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error testing Google Sheets connection:', error);
      return false;
    }
  }

  /**
   * Get available sheets in a spreadsheet
   * @param spreadsheetId - The ID of the Google Spreadsheet
   * @param apiKey - Google Sheets API key
   * @returns Promise<string[]>
   */
  static async getAvailableSheets(spreadsheetId: string, apiKey: string): Promise<string[]> {
    try {
      console.log('Getting available sheets for:', {
        spreadsheetId,
        apiKey: apiKey.substring(0, 10) + '...'
      });
      
      const url = `${this.BASE_URL}/${spreadsheetId}?key=${apiKey}&fields=sheets.properties.title`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Get sheets error:', errorData);
        throw new Error(`Failed to get sheets: ${response.statusText}`);
      }

      const data = await response.json();
      return data.sheets?.map((sheet: any) => sheet.properties.title) || [];
    } catch (error) {
      console.error('Error getting available sheets:', error);
      throw error;
    }
  }

  /**
   * Create a new Google Form for feedback collection
   * @param title - Form title
   * @param description - Form description
   * @param apiKey - Google Forms API key (requires OAuth, not just API key)
   * @returns Promise<any>
   */
  static async createFeedbackForm(title: string, description: string, apiKey: string): Promise<any> {
    try {
      // Note: This requires OAuth authentication, not just an API key
      // For now, we'll return instructions for manual creation
      throw new Error('Google Forms API requires OAuth authentication. Please create the form manually using the provided template.');
    } catch (error) {
      console.error('Error creating Google Form:', error);
      throw error;
    }
  }

  /**
   * Generate a Google Form template URL for manual creation
   * @param title - Form title
   * @param description - Form description
   * @returns string - URL to create form with pre-filled template
   */
  static generateFormTemplate(title: string, description: string): string {
    const baseUrl = 'https://docs.google.com/forms/create';
    const params = new URLSearchParams({
      title: title || 'Student Feedback Form',
      description: description || 'Please provide your feedback to help us improve our services.'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Get spreadsheet metadata
   * @param spreadsheetId - The ID of the Google Spreadsheet
   * @param apiKey - Google Sheets API key
   * @returns Promise<any>
   */
  static async getSpreadsheetInfo(spreadsheetId: string, apiKey: string): Promise<any> {
    try {
      console.log('Getting spreadsheet info for:', {
        spreadsheetId,
        apiKey: apiKey.substring(0, 10) + '...'
      });
      
      const url = `${this.BASE_URL}/${spreadsheetId}?key=${apiKey}&fields=properties,sheets.properties`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Get spreadsheet info error:', errorData);
        throw new Error(`Failed to get spreadsheet info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting spreadsheet info:', error);
      throw error;
    }
  }

  /**
   * Format Google Form URL for embedding
   * @param formUrl - The Google Form URL
   * @returns string - Embeddable URL
   */
  static formatFormUrlForEmbed(formUrl: string): string {
    if (!formUrl) return '';
    
    // Convert regular form URL to embed URL
    if (formUrl.includes('forms.gle/') || formUrl.includes('docs.google.com/forms/')) {
      // Extract form ID and create embed URL
      const formId = this.extractFormId(formUrl);
      if (formId) {
        return `https://docs.google.com/forms/d/e/${formId}/viewform?embedded=true`;
      }
    }
    
    return formUrl;
  }

  /**
   * Extract form ID from Google Form URL
   * @param formUrl - The Google Form URL
   * @returns string | null - Form ID
   */
  private static extractFormId(formUrl: string): string | null {
    try {
      // Handle forms.gle short URLs
      if (formUrl.includes('forms.gle/')) {
        return formUrl.split('forms.gle/')[1].split('?')[0];
      }
      
      // Handle full Google Forms URLs
      if (formUrl.includes('docs.google.com/forms/')) {
        const match = formUrl.match(/\/forms\/d\/e\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting form ID:', error);
      return null;
    }
  }

  /**
   * Validate Google Sheets API key format
   * @param apiKey - The API key to validate
   * @returns boolean
   */
  static validateApiKey(apiKey: string): boolean {
    // Google API keys start with AIza and are 39 characters total
    return /^AIza[0-9A-Za-z\-_]{35}$/.test(apiKey);
  }

  /**
   * Validate Google Spreadsheet ID format
   * @param spreadsheetId - The spreadsheet ID to validate
   * @returns boolean
   */
  static validateSpreadsheetId(spreadsheetId: string): boolean {
    // Google Spreadsheet IDs are typically 44 characters with alphanumeric, hyphens, and underscores
    return /^[a-zA-Z0-9\-_]{40,50}$/.test(spreadsheetId);
  }
}
