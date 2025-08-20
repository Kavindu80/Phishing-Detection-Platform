import { Link } from 'react-router-dom';
import { FiShield, FiMail, FiBarChart2, FiGlobe, FiCpu, FiAlertTriangle } from 'react-icons/fi';
import Button from '../components/common/Button';

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative gradient-bg text-white min-h-screen flex items-center overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
        </div>
        
        <div className="relative container mx-auto px-4 lg:px-16 xl:px-4 py-24 lg:py-32 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.15] md:leading-[1.12] lg:leading-[1.1] pb-1">
                Protect Your Inbox from 
                <span className="block text-white drop-shadow-lg pb-1 md:pb-1.5">
                  Phishing Attacks
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-10 text-white/95 max-w-2xl mx-auto lg:mx-0 leading-relaxed drop-shadow-sm">
                PhishGuard uses advanced machine learning to detect and block phishing emails before they can harm you. Our multilingual detection system works across languages to keep you safe.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <Button 
                  to="/public-scanner" 
                  size="lg" 
                  className="!bg-white !text-gray-900 hover:!bg-gray-50 hover:!text-gray-800 !border-white hover:!border-gray-50 shadow-2xl hover:shadow-3xl font-semibold text-lg px-8 py-4 transform hover:scale-105 transition-all duration-300"
                >
                  Try Scanner Now
                </Button>
                <Button 
                  to="/register" 
                  size="lg" 
                  variant="outline" 
                  className="!border-2 !border-white !bg-white/20 !text-white hover:!bg-white hover:!text-gray-900 hover:!border-white font-semibold text-lg px-8 py-4 backdrop-blur-md transform hover:scale-105 transition-all duration-300"
                >
                  Create Free Account
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="cursor-card p-8 rounded-3xl shadow-2xl border border-white/30 transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-4 h-4 rounded-full bg-red-500 mr-3 shadow-sm"></div>
                  <div className="w-4 h-4 rounded-full bg-yellow-500 mr-3 shadow-sm"></div>
                  <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm"></div>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                  <div className="flex items-start mb-6">
                    <div className="bg-red-100 text-red-600 p-3 rounded-2xl mr-4 flex-shrink-0 shadow-sm">
                      <FiAlertTriangle size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">Suspicious Email Detected</p>
                      <p className="text-sm text-gray-600 mt-1">From: bank-security@secur1ty-alert.com</p>
                      <p className="text-sm text-gray-600">Subject: Your account has been locked</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 mb-6 shadow-sm">
                    <p className="text-sm text-gray-800 leading-relaxed">Dear Customer, Your account has been locked due to suspicious activity. Click <span className="text-blue-600 font-semibold underline">here</span> to verify your identity and restore access.</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
                    <p className="text-sm font-bold text-red-800 mb-3">⚠️ Phishing Detected (95% confidence)</p>
                    <ul className="text-xs text-red-700 space-y-2">
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                        Suspicious sender domain
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                        Urgency tactics detected
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                        Link leads to fake website
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="bg-white py-24">
        <div className="container mx-auto px-4 lg:px-16 xl:px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-8">How it works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Our three-step process makes email security simple and effective
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
              {/* Step 1 - Extract */}
              <div className="relative text-center lg:text-left">
                <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <FiMail className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Extract</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      The email content is extracted and preprocessed for analysis.
                    </p>
                  </div>
                </div>
                {/* Enhanced connector line */}
                <div className="hidden lg:block absolute top-8 -right-8 w-16 h-0.5 bg-gradient-to-r from-blue-300 to-green-300"></div>
              </div>

              {/* Step 2 - Translate */}
              <div className="relative text-center lg:text-left">
                <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <FiGlobe className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Translate</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      Multi-language content is translated into a standardized format.
                    </p>
                  </div>
                </div>
                {/* Enhanced connector line */}
                <div className="hidden lg:block absolute top-8 -right-8 w-16 h-0.5 bg-gradient-to-r from-green-300 to-purple-300"></div>
              </div>

              {/* Step 3 - Classify */}
              <div className="relative text-center lg:text-left">
                <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <FiShield className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Classify</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      AI classifies the email as phishing or legitimate with high accuracy.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Features Row */}
            <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all duration-300 group transform hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiCpu className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">AI-Powered</h4>
                <p className="text-gray-600">Advanced machine learning algorithms</p>
              </div>

              <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all duration-300 group transform hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiGlobe className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Multi-Language</h4>
                <p className="text-gray-600">Supports 50+ languages globally</p>
              </div>

              <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all duration-300 group transform hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiBarChart2 className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Real-time</h4>
                <p className="text-gray-600">Instant threat detection and analysis</p>
              </div>

              <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all duration-300 group transform hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiAlertTriangle className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Accurate</h4>
                <p className="text-gray-600">99.5% detection accuracy rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-24">
        <div className="container mx-auto px-4 lg:px-16 xl:px-4">
          <div className="mb-20 text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-8">Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              PhishGuard offers a comprehensive suite of features to help you stay protected from phishing attacks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-10 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1">
              <div className="mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiShield className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Real-time Detection</h3>
              <p className="text-gray-600 leading-relaxed">
                Detect phishing emails in real-time as they arrive in your inbox.
              </p>
            </div>

            <div className="bg-white p-10 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1">
              <div className="mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiBarChart2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Content Analysis</h3>
              <p className="text-gray-600 leading-relaxed">
                Analyze email content, including text, links, and attachments, to identify suspicious patterns.
              </p>
            </div>

            <div className="bg-white p-10 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1">
              <div className="mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiCpu className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Fast Processing</h3>
              <p className="text-gray-600 leading-relaxed">
                Get instant results with our fast and efficient processing engine.
              </p>
            </div>

            <div className="bg-white p-10 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1">
              <div className="mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiGlobe className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Multi-language Support</h3>
              <p className="text-gray-600 leading-relaxed">
                Support for multiple languages, ensuring protection against phishing attempts from around the world.
              </p>
            </div>
          </div>

          {/* Additional Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="bg-white p-10 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1">
              <div className="mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiMail className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Email Integration</h3>
              <p className="text-gray-600 leading-relaxed">
                Seamlessly integrate with popular email providers including Gmail, Outlook, and more for automatic protection.
              </p>
            </div>

            <div className="bg-white p-10 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1">
              <div className="mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiAlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Advanced Analytics</h3>
              <p className="text-gray-600 leading-relaxed">
                Comprehensive reporting and analytics to track threats, analyze patterns, and improve your security posture.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-black text-white py-24 relative overflow-hidden">
        {/* Geometric background elements */}
        <div className="absolute inset-0">
          {/* Large geometric shape - top right */}
          <div className="absolute top-0 right-0 w-96 h-96 transform translate-x-48 -translate-y-48">
            <div className="w-full h-full bg-gradient-to-br from-purple-500 via-blue-500 to-green-400 transform rotate-45 opacity-20"></div>
          </div>
          
          {/* Medium geometric shape - bottom left */}
          <div className="absolute bottom-0 left-0 w-64 h-64 transform -translate-x-32 translate-y-32">
            <div className="w-full h-full bg-gradient-to-tr from-blue-400 via-purple-500 to-pink-500 transform rotate-12 opacity-15"></div>
          </div>
          
          {/* Small geometric accents */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 transform -translate-x-16 -translate-y-16">
            <div className="w-full h-full bg-gradient-to-bl from-yellow-400 to-orange-500 transform rotate-45 opacity-10"></div>
          </div>
          
          <div className="absolute bottom-1/3 right-1/3 w-24 h-24 transform translate-x-12 translate-y-12">
            <div className="w-full h-full bg-gradient-to-tr from-green-400 to-blue-500 transform rotate-12 opacity-10"></div>
          </div>
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 lg:px-16 xl:px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content side */}
            <div className="text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
                Ready to Protect Your Inbox?
              </h2>
              <p className="text-xl mb-12 max-w-2xl mx-auto lg:mx-0 text-gray-300 leading-relaxed">
                Join thousands of users who trust PhishGuard to keep their emails safe from phishing attacks.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <Button 
                  to="/register" 
                  size="lg" 
                  className="!bg-white !text-black hover:!bg-gray-100 hover:!text-black !border-white hover:!border-gray-100 shadow-2xl hover:shadow-3xl font-semibold text-lg px-8 py-4 transform hover:scale-105 transition-all duration-300"
                >
                  Sign Up Free
                </Button>
                <Button 
                  to="/public-scanner" 
                  size="lg" 
                  variant="outline" 
                  className="!border-2 !border-white !bg-transparent !text-white hover:!bg-white hover:!text-black hover:!border-white font-semibold text-lg px-8 py-4 backdrop-blur-md transform hover:scale-105 transition-all duration-300"
                >
                  Try Scanner
                </Button>
              </div>
            </div>
            
            {/* Geometric design side */}
            <div className="hidden lg:flex justify-center items-center">
              <div className="relative w-80 h-80">
                {/* Main geometric shape */}
                <div className="absolute inset-0 transform rotate-12">
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 via-blue-500 via-green-400 to-yellow-400 transform skew-y-6 opacity-80 rounded-3xl shadow-2xl"></div>
                </div>
                
                {/* Secondary shape */}
                <div className="absolute top-8 left-8 w-64 h-64 transform -rotate-6">
                  <div className="w-full h-full bg-gradient-to-tl from-blue-400 via-purple-500 to-pink-500 transform -skew-y-3 opacity-60 rounded-2xl"></div>
                </div>
                
                {/* Accent shape */}
                <div className="absolute top-16 left-16 w-48 h-48 transform rotate-45">
                  <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/5 transform skew-x-6 backdrop-blur-sm rounded-xl border border-white/10"></div>
                </div>
                
                {/* Small geometric elements */}
                <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 transform rotate-45 rounded-lg opacity-70"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 transform -rotate-12 rounded-lg opacity-70"></div>
                <div className="absolute bottom-8 right-8 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 transform rotate-12 rounded-full opacity-70"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 