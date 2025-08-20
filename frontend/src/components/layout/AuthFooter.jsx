const AuthFooter = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 py-2">
      <div className="container mx-auto px-4">
        <p className="text-xs text-center text-gray-500">
          &copy; {currentYear} PhishGuard. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default AuthFooter; 