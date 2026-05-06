# AI Study Helper Agent

An autonomous AI agent that ingests your lecture notes and answers questions grounded in that material using Gemini, Redis, and RAG (Retrieval-Augmented Generation).

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Google Gemini API Key (get from [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your GEMINI_API_KEY
# GEMINI_API_KEY=your_actual_key_here
```

### 3. Start Redis Container
```bash
docker compose up -d
```

Verify Redis is running:
```bash
docker compose ps
```

### 4. Add Lecture Notes
Place PDF files in the `lecture_notes/` directory:
```bash
cp /path/to/your/lecture.pdf lecture_notes/
```

### 5. Ingest Lecture Notes into Vector Database
```bash
npm run ingest
```

This script will:
- Extract text from all PDFs
- Split into semantic chunks
- Generate embeddings using Gemini
- Store in Redis as vector database

### 6. Start the Agent
```bash
npm start
```

Then ask questions like:
- "According to my notes, what is [topic]?"
- "Summarize the lecture about [subject]"
- "Explain how [concept] works based on my lecture notes"

The agent will retrieve relevant sections and provide grounded answers with sources.

## Architecture

```
User Question
    ↓
Generate Embedding (Gemini)
    ↓
Vector Search (Redis)
    ↓
Retrieve Top 3 Chunks
    ↓
Inject Context into Prompt
    ↓
LLM Reasoning (Gemini 2.5 Flash Lite)
    ↓
Grounded Response with Citations
```

## File Structure

- `index.js` - Main agent loop (ReAct pattern)
- `rag-ingest.js` - RAG pipeline for ingesting PDFs
- `docker-compose.yml` - Redis container setup
- `.gemini/GEMINI.md` - Global agent rules
- `lecture_notes/` - Your PDF files go here

## Persistence

- Redis data persists in Docker volume `redis_data`
- Agent interaction history stored in Redis for future context
- All embeddings cached so re-ingestion only needed for new files

## Monitoring

Check Redis memory and stored chunks:
```bash
docker exec study-helper-redis redis-cli info memory
docker exec study-helper-redis redis-cli hlen lecture_chunks
```

View agent interaction history:
```bash
docker exec study-helper-redis redis-cli lrange agent_history 0 -1
```
