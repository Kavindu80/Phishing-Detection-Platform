import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import AuthFooter from './AuthFooter';
import { useAuth } from '../../hooks/useAuth';

const Layout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  // Check if current page is login or register
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthPage && <Header />}
      <main className={`flex-grow ${!isHomePage && !isAuthPage ? 'pt-16 md:pt-18 lg:pt-20' : ''}`}>
        <Outlet />
      </main>
      {!isAuthPage && (isAuthenticated ? <AuthFooter /> : <Footer />)}
    </div>
  );
};

export default Layout; 