#!/bin/bash
set -e
echo "🚀 Starting LexAI..."
docker-compose up --build -d
echo ""
echo "✅ LexAI is running!"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/api/docs"
echo ""
echo "📋 Logs: docker-compose logs -f"
