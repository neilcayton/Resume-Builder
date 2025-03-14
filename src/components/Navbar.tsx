import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface NavbarProps {
  user: any;
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                ResumeForge
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link 
                to="/" 
                className={`${isActive('/') ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:border-blue-300 hover:text-blue-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                title="Go to home page"
              >
                Home
              </Link>
              <Link 
                to="/templates" 
                className={`${isActive('/templates') ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:border-blue-300 hover:text-blue-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                title="Browse resume templates"
              >
                Templates
              </Link>
              {user && (
                <Link 
                  to="/dashboard" 
                  className={`${isActive('/dashboard') ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:border-blue-300 hover:text-blue-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                  title="View your resumes"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate max-w-[150px]" title={user.email}>
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
                  title="Sign out of your account"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm7 2a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  title="Log in to your account"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  title="Create a new account"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden absolute w-full bg-white shadow-lg z-50">
          <div className="pt-2 pb-3 space-y-1">
            <Link 
              to="/" 
              className={`block pl-3 pr-4 py-2 ${isActive('/') ? 'border-l-4 border-blue-500 bg-blue-50 text-blue-700' : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-700'}`}
              onClick={closeMenu}
            >
              Home
            </Link>
            <Link 
              to="/templates" 
              className={`block pl-3 pr-4 py-2 ${isActive('/templates') ? 'border-l-4 border-blue-500 bg-blue-50 text-blue-700' : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-700'}`}
              onClick={closeMenu}
            >
              Templates
            </Link>
            {user && (
              <Link 
                to="/dashboard" 
                className={`block pl-3 pr-4 py-2 ${isActive('/dashboard') ? 'border-l-4 border-blue-500 bg-blue-50 text-blue-700' : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-700'}`}
                onClick={closeMenu}
              >
                Dashboard
              </Link>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user ? (
              <div className="space-y-2">
                <div className="px-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    closeMenu();
                  }}
                  className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <Link 
                  to="/login" 
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-700"
                  onClick={closeMenu}
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-700"
                  onClick={closeMenu}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
