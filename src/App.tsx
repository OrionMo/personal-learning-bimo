import { useEffect, useState, type ChangeEvent } from 'react'

type View = 'overview' | 'cards' | 'tree' | 'inbox'

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
  const [domainImage, setDomainImage] = useState<string | null>(() => localStorage.getItem('growth-library:ai-product-image'))

  useEffect(() => {
    if (domainImage) localStorage.setItem('growth-library:ai-product-image', domainImage)
    else localStorage.removeItem('growth-library:ai-product-image')
  }, [domainImage])

  const handleDomainImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      window.alert('图片请控制在 5MB 以内')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setDomainImage(typeof reader.result === 'string' ? reader.result : null)
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
              <span>{item.label}</span>
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

          <section className="black-panel">
            <div className="panel-heading">
              <div><span className="panel-kicker">01 / TODAY'S FOCUS</span><h2>今天的学习轨迹</h2></div>
              <button className="add-button" onClick={() => setShowModal(true)}>+ 新增学习卡</button>
            </div>
            <div className="focus-grid">
              <div className={`focus-main ${domainImage ? 'has-image' : ''}`} style={domainImage ? { backgroundImage: `url(${domainImage})` } : undefined}>
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
        </div>
      </section>

      {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><span className="eyebrow lime-text">NEW LEARNING CARD</span><h2>今天学到了什么？</h2><textarea placeholder="先写下你的第一反应……" autoFocus /><div className="modal-actions"><button className="plain-link" onClick={() => setShowModal(false)}>取消</button><button className="add-button" onClick={() => setShowModal(false)}>保存草稿</button></div></div></div>}
    </main>
  )
}

export default App
