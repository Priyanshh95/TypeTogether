import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

const socket = io();

function App() {
  // Auth state
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authError, setAuthError] = useState('');

  // Document state
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeContent, setActiveContent] = useState('');
  const contentRef = useRef();
  const [docError, setDocError] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Fetch documents on mount (if authenticated)
  useEffect(() => {
    if (token) {
      setDocLoading(true);
      setDocError('');
      axios.get('/documents', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setDocuments(res.data))
        .catch(err => setDocError(err.response?.data?.error || 'Failed to load documents'))
        .finally(() => setDocLoading(false));
    }
  }, [token]);

  // Join document room when activeDoc changes
  useEffect(() => {
    if (activeDoc) {
      socket.emit('join-document', activeDoc._id);
      setActiveContent(activeDoc.content);
    }
  }, [activeDoc]);

  // Listen for real-time changes
  useEffect(() => {
    socket.on('receive-changes', (newContent) => {
      setActiveContent(newContent);
    });
    return () => {
      socket.off('receive-changes');
    };
  }, []);

  // Handle registration/login
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        await axios.post('/auth/register', { username, password });
        setAuthMode('login');
        setAuthError('Registration successful! Please log in.');
      } else {
        const res = await axios.post('/auth/login', { username, password });
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
      }
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Authentication failed');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setDocuments([]);
    setActiveDoc(null);
    setActiveContent('');
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setDocError('');
    try {
      const res = await axios.post('/documents', { title, content }, { headers: { Authorization: `Bearer ${token}` } });
      setDocuments([...documents, res.data]);
      setTitle('');
      setContent('');
    } catch (err) {
      setDocError(err.response?.data?.error || 'Error creating document');
    }
  };

  // Handle real-time content change
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setActiveContent(newContent);
    if (activeDoc) {
      socket.emit('send-changes', { docId: activeDoc._id, content: newContent });
    }
  };

  // Save changes to DB (explicitly with button)
  const handleSave = async () => {
    if (activeDoc) {
      setSaveStatus('Saving...');
      try {
        await axios.put(`/documents/${activeDoc._id}`, { title: activeDoc.title, content: activeContent }, { headers: { Authorization: `Bearer ${token}` } });
        setDocuments(docs =>
          docs.map(d =>
            d._id === activeDoc._id ? { ...d, content: activeContent } : d
          )
        );
        setSaveStatus('Saved!');
        setTimeout(() => setSaveStatus(''), 1500);
      } catch {
        setSaveStatus('Error saving');
      }
    }
  };

  // Delete a document
  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`/documents/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
      setDocuments(docs => docs.filter(d => d._id !== docId));
      if (activeDoc && activeDoc._id === docId) {
        setActiveDoc(null);
        setActiveContent('');
      }
    } catch (err) {
      setDocError('Error deleting document');
    }
  };

  // Helper for avatar
  const getAvatar = (title) => {
    if (!title) return '?';
    return title.trim().charAt(0).toUpperCase();
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: 'none' }}>
        <div className="header-bar">TypeTogether</div>
        <div className="card">
          <h2 style={{ marginBottom: 24, color: '#2563eb' }}>{authMode === 'register' ? 'Register' : 'Login'}</h2>
          <form onSubmit={handleAuth}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn-accent" style={{ width: '100%', marginBottom: 12 }}>
              {authMode === 'register' ? 'Register' : 'Login'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')} style={{ width: '100%', background: 'none', border: 'none', color: '#2563eb', fontWeight: 500, cursor: 'pointer', marginBottom: 12 }}>
            {authMode === 'register' ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
          {authError && <div style={{ color: authError.includes('successful') ? '#22c55e' : '#ef4444', marginTop: 12, textAlign: 'center' }}>{authError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'none' }}>
      <div className="header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 2rem' }}>
        <span>TypeTogether</span>
        <button onClick={handleLogout} className="btn-danger" style={{ fontSize: 15, padding: '8px 20px' }}>Logout</button>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 0' }}>
        <div className="main-flex" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="card" style={{ margin: 0, marginBottom: 24 }}>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Content"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  style={{ minHeight: 60 }}
                />
                <button type="submit" className="btn-accent" style={{ width: '100%' }}>Add Document</button>
              </form>
              {docError && <div style={{ color: '#ef4444', marginBottom: 16 }}>{docError}</div>}
              {docLoading ? (
                <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center' }}><span className="spinner" />Loading documents...</div>
              ) : (
                <ul className="doc-list">
                  {documents.map(doc => (
                    <li key={doc._id} className={`doc-list-item${activeDoc && activeDoc._id === doc._id ? ' selected' : ''}`}
                        onClick={e => { if (e.target.tagName !== 'BUTTON') setActiveDoc(doc); }}>
                      <span className="doc-avatar">{getAvatar(doc.title)}</span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#222' }}>{doc.title}</strong>
                        <p style={{ fontSize: '0.95em', color: '#6b7280', margin: 0 }}>{doc.content.slice(0, 40)}{doc.content.length > 40 ? '...' : ''}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(doc._id); }}
                        className="btn-danger"
                        style={{ marginLeft: 10 }}
                      >Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div style={{ flex: 2, minWidth: 320 }}>
            {activeDoc ? (
              <div className="card" style={{ margin: 0 }}>
                <h2 style={{ color: '#2563eb', fontWeight: 600, marginBottom: 16 }}>{activeDoc.title}</h2>
                <textarea
                  ref={contentRef}
                  value={activeContent}
                  onChange={handleContentChange}
                  style={{ width: '100%', height: 220, marginBottom: 12 }}
                />
                <button onClick={handleSave} className="btn-accent" style={{ marginRight: 12 }}>
                  Save Changes
                </button>
                {saveStatus && <span className="save-status" style={{ color: saveStatus === 'Saved!' ? '#22c55e' : saveStatus === 'Saving...' ? '#6b7280' : '#ef4444' }}>{saveStatus}</span>}
              </div>
            ) : (
              <div style={{ color: '#6b7280', fontSize: 18, textAlign: 'center', marginTop: 60 }}>Select a document to edit in real-time.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
