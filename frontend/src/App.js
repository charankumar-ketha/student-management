import React, { useState, useEffect } from 'react';

function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("Failed to fetch students", err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, course }),
    });
    setName('');
    setEmail('');
    setCourse('');
    fetchStudents();
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto' }}>
      <h2>Student Management System</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
        <input placeholder="Student Name" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '8px' }} />
        <input placeholder="Student Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '8px' }} />
        <input placeholder="Course Enrolled" value={course} onChange={e => setCourse(e.target.value)} required style={{ padding: '8px' }} />
        <button type="submit" style={{ padding: '10px', background: '#0070f3', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Add Student
        </button>
      </form>
      <h3>Registered Students</h3>
      <ul>
        {students.map(s => (
          <li key={s.id} style={{ marginBottom: '6px' }}>
            <strong>{s.name}</strong> ({s.email}) &mdash; {s.course}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
