# 🎓 Study Helper Agent

An autonomous AI agent that ingests your lecture notes and answers questions grounded in that material using **Google Gemini**, **Redis**, and **RAG (Retrieval-Augmented Generation)**.

## 📋 Features

- ✅ **PDF & Text Ingestion** — Automatically extracts and chunks lecture notes
- ✅ **Semantic Retrieval** — Finds relevant sections from your notes using similarity matching
- ✅ **Grounded Responses** — Answers are always backed by actual lecture content with citations
- ✅ **Persistent Storage** — Redis vector database stores all embeddings and interaction history
- ✅ **Interactive CLI** — ReAct-style agent loop for natural conversation
- ✅ **Docker Ready** — Fully containerized for easy deployment
- ✅ **No Hallucination** — Explicitly refuses to answer questions not covered in notes

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| **AI Model** | Google Gemini 2.5 Flash |
| **Vector DB** | Redis (with persistence) |
| **Runtime** | Node.js 18+ |
| **RAG Framework** | Custom (pdf-parse + semantic chunking) |
| **Container** | Docker & Docker Compose |

## 📦 Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **Docker & Docker Compose** ([install](https://docs.docker.com/get-docker/))
- **Google Gemini API Key** (free, get from [Google AI Studio](https://aistudio.google.com/app/apikey))

## 🚀 Quick Start

### 1️⃣ Clone & Install

```bash
git clone https://github.com/AbdulMuhaiminKhan/study-helper-agent.git
cd study-helper-agent/default
npm install
```

### 2️⃣ Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

### 3️⃣ Start Redis

```bash
docker compose up -d
```

Verify Redis is running:
```bash
docker compose ps
```

Expected output:
```
NAME                 IMAGE           STATUS
study-helper-redis   redis:7-alpine  Up 2 seconds
```

### 4️⃣ Add Lecture Notes

Place PDF or TXT files in `lecture_notes/`:
```bash
cp /path/to/lecture.pdf lecture_notes/
# or
cp /path/to/notes.txt lecture_notes/
```

### 5️⃣ Ingest Notes into Vector Database

```bash
npm run ingest
```

Output example:
```
Starting RAG ingestion pipeline...

Processing: lecture.pdf
  Extracted 42 chunks
  ✓ Stored chunk 1/42
  ✓ Stored chunk 2/42
  ...
✅ Ingestion complete! Total chunks: 42
```

### 6️⃣ Start the Agent

```bash
npm start
```

You'll see:
```
🎓 AI Study Helper Agent Started
Type your questions about lecture material. Type "exit" to quit.

You: 
```

Ask questions like:
- "What is machine learning according to my notes?"
- "Summarize the lecture on neural networks"
- "Explain backpropagation based on my lecture notes"
- "exit" — to quit

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Question                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │  Text Similarity Matching        │
        │  (Question vs. Stored Chunks)    │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │  Retrieve Top 3 Relevant Chunks  │
        │  (from Redis)                    │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │  Inject Context into Prompt      │
        │  + System Instructions           │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │  LLM Reasoning (Gemini)          │
        │  Generate Grounded Response      │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │  Response with Citations         │
        │  + Store in History (Redis)      │
        └──────────────────────────────────┘
```

## 📁 Project Structure

```
study-helper-agent/
├── default/
│   ├── index.js                  # Main agent loop (ReAct pattern)
│   ├── rag-ingest.js             # PDF/TXT ingestion & chunking pipeline
│   ├── package.json              # Dependencies
│   ├── docker-compose.yml        # Redis container config
│   ├── .env.example              # Environment template
│   ├── .env                       # Local config (git-ignored)
│   ├── .gitignore                # Git exclusions
│   ├── lecture_notes/            # Your PDFs & TXT files
│   │   └── sample-ml-lecture.txt
│   ├── .gemini/                  # Gemini API config
│   │   └── GEMINI.md
│   └── README.md                 # This file
```

## 📊 How It Works

### Ingestion (`npm run ingest`)
1. Scans `lecture_notes/` for `.pdf` and `.txt` files
2. Extracts text using `pdf-parse` (PDFs) or native file reading (TXT)
3. Splits text into semantic chunks (~500 chars, by sentence boundaries)
4. Stores each chunk in Redis hash: `lecture_chunks` with key format `filename:chunk_N`
5. Clears old chunks on re-run to prevent duplicates

### Querying (`npm start`)
1. User enters a question
2. Simple text similarity matching: counts overlapping words between question and stored chunks
3. Retrieves top 3 chunks with highest similarity scores
4. Injects chunks into system prompt with context
5. Gemini generates response grounded in lecture material
6. Stores Q&A pair in Redis history for future context
7. Displays response with source citations

## 🔧 Development

### Watch Mode
Auto-restart on file changes:
```bash
npm run dev
```

### Check Redis Data

View all stored chunks:
```bash
docker exec study-helper-redis redis-cli hgetall lecture_chunks
```

View interaction history:
```bash
docker exec study-helper-redis redis-cli lrange agent_history 0 -1
```

Check Redis memory usage:
```bash
docker exec study-helper-redis redis-cli info memory
```

Clear all data:
```bash
docker exec study-helper-redis redis-cli flushall
```

## 🐛 Troubleshooting

### "Cannot find module '@google/generative-ai'"
```bash
npm install
```

### "Connection refused" (Redis)
Ensure Redis container is running:
```bash
docker compose up -d
docker compose ps
```

### "GEMINI_API_KEY is undefined"
1. Check `.env` file exists (copy from `.env.example` if missing)
2. Verify API key is set: `echo $GEMINI_API_KEY`
3. Restart the agent after updating `.env`

### "No relevant lecture notes found"
1. Ensure PDFs/TXTs are in `lecture_notes/` directory
2. Run ingestion: `npm run ingest`
3. Verify chunks were stored: `docker exec study-helper-redis redis-cli hlen lecture_chunks`

### Agent returns "not covered in your lecture notes"
This is intentional! The agent refuses to hallucinate. Only add lecture material to `lecture_notes/` that you want it to reference.

### Redis volume not persisting between restarts
Check volume exists:
```bash
docker volume ls | grep redis
```

If missing, recreate:
```bash
docker compose down -v
docker compose up -d
```

## 📈 Performance Tips

1. **Optimal chunk size**: Keep CHUNK_SIZE in `rag-ingest.js` at 500 for balance between granularity and retrieval speed
2. **Large lectures**: 50+ PDFs may need Redis tuning or pagination
3. **Faster retrieval**: Reduce TOP_K in `index.js` from 3 to 1-2 for speed vs. accuracy tradeoff
4. **Memory**: Monitor with `docker stats study-helper-redis`

## 🔐 Security Notes

- **API Key**: Never commit `.env` to version control (already in `.gitignore`)
- **Redis**: In production, bind Redis to localhost or use authentication
- **Sensitive Material**: Be cautious ingesting confidential lecture notes

## 🚢 Deployment

### Docker Compose (Single Host)
```bash
docker compose up -d
npm install
npm run ingest
npm start
```

### Production Hardening
1. Use secrets manager for `GEMINI_API_KEY` instead of `.env`
2. Add Redis authentication: update `docker-compose.yml` with password
3. Use read-only volumes: `docker run -v /notes:/app/lecture_notes:ro`
4. Set resource limits: `docker compose up -d --cpus="2" --memory="2g"`

## 📝 Example Interaction

```
🎓 AI Study Helper Agent Started
Type your questions about lecture material. Type "exit" to quit.

You: What is supervised learning?

🔍 Retrieving relevant lecture notes...
Found 3 relevant chunks:
  1. (match: 85.5%) sample-ml-lecture.txt:chunk_5
  2. (match: 72.3%) sample-ml-lecture.txt:chunk_8
  3. (match: 61.2%) sample-ml-lecture.txt:chunk_12

🧠 Reasoning and generating response...

Agent: Based on your lecture notes, supervised learning is a machine learning approach where the model learns from labeled training data. The lecture notes explain that it involves:
- Input features and corresponding target outputs
- Training on examples where the correct answer is known
- Minimizing prediction error through optimization

The lecture specifically mentions two main categories: regression (continuous outputs) and classification (discrete categories).

[Source 1: sample-ml-lecture.txt:chunk_5]
[Source 2: sample-ml-lecture.txt:chunk_8]

============================================================

You: exit

👋 Goodbye!
```

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

## 📄 License

MIT License — see LICENSE file for details

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/AbdulMuhaiminKhan/study-helper-agent/issues)
- **API Docs**: [Google Generative AI](https://ai.google.dev/docs)
- **Redis Docs**: [redis.io](https://redis.io/docs/)

## 🎯 Future Enhancements

- [ ] Vector embeddings (Gemini Embeddings API instead of text similarity)
- [ ] Multi-modal support (images, diagrams in lectures)
- [ ] Web UI (Next.js frontend)
- [ ] Semantic caching (improve response speed)
- [ ] Fine-tuned Gemini model for domain knowledge
- [ ] Export interaction history to PDF/markdown
- [ ] Batch question processing

---

**Built by Abdul Muhaiminhan** | Last updated: January 2025
