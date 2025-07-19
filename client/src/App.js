import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

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

  // Save changes to DB (optional: on blur)
  const handleSave = async () => {
    if (activeDoc) {
      await axios.post(`/documents`, { title: activeDoc.title, content: activeContent }, { headers: { Authorization: `Bearer ${token}` } });
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: '4rem auto', padding: 24, border: '1px solid #ccc', borderRadius: 8 }}>
        <h2>{authMode === 'register' ? 'Register' : 'Login'}</h2>
        <form onSubmit={handleAuth}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12, padding: 8 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12, padding: 8 }}
          />
          <button type="submit" style={{ width: '100%', marginBottom: 12 }}>
            {authMode === 'register' ? 'Register' : 'Login'}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')} style={{ width: '100%' }}>
          {authMode === 'register' ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>
        {authError && <div style={{ color: authError.includes('successful') ? 'green' : 'red', marginTop: 12 }}>{authError}</div>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Documents</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
        />
        <button type="submit">Add Document</button>
      </form>
      {docError && <div style={{ color: 'red', marginBottom: 16 }}>{docError}</div>}
      {docLoading ? (
        <div>Loading documents...</div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem' }}>
          <ul style={{ flex: 1 }}>
            {documents.map(doc => (
              <li key={doc._id} style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem', cursor: 'pointer', background: activeDoc && activeDoc._id === doc._id ? '#f0f0f0' : 'white' }}
                  onClick={() => setActiveDoc(doc)}>
                <strong>{doc.title}</strong>
                <p style={{ fontSize: '0.9em', color: '#555' }}>{doc.content.slice(0, 40)}...</p>
              </li>
            ))}
          </ul>
          <div style={{ flex: 2 }}>
            {activeDoc ? (
              <div>
                <h2>{activeDoc.title}</h2>
                <textarea
                  ref={contentRef}
                  value={activeContent}
                  onChange={handleContentChange}
                  onBlur={handleSave}
                  style={{ width: '100%', height: 200, padding: '0.5rem' }}
                />
              </div>
            ) : (
              <div style={{ color: '#888' }}>Select a document to edit in real-time.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
