import express from 'express'
import { JiraConnectionRequestSchema, JiraStoriesResponseSchema, JiraStoriesResponse } from '../schemas'

export const jiraRouter = express.Router()

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
    const searchUrl = `${baseUrlNormalized}/rest/api/3/search/jql`

    // Fetch from Jira API
    let jiraResponse: Response
    try {
      jiraResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql: 'issuetype = Story ORDER BY created DESC',
          maxResults: 20,
          fields: ['summary', 'status', 'assignee', 'description'],
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
      const descriptionValue = issue.fields?.description
      let description = 'No description provided.'

      if (typeof descriptionValue === 'string') {
        description = descriptionValue
      } else if (descriptionValue && Array.isArray(descriptionValue.content)) {
        description = descriptionValue.content
          .map((node: any) => {
            if (Array.isArray(node.content)) {
              return node.content.map((child: any) => child.text || '').join(' ')
            }
            return node.text || ''
          })
          .join(' ')
          .trim() || 'No description provided.'
      }

      return {
        id: issue.id || issue.key || 'unknown',
        key: issue.key || 'UNKNOWN',
        summary: issue.fields?.summary || 'Untitled story',
        status: issue.fields?.status?.name || 'Unknown',
        assignee: issue.fields?.assignee?.displayName || 'Unassigned',
        description,
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
