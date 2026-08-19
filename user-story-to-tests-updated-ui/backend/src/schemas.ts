import { z } from 'zod'

export const GenerateRequestSchema = z.object({
  storyTitle: z.string().min(1, 'Story title is required'),
  summary: z.string().min(1, 'Summary is required'),
  acceptanceCriteria: z.string().min(1, 'Acceptance criteria is required'),
  description: z.string().optional(),
  additionalInfo: z.string().optional()
})

export const TestCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  steps: z.array(z.string()),
  testData: z.string().optional(),
  expectedResult: z.string(),
  category: z.string()
})

export const GenerateResponseSchema = z.object({
  cases: z.array(TestCaseSchema),
  model: z.string().optional(),
  promptTokens: z.number(),
  completionTokens: z.number()
})

export const JiraConnectionRequestSchema = z.object({
  baseUrl: z.string().min(1, 'Base URL is required'),
  email: z.string().min(1, 'Email is required'),
  apiToken: z.string().min(1, 'API token is required')
})

export const JiraStorySchema = z.object({
  id: z.string(),
  key: z.string(),
  summary: z.string(),
  status: z.string(),
  assignee: z.string(),
  description: z.string(),
  acceptanceCriteria: z.string(),
  url: z.string()
})

export const JiraStoriesResponseSchema = z.object({
  stories: z.array(JiraStorySchema),
  total: z.number()
})

// Type exports
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>
export type TestCase = z.infer<typeof TestCaseSchema>
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>
export type JiraConnectionRequest = z.infer<typeof JiraConnectionRequestSchema>
export type JiraStory = z.infer<typeof JiraStorySchema>
export type JiraStoriesResponse = z.infer<typeof JiraStoriesResponseSchema>