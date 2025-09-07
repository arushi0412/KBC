import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VotingPage.css';

const BACKEND_URL = 'http://10.10.122.101:5000';

function VotePage() {
  const [formData, setFormData] = useState({
    name: '',
    student_id: '',
    candidate_id: ''
  });
  
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/candidates`);
      if (response.data.status === 'success') {
        setCandidates(response.data.data);
      } else {
        setMessage({ text: 'Failed to load candidates', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      setMessage({ 
        text: 'Unable to connect to server. Please check if backend is running.', 
        type: 'error' 
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear message when user starts typing
    if (message.text) {
      setMessage({ text: '', type: '' });
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setMessage({ text: 'Please enter your name', type: 'error' });
      return false;
    }
    
    if (!formData.student_id.trim()) {
      setMessage({ text: 'Please enter your Student ID/UID', type: 'error' });
      return false;
    }
    
    if (!formData.candidate_id) {
      setMessage({ text: 'Please select a candidate', type: 'error' });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await axios.post(`${BACKEND_URL}/vote`, {
        student_id: formData.student_id.trim(),
        name: formData.name.trim(),
        candidate_id: parseInt(formData.candidate_id)
      });

      if (response.data.status === 'success') {
        setMessage({ 
          text: `✅ ${response.data.message}`, 
          type: 'success' 
        });
        setIsSubmitted(true);
        // Clear form
        setFormData({ name: '', student_id: '', candidate_id: '' });
      } else {
        setMessage({ 
          text: response.data.message || 'Failed to cast vote', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        setMessage({ 
          text: error.response.data.message, 
          type: 'error' 
        });
      } else {
        setMessage({ 
          text: 'Unable to submit vote. Please check your connection and try again.', 
          type: 'error' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', student_id: '', candidate_id: '' });
    setMessage({ text: '', type: '' });
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <div className="vote-page">
        <div className="vote-container success-container">
          <div className="success-animation">✅</div>
          <h2>Vote Submitted Successfully!</h2>
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
          <button 
            className="btn-primary"
            onClick={() => window.location.href = '/results'}
          >
            View Live Results
          </button>
          <button 
            className="btn-secondary"
            onClick={resetForm}
          >
            Cast Another Vote
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vote-page">
      <div className="vote-container">
        <div className="vote-header">
          <h2>🗳️ Cast Your Vote</h2>
          <p>Choose your Class Representative wisely!</p>
        </div>

        <form onSubmit={handleSubmit} className="vote-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="student_id">Student ID / UID</label>
            <input
              type="text"
              id="student_id"
              name="student_id"
              value={formData.student_id}
              onChange={handleInputChange}
              placeholder="Enter your Student ID (e.g., 2021001)"
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="candidate_id">Select Candidate</label>
            <select
              id="candidate_id"
              name="candidate_id"
              value={formData.candidate_id}
              onChange={handleInputChange}
              className="form-select"
              disabled={loading}
            >
              <option value="">-- Choose a candidate --</option>
              {candidates.map((candidate) => (
                <option key={candidate.candidate_id} value={candidate.candidate_id}>
                  {candidate.name} - {candidate.course}
                </option>
              ))}
            </select>
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span>
                <span className="spinner"></span>
                Submitting...
              </span>
            ) : (
              'Submit Vote'
            )}
          </button>
        </form>

        <div className="vote-info">
          <h3>📋 Voting Guidelines</h3>
          <ul>
            <li>Each student can vote only once</li>
            <li>Use your official Student ID/UID</li>
            <li>Votes are recorded with timestamp</li>
            <li>Results are updated in real-time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default VotePage;