import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { FiMenu, FiX, FiUser, FiLogOut, FiSettings, FiShield } from 'react-icons/fi';
import Button from '../common/Button';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isProfileOpen) setIsProfileOpen(false);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    if (isMenuOpen) setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    // Navigate to homepage after logout
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isHomePage = location.pathname === '/';

  // Prefer to display username; fallback to full name then email
  const displayName = user?.username || (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.name) || 'User';

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    >
      {/* Container with proper margins like Cursor */}
      <div className="mx-4 lg:mx-12 xl:mx-12">
        <div className={`rounded-2xl transition-all duration-300 ${
          isScrolled || !isHomePage 
            ? 'bg-white border border-gray-100 shadow-sm mt-4 mb-2' 
            : 'bg-transparent mt-6'
        }`}>
          <div className="px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <Link 
                  to={isAuthenticated ? "/dashboard" : "/"} 
                  className="flex items-center space-x-3 group"
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    isScrolled || !isHomePage 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-white/10 text-white backdrop-blur-sm'
                  }`}>
                    <FiShield className="h-5 w-5" />
                  </div>
                  <span className={`font-bold text-lg tracking-tight transition-colors ${
                    isScrolled || !isHomePage 
                      ? 'text-gray-900' 
                      : 'text-white'
                  }`}>
                    PhishGuard
                  </span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-8">
                {isAuthenticated ? (
                  <>
                    <Link 
                      to="/dashboard" 
                      className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        isActive('/dashboard') 
                          ? (isScrolled || !isHomePage ? 'text-gray-900 font-semibold' : 'text-white font-semibold')
                          : (isScrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900' : 'text-white/90 hover:text-white')
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/scanner" 
                      className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        isActive('/scanner') 
                          ? (isScrolled || !isHomePage ? 'text-gray-900 font-semibold' : 'text-white font-semibold')
                          : (isScrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900' : 'text-white/90 hover:text-white')
                      }`}
                    >
                      Scanner
                    </Link>
                    <Link 
                      to="/inbox" 
                      className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        isActive('/inbox') 
                          ? (isScrolled || !isHomePage ? 'text-gray-900 font-semibold' : 'text-white font-semibold')
                          : (isScrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900' : 'text-white/90 hover:text-white')
                      }`}
                    >
                      Inbox
                    </Link>
                    <Link 
                      to="/analytics" 
                      className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        isActive('/analytics') 
                          ? (isScrolled || !isHomePage ? 'text-gray-900 font-semibold' : 'text-white font-semibold')
                          : (isScrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900' : 'text-white/90 hover:text-white')
                      }`}
                    >
                      Analytics
                    </Link>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/" 
                      className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        isActive('/') 
                          ? (isScrolled || !isHomePage ? 'text-gray-900 font-semibold' : 'text-white font-semibold')
                          : (isScrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900' : 'text-white/90 hover:text-white')
                      }`}
                    >
                      Home
                    </Link>
                    <Link 
                      to="/public-scanner" 
                      className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        isActive('/public-scanner') 
                          ? (isScrolled || !isHomePage ? 'text-gray-900 font-semibold' : 'text-white font-semibold')
                          : (isScrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900' : 'text-white/90 hover:text-white')
                      }`}
                    >
                      Try Scanner
                    </Link>
                  </>
                )}
              </nav>

              {/* Right side actions */}
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <div className="relative">
                    <button 
                      onClick={toggleProfile}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                        isScrolled || !isHomePage 
                          ? 'text-gray-700 hover:bg-gray-50' 
                          : 'text-white hover:bg-white/10 backdrop-blur-sm'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isScrolled || !isHomePage 
                          ? 'bg-gray-100 text-gray-700' 
                          : 'bg-white/20 text-white backdrop-blur-sm'
                      }`}>
                        {displayName ? displayName.charAt(0).toUpperCase() : <FiUser className="w-4 h-4" />}
                      </div>
                      <span className="hidden md:inline-block text-sm font-medium">
                        {displayName}
                      </span>
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg py-2 z-50 border border-gray-100 backdrop-blur-md">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
                        </div>
                        <Link 
                          to="/settings" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <FiSettings className="mr-3 h-4 w-4" />
                          Settings
                        </Link>
                        <button 
                          onClick={handleLogout}
                          className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FiLogOut className="mr-3 h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="hidden md:flex items-center space-x-3">
                    <Link 
                      to="/login" 
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${
                        isScrolled || !isHomePage 
                          ? 'text-gray-700 hover:bg-gray-50' 
                          : 'text-white hover:bg-white/10 backdrop-blur-sm'
                      }`}
                    >
                      Login
                    </Link>
                    <button 
                      onClick={() => navigate('/register')}
                      className={`px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 transform ${
                        isScrolled || !isHomePage 
                          ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm' 
                          : 'bg-white text-gray-900 hover:bg-gray-50 shadow-lg'
                      }`}
                    >
                      Get Started
                    </button>
                  </div>
                )}

                {/* Mobile menu button */}
                <button
                  onClick={toggleMenu}
                  className={`lg:hidden p-2 rounded-lg transition-all duration-200 ${
                    isScrolled || !isHomePage 
                      ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50' 
                      : 'text-white hover:bg-white/10 backdrop-blur-sm'
                  }`}
                >
                  {isMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden mx-4 lg:mx-8 xl:mx-12">
          <div className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl mt-2 mb-4 shadow-lg">
            <div className="px-6 py-4 space-y-3">
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/dashboard') 
                        ? 'bg-gray-100 text-gray-900 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/scanner" 
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/scanner') 
                        ? 'bg-gray-100 text-gray-900 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Scanner
                  </Link>
                  <Link 
                    to="/inbox" 
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/inbox') 
                        ? 'bg-gray-100 text-gray-900 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Inbox
                  </Link>
                  <Link 
                    to="/analytics" 
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/analytics') 
                        ? 'bg-gray-100 text-gray-900 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Analytics
                  </Link>
                  <Link 
                    to="/settings" 
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/settings') 
                        ? 'bg-gray-100 text-gray-900 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="w-full text-left block px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/" 
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/') 
                        ? 'bg-gray-100 text-gray-900 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link 
                    to="/public-scanner" 
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/public-scanner') 
                        ? 'bg-gray-100 text-gray-900 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Try Scanner
                  </Link>
                  <Link 
                    to="/login" 
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/login') 
                        ? 'bg-gray-100 text-gray-900 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/register');
                      }}
                      className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      Get Started
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 