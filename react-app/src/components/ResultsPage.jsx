import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ResultsPage.css';

const BACKEND_URL = 'http://10.10.122.101:5000';

function ResultsPage() {
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchResults();
    
    // Set up interval to fetch results every 5 seconds
    const interval = setInterval(fetchResults, 5000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const fetchResults = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/results`);
      
      if (response.data.status === 'success') {
        setResults(response.data.data.candidates);
        setStats(response.data.data.stats);
        setLastUpdated(new Date());
        setError('');
      } else {
        setError('Failed to fetch results');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const getPositionText = (index) => {
    const positions = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
    return positions[index] || `#${index + 1}`;
  };

  const calculatePercentage = (votes, totalVotes) => {
    if (totalVotes === 0) return 0;
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="results-page">
        <div className="results-container">
          <div className="loading-spinner">
            <div className="spinner-large"></div>
            <p>Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-container">
        <div className="results-header">
          <h2>📊 Live Election Results</h2>
          <div className="update-info">
            {lastUpdated && (
              <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
            )}
            <div className="auto-refresh">🔄 Auto-refresh every 5 seconds</div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Voting Statistics */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.total_votes_cast || 0}</div>
              <div className="stat-label">Total Votes</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.voted_students || 0}</div>
              <div className="stat-label">Students Voted</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.total_students || 0}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.pending_votes || 0}</div>
              <div className="stat-label">Pending Votes</div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="results-section">
          <h3>🏆 Candidate Rankings</h3>
          
          {results.length === 0 ? (
            <div className="no-results">
              <p>No votes cast yet. Be the first to vote!</p>
            </div>
          ) : (
            <div className="results-table">
              <div className="table-header">
                <div className="col-position">Rank</div>
                <div className="col-candidate">Candidate</div>
                <div className="col-course">Course</div>
                <div className="col-votes">Votes</div>
                <div className="col-percentage">Percentage</div>
              </div>
              
              {results.map((candidate, index) => (
                <div 
                  key={candidate.candidate_id} 
                  className={`table-row ${index === 0 && candidate.total_votes > 0 ? 'leading' : ''}`}
                >
                  <div className="col-position">
                    <span className="position-badge">
                      {getPositionText(index)}
                    </span>
                  </div>
                  <div className="col-candidate">
                    <div className="candidate-info">
                      <span className="candidate-name">{candidate.name}</span>
                      {index === 0 && candidate.total_votes > 0 && (
                        <span className="leading-badge">👑 Leading</span>
                      )}
                    </div>
                  </div>
                  <div className="col-course">{candidate.course}</div>
                  <div className="col-votes">
                    <span className="vote-count">{candidate.total_votes}</span>
                  </div>
                  <div className="col-percentage">
                    <div className="percentage-container">
                      <div className="percentage-bar">
                        <div 
                          className="percentage-fill"
                          style={{ 
                            width: `${calculatePercentage(candidate.total_votes, stats.total_votes_cast)}%` 
                          }}
                        ></div>
                      </div>
                      <span className="percentage-text">
                        {calculatePercentage(candidate.total_votes, stats.total_votes_cast)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="btn-refresh"
            onClick={fetchResults}
            disabled={loading}
          >
            🔄 Refresh Now
          </button>
          <button 
            className="btn-vote"
            onClick={() => window.location.href = '/vote'}
          >
            🗳️ Cast Your Vote
          </button>
        </div>

        {/* Footer Info */}
        <div className="results-footer">
          <p>
            Results update automatically every 5 seconds. 
            This is a live leaderboard showing real-time voting progress.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;