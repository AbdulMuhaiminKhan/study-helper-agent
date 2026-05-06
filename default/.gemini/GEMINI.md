# AI Study Helper Agent - Global Rules

## Code Standards
- Write all code in modern, asynchronous Node.js
- Prioritize clean, modular, and well-documented code
- Strictly use Node.js standard libraries over external packages whenever possible
- Handle errors gracefully and log them clearly
- Use ES modules (import/export)

## Agent Behavior
- Operate autonomously using ReAct pattern (Reason + Act)
- Always cite sources when retrieving from lecture notes
- Refuse to hallucinate if knowledge is not in retrieved context
- Log all agent decisions and tool invocations for observability

## Memory & State
- Use Redis as vector database for embeddings
- Maintain episodic memory of past interactions
- Persist all state across container restarts

## Security
- Never commit API keys; use .env files
- Validate all tool inputs before execution
- Log sensitive operations for audit trails
