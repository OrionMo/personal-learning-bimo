import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fetch as undiciFetch, ProxyAgent } from 'undici'

function deepSeekSkillTreeApi(runtimeEnv: Record<string, string | undefined>) {
  const serverFetch = undiciFetch
  const proxyUrl = runtimeEnv.DEEPSEEK_HTTPS_PROXY || 'http://127.0.0.1:7897'
  return {
    name: 'deepseek-skill-tree-api',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: any, res: any, next: () => void) => void) => void } }) {
      server.middlewares.use('/api/generate-skill-tree', async (req, res, next) => {
        if (req.method === 'GET') { res.statusCode = 204; res.end(); return }
        if (req.method !== 'POST') { next(); return }
        const apiKey = runtimeEnv.DEEPSEEK_API_KEY
        if (!apiKey) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: '未配置 DEEPSEEK_API_KEY' }))
          return
        }

        let body = ''
        req.setEncoding('utf8')
        req.on('data', (chunk: string) => { body += chunk })
        req.on('end', async () => {
          try {
            const input = JSON.parse(body) as {
              mode?: 'interview' | 'generate' | 'recommend'
              domain?: string
              existingNodes?: string[]
              records?: string[]
              profileSummary?: string
              messages?: { role: 'assistant' | 'user'; content: string }[]
              record?: { text?: string; context?: string; currentDomain?: string }
              candidates?: { domain?: string; nodes?: { id?: string; label?: string }[] }[]
            }
            const domain = input.domain?.trim() || '未命名领域'
            const existingNodes = (input.existingNodes ?? []).slice(0, 60)
            const records = (input.records ?? []).slice(0, 20)
            if (input.mode === 'recommend') {
              const candidates = (input.candidates ?? [])
                .map((candidate) => ({
                  domain: candidate.domain?.trim() || '',
                  nodes: (candidate.nodes ?? [])
                    .filter((node) => node.id?.trim() && node.label?.trim())
                    .map((node) => ({ id: node.id!.trim(), label: node.label!.trim() })),
                }))
                .filter((candidate) => candidate.domain && candidate.nodes.length > 0)
                .slice(0, 12)
              if (!input.record?.text?.trim() || candidates.length === 0)
                throw new Error('记录内容或候选技能节点为空')
              const recommendationSystem = `你是个人学习记录整理助手。请阅读一条待整理记录，并且只能从用户提供的候选领域和技能节点中选择最合适的一项。优先判断这条知识以后会在哪种学习任务中被复用，不要只按单个关键词机械匹配。只输出 JSON：{"domain":"候选领域原文","nodeLabel":"候选节点原文","reason":"不超过40字的推荐理由"}。不要输出 Markdown，不要创造新领域或新节点。`
              const response = await serverFetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                dispatcher: new ProxyAgent(proxyUrl),
                body: JSON.stringify({
                  model: runtimeEnv.DEEPSEEK_MODEL || 'deepseek-v4-flash',
                  messages: [
                    { role: 'system', content: recommendationSystem },
                    { role: 'user', content: JSON.stringify({ record: input.record, candidates }) },
                  ],
                  response_format: { type: 'json_object' },
                  thinking: { type: 'disabled' },
                  temperature: .2,
                  max_tokens: 600,
                }),
              })
              const result = await response.json() as { error?: { message?: string }; choices?: { message?: { content?: string | null } }[] }
              if (!response.ok) throw new Error(result.error?.message || `DeepSeek 请求失败（${response.status}）`)
              const content = result.choices?.[0]?.message?.content
              if (!content) throw new Error('DeepSeek 推荐返回空内容')
              const parsed = JSON.parse(content.replace(/^```json\s*/i, '').replace(/\s*```$/, '')) as { domain?: string; nodeLabel?: string; reason?: string }
              const candidate = candidates.find((item) => item.domain === parsed.domain?.trim())
              const node = candidate?.nodes.find((item) => item.label === parsed.nodeLabel?.trim())
              if (!candidate || !node) throw new Error('DeepSeek 推荐了候选范围外的节点')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ domain: candidate.domain, nodeLabel: node.label, reason: parsed.reason?.trim() || '根据记录内容与技能节点含义推荐。' }))
              return
            }
            if (input.mode === 'interview') {
              const interviewSystem = `你是技能树生成前的用户访谈助手。目标领域是“${domain}”。请通过简短对话确认：1.用户身份或职业角色；2.当前经验基础；3.学习目的和具体使用场景；4.希望达到的能力深度；5.可投入时间。每轮只追问最关键的1到2个问题，最多4轮。信息足够时总结用户画像。只输出JSON：{"reply":"给用户的回复或追问","ready":true或false,"summary":"信息足够时给出包含身份、基础、目标、场景、深度和时间的画像摘要，否则为空字符串"}。不要输出Markdown。`
              const interviewMessages = (input.messages ?? []).slice(-10)
              const requestInterview = async (maxTokens: number) => {
                const response = await serverFetch('https://api.deepseek.com/chat/completions', {
                  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, dispatcher: new ProxyAgent(proxyUrl),
                  body: JSON.stringify({ model: runtimeEnv.DEEPSEEK_MODEL || 'deepseek-v4-flash', messages: [{ role: 'system', content: interviewSystem }, ...interviewMessages], response_format: { type: 'json_object' }, thinking: { type: 'disabled' }, temperature: .3, max_tokens: maxTokens }),
                })
                const result = await response.json() as { error?: { message?: string }; choices?: { finish_reason?: string | null; message?: { content?: string | null } }[] }
                if (!response.ok) throw new Error(result.error?.message || `DeepSeek 请求失败（${response.status}）`)
                const content = result.choices?.[0]?.message?.content
                if (!content) throw new Error(`DeepSeek 访谈返回空内容（finish_reason: ${result.choices?.[0]?.finish_reason ?? 'unknown'}）`)
                const parsed = JSON.parse(content.replace(/^```json\s*/i, '').replace(/\s*```$/, '')) as { reply?: string; ready?: boolean; summary?: string }
                if (!parsed.reply?.trim()) throw new Error('DeepSeek 访谈缺少回复内容')
                return { reply: parsed.reply.trim(), ready: Boolean(parsed.ready && parsed.summary?.trim()), summary: parsed.summary?.trim() || '' }
              }
              let interview: { reply: string; ready: boolean; summary: string }
              try { interview = await requestInterview(1600) } catch (firstError) {
                const retryable = firstError instanceof SyntaxError || (firstError instanceof Error && (firstError.message.includes('空内容') || firstError.message.includes('缺少回复')))
                if (!retryable) throw firstError
                try { interview = await requestInterview(2600) } catch {
                  const userAnswers = interviewMessages.filter((message) => message.role === 'user' && message.content.trim()).map((message) => message.content.trim())
                  const ready = userAnswers.length >= 2
                  interview = {
                    ready,
                    reply: ready ? '我已经记录了你的身份、基础和目标。请确认下面的判断，然后生成适合你的技能树。' : '我已经记录了这些信息。还想确认：你希望最终能完成什么具体任务，以及每周大约能投入多少时间？',
                    summary: ready ? `用户访谈自述：${userAnswers.join('；')}` : '',
                  }
                }
              }
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(interview))
              return
            }
            const systemPrompt = `你是个人能力成长库的技能树规划助手。请根据用户的学习领域、已有节点和学习记录，生成一份可编辑的多层技能树草案。只输出 JSON，不要 Markdown，不要解释。JSON 必须符合这个结构：{"summary":"简短说明","nodes":[{"id":"唯一英文或拼音ID","label":"节点名称","parentId":null}]}。nodes 输出 8 到 12 个节点；一级方向控制在 3 到 5 个，parentId 为 null；其余至少一半节点必须是二级或三级节点，parentId 必须引用同一份 nodes 中已有的 id。每个一级方向尽量包含 1 到 3 个具体子能力；总节点不少于 9 个时，至少包含一条三级链路。不要把所有节点都放在第一层，不要重复已有节点，不要输出空节点，不要把宽泛的学习目标写成节点。`
            const userPrompt = JSON.stringify({ domain, userProfile: input.profileSummary?.trim() || '未提供用户画像', interview: (input.messages ?? []).slice(-10), existingNodes, records })
            type DraftNode = { id?: string; label?: string; parentId?: string | null }
            type DraftShape = { summary?: string; nodes?: DraftNode[] }
            const hierarchyStats = (value: unknown) => {
              const draft = value as DraftShape
              const nodes = Array.isArray(draft?.nodes) ? draft.nodes : []
              const ids = new Set(nodes.map((node) => node.id).filter((id): id is string => typeof id === 'string' && id.length > 0))
              const parentById = new Map(nodes.map((node) => [node.id, node.parentId && ids.has(node.parentId) && node.parentId !== node.id ? node.parentId : null]))
              const depthOf = (node: DraftNode, visited = new Set<string>()): number => {
                if (!node.id || visited.has(node.id)) return 1
                const parentId = parentById.get(node.id)
                if (!parentId) return 1
                const parent = nodes.find((candidate) => candidate.id === parentId)
                return parent ? 1 + depthOf(parent, new Set([...visited, node.id])) : 1
              }
              const childCount = nodes.filter((node) => node.id && parentById.get(node.id)).length
              const topLevelCount = nodes.length - childCount
              const maxDepth = nodes.reduce((maximum, node) => Math.max(maximum, depthOf(node)), 0)
              return { nodes, childCount, topLevelCount, maxDepth }
            }
            const hasEnoughHierarchy = (value: unknown) => {
              const stats = hierarchyStats(value)
              return stats.nodes.length >= 6 && stats.topLevelCount >= 2 && stats.topLevelCount <= 5 && stats.childCount >= Math.max(2, Math.ceil(stats.nodes.length * .45)) && (stats.nodes.length < 9 || stats.maxDepth >= 3)
            }
            const repairHierarchy = (value: unknown) => {
              if (hasEnoughHierarchy(value)) return value
              const draft = value as DraftShape
              const sourceNodes = Array.isArray(draft?.nodes) ? draft.nodes.slice(0, 12) : []
              const usedIds = new Set<string>()
              const normalizedNodes = sourceNodes.filter((node) => node.label?.trim()).map((node, index) => {
                let id = node.id?.trim() || `skill-${index + 1}`
                while (usedIds.has(id)) id = `${id}-${index + 1}`
                usedIds.add(id)
                return { id, label: node.label!.trim(), parentId: null as string | null }
              })
              const firstLayerCount = Math.min(4, Math.max(2, Math.round(normalizedNodes.length * .34)))
              const firstLayer = normalizedNodes.slice(0, firstLayerCount)
              normalizedNodes.forEach((node, index) => {
                if (index < firstLayerCount) return
                const shouldBeThirdLayer = normalizedNodes.length >= 9 && index >= normalizedNodes.length - 2 && normalizedNodes.length - firstLayerCount > 2
                if (shouldBeThirdLayer) {
                  const secondLayerIndex = firstLayerCount + (index - (normalizedNodes.length - 2)) % Math.max(1, normalizedNodes.length - firstLayerCount - 2)
                  node.parentId = normalizedNodes[secondLayerIndex]?.id ?? firstLayer[0]?.id ?? null
                } else {
                  node.parentId = firstLayer[(index - firstLayerCount) % Math.max(firstLayer.length, 1)]?.id ?? null
                }
              })
              return { summary: draft?.summary ?? '已生成包含一级方向和具体子能力的多层技能树草案。', nodes: normalizedNodes }
            }
            const requestDraft = async (maxTokens: number, hierarchyReminder = false) => {
              const response = await serverFetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                dispatcher: new ProxyAgent(proxyUrl),
                body: JSON.stringify({
                  model: runtimeEnv.DEEPSEEK_MODEL || 'deepseek-v4-flash',
                  messages: [{ role: 'system', content: `必须优先根据 userProfile 中的身份、经验、目标、使用场景、期望深度和时间投入决定技能树的专业程度。同一领域中，职业从业者或转岗者应包含岗位所需专业能力，普通兴趣学习者应降低不必要的专业深度。\n${systemPrompt}` }, { role: 'user', content: hierarchyReminder ? `${userPrompt}\n上一次结果层级不足。请严格生成 3 到 5 个一级方向，并让至少一半节点成为二级或三级节点。` : userPrompt }],
                  response_format: { type: 'json_object' },
                  thinking: { type: 'disabled' },
                  temperature: 0.4,
                  max_tokens: maxTokens,
                }),
              })
              const result = await response.json() as { error?: { message?: string }; choices?: { finish_reason?: string | null; message?: { content?: string | null } }[] }
              if (!response.ok) throw new Error(result.error?.message || `DeepSeek 请求失败（${response.status}）`)
              const content = result.choices?.[0]?.message?.content
              if (!content) throw new Error(`DeepSeek 返回空内容（finish_reason: ${result.choices?.[0]?.finish_reason ?? 'unknown'}）`)
              return JSON.parse(content.replace(/^```json\s*/i, '').replace(/\s*```$/, ''))
            }

            let draft: unknown
            try {
              draft = await requestDraft(2400)
            } catch (firstError) {
              const retryable = firstError instanceof SyntaxError || (firstError instanceof Error && firstError.message.includes('返回空内容'))
              if (!retryable) throw firstError
              draft = await requestDraft(4000, true)
            }
            if (!hasEnoughHierarchy(draft)) {
              const firstDraft = draft
              try { draft = await requestDraft(4000, true) } catch { draft = firstDraft }
            }
            draft = repairHierarchy(draft)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(draft))
          } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            const message = error instanceof Error ? error.message : 'DeepSeek 请求失败'
            res.end(JSON.stringify({ error: message === 'fetch failed' ? `无法连接 DeepSeek，请检查网络或 HTTPS 代理设置（当前代理：${proxyUrl.replace(/^https?:\/\//, '')}）` : message }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const runtimeEnv = loadEnv(mode, '.', '')
  const repositoryName = runtimeEnv.GITHUB_REPOSITORY?.split('/')[1]
  const base =
    runtimeEnv.GITHUB_ACTIONS === 'true' && repositoryName
      ? `/${repositoryName}/`
      : '/'
  return {
    base,
    plugins: [react(), deepSeekSkillTreeApi(runtimeEnv)],
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
    }
  }
})
