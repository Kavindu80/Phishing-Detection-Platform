import { Link } from 'react-router-dom';
import { FiGithub, FiMail, FiLinkedin, FiShield } from 'react-icons/fi';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="container mx-auto px-4 lg:px-24 xl:px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-gray-900 text-white p-2 rounded-lg">
                <FiShield className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-gray-900">PhishGuard</span>
            </Link>
            <p className="mt-4 text-sm text-gray-600 max-w-md">
              PhishGuard is a cutting-edge phishing email detection tool that uses machine learning to protect you from email-based threats.
            </p>
            <div className="mt-6 flex space-x-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
                <FiGithub className="h-5 w-5" />
              </a>
              <a href="mailto:contact@example.com" className="text-gray-500 hover:text-gray-700">
                <FiMail className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
                <FiLinkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Product</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/scanner" className="text-sm text-gray-600 hover:text-primary-600">
                  Email Scanner
                </Link>
              </li>
              <li>
                <Link to="/inbox" className="text-sm text-gray-600 hover:text-primary-600">
                  Inbox Integration
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="text-sm text-gray-600 hover:text-primary-600">
                  Analytics
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Support</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/about" className="text-sm text-gray-600 hover:text-primary-600">
                  About
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-gray-600 hover:text-primary-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-gray-600 hover:text-primary-600">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-gray-600 hover:text-primary-600">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} PhishGuard. Final Year Project. All rights reserved.
          </p>
          <p className="mt-2 md:mt-0 text-sm text-gray-500">
            Made with ❤️ by SLTC Students
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 