import { useState, useEffect, useRef } from 'react'
import { sb } from './supabase.js'

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const DEFAULT_TAGS = ['Desktop','Mobile','Header','Footer','PDP','PDC']

const STATUSES = [
  { id:'backlog',      label:'Backlog',      color:'#64748B', bg:'#0F172A', dot:'○' },
  { id:'em_andamento', label:'Em Andamento', color:'#FBBF24', bg:'#1C1300', dot:'◑' },
  { id:'bloqueado',    label:'Bloqueado',    color:'#F87171', bg:'#1C0000', dot:'⊘' },
  { id:'feito',        label:'Feito',        color:'#34D399', bg:'#001C0F', dot:'✓' },
]

const PRIOS = [
  { id:'critico', label:'Crítico', color:'#F87171' },
  { id:'alto',    label:'Alto',    color:'#FB923C' },
  { id:'medio',   label:'Médio',   color:'#FBBF24' },
  { id:'baixo',   label:'Baixo',   color:'#64748B' },
]

const PCOLS = ['#6366F1','#EC4899','#14B8A6','#F97316','#8B5CF6','#0EA5E9','#10B981','#EAB308']

/* ─────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────── */
const inp = { width:'100%', background:'#0A0F1A', border:'1px solid #1E293B', borderRadius:6, color:'#F1F5F9', padding:'9px 12px', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl = { color:'#475569', fontSize:10, fontWeight:700, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.08em' }
const btnP = { background:'#6366F1', border:'none', color:'#fff', borderRadius:6, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13, fontFamily:'inherit' }
const btnG = { background:'transparent', border:'1px solid #1E293B', color:'#94A3B8', borderRadius:6, padding:'8px 14px', cursor:'pointer', fontWeight:600, fontSize:13, fontFamily:'inherit' }

/* ─────────────────────────────────────────────────────────
   TAG COLORS
───────────────────────────────────────────────────────── */
const TAG_MAP = { Desktop:'#3B82F6', Mobile:'#A855F7', Header:'#EC4899', Footer:'#14B8A6', PDP:'#F97316', PDC:'#10B981' }
const tc = t => TAG_MAP[t] || '#6366F1'

/* ─────────────────────────────────────────────────────────
   ATOMS
───────────────────────────────────────────────────────── */
function Chip({ t, sm, sel, onToggle }) {
  const c = tc(t)
  const look = sel != null
    ? { background: sel ? `${c}22` : 'transparent', border: `1px solid ${sel ? c+'88' : '#1E293B'}`, color: sel ? c : '#475569' }
    : { background: `${c}18`, border: `1px solid ${c}40`, color: c }
  return (
    <span onClick={onToggle} style={{
      display:'inline-flex', alignItems:'center', gap:3,
      borderRadius:4, fontWeight:700, letterSpacing:'0.05em',
      textTransform:'uppercase', whiteSpace:'nowrap',
      cursor: onToggle ? 'pointer' : 'default', transition:'all .12s',
      padding: sm ? '1px 6px' : '2px 9px', fontSize: sm ? 10 : 11,
      userSelect:'none', ...look
    }}>
      {sel && '✓ '}{t}
    </span>
  )
}

function SPill({ id }) {
  const s = STATUSES.find(x => x.id === id); if (!s) return null
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:s.bg, border:`1px solid ${s.color}33`, color:s.color, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{s.dot} {s.label}</span>
}

function PPill({ id }) {
  const p = PRIOS.find(x => x.id === id); if (!p) return null
  return <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:p.color, fontSize:11, fontWeight:700 }}><span style={{ width:6,height:6,borderRadius:'50%',background:p.color,display:'inline-block' }}/>{p.label}</span>
}

function SaveDot({ st }) {
  const map = { saving:['#FBBF24','⟳ salvando…'], ok:['#34D399','✓ salvo'], err:['#F87171','⚠ erro ao salvar'] }
  if (!map[st]) return null
  const [color, txt] = map[st]
  return <span style={{ fontSize:11, color, fontWeight:600, transition:'color .3s' }}>{txt}</span>
}

function Overlay({ children, onClose, wide, narrow }) {
  const w = narrow ? 320 : wide ? 660 : 420
  return (
    <div style={{ position:'fixed',inset:0,background:'#000d',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#080D18',border:'1px solid #1E293B',borderRadius:14,width:'100%',maxWidth:w,maxHeight:'90vh',overflowY:'auto',padding:22,boxShadow:'0 30px 80px #000a',fontFamily:"'DM Sans',sans-serif" }}>
        {children}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div style={{ minHeight:'100vh',background:'#060B14',display:'flex',alignItems:'center',justifyContent:'center',color:'#334155',fontFamily:"'DM Sans',sans-serif",fontSize:14 }}>
      Carregando...
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   SCREEN: PROJETOS
═══════════════════════════════════════════════════════ */
function Projects({ go }) {
  const [list, setList]   = useState(null)
  const [saveSt, setSS]   = useState(null)
  const [modal, setModal] = useState(false)
  const [del, setDel]     = useState(null)
  const [nm, setNm]       = useState('')
  const [ds, setDs]       = useState('')
  const [col, setCol]     = useState(PCOLS[0])

  useEffect(() => {
    sb.from('projects').select('*').order('created_at').then(({ data, error }) => {
      if (error) console.error(error)
      else setList(data || [])
    })
  }, [])

  async function create() {
    if (!nm.trim()) return
    setSS('saving')
    const { data, error } = await sb.from('projects').insert({ name:nm.trim(), description:ds.trim(), color:col, tags:DEFAULT_TAGS }).select().single()
    if (error) { setSS('err'); console.error(error); return }
    setList(p => [...p, data])
    setSS('ok'); setTimeout(() => setSS(null), 2000)
    setNm(''); setDs(''); setCol(PCOLS[0]); setModal(false)
  }

  async function remove(id) {
    setSS('saving')
    await sb.from('items').delete().eq('project_id', id)
    await sb.from('projects').delete().eq('id', id)
    setList(p => p.filter(x => x.id !== id))
    setSS('ok'); setTimeout(() => setSS(null), 2000)
    setDel(null)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#060B14', fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box}@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>

      <nav style={{ background:'#080D18', borderBottom:'1px solid #0F172A', padding:'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', height:56 }}>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:'#F1F5F9', letterSpacing:'-0.03em' }}>◈ QA Hub</span>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <SaveDot st={saveSt}/>
          <button onClick={() => setModal(true)} style={{...btnP,display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:18,lineHeight:1}}>+</span> Projeto
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'36px 28px' }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:'#F1F5F9', margin:'0 0 6px', letterSpacing:'-0.04em' }}>Projetos</h1>
        <p style={{ color:'#334155', fontSize:13, margin:'0 0 28px' }}>
          Dados salvos no Supabase — qualquer pessoa com o link acessa os mesmos projetos.
        </p>

        {list === null && <Loading/>}

        {list && list.length === 0 && (
          <div style={{ textAlign:'center', padding:'70px 0', border:'1px dashed #1E293B', borderRadius:12 }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📁</div>
            <div style={{ color:'#334155', fontWeight:600, marginBottom:16 }}>Nenhum projeto ainda</div>
            <button onClick={() => setModal(true)} style={btnP}>+ Criar primeiro projeto</button>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:14 }}>
          {(list||[]).map((p,i) => (
            <div key={p.id} style={{ animation:`up .25s ease ${i*.04}s both` }}>
              <div onClick={() => go('board', p)} style={{
                background:'#080D18', border:'1px solid #0F172A', borderTop:`3px solid ${p.color}`,
                borderRadius:12, padding:20, cursor:'pointer', position:'relative', overflow:'hidden',
                transition:'transform .15s, border-color .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=`${p.color}44` }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor='#0F172A'; e.currentTarget.style.borderTopColor=p.color }}>
                <div style={{ position:'absolute',top:0,right:0,width:55,height:55,background:`${p.color}08`,borderRadius:'0 0 0 55px' }}/>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ width:34,height:34,background:`${p.color}22`,border:`1px solid ${p.color}44`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>📁</div>
                  <button onClick={e => { e.stopPropagation(); setDel(p.id) }}
                    style={{ background:'none',border:'none',color:'#1E293B',cursor:'pointer',fontSize:18,padding:4,borderRadius:4,transition:'color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.color='#F87171'}
                    onMouseLeave={e => e.currentTarget.style.color='#1E293B'}>×</button>
                </div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:'#F1F5F9', marginBottom:4 }}>{p.name}</div>
                {p.description {p.desc && <div{p.desc && <div <div style={{ color:'#475569', fontSize:12, lineHeight:1.5 }}>>{p.description}</div>}
                <div style={{ marginTop:14, color:p.color, fontSize:11, fontWeight:700 }}>Abrir →</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <Overlay onClose={() => setModal(false)}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:'#F1F5F9', margin:'0 0 20px' }}>Novo Projeto</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Nome *</label><input value={nm} onChange={e=>setNm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&create()} placeholder="Ex: Loja Virtual v3" style={inp} autoFocus/></div>
            <div><label style={lbl}>Descrição</label><input value={ds} onChange={e=>setDs(e.target.value)} placeholder="Breve descrição..." style={inp}/></div>
            <div>
              <label style={lbl}>Cor</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {PCOLS.map(c => <button key={c} onClick={() => setCol(c)} style={{ width:26,height:26,borderRadius:'50%',background:c,border:col===c?'3px solid #fff':'3px solid transparent',cursor:'pointer' }}/>)}
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={() => setModal(false)} style={{...btnG,flex:1}}>Cancelar</button>
              <button onClick={create} style={{...btnP,flex:1}}>Criar</button>
            </div>
          </div>
        </Overlay>
      )}

      {del && (
        <Overlay onClose={() => setDel(null)} narrow>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
            <div style={{ color:'#F1F5F9', fontWeight:700, fontSize:14, marginBottom:8 }}>Excluir projeto?</div>
            <div style={{ color:'#475569', fontSize:12, marginBottom:20 }}>Todos os pontos serão apagados permanentemente.</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setDel(null)} style={{...btnG,flex:1}}>Cancelar</button>
              <button onClick={() => remove(del)} style={{...btnP,flex:1,background:'#EF4444'}}>Excluir</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   SCREEN: BOARD
═══════════════════════════════════════════════════════ */
function Board({ project, go }) {
  const [items, setItems]       = useState(null)
  const [tags, setTags]         = useState(project.tags || DEFAULT_TAGS)
  const [saveSt, setSS]         = useState(null)
  const [view, setView]         = useState('kanban')
  const [filterTags, setFT]     = useState([])
  const [filterStatus, setFS]   = useState('')
  const [search, setSearch]     = useState('')
  const [newTag, setNewTag]     = useState('')
  const [showTagBox, setSTB]    = useState(false)
  const [newItemOpen, setNIO]   = useState(false)
  const tagRef                  = useRef()

  useEffect(() => {
    sb.from('items').select('*').eq('project_id', project.id).order('created_at').then(({ data, error }) => {
      if (error) console.error(error)
      else setItems(data || [])
    })
  }, [project.id])

  useEffect(() => { if (showTagBox) tagRef.current?.focus() }, [showTagBox])

  async function saveStatus(st) { setSS(st); setTimeout(() => setSS(null), 2000) }

  async function addTag(t) {
    if (!t || tags.includes(t)) return
    const next = [...tags, t]
    setTags(next)
    await sb.from('projects').update({ tags: next }).eq('id', project.id)
  }

  async function addItem(form) {
    setSS('saving')
    const { data, error } = await sb.from('items').insert({
      project_id: project.id,
      title:  form.title,
      status: form.status,
      prio:   form.prio,
      tags:   form.tags,
      description: form.descriptionription,
      qa:     form.qa,
      dev:    form.dev,
      media:  form.media,
      comments: [],
    }).select().single()
    if (error) { saveStatus('err'); console.error(error); return }
    setItems(p => [...p, data])
    saveStatus('ok')
  }

  async function setStatus(id, status) {
    setSS('saving')
    const { error } = await sb.from('items').update({ status }).eq('id', id)
    if (error) { saveStatus('err'); return }
    setItems(p => p.map(x => x.id === id ? {...x, status} : x))
    saveStatus('ok')
  }

  async function addComment(id, comment) {
    setSS('saving')
    const item = items.find(x => x.id === id)
    const comments = [...(item.comments || []), comment]
    const { error } = await sb.from('items').update({ comments }).eq('id', id)
    if (error) { saveStatus('err'); return }
    setItems(p => p.map(x => x.id === id ? {...x, comments} : x))
    saveStatus('ok')
  }

  async function createTagInline() {
    const t = newTag.trim(); if (!t) return
    await addTag(t); setNewTag(''); setSTB(false)
  }

  if (items === null) return <Loading/>

  const counts = STATUSES.reduce((a,s) => { a[s.id] = items.filter(x => x.status === s.id).length; return a }, {})
  const filtered = items.filter(item => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterTags.length && !filterTags.every(t => item.tags.includes(t))) return false
    if (filterStatus && item.status !== filterStatus) return false
    return true
  })

  return (
    <div style={{ minHeight:'100vh', background:'#060B14', fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box}`}</style>

      <nav style={{ background:'#080D18', borderBottom:'1px solid #0F172A', padding:'0 22px', display:'flex', alignItems:'center', justifyContent:'space-between', height:54, position:'sticky', top:0, zIndex:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => go('projects')} style={{...btnG,padding:'5px 10px',fontSize:14}}>←</button>
          <span style={{ width:8,height:8,borderRadius:'50%',background:project.color,display:'inline-block' }}/>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14, color:'#F1F5F9' }}>{project.name}</span>
          <span style={{ color:'#1E293B' }}>|</span>
          <span style={{ color:'#334155', fontSize:12 }}>Pontos de QA</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <SaveDot st={saveSt}/>
          <button onClick={() => setNIO(true)} style={{...btnP,background:project.color,display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:17,lineHeight:1}}>+</span> Novo Ponto
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'16px 22px' }}>
        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
          {STATUSES.map(s => (
            <div key={s.id} onClick={() => setFS(filterStatus === s.id ? '' : s.id)} style={{
              background: filterStatus === s.id ? s.bg : '#080D18',
              border: `1px solid ${filterStatus === s.id ? s.color+'55' : '#0F172A'}`,
              borderRadius:8, padding:'11px 14px', cursor:'pointer', transition:'all .15s',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#334155', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</span>
                <span style={{ color:s.color, fontSize:8 }}>●</span>
              </div>
              <div style={{ color:s.color, fontSize:22, fontWeight:800, lineHeight:1.3, marginTop:2 }}>{counts[s.id]}</div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar..." style={{...inp,width:170}}/>
          <div style={{ display:'flex', gap:5, flex:1, flexWrap:'wrap', alignItems:'center' }}>
            {tags.map(t => (
              <button key={t} onClick={() => setFT(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])} style={{
                background: filterTags.includes(t) ? `${tc(t)}1A` : 'transparent',
                border: `1px solid ${filterTags.includes(t) ? tc(t)+'66' : '#1E293B'}`,
                color: filterTags.includes(t) ? tc(t) : '#334155',
                borderRadius:4, padding:'4px 9px', cursor:'pointer', fontSize:11, fontWeight:700, transition:'all .12s',
              }}>{t}</button>
            ))}
            <button onClick={() => setSTB(v => !v)} style={{
              background: showTagBox ? '#6366F11A' : 'transparent',
              border: `1px dashed ${showTagBox ? '#6366F1' : '#1E293B'}`,
              color: showTagBox ? '#6366F1' : '#475569',
              borderRadius:4, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:700,
            }}>+ Tag</button>
          </div>
          <div style={{ display:'flex', border:'1px solid #0F172A', borderRadius:6, overflow:'hidden' }}>
            {[['kanban','⊞'],['list','☰']].map(([v,ic]) => (
              <button key={v} onClick={() => setView(v)} style={{ background:view===v?'#0F172A':'transparent', border:'none', color:view===v?'#F1F5F9':'#334155', padding:'6px 12px', cursor:'pointer', fontSize:13 }}>{ic}</button>
            ))}
          </div>
        </div>

        {showTagBox && (
          <div style={{ display:'flex', gap:8, marginBottom:12, background:'#080D18', border:'1px solid #6366F133', borderRadius:8, padding:'10px 14px', alignItems:'center' }}>
            <span>🏷</span>
            <input ref={tagRef} value={newTag} onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') createTagInline(); if(e.key==='Escape') setSTB(false) }}
              placeholder="Nome da tag... (Enter para criar)" style={{...inp,flex:1,background:'#0A0F1A'}}/>
            <button onClick={createTagInline} style={{...btnP,padding:'7px 14px',whiteSpace:'nowrap'}}>Criar</button>
            <button onClick={() => setSTB(false)} style={btnG}>✕</button>
          </div>
        )}

        {/* KANBAN */}
        {view === 'kanban' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, paddingBottom:24 }}>
            {STATUSES.map(s => {
              const col = filtered.filter(x => x.status === s.id)
              return (
                <div key={s.id}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <span style={{ color:s.color, fontSize:12 }}>{s.dot}</span>
                    <span style={{ color:'#94A3B8', fontSize:11, fontWeight:700 }}>{s.label}</span>
                    <span style={{ background:'#0F172A', color:'#334155', borderRadius:10, padding:'1px 6px', fontSize:10, fontWeight:700 }}>{col.length}</span>
                  </div>
                  <div style={{ background:'#04080F', borderRadius:8, padding:7, minHeight:80 }}>
                    {col.map(item => <KCard key={item.id} item={item} onClick={() => go('detail', { item, project, setStatus, addComment })}/>)}
                    {col.length === 0 && <div style={{ textAlign:'center', padding:'24px 0', color:'#1E293B', fontSize:11 }}>Vazio</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* LIST */}
        {view === 'list' && (
          <div style={{ background:'#080D18', border:'1px solid #0F172A', borderRadius:10, overflow:'hidden', marginBottom:24 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 130px 100px 140px 140px', padding:'9px 16px', borderBottom:'1px solid #0F172A' }}>
              {['Título','Status','Prioridade','QA/Designer','Dev'].map(h => (
                <span key={h} style={{ color:'#334155', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</span>
              ))}
            </div>
            {filtered.length === 0 && <div style={{ textAlign:'center', padding:40, color:'#1E293B', fontSize:13 }}>Nenhum item</div>}
            {filtered.map((item,i) => (
              <div key={item.id} onClick={() => go('detail', { item, project, setStatus, addComment })}
                style={{ display:'grid', gridTemplateColumns:'1fr 130px 100px 140px 140px', padding:'11px 16px', cursor:'pointer', borderBottom:i < filtered.length-1 ? '1px solid #0F172A' : 'none', transition:'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background='#0F172A'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div>
                  <div style={{ color:'#E2E8F0', fontSize:12, fontWeight:600, marginBottom:4 }}>{item.title}</div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{(item.tags||[]).map(t => <Chip key={t} t={t} sm/>)}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center' }}><SPill id={item.status}/></div>
                <div style={{ display:'flex', alignItems:'center' }}><PPill id={item.prio}/></div>
                <div style={{ display:'flex', alignItems:'center' }}><span style={{ color:'#475569', fontSize:12 }}>{item.qa||'—'}</span></div>
                <div style={{ display:'flex', alignItems:'center' }}><span style={{ color:'#475569', fontSize:12 }}>{item.dev||'—'}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {newItemOpen && (
        <NewItemModal tags={tags} onAddTag={addTag} onSave={addItem} color={project.color} onClose={() => setNIO(false)}/>
      )}
    </div>
  )
}

function KCard({ item, onClick }) {
  return (
    <div onClick={onClick} style={{ background:'#080D18', border:'1px solid #0F172A', borderRadius:7, padding:11, cursor:'pointer', marginBottom:7, transition:'border-color .15s, transform .1s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='#1E293B'; e.currentTarget.style.transform='translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='#0F172A'; e.currentTarget.style.transform='none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6, marginBottom:6 }}>
        <p style={{ color:'#E2E8F0', fontSize:12, fontWeight:600, margin:0, lineHeight:1.4 }}>{item.title}</p>
        <PPill id={item.prio}/>
      </div>
      {item.tags?.length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>{item.tags.map(t => <Chip key={t} t={t} sm/>)}</div>}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'#334155', fontSize:10 }}>{item.dev||item.qa||''}</span>
        <div style={{ display:'flex', gap:5 }}>
          {item.media?.length > 0 && <span style={{ color:'#334155', fontSize:10 }}>🖼{item.media.length}</span>}
          {item.comments?.length > 0 && <span style={{ color:'#334155', fontSize:10 }}>💬{item.comments.length}</span>}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   MODAL: NOVO ITEM
═══════════════════════════════════════════════════════ */
function NewItemModal({ tags: initTags, onAddTag, onSave, color, onClose }) {
  const [localTags, setLT] = useState([...initTags])
  const [form, setForm]    = useState({ title:'', status:'backlog', prio:'medio', tags:[], description:'', qa:'', dev:'', media:[] })
  const [newTag, setNT]    = useState('')
  const [tab, setTab]      = useState('info')
  const [vurl, setVurl]    = useState('')
  const [busy, setBusy]    = useState(false)
  const imgRef             = useRef()
  const vidRef             = useRef()

  const f = (k,v) => setForm(p => ({...p,[k]:v}))
  const tog = t => f('tags', form.tags.includes(t) ? form.tags.filter(x => x !== t) : [...form.tags, t])

  async function createTag() {
    const t = newTag.trim(); if (!t) return
    setLT(p => p.includes(t) ? p : [...p, t])
    setForm(p => ({ ...p, tags: p.tags.includes(t) ? p.tags : [...p.tags, t] }))
    await onAddTag(t)
    setNT('')
  }

  function handleFile(e, type) {
    const file = e.target.files[0]; if (!file) return
    const r = new FileReader()
    r.onload = ev => f('media', [...form.media, { type, url:ev.target.result, name:file.name }])
    r.readAsDataURL(file)
    e.target.value = ''
  }

  async function submit() {
    if (!form.title.trim()) { alert('Título é obrigatório!'); return }
    setBusy(true)
    await onSave(form)
    setBusy(false)
    onClose()
  }

  return (
    <Overlay onClose={onClose} wide>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:14, borderBottom:'1px solid #0F172A', marginBottom:0 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:'#F1F5F9', margin:0 }}>➕ Novo Ponto de QA</h2>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#334155', cursor:'pointer', fontSize:22, lineHeight:1 }}>×</button>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid #0F172A', margin:'0 -22px', padding:'0 22px' }}>
        {[['info','📋 Informações'],['media',`🖼 Mídia${form.media.length?` (${form.media.length})`:''}`]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background:'none', border:'none', borderBottom:tab===id?'2px solid #6366F1':'2px solid transparent', color:tab===id?'#6366F1':'#334155', cursor:'pointer', padding:'9px 12px', fontSize:12, fontWeight:700, marginBottom:-1, fontFamily:'inherit' }}>{label}</button>
        ))}
      </div>

      <div style={{ paddingTop:18 }}>
        {tab === 'info' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Título *</label><input value={form.title} onChange={e => f('title',e.target.value)} placeholder="Ex: Header — botão desalinhado no mobile" style={inp} autoFocus/></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={lbl}>Status</label>
                <select value={form.status} onChange={e => f('status',e.target.value)} style={inp}>
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.dot} {s.label}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Prioridade</label>
                <select value={form.prio} onChange={e => f('prio',e.target.value)} style={inp}>
                  {PRIOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={lbl}>QA / Designer</label><input value={form.qa} onChange={e => f('qa',e.target.value)} placeholder="Quem encontrou" style={inp}/></div>
              <div><label style={lbl}>Desenvolvedor</label><input value={form.dev} onChange={e => f('dev',e.target.value)} placeholder="Quem vai corrigir" style={inp}/></div>
            </div>
            <div>
              <label style={lbl}>Tags</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                {localTags.map(t => <Chip key={t} t={t} sel={form.tags.includes(t)} onToggle={() => tog(t)}/>)}
              </div>
              <div style={{ background:'#0A0F1A', border:'1px dashed #1E293B', borderRadius:8, padding:11 }}>
                <div style={{ color:'#334155', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>➕ Nova tag</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={newTag} onChange={e => setNT(e.target.value)} onKeyDown={e => e.key==='Enter'&&createTag()} placeholder="Ex: Checkout, Hero... (Enter)" style={{...inp,flex:1,background:'#080D18'}}/>
                  <button onClick={createTag} style={{...btnP,padding:'8px 14px',whiteSpace:'nowrap'}}>Criar e selecionar</button>
                </div>
              </div>
            </div>
            <div><label style={lbl}>Descrição</label><textarea value={form.description} onChange={e => f('description',e.target.value)} placeholder="Detalhe o problema..." rows={4} style={{...inp,resize:'vertical',fontFamily:'inherit'}}/></div>
          </div>
        )}

        {tab === 'media' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input ref={imgRef} type="file" accept="image/*" onChange={e => handleFile(e,'image')} style={{ display:'none' }}/>
            <input ref={vidRef} type="file" accept="video/*" onChange={e => handleFile(e,'video')} style={{ display:'none' }}/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => imgRef.current.click()} style={btnG}>📸 Imagem</button>
              <button onClick={() => vidRef.current.click()} style={btnG}>🎥 Vídeo</button>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={vurl} onChange={e => setVurl(e.target.value)} placeholder="Link de vídeo (YouTube, Loom...)" style={{...inp,flex:1}}/>
              <button onClick={() => { if(!vurl.trim())return; f('media',[...form.media,{type:'video',url:vurl,name:'Link externo'}]); setVurl('') }} style={btnG}>+ Link</button>
            </div>
            {form.media.length === 0 ? (
              <div style={{ textAlign:'center', padding:'36px 0', border:'1px dashed #1E293B', borderRadius:8, color:'#1E293B' }}>
                <div style={{ fontSize:28 }}>🖼</div>
                <div style={{ fontSize:12, marginTop:6 }}>Nenhuma mídia</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {form.media.map((m,i) => (
                  m.type === 'image'
                    ? <div key={i} style={{ position:'relative' }}>
                        <img src={m.url} style={{ width:88,height:66,objectFit:'cover',borderRadius:6,border:'1px solid #1E293B' }}/>
                        <button onClick={() => f('media',form.media.filter((_,j)=>j!==i))} style={{ position:'absolute',top:-6,right:-6,background:'#EF4444',border:'none',color:'#fff',borderRadius:'50%',width:18,height:18,cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
                      </div>
                    : <div key={i} style={{ background:'#0F172A',border:'1px solid #1E293B',borderRadius:6,padding:'7px 11px',display:'flex',alignItems:'center',gap:6 }}>
                        <span>▶</span><span style={{ color:'#94A3B8',fontSize:11 }}>{m.name}</span>
                        <button onClick={() => f('media',form.media.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:14,padding:0 }}>×</button>
                      </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid #0F172A' }}>
        <button onClick={onClose} style={btnG}>Cancelar</button>
        <button onClick={submit} disabled={busy} style={{...btnP,opacity:busy?.6:1}}>
          {busy ? '⟳ Salvando...' : '🔒 Criar Ponto'}
        </button>
      </div>
    </Overlay>
  )
}

/* ═══════════════════════════════════════════════════════
   SCREEN: DETAIL
═══════════════════════════════════════════════════════ */
function Detail({ ctx, go }) {
  const { item: init, project, setStatus, addComment } = ctx
  const [item, setItem]   = useState(init)
  const [devView, setDV]  = useState(false)
  const [author, setAu]   = useState('')
  const [text, setTx]     = useState('')
  const [busy, setBusy]   = useState(false)
  const [lb, setLb]       = useState(null)

  const s    = STATUSES.find(x => x.id === item.status)
  const imgs = (item.media||[]).filter(m => m.type === 'image')
  const vids = (item.media||[]).filter(m => m.type === 'video')

  async function changeStatus(st) {
    setBusy(true)
    await setStatus(item.id, st)
    setItem(p => ({...p, status:st}))
    setBusy(false)
  }

  async function postComment() {
    if (!text.trim()) return
    const c = { author:author||'Anônimo', text, at:Date.now() }
    setBusy(true)
    await addComment(item.id, c)
    setItem(p => ({...p, comments:[...(p.comments||[]),c]}))
    setBusy(false)
    setTx('')
  }

  return (
    <div style={{ minHeight:'100vh', background:'#060B14', fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box}`}</style>

      <nav style={{ background:'#080D18', borderBottom:'1px solid #0F172A', padding:'0 22px', display:'flex', alignItems:'center', justifyContent:'space-between', height:54, position:'sticky', top:0, zIndex:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => go('board', project)} style={{...btnG,padding:'5px 10px',fontSize:14}}>←</button>
          <span style={{ width:7,height:7,borderRadius:'50%',background:project.color,display:'inline-block' }}/>
          <span style={{ color:'#334155', fontSize:12 }}>{project.name}</span>
        </div>
        <button onClick={() => setDV(v => !v)} style={{...btnG,color:devView?'#0EA5E9':'#94A3B8',borderColor:devView?'#0EA5E944':'#1E293B'}}>
          {devView ? '📋 Visão QA' : '👨‍💻 Visão Dev'}
        </button>
      </nav>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'26px 22px' }}>
        <div style={{ background:'#0A0F1A', border:'1px solid #1E293B', borderRadius:7, padding:'8px 14px', marginBottom:18, display:'flex', gap:8, alignItems:'center' }}>
          <span>🔒</span>
          <span style={{ color:'#334155', fontSize:11 }}>Registrado em {new Date(item.created_at).toLocaleDateString('pt-BR')} — conteúdo imutável. Apenas status e comentários podem ser atualizados.</span>
        </div>

        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:10 }}>
            <SPill id={item.status}/><PPill id={item.prio}/>
            {(item.tags||[]).map(t => <Chip key={t} t={t}/>)}
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:devView?22:18, fontWeight:800, color:'#F1F5F9', margin:'0 0 8px', letterSpacing:'-0.03em', lineHeight:1.3 }}>{item.title}</h1>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            {item.qa && <span style={{ color:'#475569', fontSize:12 }}>👤 {item.qa}</span>}
            {item.dev && <span style={{ color:devView?'#0EA5E9':'#475569', fontSize:12, fontWeight:devView?700:400 }}>💻 {item.dev}</span>}
          </div>
        </div>

        <div style={{ marginBottom:18 }}>
          <label style={lbl}>Alterar Status</label>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {STATUSES.map(st => (
              <button key={st.id} onClick={() => changeStatus(st.id)} disabled={busy} style={{
                background: item.status===st.id ? st.bg : 'transparent',
                border: `1px solid ${item.status===st.id ? st.color+'66' : '#1E293B'}`,
                color: item.status===st.id ? st.color : '#334155',
                borderRadius:6, padding:'7px 14px', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', transition:'all .15s',
              }}>{st.dot} {st.label}</button>
            ))}
          </div>
        </div>

        {item.description && (
          <div style={{ marginBottom:18 }}>
            <label style={lbl}>Descrição</label>
            <div style={{ background:'#080D18', border:'1px solid #0F172A', borderRadius:8, padding:14, color:'#94A3B8', fontSize:13, lineHeight:1.75 }}>{item.description}</div>
          </div>
        )}

        {devView && imgs.length > 0 && (
          <div style={{ marginBottom:18 }}>
            <label style={lbl}>📸 Evidências Visuais</label>
            <div style={{ display:'grid', gridTemplateColumns:imgs.length===1?'1fr':'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
              {imgs.map((m,i) => (
                <img key={i} src={m.url} onClick={() => setLb(m.url)} style={{ width:'100%', borderRadius:10, border:`1px solid ${s?.color||'#1E293B'}22`, objectFit:'cover', maxHeight:440, cursor:'zoom-in', transition:'opacity .15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity='.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity='1'}/>
              ))}
            </div>
          </div>
        )}

        {!devView && (item.media||[]).length > 0 && (
          <div style={{ marginBottom:18 }}>
            <label style={lbl}>Mídia ({item.media.length})</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {item.media.map((m,i) => (
                m.type==='image'
                  ? <img key={i} src={m.url} onClick={() => setLb(m.url)} style={{ width:110,height:80,objectFit:'cover',borderRadius:7,border:'1px solid #1E293B',cursor:'zoom-in' }}/>
                  : <div key={i} style={{ background:'#080D18',border:'1px solid #1E293B',borderRadius:7,padding:'8px 12px',display:'flex',alignItems:'center',gap:7 }}>
                      <span>▶</span><span style={{ color:'#94A3B8',fontSize:11 }}>{m.name}</span>
                      {m.url.startsWith('http')&&<a href={m.url} target="_blank" rel="noreferrer" style={{ color:'#0EA5E9',fontSize:11 }}>→</a>}
                    </div>
              ))}
            </div>
          </div>
        )}

        {devView && vids.length > 0 && (
          <div style={{ marginBottom:18 }}>
            <label style={lbl}>🎥 Vídeos</label>
            {vids.map((m,i) => (
              <div key={i} style={{ background:'#080D18',border:'1px solid #1E293B',borderRadius:9,padding:14,marginBottom:8,display:'flex',alignItems:'center',gap:12 }}>
                <span style={{ fontSize:20 }}>▶</span>
                <div>
                  <div style={{ color:'#E2E8F0',fontSize:13,fontWeight:600 }}>{m.name}</div>
                  {m.url.startsWith('http')&&<a href={m.url} target="_blank" rel="noreferrer" style={{ color:'#0EA5E9',fontSize:12 }}>Abrir →</a>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <label style={lbl}>Comentários ({(item.comments||[]).length})</label>
          {(item.comments||[]).length === 0 && <div style={{ color:'#1E293B',fontSize:12,padding:'12px 0' }}>Nenhum comentário ainda.</div>}
          {(item.comments||[]).map((c,i) => (
            <div key={i} style={{ background:'#080D18',border:'1px solid #0F172A',borderRadius:8,padding:12,marginBottom:7 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                <span style={{ color:devView?'#0EA5E9':'#6366F1',fontWeight:700,fontSize:12 }}>{c.author}</span>
                <span style={{ color:'#1E293B',fontSize:10 }}>{new Date(c.at).toLocaleString('pt-BR')}</span>
              </div>
              <p style={{ color:'#94A3B8',fontSize:13,margin:0,lineHeight:1.6 }}>{c.text}</p>
            </div>
          ))}
          <div style={{ display:'flex',flexDirection:'column',gap:8,marginTop:14,paddingTop:14,borderTop:'1px solid #0F172A' }}>
            <input value={author} onChange={e => setAu(e.target.value)} placeholder="Seu nome" style={inp}/>
            <textarea value={text} onChange={e => setTx(e.target.value)} placeholder="Comentário..." rows={3} style={{...inp,resize:'vertical',fontFamily:'inherit'}}/>
            <button onClick={postComment} disabled={busy} style={{...btnP,background:project.color,opacity:busy?.6:1}}>
              {busy ? '⟳ Salvando...' : 'Comentar'}
            </button>
          </div>
        </div>
      </div>

      {lb && (
        <div onClick={() => setLb(null)} style={{ position:'fixed',inset:0,background:'#000000f0',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out',padding:20 }}>
          <img src={lb} style={{ maxWidth:'100%',maxHeight:'100%',borderRadius:8,boxShadow:'0 0 80px #000' }}/>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState('projects')
  const [proj, setProj]     = useState(null)
  const [detailCtx, setDC]  = useState(null)

  function go(screen, payload) {
    if (screen === 'projects') setScreen('projects')
    if (screen === 'board')    { setProj(payload);  setScreen('board') }
    if (screen === 'detail')   { setDC(payload);    setScreen('detail') }
  }

  if (screen === 'projects') return <Projects go={go}/>
  if (screen === 'board')    return <Board project={proj} go={go}/>
  if (screen === 'detail')   return <Detail ctx={detailCtx} go={go}/>
}

/* ─────────────────────────────────────────────────────────
   ENTRY POINT
───────────────────────────────────────────────────────── */
import ReactDOM from 'react-dom/client'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
