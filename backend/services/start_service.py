#!/usr/bin/env python3
"""
Start script for the Python parsing service
"""
import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    print("Installing Python dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

def download_spacy_model():
    """Download spaCy English model"""
    print("Downloading spaCy English model...")
    subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])

def start_service():
    """Start the FastAPI service"""
    print("Starting parsing service on http://localhost:8000")
    subprocess.run([sys.executable, "main.py"])

if __name__ == "__main__":
    try:
        # Check if we're in the right directory
        if not os.path.exists("requirements.txt"):
            print("Error: requirements.txt not found. Please run from the services directory.")
            sys.exit(1)
        
        # Install requirements
        install_requirements()
        
        # Download spaCy model
        download_spacy_model()
        
        # Start service
        start_service()
        
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nService stopped.")
        sys.exit(0)
