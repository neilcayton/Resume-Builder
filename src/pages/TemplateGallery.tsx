import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface Template {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
}

const templates: Template[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'A timeless template with a clean and professional layout.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    tags: ['Professional', 'Simple', 'Traditional']
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
    tags: ['Technical', 'IT', 'Engineering']
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
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(filter.toLowerCase()) || 
    template.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
  );

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleCreateResume = async () => {
    if (!selectedTemplate) {
      setError('Please select a template first');
      return;
    }

    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Choose a Template
        </h1>
        <p className="mt-4 text-xl text-gray-500">
          Select a template to start building your professional resume
        </p>
      </div>

      <div className="mb-8">
        <div className="max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search templates..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 max-w-md mx-auto">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all duration-200 ${
              selectedTemplate === template.id ? 'ring-2 ring-blue-500 transform scale-[1.02]' : 'hover:shadow-lg'
            }`}
            onClick={() => handleSelectTemplate(template.id)}
          >
            <div className="h-48 overflow-hidden">
              <img
                src={template.image}
                alt={template.name}
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
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <button
          onClick={handleCreateResume}
          disabled={!selectedTemplate || loading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            'Use this template'
          )}
        </button>
      </div>
    </div>
  );
};

export default TemplateGallery;
