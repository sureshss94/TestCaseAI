export interface GenerateRequest {
  storyTitle: string
  summary: string
  acceptanceCriteria: string
  description?: string
  additionalInfo?: string
}

export interface JiraConnectionRequest {
  baseUrl: string
  email: string
  apiToken: string
}

export interface JiraStory {
  id: string
  key: string
  summary: string
  status: string
  assignee: string
  description: string
  acceptanceCriteria: string
  url: string
}

export interface JiraStoriesResponse {
  stories: JiraStory[]
  total: number
}

export interface TestCase {
  id: string
  title: string
  steps: string[]
  testData?: string
  expectedResult: string
  category: string
}

export interface GenerateResponse {
  cases: TestCase[]
  model?: string
  promptTokens: number
  completionTokens: number
}