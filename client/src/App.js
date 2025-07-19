import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io();

function App() {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeContent, setActiveContent] = useState('');
  const contentRef = useRef();

  // Fetch documents on mount
  useEffect(() => {
    axios.get('/documents')
      .then(res => setDocuments(res.data))
      .catch(err => console.error(err));
  }, []);

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

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/documents', { title, content });
      setDocuments([...documents, res.data]);
      setTitle('');
      setContent('');
    } catch (err) {
      alert('Error creating document');
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
      await axios.post(`/documents`, { title: activeDoc.title, content: activeContent });
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto' }}>
      <h1>Documents</h1>
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
    </div>
  );
}

export default App;
