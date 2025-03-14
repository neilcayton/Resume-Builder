import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface Template {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
  recommended?: boolean;
}

const templates: Template[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'A timeless template with a clean and professional layout.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    tags: ['Professional', 'Simple', 'Traditional'],
    recommended: true
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'A contemporary design with a sleek and minimalist approach.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    tags: ['Creative', 'Modern', 'Minimalist']
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'An elegant template for senior professionals and executives.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    tags: ['Executive', 'Professional', 'Elegant']
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'A bold and artistic template for creative professionals.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    tags: ['Creative', 'Artistic', 'Bold']
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Optimized for technical roles with skills emphasis.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    tags: ['Technical', 'IT', 'Engineering'],
    recommended: true
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Ideal for academic and research positions.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    tags: ['Academic', 'Research', 'Education']
  }
];

const TemplateGallery: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingResume, setCreatingResume] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(!!auth.currentUser);
    };
    
    checkAuth();
    const unsubscribe = auth.onAuthStateChanged(() => {
      checkAuth();
    });
    
    return () => unsubscribe();
  }, []);

  // Get all unique tags from templates
  const allTags = Array.from(new Set(templates.flatMap(template => template.tags)));

  const filteredTemplates = templates.filter(template => {
    // Filter by search term
    const matchesSearch = 
      template.name.toLowerCase().includes(filter.toLowerCase()) || 
      template.description.toLowerCase().includes(filter.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()));
    
    // Filter by selected tag
    const matchesTag = !activeTag || template.tags.includes(activeTag);
    
    return matchesSearch && matchesTag;
  });

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    // Scroll to the bottom where the "Use this template" button is
    setTimeout(() => {
      document.getElementById('create-resume-button')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCreateResume = async () => {
    if (!selectedTemplate) {
      setError('Please select a template first');
      return;
    }

    if (!auth.currentUser) {
      // Store the selected template in session storage so we can use it after login
      sessionStorage.setItem('selectedTemplate', selectedTemplate);
      navigate('/login?redirect=templates');
      return;
    }

    setCreatingResume(true);
    setLoading(true);
    setError('');

    try {
      const userId = auth.currentUser.uid;
      
      // Ensure user document exists
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(userDocRef, {
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName || '',
          photoURL: auth.currentUser.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Create new resume document in the user's resumes subcollection
      const resumeData = {
        title: 'Untitled Resume',
        template: selectedTemplate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: {
          personalInfo: {
            name: auth.currentUser.displayName || '',
            email: auth.currentUser.email || '',
            phone: '',
            address: '',
            linkedin: '',
            website: ''
          },
          education: [],
          experience: [],
          skills: [],
          projects: [],
          certifications: []
        }
      };

      // Use the subcollection path for users/{userId}/resumes
      const userResumesRef = collection(db, `users/${userId}/resumes`);
      const docRef = await addDoc(userResumesRef, resumeData);
      
      console.log("Resume created successfully with ID:", docRef.id);
      
      // Create user settings if they don't exist
      const userSettingsRef = doc(db, 'userSettings', userId);
      const userSettingsDoc = await getDoc(userSettingsRef);
      
      if (!userSettingsDoc.exists()) {
        await setDoc(userSettingsRef, {
          userId: userId,
          recentlyUsed: {
            resumes: [docRef.id],
            templates: [selectedTemplate]
          },
          preferences: {
            theme: 'light',
            language: 'en'
          }
        });
      } else {
        // Update recently used resumes in user settings
        const settings = userSettingsDoc.data();
        const recentResumes = settings.recentlyUsed?.resumes || [];
        const updatedResumes = [docRef.id, ...recentResumes.filter((id: string) => id !== docRef.id)].slice(0, 10);
        
        await setDoc(userSettingsRef, {
          ...settings,
          recentlyUsed: {
            ...settings.recentlyUsed,
            resumes: updatedResumes,
            templates: [selectedTemplate, ...(settings.recentlyUsed?.templates || []).filter((id: string) => id !== selectedTemplate)].slice(0, 5)
          }
        }, { merge: true });
      }
      
      navigate(`/builder/${docRef.id}`);
    } catch (err: any) {
      console.error('Error creating resume:', err);
      console.error('Detailed error:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      setError(`Failed to create resume: ${err.message}`);
      setCreatingResume(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag(null); // Toggle off if already active
    } else {
      setActiveTag(tag);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Choose a Template
        </h1>
        <p className="mt-4 text-xl text-gray-500">
          Select a template to start building your professional resume
        </p>
        {!isLoggedIn && (
          <div className="mt-4 bg-blue-50 text-blue-700 p-4 rounded-md inline-flex items-start max-w-md mx-auto">
            <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-left text-sm">
              You'll need to log in or create an account to save your resume. You can still browse templates without logging in.
            </p>
          </div>
        )}
      </div>

      <div className="mb-8 space-y-4">
        <div className="max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search templates..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              aria-label="Search templates"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeTag === tag
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors duration-200 flex items-center"
            >
              Clear filter
              <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 max-w-md mx-auto flex items-start">
          <svg className="h-5 w-5 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p>{error}</p>
            <button 
              className="text-red-700 underline mt-1 text-sm"
              onClick={() => setError('')}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {filteredTemplates.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center max-w-md mx-auto">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No matching templates</h3>
          <p className="mt-1 text-gray-500">Try adjusting your search criteria or filters.</p>
          <div className="mt-4 flex justify-center space-x-2">
            <button
              onClick={() => setFilter('')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear search
            </button>
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all duration-200 relative ${
                selectedTemplate === template.id ? 'ring-2 ring-blue-500 transform scale-[1.02]' : 'hover:shadow-lg'
              }`}
              onClick={() => handleSelectTemplate(template.id)}
              tabIndex={0}
              role="button"
              aria-pressed={selectedTemplate === template.id}
              aria-label={`Select ${template.name} template`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelectTemplate(template.id);
                  e.preventDefault();
                }
              }}
            >
              {template.recommended && (
                <div className="absolute top-0 right-0 mt-2 mr-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  Recommended
                </div>
              )}
              <div className="h-48 overflow-hidden">
                <img
                  src={template.image}
                  alt={`${template.name} template preview`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        activeTag === tag 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {selectedTemplate === template.id && (
                  <div className="mt-3 flex items-center text-blue-600">
                    <svg className="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Selected
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div id="create-resume-button" className="mt-12 text-center">
        <button
          onClick={handleCreateResume}
          disabled={!selectedTemplate || creatingResume}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
        >
          {creatingResume ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Use this template
            </>
          )}
        </button>
        {!selectedTemplate && (
          <p className="mt-2 text-sm text-gray-500">Please select a template first</p>
        )}
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg p-6 max-w-3xl mx-auto">
        <h3 className="text-lg font-medium text-blue-800 mb-3">How to choose the right template</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-blue-500 text-white">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-md font-medium text-blue-700">Consider your industry</h4>
              <p className="mt-1 text-sm text-blue-600">
                Choose a template that aligns with the norms of your industry. Creative fields allow for more design elements, while traditional industries prefer classic formats.
              </p>
            </div>
          </div>
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-blue-500 text-white">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-md font-medium text-blue-700">ATS Compatibility</h4>
              <p className="mt-1 text-sm text-blue-600">
                All our templates are designed to be ATS-friendly, ensuring your resume gets past automated screening systems.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateGallery;
