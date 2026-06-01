# Smart LLM Gateway

An intelligent multi-LLM routing gateway built on GCP Cloud Run.
Routes requests automatically between Google Gemini and Groq/Llama based on task type.

## Features

- API Key authentication (x-api-key header)
- Intelligent routing: code tasks go to Groq (19x faster), general tasks to Gemini
- Rate limiting: 10 requests/minute per key
- Latency tracking per provider
- Health check endpoint

## API

POST /chat
- Body: { "message": "...", "model": "auto|gemini|groq" }
- Header: x-api-key: your-key
- Response: { "success": true, "provider": "...", "latencyMs": 668, "response": "..." }

GET /health
- Returns service status and timestamp

## Performance

| Provider | Model | Avg Latency |
|---|---|---|
| Google Gemini | gemini-2.5-flash | ~12,000ms |
| Groq | llama-3.3-70b | ~668ms |

## Stack

- Node.js 20 on GCP Cloud Run
- Google Gemini 2.5 Flash
- Groq Llama 3.3 70B
- Google Cloud Build

## Author

Saif Layouni - API and Integration Engineer
https://linkedin.com/in/saifeddinelayouni