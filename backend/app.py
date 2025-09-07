from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import logging
from datetime import datetime
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database configuration
DB_CONFIG = {
    'host': '10.10.127.21',  # PC3 IP
    'database': 'kbc_election',
    'user': 'kbc_user',
    'password': 'kbc_password_2024',
    'port': 3306,
    'charset': 'utf8mb4',
    'autocommit': True
}

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            return connection
    except Error as e:
        logger.error(f"Error connecting to database: {e}")
        return None

def close_db_connection(connection, cursor=None):
    """Close database connection and cursor"""
    try:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
    except Error as e:
        logger.error(f"Error closing database connection: {e}")

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'KBC Backend Server is running!',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/candidates', methods=['GET'])
def get_candidates():
    """Get all candidates for dropdown"""
    connection = get_db_connection()
    if not connection:
        return jsonify({
            'status': 'error',
            'message': 'Database connection failed'
        }), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT candidate_id, name, course 
            FROM candidates 
            ORDER BY name
        """)
        candidates = cursor.fetchall()
        
        return jsonify({
            'status': 'success',
            'data': candidates
        })
        
    except Error as e:
        logger.error(f"Error fetching candidates: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch candidates'
        }), 500
        
    finally:
        close_db_connection(connection, cursor)

@app.route('/vote', methods=['POST'])
def cast_vote():
    """Handle vote submission"""
    try:
        # Get JSON data from request
        data = request.get_json()
        
        # Validate required fields
        if not data or not all(key in data for key in ['student_id', 'name', 'candidate_id']):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: student_id, name, candidate_id'
            }), 400
        
        student_id = data['student_id'].strip()
        student_name = data['name'].strip()
        candidate_id = int(data['candidate_id'])
        
        # Validate input
        if not student_id or not student_name or not candidate_id:
            return jsonify({
                'status': 'error',
                'message': 'All fields are required and cannot be empty'
            }), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'status': 'error',
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = connection.cursor(dictionary=True)
            
            # Check if student exists and hasn't voted yet
            cursor.execute("""
                SELECT student_id, name, has_voted 
                FROM students 
                WHERE student_id = %s
            """, (student_id,))
            
            student = cursor.fetchone()
            
            if not student:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid Student ID. Please check your UID.'
                }), 400
            
            if student['has_voted']:
                return jsonify({
                    'status': 'error',
                    'message': 'You have already voted! Multiple votes are not allowed.'
                }), 400
            
            # Verify student name matches (optional validation)
            if student['name'].lower() != student_name.lower():
                logger.warning(f"Name mismatch for student {student_id}: DB='{student['name']}', Input='{student_name}'")
            
            # Check if candidate exists
            cursor.execute("""
                SELECT candidate_id, name 
                FROM candidates 
                WHERE candidate_id = %s
            """, (candidate_id,))
            
            candidate = cursor.fetchone()
            
            if not candidate:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid candidate selected'
                }), 400
            
            # Begin transaction
            connection.start_transaction()
            
            try:
                # Insert vote record
                cursor.execute("""
                    INSERT INTO votes (student_id, candidate_id, timestamp) 
                    VALUES (%s, %s, %s)
                """, (student_id, candidate_id, datetime.now()))
                
                # Update student has_voted status
                cursor.execute("""
                    UPDATE students 
                    SET has_voted = TRUE 
                    WHERE student_id = %s
                """, (student_id,))
                
                # Update candidate vote count
                cursor.execute("""
                    UPDATE candidates 
                    SET total_votes = total_votes + 1 
                    WHERE candidate_id = %s
                """, (candidate_id,))
                
                # Commit transaction
                connection.commit()
                
                logger.info(f"Vote cast successfully: Student {student_id} voted for candidate {candidate_id}")
                
                return jsonify({
                    'status': 'success',
                    'message': f'Vote cast successfully for {candidate["name"]}!',
                    'data': {
                        'student_id': student_id,
                        'candidate_name': candidate['name'],
                        'timestamp': datetime.now().isoformat()
                    }
                })
                
            except Exception as e:
                # Rollback transaction on error
                connection.rollback()
                raise e
                
        except Error as e:
            logger.error(f"Database error during voting: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify({
                'status': 'error',
                'message': 'Failed to cast vote. Please try again.'
            }), 500
            
        finally:
            close_db_connection(connection, cursor)
            
    except Exception as e:
        logger.error(f"Unexpected error during voting: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'message': 'An unexpected error occurred'
        }), 500

@app.route('/results', methods=['GET'])
def get_results():
    """Get voting results - candidates with vote counts"""
    connection = get_db_connection()
    if not connection:
        return jsonify({
            'status': 'error',
            'message': 'Database connection failed'
        }), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get candidates with vote counts, sorted by votes (descending)
        cursor.execute("""
            SELECT 
                candidate_id,
                name,
                course,
                total_votes
            FROM candidates 
            ORDER BY total_votes DESC, name ASC
        """)
        
        results = cursor.fetchall()
        
        # Get total votes count
        cursor.execute("SELECT COUNT(*) as total_votes FROM votes")
        total_votes_cast = cursor.fetchone()['total_votes']
        
        # Get total students count
        cursor.execute("SELECT COUNT(*) as total_students FROM students")
        total_students = cursor.fetchone()['total_students']
        
        # Get students who have voted
        cursor.execute("SELECT COUNT(*) as voted_students FROM students WHERE has_voted = TRUE")
        voted_students = cursor.fetchone()['voted_students']
        
        return jsonify({
            'status': 'success',
            'data': {
                'candidates': results,
                'stats': {
                    'total_votes_cast': total_votes_cast,
                    'total_students': total_students,
                    'voted_students': voted_students,
                    'pending_votes': total_students - voted_students
                }
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Error as e:
        logger.error(f"Error fetching results: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch results'
        }), 500
        
    finally:
        close_db_connection(connection, cursor)

@app.route('/stats', methods=['GET'])
def get_voting_stats():
    """Get voting statistics"""
    connection = get_db_connection()
    if not connection:
        return jsonify({
            'status': 'error',
            'message': 'Database connection failed'
        }), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get recent votes (last 10)
        cursor.execute("""
            SELECT 
                v.vote_id,
                s.name as student_name,
                s.student_id,
                c.name as candidate_name,
                v.timestamp
            FROM votes v
            JOIN students s ON v.student_id = s.student_id
            JOIN candidates c ON v.candidate_id = c.candidate_id
            ORDER BY v.timestamp DESC
            LIMIT 10
        """)
        
        recent_votes = cursor.fetchall()
        
        return jsonify({
            'status': 'success',
            'data': {
                'recent_votes': recent_votes
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Error as e:
        logger.error(f"Error fetching stats: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch statistics'
        }), 500
        
    finally:
        close_db_connection(connection, cursor)

if __name__ == '__main__':
    # Test database connection on startup
    test_connection = get_db_connection()
    if test_connection:
        logger.info("Database connection successful!")
        close_db_connection(test_connection)
    else:
        logger.error("Failed to connect to database on startup!")
    
    # Run Flask server
    logger.info("Starting KBC Backend Server on 0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)