import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import { FiShield } from 'react-icons/fi';

const RegisterPage = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
    validationSchema: Yup.object({
      username: Yup.string()
        .min(3, 'Username must be at least 3 characters')
        .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .required('Username is required'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
      first_name: Yup.string().required('First name is required'),
      last_name: Yup.string().required('Last name is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Confirm password is required'),
      agreeToTerms: Yup.boolean().oneOf([true], 'You must accept the terms and conditions'),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError('');
        setSuccess('');
        
        const userData = {
          username: values.username,
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          password: values.password,
        };
        
        await register(userData);
        
        setSuccess('Registration successful! Please log in with your credentials.');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        
      } catch (err) {
        console.error('Registration error:', err);
        if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError('An error occurred during registration. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Header with PhishGuard Logo */}
        <div className="text-center">
          {/* PhishGuard Shield Icon - Fixed responsive display */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 bg-white rounded-lg shadow-lg">
              <FiShield className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Sign up</h2>
        </div>

        {/* Registration Form Card - Improved responsive padding */}
        <div className="bg-[#1a1a1a] rounded-2xl p-4 sm:p-6 lg:p-8 border border-[#333333] shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg">
              <span className="text-green-300 text-sm">{success}</span>
            </div>
          )}

          <form className="space-y-4 sm:space-y-5" onSubmit={formik.handleSubmit}>
            {/* Name Fields - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  First name
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base ${
                    formik.touched.first_name && formik.errors.first_name 
                      ? 'border-red-500' 
                      : 'border-[#404040] hover:border-[#505050]'
                  }`}
                  placeholder="Your first name"
                  {...formik.getFieldProps('first_name')}
                />
                {formik.touched.first_name && formik.errors.first_name && (
                  <p className="mt-1 text-xs sm:text-sm text-red-400">{formik.errors.first_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Last name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base ${
                    formik.touched.last_name && formik.errors.last_name 
                      ? 'border-red-500' 
                      : 'border-[#404040] hover:border-[#505050]'
                  }`}
                  placeholder="Your last name"
                  {...formik.getFieldProps('last_name')}
                />
                {formik.touched.last_name && formik.errors.last_name && (
                  <p className="mt-1 text-xs sm:text-sm text-red-400">{formik.errors.last_name}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#d1d5db] mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base ${
                  formik.touched.email && formik.errors.email 
                    ? 'border-red-500' 
                    : 'border-[#404040] hover:border-[#505050]'
                }`}
                placeholder="Your email address"
                {...formik.getFieldProps('email')}
              />
              {formik.touched.email && formik.errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-red-400">{formik.errors.email}</p>
              )}
            </div>

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#d1d5db] mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base ${
                  formik.touched.username && formik.errors.username 
                    ? 'border-red-500' 
                    : 'border-[#404040] hover:border-[#505050]'
                }`}
                placeholder="Choose a username"
                {...formik.getFieldProps('username')}
              />
              {formik.touched.username && formik.errors.username && (
                <p className="mt-1 text-xs sm:text-sm text-red-400">{formik.errors.username}</p>
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
                  autoComplete="new-password"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base ${
                    formik.touched.password && formik.errors.password 
                      ? 'border-red-500' 
                      : 'border-[#404040] hover:border-[#505050]'
                  }`}
                  placeholder="Create a password"
                  {...formik.getFieldProps('password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#6b7280] hover:text-[#9ca3af] transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#6b7280] hover:text-[#9ca3af] transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="mt-1 text-xs sm:text-sm text-red-400">{formik.errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#d1d5db] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base ${
                    formik.touched.confirmPassword && formik.errors.confirmPassword 
                      ? 'border-red-500' 
                      : 'border-[#404040] hover:border-[#505050]'
                  }`}
                  placeholder="Confirm your password"
                  {...formik.getFieldProps('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#6b7280] hover:text-[#9ca3af] transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#6b7280] hover:text-[#9ca3af] transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <p className="mt-1 text-xs sm:text-sm text-red-400">{formik.errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="w-full bg-white text-black py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
            >
              {formik.isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </div>
              ) : (
                'Continue'
              )}
            </button>

            {/* Divider */}
            <div className="relative my-5 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#404040]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1a1a1a] text-[#9ca3af]">OR</span>
              </div>
            </div>

            {/* Social Login Buttons - Improved responsive spacing */}
            <div className="space-y-2.5 sm:space-y-3">
              <button 
                type="button"
                className="w-full flex items-center justify-center py-2.5 sm:py-3 px-4 border border-[#404040] rounded-lg bg-[#2a2a2a] text-[#d1d5db] hover:bg-[#333333] transition-colors text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="truncate">Continue with Google</span>
              </button>

              <button 
                type="button"
                className="w-full flex items-center justify-center py-2.5 sm:py-3 px-4 border border-[#404040] rounded-lg bg-[#2a2a2a] text-[#d1d5db] hover:bg-[#333333] transition-colors text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="truncate">Continue with GitHub</span>
              </button>

              <button 
                type="button"
                className="w-full flex items-center justify-center py-2.5 sm:py-3 px-4 border border-[#404040] rounded-lg bg-[#2a2a2a] text-[#d1d5db] hover:bg-[#333333] transition-colors text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span className="truncate">Continue with Apple</span>
              </button>
            </div>

            {/* Terms & Conditions - Improved responsive layout */}
            <div className="flex items-start mt-4 sm:mt-6">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-[#404040] bg-[#2a2a2a] rounded mt-0.5 flex-shrink-0"
                {...formik.getFieldProps('agreeToTerms')}
              />
              <label htmlFor="agreeToTerms" className="ml-2 text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-blue-400 hover:text-blue-300 font-medium underline">
                  Terms and Conditions
                </Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-blue-400 hover:text-blue-300 font-medium underline">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {formik.touched.agreeToTerms && formik.errors.agreeToTerms && (
              <p className="mt-1 text-xs sm:text-sm text-red-400">{formik.errors.agreeToTerms}</p>
            )}
          </form>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-sm sm:text-base text-[#9ca3af]">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:text-[#d1d5db] font-medium underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Terms at bottom - Improved responsive text */}
        <div className="text-center text-xs text-[#6b7280] mt-6 sm:mt-8 px-4">
          By creating an account, you agree to the<br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          <Link to="/terms" className="hover:text-[#9ca3af] underline">Terms of Service</Link> and <Link to="/privacy" className="hover:text-[#9ca3af] underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 