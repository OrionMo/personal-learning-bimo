import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'

type View = 'overview' | 'cards' | 'tree' | 'inbox'
type CaptureMode = 'quick' | 'reflect'
type InboxRecord = { id: string; domain: string; rawText: string; context: string; trigger: string; nextStep: string; createdAt: string; images?: string[]; image?: string }

const learningDomains = ['AI产品开发', '个人认知', '表达社交', '内容创作', '职场成长']

const domainCatalog = [
  { name: 'AI产品开发', summary: '从需求、设计到上线，建立自己的产品开发方法。', progress: 28, tone: 'domain-lime' },
  { name: '个人认知', summary: '记录判断、选择和复盘，慢慢形成自己的思考框架。', progress: 12, tone: 'domain-coral' },
  { name: '表达社交', summary: '把复杂的事情讲清楚，也把自己的想法传递出去。', progress: 20, tone: 'domain-blue' },
  { name: '内容创作', summary: '积累选题、表达和内容生产的方法与素材。', progress: 8, tone: 'domain-purple' },
  { name: '职场成长', summary: '记录工作中的经验、反馈和可以复用的行动。', progress: 16, tone: 'domain-green' },
]

const recommendedSkillNodes: Record<string, string[]> = {
  'AI产品开发': ['产品需求', 'AI能力', '技术实现', '上线复盘'],
  '个人认知': ['自我理解', '判断选择', '情绪管理', '行动复盘'],
  '表达社交': ['结构表达', '倾听提问', '关系沟通', '公开表达'],
  '内容创作': ['选题判断', '内容结构', '表达风格', '复盘迭代'],
  '职场成长': ['工作方法', '项目协作', '反馈沟通', '职业规划'],
}

const nodeColorPalette = ['#eaf3ff', '#e8f7ea', '#fff3d9', '#fbe8ee', '#f0eaff', '#e9f5f2']

const navItems: { id: View; label: string; hint: string }[] = [
  { id: 'overview', label: '今日总览', hint: 'OVERVIEW' },
  { id: 'cards', label: '学习卡片', hint: 'LIBRARY' },
  { id: 'tree', label: '我的技能树', hint: 'SKILL MAP' },
  { id: 'inbox', label: '待整理', hint: 'INBOX' },
]

const cards = [
  { tag: 'AI产品开发', title: '先把图纸画出来，再让 AI 写第一行代码', status: '会用', tone: 'lime', learned: '开始写代码前，先把需求、页面、架构和验收标准写清楚。', skillNode: 'AI产品开发 / 前期准备', understanding: '这样 AI 的每次输出都有边界，也更容易检查。', useCase: '下次启动一个新功能时，先让 AI 输出需求清单和验收标准。', related: '项目开发流程 · PRD 文档', nextStep: '把个人学习库的快速记录流程整理成一页 PRD。' },
  { tag: '个人认知', title: '真正的成长，不是知道更多，而是能做出选择', status: '看过', tone: 'coral', learned: '信息本身不会自动变成能力，只有在具体场景里做过判断，才会留下自己的方法。', skillNode: '个人认知 / 判断力', understanding: '记录判断过程，比只记录最后的结果更有复用价值。', useCase: '遇到选择困难时，记录当时的判断依据，而不是只记录结果。', related: '选择复盘 · 个人决策记录', nextStep: '回想最近一次重要选择，补充当时的依据。' },
  { tag: '表达社交', title: '把复杂的事情讲清楚，是一种可以训练的能力', status: '能讲', tone: 'blue', learned: '表达不是把所有信息都说出来，而是先找到对方最需要理解的那一个核心。', skillNode: '表达社交 / 结构化表达', understanding: '先讲结论和价值，再补充必要细节，更容易让别人听懂。', useCase: '汇报、面试或向别人介绍自己的项目时，先讲结论和价值。', related: '项目介绍模板 · 三句话表达练习', nextStep: '用三句话重新介绍一个自己做过的项目。' },
]

type ForcePoint = { x: number; y: number; vx: number; vy: number; fixed?: boolean }
type ResizeDirection = { x: number; y: number }

function ForceSkillMap({ domain, labels, colors, sizes, parents, nodeIds, onEdit, onAdd, onDelete, onResize }: { domain: string; labels: string[]; colors: string[]; sizes: number[]; parents: (number | null)[]; nodeIds: string[]; onEdit: (index: number, label: string, color: string) => void; onAdd: (parentIndex?: number) => void; onDelete: (index: number) => void; onResize: (index: number, size: number) => void }) {
  const boardRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<{ type: 'node' | 'pan'; index?: number; moved: boolean; startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)
  const resizeRef = useRef<{ index: number; startX: number; startY: number; startSize: number; direction: ResizeDirection } | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [points, setPoints] = useState<ForcePoint[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const previousNodeIdsRef = useRef<string[]>(nodeIds)

  useEffect(() => {
    if (!boardRef.current) return
    const updateSize = () => { if (boardRef.current) { const rect = boardRef.current.getBoundingClientRect(); setSize({ width: rect.width, height: rect.height }) } }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(boardRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const centerX = size.width / 2 || 420
    const centerY = size.height / 2 || 260
    const radius = Math.min(centerX, centerY) * .68
    setPoints(labels.map((_, index) => { const angle = (-Math.PI / 2) + index * (Math.PI * 2 / Math.max(labels.length, 1)); return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius, vx: 0, vy: 0, fixed: true } }))
    previousNodeIdsRef.current = nodeIds
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [domain, size.width, size.height])

  useEffect(() => {
    setPoints((current) => {
      const previousNodeIds = previousNodeIdsRef.current
      if (nodeIds.length === previousNodeIds.length) return current
      if (nodeIds.length < previousNodeIds.length) {
        const nextPoints = nodeIds.map((nodeId) => current[previousNodeIds.indexOf(nodeId)]).filter(Boolean)
        previousNodeIdsRef.current = nodeIds
        return nextPoints
      }
      const centerX = size.width / 2 || 420
      const centerY = size.height / 2 || 260
      const newIndex = nodeIds.length - 1
      const parentIndex = newIndex > 0 ? parents[newIndex] : null
      const parent = parentIndex !== null && parentIndex !== undefined ? current[parentIndex] : undefined
      const base = parent ?? { x: centerX, y: centerY, vx: 0, vy: 0 }
      const newSize = sizes[newIndex] ?? 112
      const rootRadius = 112
      const padding = 24
      const maxX = Math.max(newSize / 2 + padding, (size.width || 840) - newSize / 2 - padding)
      const maxY = Math.max(newSize / 2 + padding, (size.height || 520) - newSize / 2 - padding)
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
      const overlaps = (candidate: { x: number; y: number }) => {
        const rootDistance = Math.hypot(candidate.x - centerX, candidate.y - centerY)
        if (rootDistance < newSize / 2 + rootRadius + 22) return true
        return current.some((point, index) => {
          const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y)
          return distance < newSize / 2 + (sizes[index] ?? 112) / 2 + 22
        })
      }
      const distances = [
        Math.max(150, ((sizes[parentIndex ?? 0] ?? 112) + newSize) * .72),
        Math.max(210, ((sizes[parentIndex ?? 0] ?? 112) + newSize) * 1.05),
        Math.max(280, ((sizes[parentIndex ?? 0] ?? 112) + newSize) * 1.35),
      ]
      const candidates = distances.flatMap((distance) => Array.from({ length: 18 }, (_, step) => {
        const angle = (step / 18) * Math.PI * 2 + (newIndex % 2 ? Math.PI / 18 : 0)
        return { x: clamp(base.x + Math.cos(angle) * distance, newSize / 2 + padding, maxX), y: clamp(base.y + Math.sin(angle) * distance, newSize / 2 + padding, maxY) }
      }))
      const position = candidates.find((candidate) => !overlaps(candidate)) ?? candidates.reduce((best, candidate) => {
        const clearance = current.reduce((minimum, point, index) => Math.min(minimum, Math.hypot(candidate.x - point.x, candidate.y - point.y) - newSize / 2 - (sizes[index] ?? 112) / 2), Number.POSITIVE_INFINITY)
        const bestClearance = current.reduce((minimum, point, index) => Math.min(minimum, Math.hypot(best.x - point.x, best.y - point.y) - newSize / 2 - (sizes[index] ?? 112) / 2), Number.POSITIVE_INFINITY)
        return clearance > bestClearance ? candidate : best
      })
      previousNodeIdsRef.current = nodeIds
      return [...current, { x: position.x, y: position.y, vx: 0, vy: 0, fixed: true }]
    })
  }, [nodeIds, parents, size.height, size.width, sizes])

  const worldPoint = (event: PointerEvent<HTMLElement>) => { const rect = boardRef.current?.getBoundingClientRect(); if (!rect) return { x: 0, y: 0 }; return { x: (event.clientX - rect.left - rect.width / 2 - pan.x) / zoom + rect.width / 2, y: (event.clientY - rect.top - rect.height / 2 - pan.y) / zoom + rect.height / 2 } }
  const handleNodeDown = (event: PointerEvent<HTMLElement>, index: number) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); interactionRef.current = { type: 'node', index, moved: false, startX: event.clientX, startY: event.clientY, startPanX: pan.x, startPanY: pan.y }; setPoints((current) => current.map((point, pointIndex) => pointIndex === index ? { ...point, vx: 0, vy: 0 } : point)) }
  const handleNodeMove = (event: PointerEvent<HTMLElement>, index: number) => { const interaction = interactionRef.current; if (!interaction || interaction.type !== 'node' || interaction.index !== index) return; const point = worldPoint(event); if (Math.hypot(event.clientX - interaction.startX, event.clientY - interaction.startY) > 4) interaction.moved = true; setPoints((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, x: point.x, y: point.y, vx: 0, vy: 0 } : item)) }
  const handleNodeUp = (event: PointerEvent<HTMLElement>, index: number) => { const interaction = interactionRef.current; event.currentTarget.releasePointerCapture(event.pointerId); if (interaction?.type === 'node' && interaction.index === index) { setPoints((current) => current.map((point, pointIndex) => pointIndex === index ? { ...point, fixed: true } : point)); if (!interaction.moved) setSelectedIndex(index) } interactionRef.current = null }
  const handleResizeDown = (event: PointerEvent<HTMLSpanElement>, index: number, direction: ResizeDirection) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); resizeRef.current = { index, startX: event.clientX, startY: event.clientY, startSize: sizes[index] ?? 112, direction } }
  const handleResizeMove = (event: PointerEvent<HTMLSpanElement>) => { const resize = resizeRef.current; if (!resize) return; event.stopPropagation(); const dx = (event.clientX - resize.startX) / zoom; const dy = (event.clientY - resize.startY) / zoom; const delta = Math.max(dx * resize.direction.x, dy * resize.direction.y); onResize(resize.index, Math.max(76, Math.min(180, Math.round(resize.startSize + delta * 1.15)))) }
  const handleResizeUp = (event: PointerEvent<HTMLSpanElement>) => { event.stopPropagation(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); resizeRef.current = null }
  const handleNodeKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => { if (event.key !== 'Backspace') return; event.preventDefault(); event.stopPropagation(); onDelete(index); setSelectedIndex(null) }
  const handleCanvasDown = (event: PointerEvent<HTMLDivElement>) => { if ((event.target as HTMLElement).closest('[data-node]')) return; setSelectedIndex(null); event.currentTarget.setPointerCapture(event.pointerId); interactionRef.current = { type: 'pan', moved: false, startX: event.clientX, startY: event.clientY, startPanX: pan.x, startPanY: pan.y } }
  const handleCanvasMove = (event: PointerEvent<HTMLDivElement>) => { const interaction = interactionRef.current; if (!interaction || interaction.type !== 'pan') return; const dx = event.clientX - interaction.startX; const dy = event.clientY - interaction.startY; if (Math.hypot(dx, dy) > 3) interaction.moved = true; setPan({ x: interaction.startPanX + dx, y: interaction.startPanY + dy }) }
  const handleCanvasUp = (event: PointerEvent<HTMLDivElement>) => { if (interactionRef.current?.type === 'pan') event.currentTarget.releasePointerCapture(event.pointerId); interactionRef.current = null }
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => { event.preventDefault(); event.stopPropagation(); setZoom((value) => Math.max(.65, Math.min(1.8, value - event.deltaY * .001))) }

  return <div className="skill-map-board neural-map" ref={boardRef} onPointerDown={handleCanvasDown} onPointerMove={handleCanvasMove} onPointerUp={handleCanvasUp} onPointerCancel={handleCanvasUp} onWheelCapture={handleWheel}><div className="mindmap-toolbar" onPointerDown={(event) => event.stopPropagation()}><span>{Math.round(zoom * 100)}%</span></div><div className="neural-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>{points.map((point, index) => { const parentIndex = parents[index]; const parent = parentIndex !== null && parentIndex !== undefined ? points[parentIndex] : undefined; const centerX = parent?.x ?? size.width / 2; const centerY = parent?.y ?? size.height / 2; const dx = point.x - centerX; const dy = point.y - centerY; return <div className="neural-line" key={`line-${nodeIds[index] ?? index}`} style={{ left: `${centerX}px`, top: `${centerY}px`, width: `${Math.hypot(dx, dy)}px`, transform: `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)` }} /> })}<div className="neural-node neural-root" style={{ left: `${size.width / 2}px`, top: `${size.height / 2}px` }}><span className="node-kicker">目标领域</span><strong>{domain}</strong></div>{points.map((point, index) => { const selected = selectedIndex === index; const nodeSize = sizes[index] ?? 112; return <div className={`neural-node neural-branch ${selected ? 'is-selected' : ''}`} data-node key={nodeIds[index] ?? `${labels[index]}-${index}`} style={{ left: `${point.x}px`, top: `${point.y}px`, width: `${nodeSize}px`, height: `${nodeSize}px`, background: colors[index] ?? nodeColorPalette[0], transform: 'translate(-50%, -50%)' }} onPointerDown={(event) => handleNodeDown(event, index)} onPointerMove={(event) => handleNodeMove(event, index)} onPointerUp={(event) => handleNodeUp(event, index)} onPointerCancel={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); interactionRef.current = null }} onDoubleClick={() => onEdit(index, labels[index], colors[index] ?? nodeColorPalette[0])} onKeyDown={(event) => handleNodeKeyDown(event, index)} tabIndex={0} role="button"><strong>{labels[index]}</strong><small>{selected ? '长按右下角圆点调整' : '点击选中'}</small>{selected && <><span className="node-action-add" role="button" tabIndex={0} aria-label="从此节点添加节点" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onAdd(index) }}>＋</span><span className="node-handles" aria-label="调整节点大小"><span className="node-handle handle-se" aria-label="拖动调整节点大小" onPointerDown={(event) => handleResizeDown(event, index, { x: 1, y: 1 })} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerCancel={handleResizeUp} /></span></>}</div> })}</div><div className="neural-hint">单击选中 · 点击节点右上角小圆点添加子节点 · 长按拖动右下角圆点调整大小 · 双击编辑文字 · 按 Backspace 删除节点 · 拖动节点重新排列 · 滚轮缩放 · 拖动画布平移</div></div>
}

function App() {
  const [view, setView] = useState<View>('overview')
  const [showModal, setShowModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<(typeof cards)[number] | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [nodeLabels, setNodeLabels] = useState<Record<string, string[]>>(() => {
    try { return { ...recommendedSkillNodes, ...JSON.parse(localStorage.getItem('growth-library:node-labels') ?? '{}') as Record<string, string[]> } } catch { return recommendedSkillNodes }
  })
  const [nodeColors, setNodeColors] = useState<Record<string, string[]>>(() => {
    const defaults = Object.fromEntries(Object.entries(recommendedSkillNodes).map(([domain, labels]) => [domain, labels.map((_, index) => nodeColorPalette[index % nodeColorPalette.length])]))
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('growth-library:node-colors') ?? '{}') as Record<string, string[]> } } catch { return defaults }
  })
  const [nodeSizes, setNodeSizes] = useState<Record<string, number[]>>(() => {
    const defaults = Object.fromEntries(Object.entries(recommendedSkillNodes).map(([domain, labels]) => [domain, labels.map(() => 112)]))
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('growth-library:node-sizes') ?? '{}') as Record<string, number[]> } } catch { return defaults }
  })
  const [nodeIds, setNodeIds] = useState<Record<string, string[]>>(() => {
    let saved: Record<string, string[]> = {}
    try { saved = JSON.parse(localStorage.getItem('growth-library:node-ids') ?? '{}') as Record<string, string[]> } catch { saved = {} }
    return Object.fromEntries(Object.entries(nodeLabels).map(([domain, labels]) => [domain, labels.map((_, index) => saved[domain]?.[index] ?? `${domain}-${index}`)]))
  })
  const [nodeParents, setNodeParents] = useState<Record<string, (number | null)[]>>(() => {
    const defaults = Object.fromEntries(Object.entries(recommendedSkillNodes).map(([domain, labels]) => [domain, labels.map(() => null)]))
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('growth-library:node-parents') ?? '{}') as Record<string, (number | null)[]> } } catch { return defaults }
  })
  const [editingNode, setEditingNode] = useState<{ index: number; label: string; color: string; isNew?: boolean } | null>(null)
  const [editingNodeText, setEditingNodeText] = useState('')
  const [pendingDeleteNode, setPendingDeleteNode] = useState<{ index: number; label: string } | null>(null)
  const [captureMode, setCaptureMode] = useState<CaptureMode>('quick')
  const [captureDomain, setCaptureDomain] = useState(learningDomains[0])
  const [captureText, setCaptureText] = useState('')
  const [captureImages, setCaptureImages] = useState<string[]>([])
  const [reflection, setReflection] = useState({ context: '', trigger: '', nextStep: '' })
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<{ id: string; text: string } | null>(null)
  const [inboxRecords, setInboxRecords] = useState<InboxRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem('growth-library:inbox') ?? '[]') as InboxRecord[] } catch { return [] }
  })
  const [domainImage, setDomainImage] = useState<string | null>(() => localStorage.getItem('growth-library:ai-product-image'))
  const [imageAnimating, setImageAnimating] = useState(false)

  useEffect(() => {
    if (domainImage) localStorage.setItem('growth-library:ai-product-image', domainImage)
    else localStorage.removeItem('growth-library:ai-product-image')
  }, [domainImage])

  useEffect(() => {
    localStorage.setItem('growth-library:inbox', JSON.stringify(inboxRecords))
  }, [inboxRecords])

  useEffect(() => {
    localStorage.setItem('growth-library:node-labels', JSON.stringify(nodeLabels))
  }, [nodeLabels])

  useEffect(() => {
    localStorage.setItem('growth-library:node-colors', JSON.stringify(nodeColors))
  }, [nodeColors])

  useEffect(() => {
    localStorage.setItem('growth-library:node-sizes', JSON.stringify(nodeSizes))
  }, [nodeSizes])

  useEffect(() => {
    localStorage.setItem('growth-library:node-ids', JSON.stringify(nodeIds))
  }, [nodeIds])

  useEffect(() => {
    localStorage.setItem('growth-library:node-parents', JSON.stringify(nodeParents))
  }, [nodeParents])

  const openCapture = (mode: CaptureMode) => {
    setEditingRecordId(null)
    setCaptureMode(mode)
    setCaptureDomain(learningDomains[0])
    setCaptureText('')
    setCaptureImages([])
    setReflection({ context: '', trigger: '', nextStep: '' })
    setShowModal(true)
  }

  const openRecordEdit = (record: InboxRecord) => {
    setEditingRecordId(record.id)
    setCaptureMode('reflect')
    setCaptureDomain(record.domain ?? learningDomains[0])
    setCaptureText(record.rawText)
    setCaptureImages(record.images ?? (record.image ? [record.image] : []))
    setReflection({ context: record.context ?? '', trigger: record.trigger ?? '', nextStep: record.nextStep ?? '' })
    setShowModal(true)
  }

  const saveCapture = () => {
    if (!captureText.trim()) return
    if (editingRecordId) {
      setInboxRecords((records) => records.map((record) => record.id === editingRecordId ? { ...record, domain: captureDomain, rawText: captureText.trim(), context: reflection.context.trim(), trigger: reflection.trigger.trim(), nextStep: reflection.nextStep.trim(), images: captureImages } : record))
      setEditingRecordId(null)
      setShowModal(false)
      setView('inbox')
      return
    }
    const record: InboxRecord = {
      id: crypto.randomUUID(),
      domain: captureDomain,
      rawText: captureText.trim(),
      context: reflection.context.trim(),
      trigger: reflection.trigger.trim(),
      nextStep: reflection.nextStep.trim(),
      createdAt: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      images: captureImages,
    }
    setInboxRecords((records) => [record, ...records])
    setShowModal(false)
    setView('inbox')
  }

  const requestDeleteRecord = (record: InboxRecord) => {
    setPendingDeleteRecord({ id: record.id, text: record.rawText.slice(0, 42) })
  }

  const confirmDeleteRecord = () => {
    if (!pendingDeleteRecord) return
    setInboxRecords((records) => records.filter((record) => record.id !== pendingDeleteRecord.id))
    setPendingDeleteRecord(null)
  }

  const addSkillNode = (parentIndex?: number) => {
    if (!selectedDomain) return
    const nextLabel = '新技能节点'
    const nextIndex = (nodeLabels[selectedDomain] ?? []).length
    setNodeLabels((labels) => ({ ...labels, [selectedDomain]: [...(labels[selectedDomain] ?? []), nextLabel] }))
    const nextColor = nodeColorPalette[nextIndex % nodeColorPalette.length]
    setNodeColors((colors) => ({ ...colors, [selectedDomain]: [...(colors[selectedDomain] ?? []), nextColor] }))
    setNodeSizes((sizes) => ({ ...sizes, [selectedDomain]: [...(sizes[selectedDomain] ?? []), 112] }))
    setNodeIds((ids) => ({ ...ids, [selectedDomain]: [...(ids[selectedDomain] ?? []), crypto.randomUUID()] }))
    setNodeParents((parents) => ({ ...parents, [selectedDomain]: [...(parents[selectedDomain] ?? []), parentIndex ?? null] }))
    setEditingNode({ index: nextIndex, label: nextLabel, color: nextColor, isNew: true })
    setEditingNodeText(nextLabel)
  }

  const discardEditingNode = () => {
    // 取消只关闭编辑弹窗，保留新节点及其当前布局位置。
    setEditingNode(null)
  }

  const deleteSkillNode = (index: number) => {
    if (!selectedDomain) return
    const label = nodeLabels[selectedDomain]?.[index] ?? '这个节点'
    setPendingDeleteNode({ index, label })
  }

  const confirmDeleteSkillNode = () => {
    if (!selectedDomain || !pendingDeleteNode) return
    const { index } = pendingDeleteNode
    setNodeLabels((labels) => ({ ...labels, [selectedDomain]: (labels[selectedDomain] ?? []).filter((_, valueIndex) => valueIndex !== index) }))
    setNodeColors((colors) => ({ ...colors, [selectedDomain]: (colors[selectedDomain] ?? []).filter((_, valueIndex) => valueIndex !== index) }))
    setNodeSizes((sizes) => ({ ...sizes, [selectedDomain]: (sizes[selectedDomain] ?? []).filter((_, valueIndex) => valueIndex !== index) }))
    setNodeIds((ids) => ({ ...ids, [selectedDomain]: (ids[selectedDomain] ?? []).filter((_, valueIndex) => valueIndex !== index) }))
    setNodeParents((parents) => ({ ...parents, [selectedDomain]: (parents[selectedDomain] ?? []).filter((_, valueIndex) => valueIndex !== index).map((parent) => parent === index ? null : parent !== null && parent > index ? parent - 1 : parent) }))
    setPendingDeleteNode(null)
  }

  const readCaptureImage = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (captureImages.length >= 9) {
      window.alert('每条记录最多上传 9 张图片')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert('图片请控制在 5MB 以内')
      return
    }
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') setCaptureImages((images) => images.length < 9 ? [...images, reader.result as string] : images) }
    reader.readAsDataURL(file)
  }

  const handleCapturePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'))
    if (!imageItem) return
    event.preventDefault()
    const file = imageItem.getAsFile()
    if (file) readCaptureImage(file)
  }

  const handleDomainImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      window.alert('图片请控制在 5MB 以内')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDomainImage(typeof reader.result === 'string' ? reader.result : null)
      setImageAnimating(true)
      window.setTimeout(() => setImageAnimating(false), 820)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const current = navItems.find((item) => item.id === view) ?? navItems[0]
  const domainNoteCount = inboxRecords.filter((record) => (record.domain ?? '未选择领域') === 'AI产品开发').length
  const skillProgress = 28

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">PG<span>/</span>01</div>
        <div className="brand-copy">个人能力<br />成长库</div>

        <nav className="main-nav" aria-label="主导航">
          <p className="eyebrow">MY WORKSPACE</p>
          {navItems.map((item) => (
            <button
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              <span className="nav-index">0{navItems.indexOf(item) + 1}</span>
              <span>{item.label}{item.id === 'inbox' && inboxRecords.length > 0 && <b className="nav-count">{inboxRecords.length}</b>}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-progress">
            <span className="eyebrow">THIS WEEK</span>
            <strong>03 <small>张学习卡</small></strong>
            <div className="progress-line"><i /></div>
          </div>
          <button className="settings-button">设置 <span>↗</span></button>
        </div>
      </aside>

      <section className="content-area">
        <header className="topbar">
          <div className="breadcrumb"><span>WORKSPACE</span><b>/</b>{current.hint}</div>
          <div className="top-actions"><span className="date-label">2026 / 07 / 30</span><button className="avatar">L</button></div>
        </header>

        <div className="page-content">
          {view === 'overview' && <section className="hero-row">
            <div>
              <p className="eyebrow lime-text">THURSDAY / DAILY CHECK-IN</p>
              <h1>今天，<br /><em>你收获了什么？</em></h1>
              <p className="hero-note">把零散的输入，变成可以反复使用的个人能力。</p>
            </div>
            <div className="hero-number"><span>总学习记录</span><strong>024</strong><small>张卡片</small></div>
          </section>}

          {view === 'overview' && <section className={`black-panel ${domainImage ? 'has-image' : ''} ${imageAnimating ? 'image-animating' : ''}`}>
            {domainImage && <div className="panel-image-layer" style={{ backgroundImage: `url(${domainImage})` }} aria-hidden="true" />}
            <div className="panel-heading">
              <div><span className="panel-kicker">01 / TODAY'S FOCUS</span><h2>今天的学习轨迹</h2></div>
              <button className="add-button" onClick={() => openCapture('quick')}>+ 快速记录</button>
            </div>
            <div className="focus-grid">
              <div className="focus-main">
                <span className="topic-number">01</span>
                <p className="topic-label">正在进行</p>
                <h3>AI 产品开发<br /><span>前期准备</span></h3>
                <p className="topic-description">先把需求、页面、架构和规则想清楚。好的地基，会让后面的每一次迭代都更轻。</p>
                <button className="text-link" onClick={() => setView('cards')}>继续学习 <span>→</span></button>
                <div className="domain-image-actions">
                  <label className="image-upload">{domainImage ? '更换背景图' : '+ 自定义背景图'}<input type="file" accept="image/*" onChange={handleDomainImageUpload} /></label>
                  {domainImage && <button className="remove-image" onClick={() => setDomainImage(null)}>移除</button>}
                </div>
              </div>
              <div className="focus-side">
                <div className="stat-row"><span>本周连续</span><strong>03 <small>天</small></strong></div>
                <div className="stat-row"><span>本领域笔记</span><strong>{String(domainNoteCount).padStart(2, '0')} <small>条</small></strong></div>
                <div className="skill-progress-box"><div><span>技能树学习进展</span><b>AI 产品开发</b></div><div className="progress-ring" style={{ background: `conic-gradient(var(--lime) ${skillProgress}%, #3d403a 0)` }}><div><strong>{skillProgress}%</strong><small>已掌握</small></div></div></div>
              </div>
            </div>
          </section>}

          {view === 'overview' && <section className="lower-grid">
            <div className="section-block">
              <div className="section-title"><div><span className="eyebrow">02 / RECENT NOTES</span><h2>最近的学习卡</h2></div><button className="plain-link" onClick={() => setView('cards')}>查看全部 →</button></div>
              <div className="card-stack">
                {cards.map((card, index) => <article className="learning-card" key={card.title} onClick={() => setSelectedCard(card)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedCard(card) }}><div className={`card-dot ${card.tone}`} /><span className="card-index">0{index + 1}</span><div className="card-copy"><span>{card.tag}</span><h3>{card.title}</h3></div><b className="card-status">{card.status}</b><span className="card-arrow">↗</span></article>)}
              </div>
            </div>
            <div className="section-block tree-preview">
              <div className="section-title"><div><span className="eyebrow">03 / SKILL MAP</span><h2>技能树还是空的</h2></div><button className="plain-link" onClick={() => setView('tree')}>去建立 →</button></div>
              <div className="empty-tree"><div className="tree-node root-node">我的能力地图</div><div className="tree-branches"><i /><i /><i /></div><div className="tree-node ghost-node">从一个领域开始</div><p>你可以先记录，等真正形成自己的理解后，再决定它应该长在哪里。</p></div>
            </div>
          </section>}

          {view === 'cards' && <section className="view-page cards-page">
            <div className="section-title"><div><span className="eyebrow">02 / LEARNING CARDS</span><h2>学习卡片</h2></div><button className="add-button" onClick={() => openCapture('quick')}>+ 新建记录</button></div>
            <p className="view-intro">把看过的内容变成自己的理解，再逐步走到能讲和会用。</p>
            <div className="status-tabs"><button className="selected">全部</button><button>看过</button><button>能讲</button><button>会用</button></div>
            <div className="card-stack full-card-stack">{cards.map((card, index) => <article className="learning-card" key={card.title} onClick={() => setSelectedCard(card)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedCard(card) }}><div className={`card-dot ${card.tone}`} /><span className="card-index">0{index + 1}</span><div className="card-copy"><span>{card.tag}</span><h3>{card.title}</h3></div><b className="card-status">{card.status}</b><span className="card-arrow">↗</span></article>)}</div>
          </section>}

          {view === 'tree' && !selectedDomain && <section className="view-page tree-page">
            <div className="section-title"><div><span className="eyebrow">03 / MY DOMAINS</span><h2>我的领域</h2></div><button className="add-button" onClick={() => openCapture('quick')}>+ 快速记录</button></div>
            <p className="view-intro">先选择一个正在积累的领域，再进入它的技能树。你的每条碎片笔记，都可以慢慢长成自己的能力结构。</p>
            <div className="domain-card-grid">{domainCatalog.map((domain) => {
              const count = inboxRecords.filter((record) => (record.domain ?? '未选择领域') === domain.name).length
              return <button className={`domain-card ${domain.tone}`} key={domain.name} onClick={() => setSelectedDomain(domain.name)}><div className="domain-card-topline"><span className="eyebrow">DOMAIN / 0{domainCatalog.indexOf(domain) + 1}</span><span>↗</span></div><h3>{domain.name}</h3><p>{domain.summary}</p><div className="domain-card-meta"><span>{count} 条笔记</span><strong>{domain.progress}%</strong></div><div className="domain-card-progress"><i style={{ width: `${domain.progress}%` }} /></div></button>
            })}</div>
          </section>}

          {view === 'tree' && selectedDomain && <section className="view-page tree-page">
            <div className="domain-detail-head"><button className="back-link" onClick={() => setSelectedDomain(null)}>← 我的领域</button><button className="add-button" onClick={() => openCapture('quick')}>+ 记录到{selectedDomain}</button></div>
            <div className="section-title"><div><span className="eyebrow">03 / SKILL MAP</span><h2>{selectedDomain}</h2></div><span className="domain-detail-progress">{domainCatalog.find((domain) => domain.name === selectedDomain)?.progress ?? 0}% 学习进展</span></div>
            <p className="view-intro">从真实记录中整理节点，不追求一开始就完整。先留下足迹，再慢慢长出自己的技能树。</p>
            <ForceSkillMap key={selectedDomain} domain={selectedDomain} labels={nodeLabels[selectedDomain] ?? []} colors={nodeColors[selectedDomain] ?? []} sizes={nodeSizes[selectedDomain] ?? []} parents={nodeParents[selectedDomain] ?? []} nodeIds={nodeIds[selectedDomain] ?? []} onAdd={addSkillNode} onDelete={deleteSkillNode} onResize={(index, nextSize) => setNodeSizes((sizes) => ({ ...sizes, [selectedDomain]: (sizes[selectedDomain] ?? []).map((value, valueIndex) => valueIndex === index ? nextSize : value) }))} onEdit={(index, label, color) => { setEditingNode({ index, label, color }); setEditingNodeText(label) }} />
            <div className="domain-note-strip"><span>本领域笔记</span><strong>{inboxRecords.filter((record) => (record.domain ?? '未选择领域') === selectedDomain).length} 条</strong><button className="plain-link" onClick={() => setView('inbox')}>查看记录 →</button></div>
          </section>}

          {view === 'inbox' && <section className="inbox-section">
            <div className="section-title"><div><span className="eyebrow">04 / INBOX</span><h2>待整理的碎片</h2></div><button className="add-button" onClick={() => openCapture('reflect')}>帮我回想</button></div>
            {inboxRecords.length === 0 ? <div className="inbox-empty">还没有待整理内容。看到什么，就先丢进来。</div> : <div className="inbox-list">{inboxRecords.map((record) => <article className="inbox-record" key={record.id}><div className="inbox-record-meta"><span>{record.createdAt}</span><b>{record.domain ?? '未选择领域'} · {record.context ? '已回想' : '待回想'}</b><div className="inbox-record-actions"><button aria-label="编辑这条笔记" onClick={() => openRecordEdit(record)}>编辑</button><button className="danger" aria-label="删除这条笔记" onClick={() => requestDeleteRecord(record)}>删除</button></div></div><p>{record.rawText}</p>{(record.images ?? (record.image ? [record.image] : [])).length > 0 && <div className="inbox-record-images">{(record.images ?? (record.image ? [record.image] : [])).map((image, index) => <img className="inbox-record-image" key={`${record.id}-${index}`} src={image} alt={`记录中的图片 ${index + 1}`} />)}</div>}{record.context && <div className="reflection-summary"><span>当时场景</span>{record.context}{record.trigger && ` · 触发：${record.trigger}`}</div>}</article>)}</div>}
          </section>}
        </div>
      </section>

      <nav className="mobile-nav" aria-label="手机端主导航">
        {navItems.map((item) => <button className={view === item.id ? 'active' : ''} key={item.id} onClick={() => setView(item.id)}><span>{item.label}</span>{item.id === 'inbox' && inboxRecords.length > 0 && <b>{inboxRecords.length}</b>}</button>)}
      </nav>
      <button className="mobile-capture" onClick={() => openCapture('quick')}>+</button>

      {selectedCard && <div className="modal-backdrop" onClick={() => setSelectedCard(null)}><article className="learning-card-detail" onClick={(event) => event.stopPropagation()}>
        <div className="detail-topline"><span className={`card-dot ${selectedCard.tone}`} /><span>{selectedCard.tag}</span><button className="close-button" onClick={() => setSelectedCard(null)}>×</button></div>
        <p className="eyebrow">LEARNING CARD / {selectedCard.status}</p>
        <h2>{selectedCard.title}</h2>
        <div className="detail-section"><span>我学到了什么</span><p>{selectedCard.learned}</p></div>
        <div className="detail-meta-grid"><div><span>所属领域</span><strong>{selectedCard.tag}</strong></div><div><span>技能树节点</span><strong>{selectedCard.skillNode}</strong></div></div>
        <div className="detail-section"><span>我的理解</span><p>{selectedCard.understanding}</p></div>
        <div className="detail-section"><span>什么时候能用</span><p>{selectedCard.useCase}</p></div>
        <div className="detail-section"><span>关联素材和行动记录</span><p>{selectedCard.related}</p></div>
        <div className="detail-next"><span>下一步行动</span><strong>{selectedCard.nextStep}</strong></div>
        <button className="detail-done-button" onClick={() => setSelectedCard(null)}>看完了</button>
      </article></div>}

      {editingNode && <div className="modal-backdrop" onClick={discardEditingNode}><div className="node-edit-modal" onClick={(event) => event.stopPropagation()}><span className="eyebrow">EDIT NODE</span><h2>编辑技能节点</h2><p>把它改成你真正想发展的能力方向。</p><input value={editingNodeText} onChange={(event) => setEditingNodeText(event.target.value)} autoFocus onKeyDown={(event) => { if (event.key === 'Enter') { const nextText = editingNodeText.trim(); if (nextText && selectedDomain && editingNode) { setNodeLabels((labels) => ({ ...labels, [selectedDomain]: labels[selectedDomain].map((label, index) => index === editingNode.index ? nextText : label) })); setNodeColors((colors) => ({ ...colors, [selectedDomain]: (colors[selectedDomain] ?? []).map((color, index) => index === editingNode.index ? editingNode.color : color) })); setEditingNode(null) } } }} /><div className="node-color-control"><span>节点颜色</span><div className="node-color-options">{nodeColorPalette.map((color) => <button className={editingNode.color === color ? 'selected' : ''} key={color} style={{ background: color }} aria-label={`选择颜色 ${color}`} onClick={() => setEditingNode((node) => node ? { ...node, color } : node)} />)}</div></div><div className="node-edit-actions"><button className="plain-link" onClick={discardEditingNode}>取消</button><button className="add-button" onClick={() => { const nextText = editingNodeText.trim(); if (!nextText || !selectedDomain || !editingNode) return; setNodeLabels((labels) => ({ ...labels, [selectedDomain]: labels[selectedDomain].map((label, index) => index === editingNode.index ? nextText : label) })); setNodeColors((colors) => ({ ...colors, [selectedDomain]: (colors[selectedDomain] ?? []).map((color, index) => index === editingNode.index ? editingNode.color : color) })); setEditingNode(null) }}>保存节点</button></div></div></div>}

      {pendingDeleteNode && <div className="modal-backdrop" onClick={() => setPendingDeleteNode(null)}><div className="node-edit-modal delete-confirm-modal" onClick={(event) => event.stopPropagation()}><span className="eyebrow">DELETE NODE</span><h2>删除技能节点</h2><p>确定删除“{pendingDeleteNode.label}”吗？删除后可以重新添加，但当前节点内容不会保留。</p><div className="node-edit-actions"><button className="plain-link" onClick={() => setPendingDeleteNode(null)}>取消</button><button className="delete-confirm-button" onClick={confirmDeleteSkillNode}>删除节点</button></div></div></div>}

      {pendingDeleteRecord && <div className="modal-backdrop" onClick={() => setPendingDeleteRecord(null)}><div className="node-edit-modal delete-confirm-modal" onClick={(event) => event.stopPropagation()}><span className="eyebrow">DELETE NOTE</span><h2>删除待整理笔记</h2><p>确定删除这条笔记吗？删除后将无法恢复。</p><div className="delete-record-preview">“{pendingDeleteRecord.text}{pendingDeleteRecord.text.length >= 42 ? '…' : ''}”</div><div className="node-edit-actions"><button className="plain-link" onClick={() => setPendingDeleteRecord(null)}>取消</button><button className="delete-confirm-button" onClick={confirmDeleteRecord}>删除笔记</button></div></div></div>}

      {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><div className="capture-modal" onClick={(event) => event.stopPropagation()}>
        <div className="capture-modal-head"><div><span className="eyebrow lime-text">{editingRecordId ? 'EDIT NOTE' : 'QUICK CAPTURE'}</span><h2>{editingRecordId ? '编辑待整理笔记' : captureMode === 'quick' ? '先记下来，不要打断自己' : '帮你回想一下当时'}</h2></div><button className="close-button" onClick={() => { setShowModal(false); setEditingRecordId(null) }}>×</button></div>
        <div className="capture-mode-switch"><button className={captureMode === 'quick' ? 'selected' : ''} onClick={() => setCaptureMode('quick')}>快速保存</button><button className={captureMode === 'reflect' ? 'selected' : ''} onClick={() => setCaptureMode('reflect')}>帮我回想</button></div>
        <div className="domain-select-label"><span>学习领域选择</span><div className="domain-picker">{learningDomains.map((domain) => <button className={`domain-chip ${captureDomain === domain ? 'selected' : ''}`} key={domain} onClick={() => setCaptureDomain(domain)} aria-pressed={captureDomain === domain}>{domain}</button>)}</div></div>
        <label className="capture-label">刚刚捕捉到的内容<textarea value={captureText} onChange={(event) => setCaptureText(event.target.value)} onPaste={handleCapturePaste} placeholder="一句话、一个链接，或者一段还没想清楚的话……" autoFocus /></label>
        <div className="capture-image-tools"><label className="image-attach-button">+ 上传图片（{captureImages.length}/9）<input type="file" accept="image/*" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); if (captureImages.length >= 9) window.alert('已达到上限，单条记录最多 9 张图片'); else files.slice(0, 9 - captureImages.length).forEach(readCaptureImage); event.target.value = '' }} /></label><span>也可以直接 Ctrl + V 粘贴图片</span>{captureImages.length > 0 && <button className="remove-capture-image" onClick={() => setCaptureImages([])}>全部移除</button>}</div>
        {captureImages.length > 0 && <div className="capture-image-previews">{captureImages.map((image, index) => <div className="capture-image-preview-wrap" key={`capture-${index}`}><img className="capture-image-preview" src={image} alt={`待保存的图片 ${index + 1}`} /><button className="remove-one-image" onClick={() => setCaptureImages((images) => images.filter((_, imageIndex) => imageIndex !== index))}>×</button></div>)}</div>}
        {captureMode === 'reflect' && <div className="reflection-fields"><label>你当时正在做什么？<input value={reflection.context} onChange={(event) => setReflection({ ...reflection, context: event.target.value })} placeholder="比如：下班路上刷到一条视频" /></label><label>是什么让你停下来想到它？<input value={reflection.trigger} onChange={(event) => setReflection({ ...reflection, trigger: event.target.value })} placeholder="比如：它刚好解决了我今天遇到的问题" /></label><label>之后想试试什么？<input value={reflection.nextStep} onChange={(event) => setReflection({ ...reflection, nextStep: event.target.value })} placeholder="可以先空着，之后再补" /></label></div>}
        <div className="modal-actions"><button className="plain-link" onClick={() => { setShowModal(false); setEditingRecordId(null) }}>取消</button><button className="add-button" onClick={saveCapture}>{editingRecordId ? '保存修改' : captureMode === 'quick' ? '立即保存' : '保存并完成回想'}</button></div>
      </div></div>}
    </main>
  )
}

export default App
