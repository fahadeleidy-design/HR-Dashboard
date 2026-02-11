import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { X, Star } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface InterviewScorecardFormProps {
  interview: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function InterviewScorecardForm({ interview, onClose, onSuccess }: InterviewScorecardFormProps) {
  const { currentUser } = useCompany();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    technical_skills_rating: 3,
    communication_rating: 3,
    problem_solving_rating: 3,
    cultural_fit_rating: 3,
    recommendation: 'maybe',
    strengths: '',
    weaknesses: '',
    detailed_feedback: ''
  });
  const { logError } = useErrorHandler();

  const getRatingLabel = (rating: number) => {
    const labels: Record<number, string> = {
      1: 'Poor',
      2: 'Below Average',
      3: 'Average',
      4: 'Good',
      5: 'Excellent'
    };
    return labels[rating] || '';
  };

  const renderStars = (value: number, onChange: (val: number) => void) => {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`p-1 transition-colors ${
              star <= value ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            <Star className={`h-6 w-6 ${star <= value ? 'fill-current' : ''}`} />
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {getRatingLabel(value)}
        </span>
      </div>
    );
  };

  const calculateOverallRating = () => {
    const ratings = [
      formData.technical_skills_rating,
      formData.communication_rating,
      formData.problem_solving_rating,
      formData.cultural_fit_rating
    ];
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !interview) return;

    if (!formData.strengths.trim() || !formData.weaknesses.trim() || !formData.detailed_feedback.trim()) {
      showToast('Please provide all required feedback fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const scorecardData = {
        interview_id: interview.id,
        interviewer_id: currentUser.id,
        technical_skills_rating: formData.technical_skills_rating,
        communication_rating: formData.communication_rating,
        problem_solving_rating: formData.problem_solving_rating,
        cultural_fit_rating: formData.cultural_fit_rating,
        overall_rating: parseFloat(calculateOverallRating()),
        recommendation: formData.recommendation,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        detailed_feedback: formData.detailed_feedback,
        submitted_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('interview_scorecards')
        .insert([scorecardData]);

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('interviews')
        .update({ status: 'completed' })
        .eq('id', interview.id);

      if (updateError) logError(updateError, 'medium', { component: 'InterviewScorecardForm', action: 'updateInterviewStatus' });

      showToast('Interview scorecard submitted successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      logError(error, 'medium', { component: 'InterviewScorecardForm', action: 'submitScorecard' });
      showToast(error.message || 'Failed to submit scorecard', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Interview Scorecard</h2>
            <p className="text-sm text-gray-600 mt-1">
              Candidate: {interview?.application?.candidate?.full_name || 'N/A'} |
              Position: {interview?.application?.job_posting?.job_title || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Rate the candidate on a scale of 1-5 stars for each category.
              Provide detailed feedback to support your evaluation.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Technical Skills *
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Assess the candidate's technical knowledge, expertise, and ability to solve technical problems
              </p>
              {renderStars(formData.technical_skills_rating, (val) =>
                setFormData({ ...formData, technical_skills_rating: val })
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Communication Skills *
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Evaluate clarity of expression, listening skills, and ability to explain complex concepts
              </p>
              {renderStars(formData.communication_rating, (val) =>
                setFormData({ ...formData, communication_rating: val })
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Problem Solving *
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Rate analytical thinking, creativity, and approach to challenges
              </p>
              {renderStars(formData.problem_solving_rating, (val) =>
                setFormData({ ...formData, problem_solving_rating: val })
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Cultural Fit *
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Assess alignment with company values, team dynamics, and work style
              </p>
              {renderStars(formData.cultural_fit_rating, (val) =>
                setFormData({ ...formData, cultural_fit_rating: val })
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Overall Rating</p>
                <p className="text-xs text-gray-600">Calculated average of all ratings</p>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-8 w-8 text-yellow-400 fill-current" />
                <span className="text-3xl font-bold text-gray-900">{calculateOverallRating()}</span>
                <span className="text-gray-600">/ 5.0</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Overall Recommendation *
            </label>
            <select
              value={formData.recommendation}
              onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              required
            >
              <option value="strong_hire">Strong Hire - Outstanding candidate</option>
              <option value="hire">Hire - Good fit for the role</option>
              <option value="maybe">Maybe - Needs further evaluation</option>
              <option value="no_hire">No Hire - Not suitable for this role</option>
              <option value="strong_no_hire">Strong No Hire - Definitely not a fit</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Key Strengths *
            </label>
            <p className="text-xs text-gray-600 mb-2">
              List the candidate's strongest qualities and standout achievements during the interview
            </p>
            <textarea
              value={formData.strengths}
              onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="e.g., Strong problem-solving skills, excellent communication, deep technical knowledge..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Areas for Improvement *
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Identify areas where the candidate could improve or showed weakness
            </p>
            <textarea
              value={formData.weaknesses}
              onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="e.g., Limited experience with specific technologies, needs more practice with..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Detailed Feedback *
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Provide comprehensive feedback about the interview, including specific examples and observations
            </p>
            <textarea
              value={formData.detailed_feedback}
              onChange={(e) => setFormData({ ...formData, detailed_feedback: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Provide detailed observations about the candidate's performance, answers to questions, technical abilities, behavior, and any other relevant notes..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {loading ? 'Submitting...' : 'Submit Scorecard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
