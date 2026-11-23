import { useMemo, useState, type FormEvent } from 'react'
import { Activity, Bell, ChevronDown, Compass, Hash, Inbox, MessageCircle, Moon, Plus, Search, Send, Settings, ShieldCheck, Sun, Users, Volume2, X } from 'lucide-react'

type ChatMessage = { id: number; name: string; initials: string; color: string; time: string; text: string }
const servers = [{name:'Guilded HQ',mark:'G',tone:'brand'},{name:'Design Lab',mark:'D',tone:'violet'},{name:'Developers',mark:'⌘',tone:'blue'},{name:'Game Lounge',mark:'G',tone:'orange'}]
const groups = [
  {title:'START HERE',channels:['welcome','announcements','introductions']},
  {title:'COMMUNITY',channels:['general','share-your-work','ideas-and-feedback']},
  {title:'HANGOUT',channels:['voice lounge']}
]
const members = [
  {name:'Mika',role:'Community lead',initials:'M',color:'coral',status:'online'},
  {name:'Jordan',role:'Designer',initials:'J',color:'blue',status:'online'},
  {name:'Alex',role:'Developer',initials:'A',color:'green',status:'online'},
  {name:'Taylor',role:'Member',initials:'T',color:'gold',status:'idle'},
  {name:'Sam',role:'Member',initials:'S',color:'purple',status:'offline'}
]
const seed: ChatMessage[] = [
  {id:1,name:'Mika',initials:'M',color:'coral',time:'10:42 AM',text:'Hey everyone! Welcome to the Guilded community 👋'},
  {id:2,name:'Jordan',initials:'J',color:'blue',time:'10:44 AM',text:'Been looking forward to seeing this come together. The new layout is looking clean!'},
  {id:3,name:'Alex',initials:'A',color:'green',time:'10:46 AM',text:'Same here. What should we work on first?'},
  {id:4,name:'Mika',initials:'M',color:'coral',time:'10:48 AM',text:'Let’s get everyone settled in, then we can share ideas in here.'}
]
export default function App() {
  const [theme,setTheme] = useState<'dark'|'light'>(() => localStorage.getItem('guilded-theme') === 'light' ? 'light' : 'dark')
  const [server,setServer] = useState(0)
  const [channel,setChannel] = useState('general')
  const [draft,setDraft] = useState('')
  const [messages,setMessages] = useState(seed)
  const [search,setSearch] = useState('')
  const [showMembers,setShowMembers] = useState(true)
  const [notice,setNotice] = useState('')
  const [nav,setNav] = useState('Servers')
  const filteredMembers = useMemo(() => members.filter(m => m.name.toLowerCase().includes(search.toLowerCase())),[search])
  function toggleTheme() { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); localStorage.setItem('guilded-theme',next) }
  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const text = draft.trim(); if (!text) return
    setMessages(current => [...current,{id:Date.now(),name:'You',initials:'Y',color:'violet',time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),text}]); setDraft('')
  }
  const info = (text:string) => setNotice(text)
  return <div className="app-shell" data-theme={theme}>
    <aside className="server-rail">
      <button className="brand-mark" aria-label="Guilded home" onClick={()=>setServer(0)}>g<span>.</span></button><div className="rail-divider"/>
      <button className="rail-icon active" aria-label="Servers" onClick={()=>setNav('Servers')}><MessageCircle/></button>
      <button className="rail-icon" aria-label="Direct messages" onClick={()=>{setNav('Messages');info('Your direct messages will appear here once you connect your account.')}}><Inbox/></button>
      <button className="rail-icon" aria-label="Discover" onClick={()=>{setNav('Discover');info('Discover communities is coming soon.')}}><Compass/></button><div className="rail-divider"/>
      {servers.map((item,index)=><button key={item.name} title={item.name} className={`server-icon ${item.tone} ${server===index?'selected':''}`} onClick={()=>{setServer(index);setNotice('')}}>{item.mark}</button>)}
      <button className="server-add" aria-label="Add server" onClick={()=>info('Server creation will be connected to the Guilded API in a future milestone.')}><Plus/></button>
      <div className="rail-spacer"/><button className="rail-icon" aria-label="Activity" onClick={()=>info('Activity is coming soon.')}><Activity/></button>
      <button className="rail-icon" aria-label="Settings" onClick={()=>info('Account settings are coming soon.')}><Settings/></button>
    </aside>
    <aside className="channel-sidebar">
      <button className="server-heading" onClick={()=>info('Server overview will be available when server settings are connected.')}><span className="server-heading-mark">{servers[server].mark}</span><span className="server-heading-copy"><strong>{servers[server].name}</strong><small>Community space</small></span><ChevronDown size={17}/></button>
      <div className="sidebar-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find members" aria-label="Find members"/><kbd>⌘ K</kbd></div>
      <div className="channel-list">{groups.map(group=><section className="channel-group" key={group.title}><div className="channel-category"><span>{group.title}</span><button aria-label={`Add to ${group.title}`} onClick={()=>info('Channel creation will be connected to the backend soon.')}><Plus size={14}/></button></div>
        {group.channels.map(name=><button key={name} className={`channel-item ${channel===name?'chosen':''}`} onClick={()=>{setChannel(name);setNotice('')}}>{name==='voice lounge'?<Volume2 size={17}/>:<Hash size={17}/>}<span>{name}</span></button>)}</section>)}</div>
      <div className="user-panel"><div className="avatar avatar-violet">Y<span className="presence online"/></div><div className="user-meta"><strong>Your profile</strong><small>@you</small></div>
        <button className="user-action" aria-label="Toggle theme" title="Toggle theme" onClick={toggleTheme}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button>
        <button className="user-action" aria-label="User settings" onClick={()=>info('Profile settings are coming soon.')}><Settings size={18}/></button></div>
    </aside>
    <main className="chat-panel">
      <header className="chat-header"><div className="channel-title"><Hash size={20}/><strong>{channel}</strong><span className="header-divider"/><span className="channel-topic">A place to chat, share, and connect.</span></div>
        <div className="header-actions"><button className="icon-button" aria-label="Notifications" onClick={()=>info('You are all caught up!')}><Bell/></button><button className="icon-button" aria-label="Toggle member list" onClick={()=>setShowMembers(v=>!v)}><Users/></button><button className="icon-button" aria-label="Search" onClick={()=>document.getElementById('member-search')?.focus()}><Search/></button></div></header>
      {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
      <div className="message-scroll"><div className="channel-welcome"><div className="welcome-icon"><Hash size={27}/></div><h1>Welcome to #{channel}</h1><p>This is the beginning of the conversation. Make yourself at home.</p></div>
        <div className="message-date"><span/>TODAY<span/></div><div className="messages">{messages.map(m=><article className="message" key={m.id}><div className={`avatar avatar-${m.color}`}>{m.initials}</div><div className="message-content"><div className="message-byline"><strong>{m.name}</strong><time>{m.time}</time></div><p>{m.text}</p></div></article>)}</div></div>
      <form className="composer" onSubmit={sendMessage}><button type="button" className="composer-plus" aria-label="Add attachment" onClick={()=>info('Attachments will be available when upload support is added.')}><Plus size={21}/></button>
        <input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={`Message #${channel}`} aria-label="Write a message"/>
        <button type="button" className="composer-tool" aria-label="Add sparkle" onClick={()=>setDraft(v=>v+' ✨')}>✦</button><button type="submit" className="send-button" aria-label="Send message" disabled={!draft.trim()}><Send size={17}/></button></form>
      <div className="composer-hint">Be kind. Build community. <span>Press Enter to send</span></div>
    </main>
    {showMembers&&<aside className="member-sidebar"><div className="member-header"><strong>Members</strong><span>{members.length}</span></div>
      <div className="member-search"><Search size={14}/><input id="member-search" placeholder="Find a member" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div className="member-section"><span>ONLINE — {filteredMembers.filter(m=>m.status!=='offline').length}</span>{filteredMembers.filter(m=>m.status!=='offline').map(m=><div className="member" key={m.name}><div className={`avatar avatar-${m.color}`}>{m.initials}<span className={`presence ${m.status}`}/></div><div><strong>{m.name}</strong><small>{m.role}</small></div></div>)}</div>
      <div className="member-section"><span>OFFLINE — {filteredMembers.filter(m=>m.status==='offline').length}</span>{filteredMembers.filter(m=>m.status==='offline').map(m=><div className="member" key={m.name}><div className={`avatar avatar-${m.color}`}>{m.initials}<span className="presence offline"/></div><div><strong>{m.name}</strong><small>{m.role}</small></div></div>)}</div>
      <div className="member-footer"><ShieldCheck size={15}/> Community guidelines</div></aside>}
  </div>
}
