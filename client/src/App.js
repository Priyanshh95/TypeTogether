import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io();

const COLORS = {
  bg: '#f6f8fa',
  card: '#fff',
  accent: '#2563eb',
  accentLight: '#3b82f6',
  border: '#e5e7eb',
  text: '#222',
  muted: '#6b7280',
  error: '#ef4444',
  success: '#22c55e',
};

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
        // Update the document in the documents list
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

  // Responsive card style
  const cardStyle = {
    background: COLORS.card,
    borderRadius: 16,
    boxShadow: '0 2px 16px 0 rgba(0,0,0,0.06)',
    padding: 32,
    maxWidth: 400,
    margin: '4rem auto',
    border: `1px solid ${COLORS.border}`,
    color: COLORS.text,
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={cardStyle}>
          <h2 style={{ marginBottom: 24, color: COLORS.accent }}>{authMode === 'register' ? 'Register' : 'Login'}</h2>
          <form onSubmit={handleAuth}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 16 }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 16 }}
            />
            <button type="submit" style={{ width: '100%', marginBottom: 12, padding: 12, borderRadius: 8, background: COLORS.accent, color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={e => e.target.style.background = COLORS.accentLight}
              onMouseOut={e => e.target.style.background = COLORS.accent}
            >
              {authMode === 'register' ? 'Register' : 'Login'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')} style={{ width: '100%', background: 'none', border: 'none', color: COLORS.accent, fontWeight: 500, cursor: 'pointer', marginBottom: 12 }}>
            {authMode === 'register' ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
          {authError && <div style={{ color: authError.includes('successful') ? COLORS.success : COLORS.error, marginTop: 12, textAlign: 'center' }}>{authError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, padding: 0 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ color: COLORS.accent, fontWeight: 700, fontSize: 32 }}>TypeTogether</h1>
          <button onClick={handleLogout} style={{ background: COLORS.error, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 16 }}>Logout</button>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <form onSubmit={handleSubmit} style={{ marginBottom: 24, background: COLORS.card, borderRadius: 12, boxShadow: '0 1px 6px 0 rgba(0,0,0,0.04)', padding: 20, border: `1px solid ${COLORS.border}` }}>
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 15 }}
              />
              <textarea
                placeholder="Content"
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 15, minHeight: 60 }}
              />
              <button type="submit" style={{ width: '100%', padding: 10, borderRadius: 8, background: COLORS.accent, color: '#fff', border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={e => e.target.style.background = COLORS.accentLight}
                onMouseOut={e => e.target.style.background = COLORS.accent}
              >Add Document</button>
            </form>
            {docError && <div style={{ color: COLORS.error, marginBottom: 16 }}>{docError}</div>}
            {docLoading ? (
              <div style={{ color: COLORS.muted }}>Loading documents...</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {documents.map(doc => (
                  <li key={doc._id} style={{ marginBottom: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: activeDoc && activeDoc._id === doc._id ? COLORS.accentLight : COLORS.card, boxShadow: activeDoc && activeDoc._id === doc._id ? '0 2px 8px 0 rgba(59,130,246,0.08)' : 'none', padding: 12, cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      onClick={e => { if (e.target.tagName !== 'BUTTON') setActiveDoc(doc); }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: COLORS.text }}>{doc.title}</strong>
                      <p style={{ fontSize: '0.95em', color: COLORS.muted, margin: 0 }}>{doc.content.slice(0, 40)}{doc.content.length > 40 ? '...' : ''}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(doc._id); }}
                      style={{ background: COLORS.error, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 500, fontSize: 13, cursor: 'pointer', marginLeft: 10 }}
                    >Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ flex: 2, minWidth: 320 }}>
            {activeDoc ? (
              <div style={{ background: COLORS.card, borderRadius: 12, boxShadow: '0 1px 6px 0 rgba(0,0,0,0.04)', padding: 24, border: `1px solid ${COLORS.border}` }}>
                <h2 style={{ color: COLORS.accent, fontWeight: 600, marginBottom: 16 }}>{activeDoc.title}</h2>
                <textarea
                  ref={contentRef}
                  value={activeContent}
                  onChange={handleContentChange}
                  style={{ width: '100%', height: 220, padding: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 16, background: COLORS.bg, color: COLORS.text, resize: 'vertical', marginBottom: 12 }}
                />
                <button onClick={handleSave} style={{ background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 15, cursor: 'pointer', marginRight: 12 }}>
                  Save Changes
                </button>
                {saveStatus && <span style={{ color: saveStatus === 'Saved!' ? COLORS.success : saveStatus === 'Saving...' ? COLORS.muted : COLORS.error, marginLeft: 8 }}>{saveStatus}</span>}
              </div>
            ) : (
              <div style={{ color: COLORS.muted, fontSize: 18, textAlign: 'center', marginTop: 60 }}>Select a document to edit in real-time.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
