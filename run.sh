#!/usr/bin/env bash
# Startup script for SIH 26092 MoSJE Prototype
# Single unified server: FastAPI serves both the API and all frontend pages
set -e

PORT=${PORT:-8000}
HOST=${HOST:-"0.0.0.0"}

echo "=========================================================="
echo " Starting MoSJE AI Scheme Matching Platform (SIH 26092)"
echo " Unified Server: http://localhost:${PORT}"
echo " Sign In Page:   http://localhost:${PORT}/"
echo " API Docs:       http://localhost:${PORT}/docs"
echo "=========================================================="

cd "$(dirname "$0")"
python3 backend/database.py
exec python3 -m uvicorn backend.app:app --host "${HOST}" --port "${PORT}" --reload
