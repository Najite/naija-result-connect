import React, { useState, useEffect } from 'react';

interface StudentFeedbackProps {
  studentId: string; // Student ID
  feedbackUrl: string; // URL of the Google Apps Script web app
}

const StudentFeedback: React.FC<StudentFeedbackProps> = ({ studentId, feedbackUrl }) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const response = await fetch(`${feedbackUrl}?studentId=${studentId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch feedback: ${response.statusText}`);
        }
        const text = await response.text();
        setFeedback(text);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      }
    };

    fetchFeedback();
  }, [studentId, feedbackUrl]);

  return (
    <div className="student-feedback">
      <h2>Student Feedback</h2>
      {feedback ? (
        <div className="feedback-content">
          <p>{feedback}</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      ) : (
        <div className="loading-message">
          <p>Loading feedback...</p>
        </div>
      )}
    </div>
  );
};

export default StudentFeedback;