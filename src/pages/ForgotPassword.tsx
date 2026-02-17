import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { isRTL } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setError(isRTL ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <img
            src="/image.png"
            alt="Special Offices Company"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            {isRTL
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين'
              : 'Enter your email and we\'ll send you a reset link'}
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isRTL ? 'تم إرسال الرابط' : 'Check your email'}
            </h2>
            <p className="text-gray-600 text-sm">
              {isRTL
                ? `أرسلنا رابط إعادة التعيين إلى ${email}`
                : `We sent a password reset link to ${email}`}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
              {isRTL ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'البريد الإلكتروني' : 'Email address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading
                ? (isRTL ? 'جاري الإرسال...' : 'Sending...')
                : (isRTL ? 'إرسال رابط إعادة التعيين' : 'Send reset link')}
            </button>

            <p className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                {isRTL ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
