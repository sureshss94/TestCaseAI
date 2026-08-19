import { useState } from 'react'
import * as XLSX from 'xlsx'
import { fetchJiraStories, generateTests } from './api'
import { GenerateRequest, GenerateResponse, JiraStory, TestCase } from './types'

function App() {
  const [formData, setFormData] = useState<GenerateRequest>({
    storyTitle: '',
    summary: '',
    acceptanceCriteria: '',
    description: '',
    additionalInfo: ''
  })
  const [results, setResults] = useState<GenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())
  const [jiraConfig, setJiraConfig] = useState({
    baseUrl: '',
    email: '',
    apiToken: ''
  })
  const [jiraStories, setJiraStories] = useState<JiraStory[]>([])
  const [jiraError, setJiraError] = useState<string | null>(null)
  const [isJiraLoading, setIsJiraLoading] = useState<boolean>(false)
  const [jiraConnected, setJiraConnected] = useState<boolean>(false)
  const [selectedJiraStoryKey, setSelectedJiraStoryKey] = useState<string | null>(null)

  const toggleTestCaseExpansion = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId)
    } else {
      newExpanded.add(testCaseId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleInputChange = (field: keyof GenerateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.storyTitle.trim() || !formData.summary.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title, Summary, and Acceptance Criteria are required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await generateTests(formData)
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      storyTitle: '',
      summary: '',
      acceptanceCriteria: '',
      description: '',
      additionalInfo: ''
    })
    setResults(null)
    setError(null)
    setIsLoading(false)
    setExpandedTestCases(new Set())
    setJiraConfig({ baseUrl: '', email: '', apiToken: '' })
    setJiraStories([])
    setJiraError(null)
    setIsJiraLoading(false)
    setJiraConnected(false)
    setSelectedJiraStoryKey(null)
  }

  const handleJiraInputChange = (field: 'baseUrl' | 'email' | 'apiToken', value: string) => {
    setJiraConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleConnectJira = async () => {
    const baseUrl = jiraConfig.baseUrl.trim()
    const email = jiraConfig.email.trim()
    const apiToken = jiraConfig.apiToken.trim()

    if (!baseUrl || !email || !apiToken) {
      setJiraError('Base URL, email ID, and Jira API token are required.')
      setJiraStories([])
      setJiraConnected(false)
      return
    }

    setIsJiraLoading(true)
    setJiraError(null)
    setJiraConnected(false)

    try {
      const response = await fetchJiraStories({ baseUrl, email, apiToken })
      setJiraStories(response.stories)
      setJiraConnected(true)
    } catch (err) {
      setJiraStories([])
      setJiraConnected(false)
      setJiraError(err instanceof Error ? err.message : 'Failed to connect to Jira.')
    } finally {
      setIsJiraLoading(false)
    }
  }

  const handleAddJiraStoryToForm = (story: JiraStory) => {
    setFormData(prev => ({
      ...prev,
      storyTitle: story.summary,
      summary: story.description === 'No description provided.' ? '' : story.description,
      description: '',
      acceptanceCriteria: story.acceptanceCriteria,
      additionalInfo: [
        `Jira status: ${story.status}`,
        `Assignee: ${story.assignee}`,
        `Jira issue: ${story.url}`
      ].join('\n')
    }))
    setSelectedJiraStoryKey(story.key)
    setError(null)
    setResults(null)
  }

  const handleDownload = () => {
    if (!results) return

    const workbookRows: Array<Record<string, string | number>> = []

    results.cases.forEach((testCase) => {
      if (testCase.steps.length === 0) {
        workbookRows.push({
          'Test Case ID': testCase.id,
          Title: testCase.title,
          Category: testCase.category,
          'Expected Result': testCase.expectedResult,
          'Step Number': '',
          'Step Description': '',
          'Test Data': testCase.testData || '',
          'Step Expected Result': ''
        })
        return
      }

      testCase.steps.forEach((step, index) => {
        workbookRows.push({
          'Test Case ID': testCase.id,
          Title: testCase.title,
          Category: testCase.category,
          'Expected Result': testCase.expectedResult,
          'Step Number': index + 1,
          'Step Description': step,
          'Test Data': testCase.testData || '',
          'Step Expected Result': index === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'
        })
      })
    })

    const worksheet = XLSX.utils.json_to_sheet(workbookRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TestCases')

    const filenameBase = (formData.storyTitle || 'test-cases')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'test-cases'

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    XLSX.writeFile(workbook, `${filenameBase}-test-cases-${timestamp}.xlsx`)
  }

  return (
    <div>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        :root {
          --bg: #f4f7f3;
          --surface: #ffffff;
          --border: #e3e8e0;
          --text: #1f2a24;
          --muted: #6b7a72;
          --brand: #00c853;
          --brand-dark: #009624;
          --brand-darker: #00791d;
          --brand-soft: #e6f7ec;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          color: var(--text);
          line-height: 1.6;
          min-height: 100vh;
          background:
            radial-gradient(900px 500px at 8% -8%, rgba(0,200,83,0.14), transparent 55%),
            radial-gradient(700px 400px at 100% 0%, rgba(0,200,83,0.08), transparent 50%),
            var(--bg);
          background-attachment: fixed;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes floatGlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .container {
          max-width: 95%;
          width: 100%;
          margin: 0 auto;
          padding: 24px;
          min-height: 100vh;
        }

        @media (min-width: 768px) { .container { max-width: 92%; padding: 36px; } }
        @media (min-width: 1024px) { .container { max-width: 90%; padding: 44px; } }
        @media (min-width: 1600px) { .container { max-width: 1600px; padding: 52px; } }

        .header {
          text-align: center;
          margin-bottom: 40px;
          animation: fadeUp 0.6s ease both;
        }

        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 999px;
          background: var(--brand-soft);
          border: 1px solid rgba(0,200,83,0.35);
          color: var(--brand-darker);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 18px;
        }

        .badge-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--brand);
          box-shadow: 0 0 12px var(--brand);
          animation: floatGlow 2.4s ease-in-out infinite;
        }

        .title {
          font-size: clamp(2.1rem, 5vw, 3.2rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text);
          margin-bottom: 12px;
        }
        .title .accent { color: var(--brand-dark); }

        .subtitle {
          color: var(--muted);
          font-size: 1.05rem;
          max-width: 560px;
          margin: 0 auto;
        }

        /* Header layout with reset button */
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          width: 100%;
        }

        /* Reset button styling */
        .reset-btn {
          background: #f0f0f0;
          border: 1px solid #d0d0d0;
          color: var(--text);
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(31,42,36,0.08);
          flex-shrink: 0;
          height: fit-content;
        }

        .reset-btn:hover:not(:disabled) {
          background: #e8e8e8;
          border-color: #999;
          box-shadow: 0 4px 12px rgba(31,42,36,0.12);
          transform: translateY(-1px);
        }

        .reset-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .reset-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          
          .reset-btn {
            width: 100%;
            justify-content: center;
          }
        }

        /* Side-by-side workspace — always two columns on desktop */
        .workspace {
          display: grid;
          grid-template-columns: 1fr;
          gap: 26px;
          align-items: start;
        }
        @media (min-width: 1024px) {
          .workspace {
            grid-template-columns: minmax(440px, 520px) 1fr;
          }
        }
        @media (min-width: 1600px) {
          .workspace {
            grid-template-columns: minmax(520px, 600px) 1fr;
          }
        }

        .form-container {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(31,42,36,0.06);
          animation: fadeUp 0.6s ease 0.08s both;
        }
        @media (min-width: 1024px) {
          .form-container {
            position: sticky;
            top: 24px;
          }
        }

        .form-group { margin-bottom: 16px; }
        .form-group:last-of-type { margin-bottom: 0; }

        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text);
          font-size: 14px;
        }
        .form-label .req { color: var(--brand-dark); margin-left: 3px; }

        .form-input, .form-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 11px;
          font-size: 14px;
          color: var(--text);
          background: #fbfdfa;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          font-family: inherit;
        }

        .form-input::placeholder, .form-textarea::placeholder { color: #9aa89f; }

        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: var(--brand);
          background: #fff;
          box-shadow: 0 0 0 4px rgba(0,200,83,0.18);
        }

        .form-textarea { resize: none; min-height: 96px; }
        .form-textarea.tall { min-height: 120px; }

        .submit-btn {
          margin-top: 20px;
          width: 100%;
          background: linear-gradient(120deg, var(--brand), var(--brand-dark));
          color: #fff;
          border: none;
          padding: 13px 28px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.25s ease, filter 0.2s;
          box-shadow: 0 8px 22px rgba(0,200,83,0.35);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(0,200,83,0.45);
          filter: brightness(1.03);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }

        .submit-btn:disabled {
          cursor: not-allowed;
          background: #c6d4bb;
          box-shadow: none;
        }

        .btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.5);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .output-col { min-width: 0; }

        .error-banner {
          background: #fdeceb;
          border: 1px solid #f5c2be;
          color: #b3261e;
          padding: 14px 18px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: fadeUp 0.3s ease both;
        }

        .placeholder-card {
          background:
            radial-gradient(400px 200px at 50% 0%, rgba(0,200,83,0.08), transparent 70%),
            var(--surface);
          border: 1px dashed rgba(0,200,83,0.45);
          border-radius: 18px;
          padding: 72px 34px;
          text-align: center;
          color: var(--muted);
          min-height: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: fadeUp 0.5s ease both;
        }
        .placeholder-icon {
          width: 76px;
          height: 76px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          background: var(--brand-soft);
          border: 1px solid rgba(0,200,83,0.35);
          margin-bottom: 20px;
          animation: floatGlow 3s ease-in-out infinite;
        }
        .placeholder-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
        }
        .placeholder-text { max-width: 360px; font-size: 14.5px; }
        .placeholder-hints {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-top: 22px;
        }
        .placeholder-hints .meta-chip { background: #f3f6ef; }

        .loading {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          text-align: center;
          padding: 56px 30px;
          color: var(--muted);
          font-size: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(31,42,36,0.06);
        }
        .loading .big-spinner {
          width: 42px; height: 42px;
          border: 3px solid rgba(0,200,83,0.2);
          border-top-color: var(--brand-dark);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .results-container {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(31,42,36,0.06);
          animation: fadeUp 0.5s ease both;
        }

        .results-header {
          margin-bottom: 20px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border);
        }

        .results-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 12px;
        }

        .results-meta { display: flex; flex-wrap: wrap; gap: 8px; }

        .jira-panel {
          background: #f9fcfa;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 22px;
          box-shadow: 0 10px 30px rgba(31,42,36,0.04);
        }

        .jira-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .jira-panel-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
        }

        .jira-session-tag {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--brand-darker);
          background: var(--brand-soft);
          border: 1px solid rgba(0,200,83,0.3);
          border-radius: 999px;
          padding: 5px 9px;
        }

        .jira-credentials-grid {
          display: grid;
          gap: 12px;
        }

        .jira-btn {
          width: 100%;
          margin-top: 10px;
          background: linear-gradient(120deg, var(--brand), var(--brand-dark));
          color: #fff;
          border: none;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.25s ease, filter 0.2s;
          box-shadow: 0 8px 22px rgba(0,200,83,0.35);
        }

        .jira-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(0,200,83,0.45);
          filter: brightness(1.03);
        }

        .jira-btn:disabled {
          cursor: not-allowed;
          background: #c6d4bb;
          box-shadow: none;
        }

        .jira-status-message {
          margin-top: 12px;
          font-size: 13px;
          color: var(--muted);
        }

        .jira-error {
          margin-top: 12px;
          background: #fdeceb;
          border: 1px solid #f5c2be;
          color: #b3261e;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
        }

        .jira-stories {
          margin-top: 18px;
          display: grid;
          gap: 12px;
        }

        .jira-stories-title {
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }

        .jira-story-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #fff;
          padding: 14px;
          box-shadow: 0 4px 12px rgba(31,42,36,0.03);
        }

        .jira-story-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .jira-story-key {
          font-size: 12px;
          font-weight: 700;
          color: var(--brand-darker);
          background: var(--brand-soft);
          border: 1px solid rgba(0,200,83,0.25);
          border-radius: 999px;
          padding: 5px 10px;
        }

        .jira-story-status {
          font-size: 11px;
          color: var(--text);
          background: #eef2ed;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 4px 8px;
          font-weight: 600;
        }

        .jira-story-summary {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }

        .jira-story-meta {
          margin: 0 0 6px;
          color: var(--muted);
          font-size: 13px;
        }

        .jira-story-description {
          margin: 0 0 10px;
          color: var(--text);
          font-size: 13px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .jira-story-link {
          display: inline-block;
          color: var(--brand-darker);
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .jira-story-link:hover {
          text-decoration: underline;
        }

        .jira-story-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 12px;
        }

        .jira-add-btn {
          border: 1px solid rgba(0,200,83,0.35);
          border-radius: 9px;
          padding: 8px 11px;
          background: var(--brand-soft);
          color: var(--brand-darker);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }

        .jira-add-btn:hover {
          background: #d5f2df;
          border-color: var(--brand);
          transform: translateY(-1px);
        }

        .jira-add-btn.selected {
          background: var(--brand);
          border-color: var(--brand);
          color: #fff;
          cursor: default;
        }

        .results-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .download-btn {
          background: linear-gradient(120deg, var(--brand), var(--brand-dark));
          color: #fff;
          border: none;
          padding: 11px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.25s ease, filter 0.2s;
          box-shadow: 0 8px 22px rgba(0,200,83,0.35);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .download-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(0,200,83,0.45);
          filter: brightness(1.03);
        }

        .download-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .meta-chip {
          font-size: 12.5px;
          color: var(--brand-darker);
          background: var(--brand-soft);
          border: 1px solid rgba(0,200,83,0.3);
          padding: 5px 12px;
          border-radius: 999px;
          font-weight: 600;
        }

        .table-container { overflow-x: auto; border-radius: 12px; }

        .results-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 6px;
        }

        .results-table th {
          background: #f6f9f2;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          font-size: 11.5px;
          letter-spacing: 0.06em;
          padding: 13px 14px;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }

        .results-table td {
          padding: 14px;
          text-align: left;
          border-bottom: 1px solid #eef1ec;
          color: var(--text);
          font-size: 14px;
          vertical-align: top;
        }

        .results-table tbody tr.row-main { transition: background 0.15s; }
        .results-table tbody tr.row-main:hover { background: #f7faf3; }

        .cat-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid transparent;
          text-transform: capitalize;
        }
        .category-positive { color: #1f8a4c; background: #e6f6ec; border-color: #b7e4c7; }
        .category-negative { color: #c0392b; background: #fdecea; border-color: #f5c2be; }
        .category-edge { color: #b8860b; background: #fcf3d9; border-color: #f0dca0; }
        .category-authorization { color: #7d3cc0; background: #f3e9fb; border-color: #ddc6f2; }
        .category-non-functional { color: #2b6cb0; background: #e7f0fa; border-color: #c0d8f0; }

        .test-case-id {
          cursor: pointer;
          color: var(--brand-darker);
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .test-case-id:hover { background: var(--brand-soft); }
        .test-case-id.expanded { background: var(--brand-soft); }

        .expand-icon {
          font-size: 9px;
          transition: transform 0.2s;
          color: var(--muted);
        }
        .expand-icon.expanded { transform: rotate(90deg); color: var(--brand-dark); }

        .expanded-details {
          margin-top: 8px;
          background: #f8faf5;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          animation: fadeUp 0.3s ease both;
        }

        .details-title { margin-bottom: 16px; color: var(--text); font-size: 15px; font-weight: 700; }

        .step-item {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 10px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .step-item:hover {
          border-color: var(--brand);
          box-shadow: 0 4px 12px rgba(0,200,83,0.15);
        }

        .step-header {
          display: grid;
          grid-template-columns: 70px 1fr 1fr 1fr;
          gap: 15px;
          align-items: start;
        }

        .step-id {
          font-weight: 700;
          color: #fff;
          background: linear-gradient(120deg, var(--brand), var(--brand-dark));
          padding: 5px 8px;
          border-radius: 8px;
          text-align: center;
          font-size: 12px;
        }
        .step-description { color: var(--text); line-height: 1.5; font-size: 13.5px; }
        .step-test-data { color: var(--muted); font-style: italic; font-size: 13px; }
        .step-expected { color: #1f8a4c; font-weight: 500; font-size: 13px; }

        .step-labels {
          display: grid;
          grid-template-columns: 70px 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 12px;
          font-weight: 700;
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="header-content">
            <div>
              <span className="badge-pill">
                <span className="badge-dot"></span>
                AI-Powered Test Generation
              </span>
              <h1 className="title">User Story to <span className="accent">Tests</span></h1>
              <p className="subtitle">Turn user stories into comprehensive, structured test cases in seconds.</p>
            </div>
            <button 
              className="reset-btn" 
              onClick={handleReset} 
              title="Clear all fields and results"
              aria-label="Reset form and results"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        <div className="workspace">
          <form onSubmit={handleSubmit} className="form-container">
            <div className="jira-panel">
              <div className="jira-panel-header">
                <div className="jira-panel-title">Connect Jira</div>
                <span className="jira-session-tag">Session only</span>
              </div>

              <div className="jira-credentials-grid">
                <div className="form-group">
                  <label htmlFor="jiraBaseUrl" className="form-label">
                    Base URL <span className="req">*</span>
                  </label>
                  <input
                    type="url"
                    id="jiraBaseUrl"
                    className="form-input"
                    value={jiraConfig.baseUrl}
                    onChange={(e) => handleJiraInputChange('baseUrl', e.target.value)}
                    placeholder="https://your-company.atlassian.net"
                    spellCheck={false}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="jiraEmail" className="form-label">
                    Email ID <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    id="jiraEmail"
                    className="form-input"
                    value={jiraConfig.email}
                    onChange={(e) => handleJiraInputChange('email', e.target.value)}
                    placeholder="name@company.com"
                    spellCheck={false}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="jiraApiToken" className="form-label">
                    Jira API Token <span className="req">*</span>
                  </label>
                  <input
                    type="password"
                    id="jiraApiToken"
                    className="form-input"
                    value={jiraConfig.apiToken}
                    onChange={(e) => handleJiraInputChange('apiToken', e.target.value)}
                    placeholder="Enter Jira API token"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              </div>

              <button
                type="button"
                className="jira-btn"
                onClick={handleConnectJira}
                disabled={isJiraLoading}
              >
                {isJiraLoading ? 'Connecting...' : 'Connect Jira'}
              </button>

              {!jiraError && !isJiraLoading && jiraConnected && (
                <div className="jira-status-message">
                  Connected successfully. {jiraStories.length > 0 ? `${jiraStories.length} user stor${jiraStories.length === 1 ? 'y' : 'ies'} loaded.` : 'No user stories were returned.'}
                </div>
              )}

              {jiraError && <div className="jira-error">{jiraError}</div>}

              {selectedJiraStoryKey && !jiraError && (
                <div className="jira-status-message">
                  {selectedJiraStoryKey} added to the form. Enter Acceptance Criteria before generating test cases.
                </div>
              )}

              {jiraConnected && jiraStories.length > 0 && (
                <div className="jira-stories">
                  <div className="jira-stories-title">Available Jira User Stories</div>
                  {jiraStories.map((story) => (
                    <div key={story.key} className="jira-story-card">
                      <div className="jira-story-header">
                        <span className="jira-story-key">{story.key}</span>
                        <span className="jira-story-status">{story.status}</span>
                      </div>
                      <h4 className="jira-story-summary">{story.summary}</h4>
                      <p className="jira-story-meta"><strong>Assignee:</strong> {story.assignee}</p>
                      <p className="jira-story-description">{story.description}</p>
                      <div className="jira-story-actions">
                        <a className="jira-story-link" href={story.url} target="_blank" rel="noreferrer">
                          Open in Jira
                        </a>
                        <button
                          type="button"
                          className={`jira-add-btn ${selectedJiraStoryKey === story.key ? 'selected' : ''}`}
                          onClick={() => handleAddJiraStoryToForm(story)}
                          disabled={selectedJiraStoryKey === story.key}
                        >
                          {selectedJiraStoryKey === story.key ? 'Added to form' : 'Add to form'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {jiraConnected && jiraStories.length === 0 && (
                <div className="jira-status-message">Try creating a Jira issue or adjusting the project permissions, then connect again.</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="storyTitle" className="form-label">
                Story Title <span className="req">*</span>
              </label>
              <input
                type="text"
                id="storyTitle"
                className="form-input"
                value={formData.storyTitle}
                onChange={(e) => handleInputChange('storyTitle', e.target.value)}
                placeholder="Enter the user story title..."
                required
                spellCheck={false}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
            </div>

            <div className="form-group">
              <label htmlFor="summary" className="form-label">
                Summary <span className="req">*</span>
              </label>
              <input
                type="text"
                id="summary"
                className="form-input"
                value={formData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
                placeholder="Brief summary of the user story..."
                required
                spellCheck={false}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                className="form-textarea tall"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Additional description (optional)..."
                spellCheck={false}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
            </div>

            <div className="form-group">
              <label htmlFor="acceptanceCriteria" className="form-label">
                Acceptance Criteria <span className="req">*</span>
              </label>
              <textarea
                id="acceptanceCriteria"
                className="form-textarea tall"
                value={formData.acceptanceCriteria}
                onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
                placeholder="Enter the acceptance criteria..."
                required
                spellCheck={false}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
            </div>

            <div className="form-group">
              <label htmlFor="additionalInfo" className="form-label">
                Additional Info
              </label>
              <textarea
                id="additionalInfo"
                className="form-textarea"
                value={formData.additionalInfo}
                onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                placeholder="Any additional information (optional)..."
                spellCheck={false}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading && <span className="btn-spinner"></span>}
              {isLoading ? 'Generating...' : '✨ Generate Test Cases'}
            </button>
          </form>

          <div className="output-col">
              {error && (
                <div className="error-banner">
                  <span>⚠️</span>
                  {error}
                </div>
              )}

              {isLoading && (
                <div className="loading">
                  <span className="big-spinner"></span>
                  Generating test cases...
                </div>
              )}

              {!isLoading && !results && !error && (
                <div className="placeholder-card">
                  <div className="placeholder-icon">🧪</div>
                  <div className="placeholder-title">Your test cases will appear here</div>
                  <p className="placeholder-text">
                    Fill in the story details on the left and hit Generate. We'll craft
                    positive, negative, edge, and more test cases for you.
                  </p>
                  <div className="placeholder-hints">
                    <span className="meta-chip">Positive</span>
                    <span className="meta-chip">Negative</span>
                    <span className="meta-chip">Edge</span>
                    <span className="meta-chip">Authorization</span>
                  </div>
                </div>
              )}

              {!isLoading && results && (
                <div className="results-container">
                  <div className="results-header">
                    <h2 className="results-title">Generated Test Cases</h2>
                    <div className="results-meta">
                      <span className="meta-chip">{results.cases.length} test case(s)</span>
                      {results.model && <span className="meta-chip">Model: {results.model}</span>}
                      {results.promptTokens > 0 && (
                        <span className="meta-chip">Tokens: {results.promptTokens + results.completionTokens}</span>
                      )}
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>Test Case ID</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Expected Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.cases.map((testCase: TestCase) => (
                          <>
                            <tr key={testCase.id} className="row-main">
                              <td>
                                <div
                                  className={`test-case-id ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}
                                  onClick={() => toggleTestCaseExpansion(testCase.id)}
                                >
                                  <span className={`expand-icon ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}>
                                    ▶
                                  </span>
                                  {testCase.id}
                                </div>
                              </td>
                              <td>{testCase.title}</td>
                              <td>
                                <span className={`cat-badge category-${testCase.category.toLowerCase()}`}>
                                  {testCase.category}
                                </span>
                              </td>
                              <td>{testCase.expectedResult}</td>
                            </tr>
                            {expandedTestCases.has(testCase.id) && (
                              <tr key={`${testCase.id}-details`}>
                                <td colSpan={4}>
                                  <div className="expanded-details">
                                    <h4 className="details-title">Test Steps for {testCase.id}</h4>
                                    <div className="step-labels">
                                      <div>Step ID</div>
                                      <div>Step Description</div>
                                      <div>Test Data</div>
                                      <div>Expected Result</div>
                                    </div>
                                    {testCase.steps.map((step, index) => (
                                      <div key={index} className="step-item">
                                        <div className="step-header">
                                          <div className="step-id">S{String(index + 1).padStart(2, '0')}</div>
                                          <div className="step-description">{step}</div>
                                          <div className="step-test-data">{testCase.testData || 'N/A'}</div>
                                          <div className="step-expected">
                                            {index === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="results-actions">
                    <button
                      type="button"
                      className="download-btn"
                      onClick={handleDownload}
                      aria-label="Download generated test cases"
                    >
                      📥 Download
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  )
}

export default App
