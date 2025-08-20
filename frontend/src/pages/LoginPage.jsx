import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import { FiShield } from 'react-icons/fi';

const LoginPage = () => {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  // Ensure browser back button has a safe destination (Home) when arriving via protected redirect
  useEffect(() => {
    try {
      const historyLen = window.history.length || 0;
      const ref = document.referrer || '';
      let cameFromSameAppLogin = false;
      if (ref) {
        const url = new URL(ref);
        cameFromSameAppLogin = url.origin === window.location.origin && url.pathname === '/login';
      }
      const hasMeaningfulBack = historyLen > 1 && !cameFromSameAppLogin;
      if (!hasMeaningfulBack) {
        // Insert Home behind the current login entry so Back goes to '/'
        window.history.pushState({}, '', '/');
        window.history.pushState({}, '', location.pathname);
      }
    } catch {
      // ignore history errors
    }
  }, [location.pathname]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User already authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
    validationSchema: Yup.object({
      username: Yup.string().required('Username or email is required'),
      password: Yup.string().required('Password is required'),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError('');
        console.log('Submitting login form with username:', values.username);
        await login(values.username, values.password);
        console.log('Login successful, redirecting to:', from);
        navigate(from, { replace: true });
      } catch (err) {
        console.error('Login error:', err);
        if (err.response?.status === 401) {
          setError('Invalid username or password. Please try again.');
        } else if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError('An error occurred during login. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header with PhishGuard Logo */}
        <div className="text-center">
          {/* PhishGuard Shield Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-white rounded-lg">
              <FiShield className="h-6 w-6 text-black" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Sign in</h2>
        </div>

        {/* Login Form Card */}
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#333333]">
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={formik.handleSubmit}>
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#d1d5db] mb-2">
                Username or Email
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className={`w-full px-4 py-3 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  formik.touched.username && formik.errors.username 
                    ? 'border-red-500' 
                    : 'border-[#404040]'
                }`}
                placeholder="Enter your username or email"
                {...formik.getFieldProps('username')}
              />
              {formik.touched.username && formik.errors.username && (
                <p className="mt-1 text-sm text-red-400">{formik.errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#d1d5db] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`w-full px-4 py-3 pr-12 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    formik.touched.password && formik.errors.password 
                      ? 'border-red-500' 
                      : 'border-[#404040]'
                  }`}
                  placeholder="Enter your password"
                  {...formik.getFieldProps('password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-[#6b7280] hover:text-[#9ca3af]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-[#6b7280] hover:text-[#9ca3af]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="mt-1 text-sm text-red-400">{formik.errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-[#404040] bg-[#2a2a2a] rounded"
                  {...formik.getFieldProps('rememberMe')}
                />
                <span className="ml-2 text-sm text-[#9ca3af]">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="w-full bg-white text-black py-3 px-4 rounded-lg font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {formik.isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Continue'
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#404040]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1a1a1a] text-[#9ca3af]">OR</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <button 
                type="button"
                className="w-full flex items-center justify-center py-3 px-4 border border-[#404040] rounded-lg bg-[#2a2a2a] text-[#d1d5db] hover:bg-[#333333] transition-colors"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button 
                type="button"
                className="w-full flex items-center justify-center py-3 px-4 border border-[#404040] rounded-lg bg-[#2a2a2a] text-[#d1d5db] hover:bg-[#333333] transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </button>

              <button 
                type="button"
                className="w-full flex items-center justify-center py-3 px-4 border border-[#404040] rounded-lg bg-[#2a2a2a] text-[#d1d5db] hover:bg-[#333333] transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>
          </form>
        </div>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-[#9ca3af]">
            Don't have an account?{' '}
            <Link to="/register" className="text-white hover:text-[#d1d5db] font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Terms at bottom */}
        <div className="text-center text-xs text-[#6b7280] mt-8">
          By signing in, you agree to the<br />
          <Link to="/terms" className="hover:text-[#9ca3af]">Terms of Service</Link> and <Link to="/privacy" className="hover:text-[#9ca3af]">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 