import { useEffect, useState, type ChangeEvent } from 'react'

type View = 'overview' | 'cards' | 'tree' | 'inbox'
type CaptureMode = 'quick' | 'reflect'
type InboxRecord = { id: string; domain: string; rawText: string; context: string; trigger: string; nextStep: string; createdAt: string }

const learningDomains = ['AI产品开发', '个人认知', '表达社交', '内容创作', '职场成长']

const navItems: { id: View; label: string; hint: string }[] = [
  { id: 'overview', label: '今日总览', hint: 'OVERVIEW' },
  { id: 'cards', label: '学习卡片', hint: 'LIBRARY' },
  { id: 'tree', label: '我的技能树', hint: 'SKILL MAP' },
  { id: 'inbox', label: '待整理', hint: 'INBOX' },
]

const cards = [
  { tag: 'AI产品开发', title: '先把图纸画出来，再让 AI 写第一行代码', status: '会用', tone: 'lime' },
  { tag: '个人认知', title: '真正的成长，不是知道更多，而是能做出选择', status: '看过', tone: 'coral' },
  { tag: '表达社交', title: '把复杂的事情讲清楚，是一种可以训练的能力', status: '能改', tone: 'blue' },
]

function App() {
  const [view, setView] = useState<View>('overview')
  const [showModal, setShowModal] = useState(false)
  const [captureMode, setCaptureMode] = useState<CaptureMode>('quick')
  const [captureDomain, setCaptureDomain] = useState(learningDomains[0])
  const [captureText, setCaptureText] = useState('')
  const [reflection, setReflection] = useState({ context: '', trigger: '', nextStep: '' })
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

  const openCapture = (mode: CaptureMode) => {
    setCaptureMode(mode)
    setCaptureDomain(learningDomains[0])
    setCaptureText('')
    setReflection({ context: '', trigger: '', nextStep: '' })
    setShowModal(true)
  }

  const saveCapture = () => {
    if (!captureText.trim()) return
    const record: InboxRecord = {
      id: crypto.randomUUID(),
      domain: captureDomain,
      rawText: captureText.trim(),
      context: reflection.context.trim(),
      trigger: reflection.trigger.trim(),
      nextStep: reflection.nextStep.trim(),
      createdAt: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }
    setInboxRecords((records) => [record, ...records])
    setShowModal(false)
    setView('inbox')
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
          <section className="hero-row">
            <div>
              <p className="eyebrow lime-text">THURSDAY / DAILY CHECK-IN</p>
              <h1>今天，<br /><em>你收获了什么？</em></h1>
              <p className="hero-note">把零散的输入，变成可以反复使用的个人能力。</p>
            </div>
            <div className="hero-number"><span>总学习记录</span><strong>024</strong><small>张卡片</small></div>
          </section>

          <section className={`black-panel ${domainImage ? 'has-image' : ''} ${imageAnimating ? 'image-animating' : ''}`}>
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
                  <label className="image-upload">{domainImage ? '更换激励图' : '+ 设置领域激励图'}<input type="file" accept="image/*" onChange={handleDomainImageUpload} /></label>
                  {domainImage && <button className="remove-image" onClick={() => setDomainImage(null)}>移除</button>}
                </div>
              </div>
              <div className="focus-side">
                <div className="stat-row"><span>本周连续</span><strong>03 <small>天</small></strong></div>
                <div className="stat-row"><span>正在积累</span><strong>04 <small>个领域</small></strong></div>
                <div className="signal-box"><span>下一步</span><b>把一个想法<br />讲给 AI 听</b><i>↗</i></div>
              </div>
            </div>
          </section>

          <section className="lower-grid">
            <div className="section-block">
              <div className="section-title"><div><span className="eyebrow">02 / RECENT NOTES</span><h2>最近的学习卡</h2></div><button className="plain-link" onClick={() => setView('cards')}>查看全部 →</button></div>
              <div className="card-stack">
                {cards.map((card, index) => <article className="learning-card" key={card.title}><div className={`card-dot ${card.tone}`} /><span className="card-index">0{index + 1}</span><div className="card-copy"><span>{card.tag}</span><h3>{card.title}</h3></div><b className="card-status">{card.status}</b></article>)}
              </div>
            </div>
            <div className="section-block tree-preview">
              <div className="section-title"><div><span className="eyebrow">03 / SKILL MAP</span><h2>技能树还是空的</h2></div><button className="plain-link" onClick={() => setView('tree')}>去建立 →</button></div>
              <div className="empty-tree"><div className="tree-node root-node">我的能力地图</div><div className="tree-branches"><i /><i /><i /></div><div className="tree-node ghost-node">从一个领域开始</div><p>你可以先记录，等真正形成自己的理解后，再决定它应该长在哪里。</p></div>
            </div>
          </section>

          {view === 'inbox' && <section className="inbox-section">
            <div className="section-title"><div><span className="eyebrow">04 / INBOX</span><h2>待整理的碎片</h2></div><button className="add-button" onClick={() => openCapture('reflect')}>帮我回想</button></div>
            {inboxRecords.length === 0 ? <div className="inbox-empty">还没有待整理内容。看到什么，就先丢进来。</div> : <div className="inbox-list">{inboxRecords.map((record) => <article className="inbox-record" key={record.id}><div className="inbox-record-meta"><span>{record.createdAt}</span><b>{record.domain ?? '未选择领域'} · {record.context ? '已回想' : '待回想'}</b></div><p>{record.rawText}</p>{record.context && <div className="reflection-summary"><span>当时场景</span>{record.context}{record.trigger && ` · 触发：${record.trigger}`}</div>}</article>)}</div>}
          </section>}
        </div>
      </section>

      {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><div className="capture-modal" onClick={(event) => event.stopPropagation()}>
        <div className="capture-modal-head"><div><span className="eyebrow lime-text">QUICK CAPTURE</span><h2>{captureMode === 'quick' ? '先记下来，不要打断自己' : '帮你回想一下当时'}</h2></div><button className="close-button" onClick={() => setShowModal(false)}>×</button></div>
        <div className="capture-mode-switch"><button className={captureMode === 'quick' ? 'selected' : ''} onClick={() => setCaptureMode('quick')}>快速保存</button><button className={captureMode === 'reflect' ? 'selected' : ''} onClick={() => setCaptureMode('reflect')}>帮我回想</button></div>
        <div className="domain-select-label"><span>学习领域选择</span><div className="domain-picker">{learningDomains.map((domain) => <button className={`domain-chip ${captureDomain === domain ? 'selected' : ''}`} key={domain} onClick={() => setCaptureDomain(domain)} aria-pressed={captureDomain === domain}>{domain}</button>)}</div></div>
        <label className="capture-label">刚刚捕捉到的内容<textarea value={captureText} onChange={(event) => setCaptureText(event.target.value)} placeholder="一句话、一个链接，或者一段还没想清楚的话……" autoFocus /></label>
        {captureMode === 'reflect' && <div className="reflection-fields"><label>你当时正在做什么？<input value={reflection.context} onChange={(event) => setReflection({ ...reflection, context: event.target.value })} placeholder="比如：下班路上刷到一条视频" /></label><label>是什么让你停下来想到它？<input value={reflection.trigger} onChange={(event) => setReflection({ ...reflection, trigger: event.target.value })} placeholder="比如：它刚好解决了我今天遇到的问题" /></label><label>之后想试试什么？<input value={reflection.nextStep} onChange={(event) => setReflection({ ...reflection, nextStep: event.target.value })} placeholder="可以先空着，之后再补" /></label></div>}
        <div className="modal-actions"><button className="plain-link" onClick={() => setShowModal(false)}>取消</button><button className="add-button" onClick={saveCapture}>{captureMode === 'quick' ? '立即保存' : '保存并完成回想'}</button></div>
      </div></div>}
    </main>
  )
}

export default App
