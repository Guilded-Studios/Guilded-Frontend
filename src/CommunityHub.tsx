import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Shield, Users, MessageCircle, ClipboardList, FolderPlus, Plus, Send, UserPlus, Check, X, Clock, Paperclip } from 'lucide-react'

type Person = { id:string; username:string; displayName:string|null }
type ServerInfo = { id:string; name:string }
type Props = { apiBase:string; server:ServerInfo|null; user:Person; mode:'messages'|'management'; initialTab?:string; onNotice:(message:string)=>void }
type FriendData = { incoming:{id:string;sender:Person}[]; outgoing:{id:string;receiver:Person}[]; friends:Person[] }
type Conversation = { id:string; members:{user:Person}[] }
type DM = { id:string; content:string; createdAt:string; author:Person }
type Role = { id:string; name:string; color:string|null; permissions:Record<string,boolean> }
type EventItem = { id:string; title:string; description:string|null; location:string|null; startsAt:string }
type Application = { id:string; status:string; createdAt:string; user:Person; answers:Record<string,string> }
type Audit = { id:string; action:string; createdAt:string; actor:Person; targetId:string|null; details:unknown }
type Category = { id:string; name:string; channels:{id:string;name:string}[] }
type ServerMember = { id:string; role:string; user:Person; roleId?:string|null }
type ServerChannel = { id:string; name:string; categoryId?:string|null }

async function request<T>(base:string,path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(base+path,{...init,credentials:'include',headers:{'Content-Type':'application/json',...init.headers}})
 if(!response.ok){let message='Request failed ('+response.status+')';try{message=(await response.json()).error?.message||message}catch{}throw new Error(message)}
 if(response.status===204)return undefined as T
 return response.json() as Promise<T>
}
const PERMISSIONS=['MANAGE_ROLES','MANAGE_CHANNELS','MANAGE_EVENTS','MANAGE_APPLICATIONS','VIEW_AUDIT_LOG','MODERATE_MEMBERS','SEND_MESSAGES','READ_MESSAGES','ATTACH_FILES']
const permissionLabel=(value:string)=>value.toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default function CommunityHub({apiBase,server,user,mode,initialTab,onNotice}:Props){
 const [tab,setTab]=useState(initialTab||(mode==='messages'?'friends':'roles'))
 const [friends,setFriends]=useState<FriendData>({incoming:[],outgoing:[],friends:[]})
 const [conversations,setConversations]=useState<Conversation[]>([])
 const [activeConversation,setActiveConversation]=useState<Conversation|null>(null)
 const [dmMessages,setDmMessages]=useState<DM[]>([])
 const [dmDraft,setDmDraft]=useState('')
 const [friendName,setFriendName]=useState('')
 const [roleName,setRoleName]=useState('')
 const [roleColor,setRoleColor]=useState('#e9bd18')
 const [permissions,setPermissions]=useState<Record<string,boolean>>({})
 const [roles,setRoles]=useState<Role[]>([])
 const [categories,setCategories]=useState<Category[]>([])
 const [serverMembers,setServerMembers]=useState<ServerMember[]>([])
 const [serverChannels,setServerChannels]=useState<ServerChannel[]>([])
 const [categoryName,setCategoryName]=useState('')
 const [events,setEvents]=useState<EventItem[]>([])
 const [eventTitle,setEventTitle]=useState('')
 const [eventDate,setEventDate]=useState('')
 const [eventDescription,setEventDescription]=useState('')
 const [applications,setApplications]=useState<Application[]>([])
 const [audit,setAudit]=useState<Audit[]>([])
 const [targetUsername,setTargetUsername]=useState('')
 const [targetAction,setTargetAction]=useState<'WARN'|'KICK'|'BAN'|'UNBAN'|'TIMEOUT'>('WARN')
 const [reason,setReason]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)

 async function loadFriends(){const data=await request<FriendData>(apiBase,'/friends');setFriends(data)}
 async function loadConversation(id:string){const data=await request<{messages:DM[]}>(apiBase,'/conversations/'+id+'/messages');setDmMessages(data.messages)}
 async function openConversation(person:Person){
  setBusy(true);setError('')
  try{const data=await request<{conversation:Conversation}>(apiBase,'/conversations',{method:'POST',body:JSON.stringify({userId:person.id})});setActiveConversation(data.conversation);await loadConversation(data.conversation.id)}
  catch(e){setError(e instanceof Error?e.message:'Could not open conversation')}finally{setBusy(false)}
 }
 useEffect(()=>{let active=true;setLoading(true);setError('')
  const work=mode==='messages'?loadFriends():server?Promise.all([
   request<{roles:Role[]}>(apiBase,'/servers/'+server.id+'/roles').then(v=>active&&setRoles(v.roles)),
   request<{categories:Category[]}>(apiBase,'/servers/'+server.id+'/categories').then(v=>active&&setCategories(v.categories)),
   request<{members:ServerMember[]}>(apiBase,'/servers/'+server.id+'/members').then(v=>active&&setServerMembers(v.members)),
   request<{server:{channels:ServerChannel[]}}>(apiBase,'/servers/'+server.id).then(v=>active&&setServerChannels(v.server.channels)), 
   request<{events:EventItem[]}>(apiBase,'/servers/'+server.id+'/events').then(v=>active&&setEvents(v.events)),
   request<{applications:Application[]}>(apiBase,'/servers/'+server.id+'/applications').then(v=>active&&setApplications(v.applications)).catch(()=>{}),
   request<{entries:Audit[]}>(apiBase,'/servers/'+server.id+'/audit-log').then(v=>active&&setAudit(v.entries)).catch(()=>{})
  ]):Promise.resolve()
  Promise.resolve(work).catch(e=>active&&setError(e instanceof Error?e.message:'Could not load this section')).finally(()=>active&&setLoading(false))
  return()=>{active=false}
 },[mode,server?.id,apiBase])
 async function submitFriend(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await request(apiBase,'/friends/requests',{method:'POST',body:JSON.stringify({username:friendName.trim()})});setFriendName('');await loadFriends();onNotice('Friend request sent.')}catch(e){setError(e instanceof Error?e.message:'Could not send request')}finally{setBusy(false)}}
 async function answerRequest(id:string,status:'ACCEPTED'|'DECLINED'){try{await request(apiBase,'/friends/requests/'+id,{method:'PATCH',body:JSON.stringify({status})});await loadFriends()}catch(e){setError(e instanceof Error?e.message:'Could not update request')}}
 async function sendDM(e:FormEvent){e.preventDefault();if(!activeConversation||!dmDraft.trim())return;setBusy(true);try{const data=await request<{message:DM}>(apiBase,'/conversations/'+activeConversation.id+'/messages',{method:'POST',body:JSON.stringify({content:dmDraft.trim()})});setDmMessages(v=>[...v,data.message]);setDmDraft('')}catch(e){setError(e instanceof Error?e.message:'Could not send message')}finally{setBusy(false)}}
 async function createRole(e:FormEvent){e.preventDefault();if(!server)return;setBusy(true);try{await request(apiBase,'/servers/'+server.id+'/roles',{method:'POST',body:JSON.stringify({name:roleName,color:roleColor,permissions})});setRoleName('');setPermissions({});const data=await request<{roles:Role[]}>(apiBase,'/servers/'+server.id+'/roles');setRoles(data.roles);onNotice('Role created.')}catch(e){setError(e instanceof Error?e.message:'Could not create role')}finally{setBusy(false)}}
 async function assignRole(memberId:string,roleId:string){if(!server)return;try{await request(apiBase,'/servers/'+server.id+'/members/'+memberId+'/role',{method:'PUT',body:JSON.stringify({roleId:roleId||null})});onNotice('Member role updated.')}catch(e){setError(e instanceof Error?e.message:'Could not assign role')}}
 async function assignCategory(channelId:string,categoryId:string){if(!server)return;try{await request(apiBase,'/servers/'+server.id+'/channels/'+channelId+'/category',{method:'PATCH',body:JSON.stringify({categoryId:categoryId||null})});const data=await request<{server:{channels:ServerChannel[]}}>(apiBase,'/servers/'+server.id);setServerChannels(data.server.channels);const cats=await request<{categories:Category[]}>(apiBase,'/servers/'+server.id+'/categories');setCategories(cats.categories)}catch(e){setError(e instanceof Error?e.message:'Could not assign category')}}
 async function createCategory(e:FormEvent){e.preventDefault();if(!server)return;setBusy(true);try{await request(apiBase,'/servers/'+server.id+'/categories',{method:'POST',body:JSON.stringify({name:categoryName})});setCategoryName('');const data=await request<{categories:Category[]}>(apiBase,'/servers/'+server.id+'/categories');setCategories(data.categories)}catch(e){setError(e instanceof Error?e.message:'Could not create category')}finally{setBusy(false)}}
 async function createEvent(e:FormEvent){e.preventDefault();if(!server)return;setBusy(true);try{await request(apiBase,'/servers/'+server.id+'/events',{method:'POST',body:JSON.stringify({title:eventTitle,description:eventDescription,startsAt:new Date(eventDate).toISOString()})});setEventTitle('');setEventDescription('');const data=await request<{events:EventItem[]}>(apiBase,'/servers/'+server.id+'/events');setEvents(data.events)}catch(e){setError(e instanceof Error?e.message:'Could not create event')}finally{setBusy(false)}}
 async function reviewApplication(id:string,status:'APPROVED'|'REJECTED'){if(!server)return;try{await request(apiBase,'/servers/'+server.id+'/applications/'+id,{method:'PATCH',body:JSON.stringify({status})});setApplications(v=>v.map(a=>a.id===id?{...a,status}:a))}catch(e){setError(e instanceof Error?e.message:'Could not review application')}}
 async function moderate(e:FormEvent){e.preventDefault();if(!server)return;setBusy(true);try{const lookup=await request<{members:{user:Person}[]}>(apiBase,'/servers/'+server.id+'/members');const match=lookup.members.find(m=>m.user.username.toLowerCase()===targetUsername.trim().replace(/^@/, '').toLowerCase());if(!match)throw new Error('That username is not a member of this server.');await request(apiBase,'/servers/'+server.id+'/moderation',{method:'POST',body:JSON.stringify({userId:match.user.id,action:targetAction,reason:reason||undefined})});setTargetUsername('');setReason('');onNotice('Moderation action recorded.');}catch(e){setError(e instanceof Error?e.message:'Could not moderate member')}finally{setBusy(false)}}

 const tabs=mode==='messages'?[['friends','Friends'],['requests','Requests']]:[['roles','Roles & permissions'],['categories','Categories'],['events','Events'],['applications','Applications'],['moderation','Moderation'],['audit','Audit log']]
 return <div className="hub-page">
  <div className="hub-heading"><div><span className="hub-eyebrow">{mode==='messages'?'YOUR NETWORK':'SERVER MANAGEMENT'}</span><h1>{mode==='messages'?'Friends & messages':server?.name+' tools'}</h1><p>{mode==='messages'?'Find friends and continue private conversations.':'Manage the people, spaces, and activity in this community.'}</p></div></div>
  <nav className="hub-tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  {error&&<div className="hub-error">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}
  {loading?<div className="hub-empty">Loading…</div>:mode==='messages'?<>
   {tab==='friends'&&<div className="hub-grid"><section className="hub-card"><h2><UserPlus size={17}/> Add a friend</h2><form className="hub-inline-form" onSubmit={submitFriend}><input value={friendName} onChange={e=>setFriendName(e.target.value)} placeholder="Enter their exact username" required/><button disabled={busy}>Send request</button></form><h2 className="hub-subheading"><Users size={17}/> Your friends <span>{friends.friends.length}</span></h2>{friends.friends.map(person=><div className="hub-person" key={person.id}><div className="hub-avatar">{(person.displayName||person.username)[0]?.toUpperCase()}</div><div><strong>{person.displayName||person.username}</strong><small>@{person.username}</small></div><button onClick={()=>void openConversation(person)} disabled={busy}><MessageCircle size={15}/> Message</button></div>)}{!friends.friends.length&&<p className="hub-empty">Your friend list is empty. Add someone by username to start a conversation.</p>}</section><section className="hub-card hub-chat-card"><h2><MessageCircle size={17}/> Direct messages</h2>{activeConversation?<><div className="hub-dm-title">{activeConversation.members.find(m=>m.user.id!==user.id)?.user.displayName||activeConversation.members.find(m=>m.user.id!==user.id)?.user.username||'Conversation'}</div><div className="hub-dm-feed">{dmMessages.map(m=><article key={m.id}><strong>{m.author.displayName||m.author.username}</strong><time>{new Date(m.createdAt).toLocaleString()}</time><p>{m.content}</p></article>)}</div><form className="hub-inline-form" onSubmit={sendDM}><input value={dmDraft} onChange={e=>setDmDraft(e.target.value)} placeholder="Write a private message…" maxLength={4000}/><button disabled={busy||!dmDraft.trim()}><Send size={15}/></button></form></>:<p className="hub-empty">Choose a friend and select Message. Your private conversation will appear here.</p>}</section></div>}
   {tab==='requests'&&<section className="hub-card"><h2>Incoming requests <span>{friends.incoming.length}</span></h2>{friends.incoming.map(r=><div className="hub-person" key={r.id}><div className="hub-avatar">{r.sender.username[0].toUpperCase()}</div><div><strong>{r.sender.displayName||r.sender.username}</strong><small>@{r.sender.username}</small></div><button onClick={()=>void answerRequest(r.id,'ACCEPTED')}><Check size={14}/> Accept</button><button className="hub-muted-button" onClick={()=>void answerRequest(r.id,'DECLINED')}><X size={14}/> Decline</button></div>)}{!friends.incoming.length&&<p className="hub-empty">No incoming requests.</p>}<h2 className="hub-subheading">Sent requests</h2>{friends.outgoing.map(r=><div className="hub-person" key={r.id}><div><strong>{r.receiver.displayName||r.receiver.username}</strong><small>Waiting for a response</small></div></div>)}</section>}
  </>:!server?<div className="hub-empty">Select a server to manage.</div>:<>
   {tab==='roles'&&<div className="hub-grid"><section className="hub-card"><h2><Shield size={17}/> Existing roles</h2>{roles.map(role=><div className="hub-role" key={role.id}><i style={{background:role.color||'#777'}}/><strong>{role.name}</strong><small>{Object.values(role.permissions||{}).filter(Boolean).length} permissions</small></div>)}{!roles.length&&<p className="hub-empty">No custom roles have been created.</p>}<h2 className="hub-subheading">Assign member roles</h2>{serverMembers.map(member=><div className="hub-person" key={member.id}><div><strong>{member.user.displayName||member.user.username}</strong><small>@{member.user.username}</small></div><select value={member.roleId||''} onChange={e=>void assignRole(member.id,e.target.value)} disabled={member.role==='OWNER'||member.role==='ADMIN'}><option value="">Default member</option>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></div>)}</section><section className="hub-card"><h2><Plus size={17}/> Create a role</h2><form className="hub-form" onSubmit={createRole}><label>Role name<input value={roleName} onChange={e=>setRoleName(e.target.value)} placeholder="Community moderator" minLength={2} maxLength={32} required/></label><label>Role color<input type="color" value={roleColor} onChange={e=>setRoleColor(e.target.value)}/></label><h3>Permissions</h3><div className="hub-permissions">{PERMISSIONS.map(permission=><label key={permission}><input type="checkbox" checked={!!permissions[permission]} onChange={e=>setPermissions(v=>({...v,[permission]:e.target.checked}))}/>{permissionLabel(permission)}</label>)}</div><button disabled={busy}>Create role</button></form></section></div>}
   {tab==='categories'&&<div className="hub-grid"><section className="hub-card"><h2><FolderPlus size={17}/> Channel categories</h2>{categories.map(category=><div className="hub-category" key={category.id}><strong>{category.name}</strong><small>{category.channels.length} channels</small>{category.channels.map(channel=><span key={channel.id}># {channel.name}</span>)}</div>)}{!categories.length&&<p className="hub-empty">No categories yet.</p>}</section><section className="hub-card"><h2>Create a category</h2><form className="hub-inline-form" onSubmit={createCategory}><input value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="Category name" required/><button disabled={busy}>Create</button></form><h2 className="hub-subheading">Assign channels</h2>{serverChannels.map(channel=><div className="hub-person" key={channel.id}><strong># {channel.name}</strong><select value={channel.categoryId||''} onChange={e=>void assignCategory(channel.id,e.target.value)}><option value="">No category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></div>)}</section></div>}
   {tab==='events'&&<div className="hub-grid"><section className="hub-card"><h2><CalendarDays size={17}/> Upcoming events</h2>{events.map(event=><article className="hub-event" key={event.id}><strong>{event.title}</strong><time>{new Date(event.startsAt).toLocaleString()}</time>{event.description&&<p>{event.description}</p>}</article>)}{!events.length&&<p className="hub-empty">No events have been scheduled.</p>}</section><section className="hub-card"><h2>Create an event</h2><form className="hub-form" onSubmit={createEvent}><label>Event title<input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} required maxLength={100}/></label><label>Start date and time<input type="datetime-local" value={eventDate} onChange={e=>setEventDate(e.target.value)} required/></label><label>Description<textarea value={eventDescription} onChange={e=>setEventDescription(e.target.value)} maxLength={2000}/></label><button disabled={busy}>Publish event</button></form></section></div>}
   {tab==='applications'&&<section className="hub-card"><h2><ClipboardList size={17}/> Join applications</h2>{applications.map(application=><article className="hub-application" key={application.id}><div><strong>{application.user.displayName||application.user.username}</strong><small>@{application.user.username} · {application.status}</small>{Object.entries(application.answers||{}).map(([q,a])=><p key={q}><b>{q}</b>: {a}</p>)}</div>{application.status==='PENDING'&&<div className="hub-actions"><button onClick={()=>void reviewApplication(application.id,'APPROVED')}><Check size={14}/> Approve</button><button className="hub-muted-button" onClick={()=>void reviewApplication(application.id,'REJECTED')}><X size={14}/> Reject</button></div>}</article>)}{!applications.length&&<p className="hub-empty">No applications to review, or you do not have permission to view them.</p>}</section>}
   {tab==='moderation'&&<div className="hub-grid"><section className="hub-card"><h2><Shield size={17}/> Moderation actions</h2><form className="hub-form" onSubmit={moderate}><label>Member username<input value={targetUsername} onChange={e=>setTargetUsername(e.target.value)} placeholder="@username" required/></label><label>Action<select value={targetAction} onChange={e=>setTargetAction(e.target.value as typeof targetAction)}>{['WARN','KICK','BAN','UNBAN','TIMEOUT'].map(action=><option key={action}>{action}</option>)}</select></label><label>Reason<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={500}/></label><button disabled={busy}>Record action</button></form></section><section className="hub-card"><h2>Recent moderation</h2>{audit.filter(entry=>entry.action.startsWith('MODERATION_')).slice(0,20).map(entry=><div className="hub-audit-row" key={entry.id}><strong>{entry.action.replace('MODERATION_','')}</strong><small>{entry.actor.username} · {new Date(entry.createdAt).toLocaleString()}</small></div>)}</section></div>}
   {tab==='audit'&&<section className="hub-card"><h2><ClipboardList size={17}/> Server audit log</h2>{audit.map(entry=><div className="hub-audit-row" key={entry.id}><strong>{entry.action.replaceAll('_',' ')}</strong><small>{entry.actor.displayName||entry.actor.username} · {new Date(entry.createdAt).toLocaleString()}</small>{entry.targetId&&<code>{entry.targetId}</code>}</div>)}{!audit.length&&<p className="hub-empty">No audit entries available, or your role cannot view them.</p>}</section>}
  </>}
 </div>
}
