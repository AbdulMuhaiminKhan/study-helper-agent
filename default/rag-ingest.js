import fs from 'fs';
import path from 'path';
import { createClient } from 'redis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
});

const LECTURE_NOTES_DIR = './lecture_notes';
const CHUNK_SIZE = 500;
const REDIS_CHUNKS_KEY = 'lecture_chunks';

async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return '';
  }
}

function chunkText(text, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function ingestLectureNotes() {
  await redisClient.connect();
  console.log('Starting RAG ingestion pipeline...');

  try {
    await redisClient.del(REDIS_CHUNKS_KEY);

    if (!fs.existsSync(LECTURE_NOTES_DIR)) {
      console.log(`Creating ${LECTURE_NOTES_DIR} directory. Add PDF or TXT files to begin ingestion.`);
      fs.mkdirSync(LECTURE_NOTES_DIR, { recursive: true });
      return;
    }

    const files = fs.readdirSync(LECTURE_NOTES_DIR).filter(f => f.endsWith('.pdf') || f.endsWith('.txt'));
    if (files.length === 0) {
      console.log('No PDF or TXT files found in lecture_notes directory.');
      return;
    }

    let totalChunks = 0;

    for (const file of files) {
      const filePath = path.join(LECTURE_NOTES_DIR, file);
      console.log(`\nProcessing: ${file}`);

      let text = '';
      if (file.endsWith('.pdf')) {
        text = await extractTextFromPDF(filePath);
      } else if (file.endsWith('.txt')) {
        text = fs.readFileSync(filePath, 'utf-8');
      }

      if (!text) continue;

      const chunks = chunkText(text, CHUNK_SIZE);
      console.log(`  Extracted ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = `${file}:chunk_${i}`;

        await redisClient.hSet(REDIS_CHUNKS_KEY, chunkId, chunk);
        console.log(`  ✓ Stored chunk ${i + 1}/${chunks.length}`);
      }

      totalChunks += chunks.length;
    }

    console.log(`\n✅ Ingestion complete! Total chunks: ${totalChunks}`);
  } catch (error) {
    console.error('Ingestion failed:', error.message);
  } finally {
    await redisClient.quit();
  }
}

ingestLectureNotes();
