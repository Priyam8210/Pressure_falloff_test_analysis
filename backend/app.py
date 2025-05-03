from flask import Flask
from flask_cors import CORS
from routes.pressure import pressure_bp
from routes.diagnostic import diagnostic_bp
from routes.model import model_bp

# Initialize Flask application
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register blueprints
app.register_blueprint(pressure_bp)
app.register_blueprint(diagnostic_bp)
app.register_blueprint(model_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)