import express from 'express'
import { JiraConnectionRequestSchema, JiraStoriesResponseSchema, JiraStoriesResponse } from '../schemas'

export const jiraRouter = express.Router()

function extractJiraText(value: any): string {
  if (typeof value === 'string') return value
  if (!value) return ''
  if (typeof value.text === 'string') return value.text
  if (Array.isArray(value.content)) {
    return value.content.map((item: any) => extractJiraText(item)).join(' ').trim()
  }
  return ''
}

jiraRouter.post('/', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    // Validate request body
    const validationResult = JiraConnectionRequestSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      res.status(400).json({
        error: `Validation error: ${validationResult.error.message}`
      })
      return
    }

    const { baseUrl, email, apiToken } = validationResult.data
    const baseUrlNormalized = baseUrl.trim().replace(/\/+$/, '')

    // Build Basic auth header
    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`
    const jiraHeaders = {
      Accept: 'application/json',
      Authorization: authHeader,
      'Content-Type': 'application/json',
    }
    const searchUrl = `${baseUrlNormalized}/rest/api/3/search/jql`

    let acceptanceCriteriaFieldId: string | null = null
    try {
      const fieldsResponse = await fetch(`${baseUrlNormalized}/rest/api/3/field`, {
        method: 'GET',
        headers: jiraHeaders,
      })
      if (fieldsResponse.ok) {
        const fields = await fieldsResponse.json() as Array<{ id?: string; name?: string }>
        const acceptanceField = fields.find((field) =>
          field.id && field.name?.trim().toLowerCase() === 'acceptance criteria'
        )
        acceptanceCriteriaFieldId = acceptanceField?.id || null
      }
    } catch {
      // Acceptance criteria remains empty if Jira field metadata is unavailable.
    }

    // Fetch from Jira API
    let jiraResponse: Response
    try {
      jiraResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          ...jiraHeaders,
        },
        body: JSON.stringify({
          jql: 'issuetype = Story ORDER BY created DESC',
          maxResults: 20,
          fields: [
            'summary',
            'status',
            'assignee',
            'description',
            ...(acceptanceCriteriaFieldId ? [acceptanceCriteriaFieldId] : []),
          ],
        }),
      })
    } catch (fetchError) {
      console.error('Jira fetch error:', fetchError)
      res.status(503).json({
        error: 'Unable to connect to Jira'
      })
      return
    }

    // Handle non-OK responses from Jira
    if (!jiraResponse.ok) {
      console.error(`Jira API error: ${jiraResponse.status}`)
      
      if (jiraResponse.status === 401 || jiraResponse.status === 403) {
        res.status(401).json({
          error: 'Invalid credentials or insufficient permissions'
        })
        return
      }

      res.status(jiraResponse.status).json({
        error: `Jira API error: ${jiraResponse.statusText}`
      })
      return
    }

    // Parse Jira response
    let jiraData: any
    try {
      jiraData = await jiraResponse.json()
    } catch (parseError) {
      console.error('Failed to parse Jira response:', parseError)
      res.status(502).json({
        error: 'Failed to parse Jira response'
      })
      return
    }

    // Extract issues array
    const issues = Array.isArray(jiraData.issues) ? jiraData.issues : []

    // Map and normalize stories
    const stories = issues.map((issue: any) => {
      const description = extractJiraText(issue.fields?.description) || 'No description provided.'
      const acceptanceCriteria = acceptanceCriteriaFieldId
        ? extractJiraText(issue.fields?.[acceptanceCriteriaFieldId])
        : ''

      return {
        id: issue.id || issue.key || 'unknown',
        key: issue.key || 'UNKNOWN',
        summary: issue.fields?.summary || 'Untitled story',
        status: issue.fields?.status?.name || 'Unknown',
        assignee: issue.fields?.assignee?.displayName || 'Unassigned',
        description,
        acceptanceCriteria,
        url: `${baseUrlNormalized}/browse/${issue.key}`,
      }
    })

    // Validate normalized response against schema
    const responseData = {
      stories,
      total: stories.length
    }

    const responseValidation = JiraStoriesResponseSchema.safeParse(responseData)
    if (!responseValidation.success) {
      console.error('Response validation error:', responseValidation.error)
      res.status(502).json({
        error: 'Response validation failed'
      })
      return
    }

    // Return successful response
    res.set('Cache-Control', 'no-store')
    res.json(responseValidation.data)
  } catch (error) {
    console.error('Error in Jira route:', error)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
})
