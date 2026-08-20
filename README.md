# TestCaseAI

AI-powered test case generation from user stories and acceptance criteria.

## Overview

TestCaseAI is a web application that helps QA engineers generate structured test cases from software user stories. A user can provide a story manually or retrieve stories from Jira, then use an LLM to generate positive, negative, edge, authorization, and non-functional test scenarios.

### Current integrations

- **Jira** – retrieve Jira Story issues using Jira Base URL, email, and API token.
- **Groq LLM** – generate test cases from the supplied user story information.

### Planned integration

- **Azure DevOps** – planned Microsoft SSO/OAuth-based connection for retrieving Azure DevOps work items.

## Architecture

```text
                    TestCaseAI
                        |
              +---------+---------+
              |                   |
          Frontend             Backend
          React/TS             Express/TS
              |                   |
              |          +--------+--------+
              |          |                 |
              |        Jira             Groq LLM
              |          |                 |
              +----------+-----------------+
                         |
                  Generated Test Cases
```

## Project Structure

```text
TestCaseAI/
└── user-story-to-tests-updated-ui/
    ├── backend/
    │   └── src/
    │       ├── server.ts
    │       ├── schemas.ts
    │       ├── prompt.ts
    │       ├── llm/
    │       │   └── groqClient.ts
    │       └── routes/
    │           ├── generate.ts
    │           └── jira.ts
    │
    └── frontend/
        └── src/
            ├── App.tsx
            ├── api.ts
            ├── main.tsx
            ├── types.ts
            └── vite-env.d.ts
```

## Important Files

| File | Purpose |
|---|---|
| `frontend/src/App.tsx` | Main React UI and application interaction/state logic. |
| `frontend/src/api.ts` | Central frontend API client for test generation and Jira stories. |
| `frontend/src/types.ts` | TypeScript interfaces for requests, responses, Jira stories, and test cases. |
| `frontend/src/main.tsx` | React application entry point. |
| `backend/src/server.ts` | Express server entry point, middleware, health check, and API route registration. |
| `backend/src/routes/generate.ts` | Handles test-case generation requests and calls the LLM layer. |
| `backend/src/routes/jira.ts` | Connects to Jira, retrieves Story issues, extracts fields, and normalizes the response. |
| `backend/src/prompt.ts` | Contains the system prompt and builds the user prompt sent to the LLM. |
| `backend/src/llm/groqClient.ts` | Encapsulates communication with the Groq chat-completions API. |
| `backend/src/schemas.ts` | Zod validation schemas and shared backend data types. |

## Main Application Flow

### Manual test case generation

```text
User enters User Story
        |
        v
frontend/src/App.tsx
        |
        v
frontend/src/api.ts
        |
        v
POST /api/generate-tests
        |
        v
backend/src/routes/generate.ts
        |
        +----> backend/src/schemas.ts (validate input)
        |
        +----> backend/src/prompt.ts (build prompt)
        |
        +----> backend/src/llm/groqClient.ts
                         |
                         v
                     Groq LLM
                         |
                         v
                  Generated JSON
                         |
                         v
                    Validate output
                         |
                         v
                       UI
```

### Jira flow

```text
User enters Jira connection details
        |
        v
frontend/src/App.tsx
        |
        v
frontend/src/api.ts
        |
        v
POST /api/jira/stories
        |
        v
backend/src/routes/jira.ts
        |
        v
Jira REST API
        |
        v
Jira Stories
        |
        v
Normalized Jira story data
        |
        v
Frontend
        |
        v
Generate test cases
```

## API Endpoints

### Health check

```http
GET /api/health
```

Returns the backend health status.

### Generate test cases

```http
POST /api/generate-tests
```

Request fields:

```json
{
  "storyTitle": "Payment Processing",
  "summary": "User should be able to make a payment",
  "acceptanceCriteria": "Payment should succeed with valid details",
  "description": "Optional description",
  "additionalInfo": "Optional additional information"
}
```

### Jira stories

```http
POST /api/jira/stories
```

Request fields:

```json
{
  "baseUrl": "https://your-company.atlassian.net",
  "email": "user@example.com",
  "apiToken": "your-api-token"
}
```

The backend retrieves recent Jira Story issues and normalizes fields including summary, status, assignee, description, and acceptance criteria.

## AI Prompt Design

The AI is instructed to act as a senior QA engineer and return structured JSON test cases.

Each test case contains:

- Test case ID
- Title
- Steps
- Optional test data
- Expected result
- Category

Supported categories include:

- Positive
- Negative
- Edge
- Authorization
- Non-Functional

## Environment Variables

The backend expects environment configuration similar to:

```env
PORT=8080
CORS_ORIGIN=http://localhost:5173

groq_API_BASE=https://api.groq.com/openai/v1
groq_API_KEY=your-groq-api-key
groq_MODEL=your-supported-groq-model
```

Do **not** commit real API keys or secrets to GitHub.

## Running the Project

### Backend

```bash
cd user-story-to-tests-updated-ui/backend
npm install
npm run dev
```

The backend exposes the API under:

```text
http://localhost:8080/api
```

### Frontend

```bash
cd user-story-to-tests-updated-ui/frontend
npm install
npm run dev
```

If the backend uses a different port, configure the frontend API base URL using:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## Security Notes

- Never commit `.env` files containing API keys or tokens.
- Jira API tokens should be treated as secrets.
- Azure DevOps SSO/OAuth tokens should be stored securely when that integration is implemented.
- Production deployments should use HTTPS.
- CORS should be restricted to trusted frontend origins.

## Future Azure DevOps Integration

The planned Azure DevOps integration should follow the existing Jira integration pattern while keeping authentication separate:

```text
Connect Azure DevOps
        |
        v
Microsoft Sign-In / OAuth
        |
        v
Authorization callback
        |
        v
Secure token handling
        |
        v
Azure DevOps Organizations
        |
        v
Projects / Work Items
        |
        v
User Story + Acceptance Criteria
        |
        v
Existing TestCaseAI prompt + LLM flow
        |
        v
Generated Test Cases
```

The goal is to reuse the existing test-generation pipeline rather than create a separate AI-generation implementation for Azure DevOps.

## Technology Stack

- React
- TypeScript
- Vite
- Node.js
- Express
- Zod
- Groq API / LLM
- Jira REST API

## Repository

GitHub: https://github.com/sureshss94/TestCaseAI
