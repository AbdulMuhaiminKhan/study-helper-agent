import readline from 'readline';
import { createClient } from 'redis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
});

const REDIS_CHUNKS_KEY = 'lecture_chunks';
const REDIS_HISTORY_KEY = 'agent_history';
const MODEL = 'gemini-2.5-flash';
const TOP_K = 3;

function simpleTextSimilarity(question, text) {
  const questionWords = question.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const word of questionWords) {
    if (textWords.some(w => w.includes(word) || word.includes(w))) {
      matches++;
    }
  }
  
  return matches / Math.max(questionWords.length, 1);
}

async function retrieveRelevantChunks(userQuestion) {
  console.log('\n🔍 Retrieving relevant lecture notes...');

  const allChunks = await redisClient.hGetAll(REDIS_CHUNKS_KEY);
  
  const similarities = [];
  for (const [chunkId, chunkText] of Object.entries(allChunks)) {
    const similarity = simpleTextSimilarity(userQuestion, chunkText);
    similarities.push({ chunkId, chunkText, similarity });
  }

  similarities.sort((a, b) => b.similarity - a.similarity);
  const topChunks = similarities.slice(0, TOP_K);

  console.log(`Found ${topChunks.length} relevant chunks:`);
  topChunks.forEach((c, i) => {
    console.log(`  ${i + 1}. (match: ${(c.similarity * 100).toFixed(1)}%) ${c.chunkId}`);
  });

  return topChunks;
}

async function reasonAndAct(userQuestion, retrievedChunks) {
  console.log('\n🧠 Reasoning and generating response...');

  const context = retrievedChunks
    .map((c, i) => `[Source ${i + 1}: ${c.chunkId}]\n${c.chunkText}`)
    .join('\n\n---\n\n');

  const systemPrompt = `You are an autonomous Study Helper AI Agent. Your role is to help students understand course material by:
1. Providing accurate answers grounded in the retrieved lecture notes
2. Clearly citing which lecture sources support your answer
3. Refusing to hallucinate if information is not in the notes
4. Breaking down complex concepts into understandable explanations
5. Suggesting follow-up questions if the student needs deeper understanding

Always start your answer by summarizing which lecture notes are most relevant.
If the answer cannot be found in the provided notes, explicitly state: "This information is not covered in your lecture notes. I recommend asking your instructor or consulting textbooks."`;

  const userPrompt = `Based on the following lecture notes, answer this student question:

QUESTION: ${userQuestion}

LECTURE NOTES CONTEXT:
${context}

Provide a thorough answer that cites specific sources.`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt },
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Error during generation:', error.message);
    return 'Failed to generate response.';
  }
}

async function storeInteraction(question, response) {
  const timestamp = new Date().toISOString();
  const interaction = JSON.stringify({ timestamp, question, response });
  await redisClient.lPush(REDIS_HISTORY_KEY, interaction);
}

async function agentLoop() {
  await redisClient.connect();
  console.log('🎓 AI Study Helper Agent Started');
  console.log('Type your questions about lecture material. Type "exit" to quit.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      const userQuestion = input.trim();

      if (userQuestion.toLowerCase() === 'exit') {
        console.log('\n👋 Goodbye!');
        rl.close();
        await redisClient.quit();
        return;
      }

      if (!userQuestion) {
        askQuestion();
        return;
      }

      const retrievedChunks = await retrieveRelevantChunks(userQuestion);

      if (retrievedChunks.length === 0) {
        console.log(
          '\n⚠️  No relevant lecture notes found. Please check your ingestion or try a different question.'
        );
      } else {
        const response = await reasonAndAct(userQuestion, retrievedChunks);
        console.log('\nAgent: ' + response);
        await storeInteraction(userQuestion, response);
      }

      console.log('\n' + '='.repeat(60) + '\n');
      askQuestion();
    });
  };

  askQuestion();
}

agentLoop();
