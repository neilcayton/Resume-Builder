import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ResumeBuilder: React.FC = () => {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('personalInfo');
  const [saveStatus, setSaveStatus] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [resumeTitle, setResumeTitle] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Define handleSave using useCallback to avoid dependency cycle
  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!resumeId || !auth.currentUser || !resumeData) return;

    try {
      setSaveStatus(isAutoSave ? 'Auto-saving...' : 'Saving...');
      const userId = auth.currentUser.uid;
      // Use the subcollection path for users/{userId}/resumes
      const resumeRef = doc(db, `users/${userId}/resumes`, resumeId);
      
      // Create a copy of the data without the id field before saving
      const dataToSave = { ...resumeData };
      delete dataToSave.id; // Remove the id field as it's already the document ID
      
      await updateDoc(resumeRef, {
        ...dataToSave,
        updatedAt: serverTimestamp()
      });
      
      setSaveStatus(isAutoSave ? 'Auto-saved' : 'Saved');
      
      // Clear the save status after 3 seconds
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (err: any) {
      console.error('Error saving resume:', err);
      setSaveStatus(`Error saving: ${err.message}`);
      
      // Show error for longer (5 seconds)
      setTimeout(() => {
        setSaveStatus('');
      }, 5000);
    }
  }, [resumeId, resumeData]);

  useEffect(() => {
    const fetchResumeData = async () => {
      if (!resumeId) {
        setError('No resume ID provided');
        setLoading(false);
        return;
      }
      
      if (!auth.currentUser) {
        // Store the current URL to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        navigate('/login?redirect=builder');
        return;
      }

      try {
        const userId = auth.currentUser.uid;
        // Use the subcollection path for users/{userId}/resumes
        const resumeRef = doc(db, `users/${userId}/resumes`, resumeId);
        const resumeSnap = await getDoc(resumeRef);

        if (!resumeSnap.exists()) {
          setError('Resume not found. It may have been deleted or you may not have permission to access it.');
          setLoading(false);
          return;
        }

        const data = resumeSnap.data();
        setResumeData({
          ...data,
          id: resumeSnap.id
        });
        
        setResumeTitle(data.title || 'Untitled Resume');
        
        // Calculate progress percentage based on filled fields
        calculateProgress(data);
      } catch (err: any) {
        console.error('Error fetching resume:', err);
        console.error('Detailed error:', {
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        setError(`Failed to load resume data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchResumeData();

    // Cleanup function
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [resumeId, navigate, autoSaveTimer]);

  // Calculate completion progress
  const calculateProgress = (data: any) => {
    if (!data || !data.content) {
      setProgressPercentage(0);
      return;
    }
    
    let totalFields = 0;
    let filledFields = 0;
    
    // Count personal info fields
    const personalInfo = data.content.personalInfo || {};
    const personalInfoFields = ['name', 'email', 'phone', 'address', 'linkedin', 'website'];
    totalFields += personalInfoFields.length;
    
    personalInfoFields.forEach(field => {
      if (personalInfo[field] && personalInfo[field].trim() !== '') {
        filledFields++;
      }
    });
    
    // Count other sections (just check if they exist and have items)
    const sections = ['education', 'experience', 'skills', 'projects', 'certifications'];
    sections.forEach(section => {
      if (data.content[section] && Array.isArray(data.content[section])) {
        totalFields += 1; // Count each section as 1 for simplicity
        if (data.content[section].length > 0) {
          filledFields += 1;
        }
      }
    });
    
    const percentage = Math.round((filledFields / totalFields) * 100);
    setProgressPercentage(percentage);
  };

  // Auto-save when resumeData changes
  useEffect(() => {
    if (!resumeData || loading) return;

    // Clear any existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set a new timer for auto-save
    const timer = setTimeout(() => {
      handleSave(true);
    }, 3000); // Auto-save after 3 seconds of inactivity

    setAutoSaveTimer(timer);

    // Cleanup function
    return () => {
      clearTimeout(timer);
    };
  }, [resumeData, autoSaveTimer, handleSave, loading]);

  const handleExportPDF = () => {
    // PDF export functionality will be implemented here
    console.log('Export to PDF');
    alert('PDF export functionality coming soon!');
  };

  const updatePersonalInfo = (field: string, value: string) => {
    const updatedData = {
      ...resumeData,
      content: {
        ...resumeData.content,
        personalInfo: {
          ...resumeData.content.personalInfo,
          [field]: value
        }
      }
    };
    
    setResumeData(updatedData);
    calculateProgress(updatedData);
  };
  
  const handleTitleChange = async () => {
    if (!resumeTitle.trim()) {
      setResumeTitle(resumeData.title || 'Untitled Resume');
      setTitleEditing(false);
      return;
    }
    
    if (resumeTitle !== resumeData.title) {
      const updatedData = {
        ...resumeData,
        title: resumeTitle
      };
      
      setResumeData(updatedData);
      
      // Save title change immediately
      try {
        const userId = auth.currentUser?.uid;
        if (!userId || !resumeId) return;
        
        const resumeRef = doc(db, `users/${userId}/resumes`, resumeId);
        await updateDoc(resumeRef, {
          title: resumeTitle,
          updatedAt: serverTimestamp()
        });
        
        setSaveStatus('Title updated');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (err: any) {
        console.error('Error updating title:', err);
        setSaveStatus(`Error updating title: ${err.message}`);
      }
    }
    
    setTitleEditing(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <h2 className="text-lg font-medium text-gray-700">Loading your resume...</h2>
        <p className="text-sm text-gray-500 mt-2">This will just take a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
              <div className="mt-2 text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-red-50 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Back to Dashboard
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="ml-3 bg-red-50 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex-1 min-w-0 mb-4 sm:mb-0">
              {titleEditing ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    value={resumeTitle}
                    onChange={(e) => setResumeTitle(e.target.value)}
                    onBlur={handleTitleChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTitleChange();
                      } else if (e.key === 'Escape') {
                        setResumeTitle(resumeData.title || 'Untitled Resume');
                        setTitleEditing(false);
                      }
                    }}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg font-bold"
                    autoFocus
                  />
                  <button
                    onClick={handleTitleChange}
                    className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">
                    {resumeTitle}
                  </h1>
                  <button
                    onClick={() => setTitleEditing(true)}
                    className="ml-2 text-gray-400 hover:text-gray-500"
                    aria-label="Edit resume title"
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="mt-1 flex items-center">
                <span className="text-sm text-gray-500">
                  Last updated: {resumeData.updatedAt ? new Date(resumeData.updatedAt.seconds * 1000).toLocaleString() : 'Just now'}
                </span>
                <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {resumeData.template} template
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {saveStatus && (
                <span className={`text-sm ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'} flex items-center`}>
                  {saveStatus.includes('Error') ? (
                    <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {saveStatus}
                </span>
              )}
              <button
                onClick={() => handleSave()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                </svg>
                Save
              </button>
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414L8 12.586l1.293 1.293a1 1 0 001.414 0l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                Export PDF
              </button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">Resume completion</span>
              <span className="text-sm font-medium text-gray-700">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  progressPercentage < 30 ? 'bg-red-500' : 
                  progressPercentage < 70 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`} 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Tips panel */}
        {progressPercentage < 70 && (
          <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-blue-700">
                  Pro tip: A complete resume has a higher chance of getting noticed by employers. Fill in all sections for best results.
                </p>
                <p className="mt-3 text-sm md:mt-0 md:ml-6">
                  <button 
                    onClick={() => setActiveSection('personalInfo')}
                    className="whitespace-nowrap font-medium text-blue-700 hover:text-blue-600"
                  >
                    Complete profile <span aria-hidden="true">&rarr;</span>
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left sidebar - Sections */}
        <div className="w-full md:w-64 bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Resume Sections</h2>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection('personalInfo')}
              className={`w-full flex items-center text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                activeSection === 'personalInfo'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-current={activeSection === 'personalInfo' ? 'page' : undefined}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span>Personal Information</span>
              {resumeData.content.personalInfo && 
               Object.values(resumeData.content.personalInfo).some((value: any) => value && value.trim() !== '') && (
                <svg className="ml-auto h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setActiveSection('education')}
              className={`w-full flex items-center text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                activeSection === 'education'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-current={activeSection === 'education' ? 'page' : undefined}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414L8 12.586l1.293 1.293a1 1 0 001.414 0l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
              <span>Education</span>
              {resumeData.content.education && resumeData.content.education.length > 0 && (
                <svg className="ml-auto h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setActiveSection('experience')}
              className={`w-full flex items-center text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                activeSection === 'experience'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-current={activeSection === 'experience' ? 'page' : undefined}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
              </svg>
              <span>Work Experience</span>
              {resumeData.content.experience && resumeData.content.experience.length > 0 && (
                <svg className="ml-auto h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setActiveSection('skills')}
              className={`w-full flex items-center text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                activeSection === 'skills'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-current={activeSection === 'skills' ? 'page' : undefined}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>Skills</span>
              {resumeData.content.skills && resumeData.content.skills.length > 0 && (
                <svg className="ml-auto h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setActiveSection('projects')}
              className={`w-full flex items-center text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                activeSection === 'projects'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-current={activeSection === 'projects' ? 'page' : undefined}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
              </svg>
              <span>Projects</span>
              {resumeData.content.projects && resumeData.content.projects.length > 0 && (
                <svg className="ml-auto h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setActiveSection('certifications')}
              className={`w-full flex items-center text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                activeSection === 'certifications'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-current={activeSection === 'certifications' ? 'page' : undefined}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
              <span>Certifications</span>
              {resumeData.content.certifications && resumeData.content.certifications.length > 0 && (
                <svg className="ml-auto h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </nav>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Resume Building Tips</h3>
            <ul className="text-xs text-blue-700 space-y-2">
              <li className="flex items-start">
                <svg className="h-4 w-4 text-blue-500 mr-1.5 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Use action verbs to describe your experience</span>
              </li>
              <li className="flex items-start">
                <svg className="h-4 w-4 text-blue-500 mr-1.5 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Quantify achievements with numbers when possible</span>
              </li>
              <li className="flex items-start">
                <svg className="h-4 w-4 text-blue-500 mr-1.5 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Tailor your resume for each job application</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Middle - Form */}
        <div className="flex-1 bg-white shadow rounded-lg p-6">
          {/* Form header */}
          <div className="mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {activeSection === 'personalInfo' && 'Personal Information'}
              {activeSection === 'education' && 'Education'}
              {activeSection === 'experience' && 'Work Experience'}
              {activeSection === 'skills' && 'Skills'}
              {activeSection === 'projects' && 'Projects'}
              {activeSection === 'certifications' && 'Certifications'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {activeSection === 'personalInfo' && 'Add your contact details and basic information.'}
              {activeSection === 'education' && 'Add your educational background, degrees, and certifications.'}
              {activeSection === 'experience' && 'Add your work history and professional experience.'}
              {activeSection === 'skills' && 'List your technical and soft skills.'}
              {activeSection === 'projects' && 'Showcase your notable projects and accomplishments.'}
              {activeSection === 'certifications' && 'Add professional certifications and licenses.'}
            </p>
          </div>

          {/* Form content */}
          {activeSection === 'personalInfo' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={resumeData.content.personalInfo?.name || ''}
                    onChange={(e) => updatePersonalInfo('name', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="John Doe"
                    required
                  />
                  {!resumeData.content.personalInfo?.name && (
                    <p className="mt-1 text-xs text-gray-500">Adding your name helps employers identify your resume.</p>
                  )}
                </div>
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Professional Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={resumeData.content.personalInfo?.title || ''}
                    onChange={(e) => updatePersonalInfo('title', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Software Engineer"
                  />
                  {!resumeData.content.personalInfo?.title && (
                    <p className="mt-1 text-xs text-gray-500">Your professional title helps define your career focus.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={resumeData.content.personalInfo?.email || ''}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={resumeData.content.personalInfo?.phone || ''}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="(123) 456-7890"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={resumeData.content.personalInfo?.location || ''}
                  onChange={(e) => updatePersonalInfo('location', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="City, State, Country"
                />
                <p className="mt-1 text-xs text-gray-500">You can be specific or general based on your preferences.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700">
                    LinkedIn
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      linkedin.com/in/
                    </span>
                    <input
                      type="text"
                      id="linkedin"
                      name="linkedin"
                      value={resumeData.content.personalInfo?.linkedin || ''}
                      onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="johndoe"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={resumeData.content.personalInfo?.website || ''}
                    onChange={(e) => updatePersonalInfo('website', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
                  Professional Summary
                </label>
                <textarea
                  id="summary"
                  name="summary"
                  rows={4}
                  value={resumeData.content.personalInfo?.summary || ''}
                  onChange={(e) => updatePersonalInfo('summary', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Write a short summary highlighting your skills and experience..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  A compelling summary can grab the attention of recruiters. Keep it concise and highlight your key strengths.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveSection('education')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Next: Education
                  <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'education' && (
            <div className="space-y-6">
              {/* Education form placeholder - to be implemented */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Education section is coming soon. This will allow you to add your educational background, degrees, and certifications.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveSection('personalInfo')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L12.586 9H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Previous: Personal Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('experience')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Next: Experience
                  <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Placeholders for other sections */}
          {(activeSection === 'experience' || 
            activeSection === 'skills' || 
            activeSection === 'projects' || 
            activeSection === 'certifications') && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      {activeSection === 'experience' && 'Work Experience section is coming soon. This will allow you to add your work history and professional experience.'}
                      {activeSection === 'skills' && 'Skills section is coming soon. This will allow you to list your technical and soft skills.'}
                      {activeSection === 'projects' && 'Projects section is coming soon. This will allow you to showcase your notable projects and accomplishments.'}
                      {activeSection === 'certifications' && 'Certifications section is coming soon. This will allow you to add professional certifications and licenses.'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSection === 'experience') setActiveSection('education');
                    if (activeSection === 'skills') setActiveSection('experience');
                    if (activeSection === 'projects') setActiveSection('skills');
                    if (activeSection === 'certifications') setActiveSection('projects');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L12.586 9H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  {activeSection === 'experience' && 'Previous: Education'}
                  {activeSection === 'skills' && 'Previous: Experience'}
                  {activeSection === 'projects' && 'Previous: Skills'}
                  {activeSection === 'certifications' && 'Previous: Projects'}
                </button>
                {activeSection !== 'certifications' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSection === 'experience') setActiveSection('skills');
                      if (activeSection === 'skills') setActiveSection('projects');
                      if (activeSection === 'projects') setActiveSection('certifications');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {activeSection === 'experience' && 'Next: Skills'}
                    {activeSection === 'skills' && 'Next: Projects'}
                    {activeSection === 'projects' && 'Next: Certifications'}
                    <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right - Preview */}
        <div className="w-full md:w-96 bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Resume Preview</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  // Toggle preview mode logic would go here
                  alert('Preview mode toggle feature coming soon!');
                }}
                className="inline-flex items-center p-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Toggle preview mode"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  // Refresh preview logic would go here
                  alert('Preview refresh feature coming soon!');
                }}
                className="inline-flex items-center p-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Refresh preview"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="p-4 h-[calc(100vh-20rem)] overflow-auto bg-white">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500">Loading your resume...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <svg className="h-12 w-12 text-red-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-500 font-medium mb-2">Error loading resume</p>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reload page
                </button>
              </div>
            ) : (
              <div className="preview-content" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
                {/* Resume Header */}
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold">{resumeData.content.personalInfo.name || 'Your Name'}</h1>
                  {resumeData.content.personalInfo.title && (
                    <div className="text-md text-gray-700 mb-2">{resumeData.content.personalInfo.title}</div>
                  )}
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-gray-600">
                    {resumeData.content.personalInfo.email && (
                      <div className="flex items-center">
                        <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <span>{resumeData.content.personalInfo.email}</span>
                      </div>
                    )}
                    {resumeData.content.personalInfo.phone && (
                      <div className="flex items-center">
                        <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        <span>{resumeData.content.personalInfo.phone}</span>
                      </div>
                    )}
                    {resumeData.content.personalInfo.location && (
                      <div className="flex items-center">
                        <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span>{resumeData.content.personalInfo.location}</span>
                      </div>
                    )}
                    {resumeData.content.personalInfo.linkedin && (
                      <div className="flex items-center">
                        <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                        </svg>
                        <span>linkedin.com/in/{resumeData.content.personalInfo.linkedin}</span>
                      </div>
                    )}
                    {resumeData.content.personalInfo.website && (
                      <div className="flex items-center">
                        <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                        </svg>
                        <span>{resumeData.content.personalInfo.website}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Section */}
                {resumeData.content.personalInfo?.summary && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">SUMMARY</h2>
                    <p className="text-sm text-gray-700">{resumeData.content.personalInfo.summary}</p>
                  </div>
                )}

                {/* Education Section */}
                {resumeData.content.education && resumeData.content.education.length > 0 ? (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">EDUCATION</h2>
                    <div className="text-sm text-gray-700">
                      {/* Education items would be mapped here */}
                      <p className="italic">Education details will appear here</p>
                    </div>
                  </div>
                ) : (
                  activeSection === 'education' && (
                    <div className="mb-6">
                      <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">EDUCATION</h2>
                      <p className="text-sm text-gray-500 italic">Add your education details in the form</p>
                    </div>
                  )
                )}

                {/* Experience Section */}
                {resumeData.content.experience && resumeData.content.experience.length > 0 ? (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">EXPERIENCE</h2>
                    <div className="text-sm text-gray-700">
                      {/* Experience items would be mapped here */}
                      <p className="italic">Experience details will appear here</p>
                    </div>
                  </div>
                ) : (
                  activeSection === 'experience' && (
                    <div className="mb-6">
                      <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">EXPERIENCE</h2>
                      <p className="text-sm text-gray-500 italic">Add your work experience in the form</p>
                    </div>
                  )
                )}

                {/* Skills Section */}
                {resumeData.content.skills && resumeData.content.skills.length > 0 ? (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">SKILLS</h2>
                    <div className="text-sm text-gray-700">
                      {/* Skills would be mapped here */}
                      <p className="italic">Skills will appear here</p>
                    </div>
                  </div>
                ) : (
                  activeSection === 'skills' && (
                    <div className="mb-6">
                      <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">SKILLS</h2>
                      <p className="text-sm text-gray-500 italic">Add your skills in the form</p>
                    </div>
                  )
                )}

                {/* Projects Section */}
                {resumeData.content.projects && resumeData.content.projects.length > 0 ? (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">PROJECTS</h2>
                    <div className="text-sm text-gray-700">
                      {/* Projects would be mapped here */}
                      <p className="italic">Projects will appear here</p>
                    </div>
                  </div>
                ) : (
                  activeSection === 'projects' && (
                    <div className="mb-6">
                      <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">PROJECTS</h2>
                      <p className="text-sm text-gray-500 italic">Add your projects in the form</p>
                    </div>
                  )
                )}

                {/* Certifications Section */}
                {resumeData.content.certifications && resumeData.content.certifications.length > 0 ? (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">CERTIFICATIONS</h2>
                    <div className="text-sm text-gray-700">
                      {/* Certifications would be mapped here */}
                      <p className="italic">Certifications will appear here</p>
                    </div>
                  </div>
                ) : (
                  activeSection === 'certifications' && (
                    <div className="mb-6">
                      <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">CERTIFICATIONS</h2>
                      <p className="text-sm text-gray-500 italic">Add your certifications in the form</p>
                    </div>
                  )
                )}

                {/* Empty state */}
                {!resumeData.content.personalInfo?.name && 
                 !resumeData.content.personalInfo?.email && 
                 !resumeData.content.personalInfo?.phone && 
                 !resumeData.content.personalInfo?.summary && 
                 (!resumeData.content.education || resumeData.content.education.length === 0) && 
                 (!resumeData.content.experience || resumeData.content.experience.length === 0) && 
                 (!resumeData.content.skills || resumeData.content.skills.length === 0) && 
                 (!resumeData.content.projects || resumeData.content.projects.length === 0) && 
                 (!resumeData.content.certifications || resumeData.content.certifications.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <svg className="h-16 w-16 text-gray-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Your resume is empty</h3>
                    <p className="text-sm text-gray-500 mb-4">Fill out the form sections to see your resume take shape</p>
                    <button
                      type="button"
                      onClick={() => setActiveSection('personalInfo')}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Start with Personal Info
                      <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gray-50 border-t">
            <button
              type="button"
              onClick={() => {
                // Export PDF logic would go here
                alert('PDF export feature coming soon!');
              }}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414L8 12.586l1.293 1.293a1 1 0 001.414 0l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
              Export as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
