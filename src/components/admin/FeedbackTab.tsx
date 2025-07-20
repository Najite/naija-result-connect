import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Star, 
  Calendar, 
  User, 
  ExternalLink, 
  RefreshCw,
  TrendingUp,
  BarChart3,
  Filter,
  Search,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFeedback } from '@/hooks/useFeedback';
import FeedbackSettings from './FeedbackSettings';

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

interface FeedbackStats {
  totalResponses: number;
  averageRating: number;
  newFeedback: number;
  resolvedFeedback: number;
  categoryBreakdown: Record<string, number>;
  ratingDistribution: Record<number, number>;
}

const FeedbackTab: React.FC = () => {
  const {
    feedbackData,
    loading,
    error,
    isConfigured,
    settings,
    fetchFeedbackData,
    getStatistics,
    filterFeedback,
    getCategories,
    updateFeedbackStatus
  } = useFeedback();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const { toast } = useToast();


  // Filter feedback data
  const filteredFeedback = filterFeedback(searchTerm, filterCategory, filterRating);

  const stats = getStatistics();
  const categories = getCategories();

  // Load settings and fetch data on mount
  useEffect(() => {
    if (isConfigured) {
      fetchFeedbackData(false); // Don't show toast on initial load
    }
  }, [isConfigured, fetchFeedbackData]);

  useEffect(() => {
    // Auto-refresh if enabled
    if (settings.autoRefresh && isConfigured) {
      const interval = setInterval(() => {
        fetchFeedbackData(false);
      }, settings.refreshInterval * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, isConfigured, fetchFeedbackData]);

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600 bg-green-100';
    if (rating >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Feedback</h2>
          <p className="text-gray-600">Monitor and respond to student feedback</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchFeedbackData}
            onClick={() => fetchFeedbackData(true)}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {!isConfigured && (
            <Button
              onClick={() => window.open('#', '_self')} // This will scroll to settings
              variant="outline"
              className="flex items-center gap-2"
            >
              Configure Integration
            </Button>
          )}
          {settings.googleFormUrl && (
            <Button
              onClick={() => window.open(settings.googleFormUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Form
            </Button>
          )}
        </div>
      </div>

      {/* Configuration Warning */}
      {!isConfigured && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Google Forms integration is not configured. The system is currently showing demo data. 
            Please configure your Google Form, Spreadsheet ID, and API key in the Settings tab to see real feedback data.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="responses">All Responses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalResponses}</p>
                    <p className="text-sm text-gray-600">Total Responses</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.averageRating.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600">Average Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.newFeedback}</p>
                    <p className="text-sm text-gray-600">New Feedback</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.resolvedFeedback}</p>
                    <p className="text-sm text-gray-600">Resolved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Latest Student Feedback</CardTitle>
              <CardDescription>Recent feedback messages and suggestions from students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feedbackData.slice(0, 5).map((feedback) => (
                  <div key={feedback.id} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{feedback.name}</span>
                        <Badge variant="outline" className="text-xs">{feedback.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(feedback.status)} variant="secondary">
                          {feedback.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(feedback.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Main feedback message */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-gray-800 leading-relaxed">{feedback.message}</p>
                    </div>
                    
                    {/* Footer with contact and rating */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{feedback.email}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Rating:</span>
                        <div className="flex items-center gap-1">
                          {renderStars(feedback.rating)}
                          <span className="text-gray-600 ml-1">({feedback.rating}/5)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Responses Tab */}
        <TabsContent value="responses" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search feedback..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
             

                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>

                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterRating('all');
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feedback List */}
          <div className="grid gap-4">
            {filteredFeedback.map((feedback) => (
              <Card key={feedback.id} className="hover:shadow-lg transition-all duration-200">
                <CardContent className="p-6">
                  {/* Header with student info and metadata */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-500" />
                      <div>
                        <span className="font-semibold text-gray-900">{feedback.name}</span>
                        <p className="text-sm text-gray-600">{feedback.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(feedback.status)} variant="secondary">
                        {feedback.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{feedback.category}</Badge>
                    </div>
                  </div>
                  
                  {/* Main feedback content */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback Message:</h4>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <p className="text-gray-800 leading-relaxed text-base">{feedback.message}</p>
                    </div>
                  </div>
                  
                  {/* Footer with timestamp and rating */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm text-gray-500">{formatDate(feedback.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Rating:</span>
                      <div className="flex items-center gap-1">
                        {renderStars(feedback.rating)}
                        <span className="text-sm text-gray-600 ml-1">({feedback.rating}/5)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFeedback.length === 0 && (
            <Card>
              <CardContent className="p-16 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No feedback messages found</h3>
                <p className="text-gray-600">
                  {!isConfigured 
                    ? 'Please configure Google Forms integration in the Settings tab to see real feedback data.'
                    : searchTerm || filterCategory !== 'all' || filterRating !== 'all'
                    ? 'Try adjusting your search terms or filters to see more feedback messages.'
                    : 'No feedback messages have been submitted yet. Students can submit feedback through the configured Google Form.'
                  }
                </p>
                {!isConfigured && (
                  <Button 
                    onClick={() => {
                      // Scroll to settings tab
                      const settingsTab = document.querySelector('[value="settings"]');
                      if (settingsTab) {
                        (settingsTab as HTMLElement).click();
                      }
                    }}
                    className="mt-4"
                  >
                    Configure Google Forms Integration
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback by Matric number</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(count / stats.totalResponses) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{
                              width: `${((stats.ratingDistribution[rating] || 0) / stats.totalResponses) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {stats.ratingDistribution[rating] || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Integration Settings</h3>
            <p className="text-gray-600">
              Configure your Google Forms integration to automatically fetch and display feedback responses.
            </p>
          </div>
          <FeedbackSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackTab;