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

export class GoogleSheetsService {
  private static readonly BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

  /**
   * Fetch feedback responses from Google Sheets
   * @param spreadsheetId - The ID of the Google Spreadsheet
   * @param apiKey - Google Sheets API key
   * @param range - The range to fetch (default: 'Sheet1!A:G')
   * @returns Promise<FeedbackResponse[]>
   */
  static async fetchFeedbackResponses(
    spreadsheetId: string,
    apiKey: string,
    range: string = 'Sheet1!A:G'
  ): Promise<FeedbackResponse[]> {
    try {
      if (!spreadsheetId || !apiKey) {
        throw new Error('Spreadsheet ID and API key are required');
      }

      const url = `${this.BASE_URL}/${spreadsheetId}/values/${range}?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Sheets API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: GoogleSheetsResponse = await response.json();
      
      if (!data.values || data.values.length === 0) {
        return [];
      }

      // Skip header row and convert to FeedbackResponse objects
      const rows = data.values.slice(1);
      
      return rows.map((row, index) => ({
        id: (index + 1).toString(),
        timestamp: row[0] || new Date().toISOString(),
        name: row[1] || 'Anonymous',
        email: row[2] || '',
        rating: parseInt(row[3]) || 0,
        category: row[4] || 'General',
        message: row[5] || '',
        status: (row[6] as 'new' | 'reviewed' | 'resolved') || 'new'
      })).filter(item => item.name !== 'Anonymous' || item.message); // Filter out empty rows

    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      throw error;
    }
  }

  /**
   * Test connection to Google Sheets
   * @param spreadsheetId - The ID of the Google Spreadsheet
   * @param apiKey - Google Sheets API key
   * @returns Promise<boolean>
   */
  static async testConnection(spreadsheetId: string, apiKey: string): Promise<boolean> {
    try {
      const url = `${this.BASE_URL}/${spreadsheetId}?key=${apiKey}&fields=properties.title`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing Google Sheets connection:', error);
      return false;
    }
  }

  /**
   * Get spreadsheet metadata
   * @param spreadsheetId - The ID of the Google Spreadsheet
   * @param apiKey - Google Sheets API key
   * @returns Promise<any>
   */
  static async getSpreadsheetInfo(spreadsheetId: string, apiKey: string): Promise<any> {
    try {
      const url = `${this.BASE_URL}/${spreadsheetId}?key=${apiKey}&fields=properties,sheets.properties`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
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
    // Updated validation for Google API key format - they start with AIza and are 39 characters total
    return /^AIza[0-9A-Za-z-_]{35}$/.test(apiKey);
  }

  /**
   * Validate Google Spreadsheet ID format
   * @param spreadsheetId - The spreadsheet ID to validate
   * @returns boolean
   */
  static validateSpreadsheetId(spreadsheetId: string): boolean {
    // Updated validation for Google Spreadsheet ID - they are typically 44 characters with alphanumeric, hyphens, and underscores
    return /^[a-zA-Z0-9-_]{40,50}$/.test(spreadsheetId);
  }
}
