import React, { useState, useEffect } from 'react';

interface FeedbackDisplayProps {
  feedbackUrl: string; // URL of the Google Apps Script web app
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedbackUrl }) => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const response = await fetch(feedbackUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch feedbacks: ${response.statusText}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Data is not in the expected format');
        }
        setFeedbacks(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [feedbackUrl]);

  return (
    <div className="feedback-display">
      <h2>Feedbacks</h2>
      {loading ? (
        <div className="loading-message">
          <p>Loading feedbacks...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      ) : (
        <div className="feedback-content">
          {feedbacks.length === 0 ? (
            <p>No feedbacks available.</p>
          ) : (
            <ul>
              {feedbacks.map((feedback, index) => (
                <li key={index}>
                  <strong>Timestamp:</strong> {feedback.timestamp}<br />
                  <strong>Feedback:</strong> {feedback.feedback}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackDisplay;