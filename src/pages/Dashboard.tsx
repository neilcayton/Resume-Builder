import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface Resume {
  id: string;
  title: string;
  template: string;
  lastUpdated: string;
  createdAt?: string;
}

const Dashboard: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'lastUpdated' | 'title'>('lastUpdated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResumes = async () => {
      if (!auth.currentUser) return;

      try {
        setLoading(true);
        setError('');
        const userId = auth.currentUser.uid;
        // Use the subcollection path for users/{userId}/resumes
        const resumesRef = collection(db, `users/${userId}/resumes`);
        const querySnapshot = await getDocs(resumesRef);
        
        const resumeList: Resume[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          resumeList.push({
            id: doc.id,
            title: data.title || 'Untitled Resume',
            template: data.template || 'basic',
            lastUpdated: data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : 'N/A',
            createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'
          });
        });
        
        setResumes(resumeList);
      } catch (err: any) {
        console.error('Error fetching resumes:', err);
        console.error('Detailed error:', {
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        setError('Failed to load your resumes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, []);

  const handleCreateNew = () => {
    navigate('/templates');
  };

  const handleDeleteResume = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      try {
        setDeleteInProgress(id);
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        
        // Use the subcollection path for users/{userId}/resumes
        await deleteDoc(doc(db, `users/${userId}/resumes`, id));
        setResumes(resumes.filter(resume => resume.id !== id));
        
        // Show success message or toast here if you have a notification system
      } catch (err: any) {
        console.error('Error deleting resume:', err);
        console.error('Detailed error:', {
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        setError('Failed to delete resume. Please try again.');
      } finally {
        setDeleteInProgress(null);
      }
    }
  };

  const filteredResumes = resumes
    .filter(resume => 
      resume.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resume.template.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'title') {
        return sortDirection === 'asc' 
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else {
        // Sort by date - we need to convert string dates back to Date objects
        const dateA = a.lastUpdated !== 'N/A' ? new Date(a.lastUpdated) : new Date(0);
        const dateB = b.lastUpdated !== 'N/A' ? new Date(b.lastUpdated) : new Date(0);
        return sortDirection === 'asc' 
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
    });

  const toggleSort = (field: 'lastUpdated' | 'title') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading your resumes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Resumes</h1>
          <p className="text-gray-600 mt-1">Manage and edit your saved resumes</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create New Resume
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 flex items-start">
          <svg className="h-5 w-5 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">{error}</p>
            <button 
              className="text-red-700 underline mt-1 text-sm"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </div>
        </div>
      )}

      {resumes.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search resumes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 pr-10"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => toggleSort('title')}
              className={`px-3 py-2 border rounded-md text-sm flex items-center ${
                sortBy === 'title' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700'
              }`}
            >
              Sort by Name
              {sortBy === 'title' && (
                <svg 
                  className="ml-1 h-4 w-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d={
                    sortDirection === 'asc' 
                      ? "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" 
                      : "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  } clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button 
              onClick={() => toggleSort('lastUpdated')}
              className={`px-3 py-2 border rounded-md text-sm flex items-center ${
                sortBy === 'lastUpdated' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700'
              }`}
            >
              Sort by Date
              {sortBy === 'lastUpdated' && (
                <svg 
                  className="ml-1 h-4 w-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d={
                    sortDirection === 'asc' 
                      ? "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" 
                      : "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  } clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {resumes.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-gray-900">No resumes yet</h3>
          <p className="mt-2 text-gray-500">Get started by creating your first resume.</p>
          <div className="mt-6">
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Resume
            </button>
          </div>
          <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
            <h4 className="font-medium text-blue-800 flex items-center">
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Quick Tip
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              Start by selecting a template that matches your career goals. You can always change it later.
            </p>
          </div>
        </div>
      ) : filteredResumes.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No matching resumes</h3>
          <p className="mt-1 text-gray-500">Try adjusting your search criteria.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {filteredResumes.map((resume) => (
              <li key={resume.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h2 className="text-lg font-medium text-gray-900">{resume.title}</h2>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <p className="flex items-center">
                          <svg className="h-4 w-4 mr-1 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                          </svg>
                          Template: {resume.template}
                        </p>
                        <p className="flex items-center">
                          <svg className="h-4 w-4 mr-1 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Updated: {resume.lastUpdated}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-16 sm:ml-0">
                    <Link
                      to={`/builder/${resume.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteResume(resume.id)}
                      disabled={deleteInProgress === resume.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-200"
                    >
                      {deleteInProgress === resume.id ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resumes.length > 0 && (
        <div className="mt-8 bg-blue-50 rounded-lg p-4 flex items-start">
          <svg className="h-6 w-6 text-blue-500 mr-3 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-medium text-blue-800">Pro Tips</h4>
            <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Keep your resume updated with your latest achievements</li>
              <li>Tailor different resumes for different job applications</li>
              <li>Use the template that best matches the industry you're applying to</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
