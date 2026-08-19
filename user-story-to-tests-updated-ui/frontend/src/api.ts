import { GenerateRequest, GenerateResponse, JiraConnectionRequest, JiraStoriesResponse } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api'

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: GenerateResponse = await response.json()
    return data
  } catch (error) {
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function fetchJiraStories(request: JiraConnectionRequest): Promise<JiraStoriesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      if (response.status === 410 || errorData.error === 'Jira API error: Gone') {
        throw new Error('Jira search is unavailable because the connected Jira endpoint is deprecated. The backend Jira route must use Jira\'s current search API.')
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: JiraStoriesResponse = await response.json()
    return data
  } catch (error) {
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}