import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, Shield, MessageCircle, ClipboardList, FolderPlus, Plus, Send, UserPlus, Check, X, Trash2 } from 'lucide-react'

type Person = { id:string; username:string; tag:string; displayName:string|null }
type ServerInfo = { id:string; name:string }
type PresenceInfo = { id:string; status:'ONLINE'|'IDLE'|'DND'|'OFFLINE' }
type Props = { apiBase:string; server:ServerInfo|null; user:Person; presence:Record<string,PresenceInfo>; mode:'messages'|'management'; initialTab?:string; onNotice:(message:string)=>void }
type FriendData = { incoming:{id:string;sender:Person}[]; outgoing:{id:string;receiver:Person}[]; friends:Person[] }
type Conversation = { id:string; members:{user:Person}[]; messages?:{content:string;createdAt:string;author:Person}[] }
type DM = { id:string; content:string; createdAt:string; author:Person; attachments?:{id:string;fileName:string;size:number}[] }
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

export default function CommunityHub({apiBase,server,user,presence,mode,initialTab,onNotice}:Props){
 const [tab,setTab]=useState(initialTab||(mode==='messages'?'friends':'roles'))
 const [friends,setFriends]=useState<FriendData>({incoming:[],outgoing:[],friends:[]})
 const [conversations,setConversations]=useState<Conversation[]>([])
 const [activeConversation,setActiveConversation]=useState<Conversation|null>(null)
 const [dmMessages,setDmMessages]=useState<DM[]>([])
 const [dmDraft,setDmDraft]=useState('')
 const [friendName,setFriendName]=useState('')
 const [roleName,setRoleName]=useState('')
 const [editingRoleId,setEditingRoleId]=useState<string|null>(null)
 const [roleColor,setRoleColor]=useState('#e9bd18')
 const [permissions,setPermissions]=useState<Record<string,boolean>>({})
 const [roles,setRoles]=useState<Role[]>([])
 const [categories,setCategories]=useState<Category[]>([])
 const [serverMembers,setServerMembers]=useState<ServerMember[]>([])
 const [serverChannels,setServerChannels]=useState<ServerChannel[]>([])
 const [permissionChannel,setPermissionChannel]=useState('')
 const [permissionRole,setPermissionRole]=useState('')
 const [permissionRules,setPermissionRules]=useState<Record<string,boolean>>({READ_MESSAGES:true,SEND_MESSAGES:true,ATTACH_FILES:true})
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
 const dmFileRef=useRef<HTMLInputElement|null>(null)

 async function loadFriends(){const [data,history]=await Promise.all([request<FriendData>(apiBase,'/friends'),request<{conversations:Conversation[]}>(apiBase,'/conversations')]);setFriends(data);setConversations(history.conversations)}
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
 async function sendDM(e:FormEvent){e.preventDefault();if(!activeConversation||!dmDraft.trim())return;setBusy(true);try{const data=await request<{message:DM}>(apiBase,'/conversations/'+activeConversation.id+'/messages',{method:'POST',body:JSON.stringify({content:dmDraft.trim()})});setDmMessages(v=>[...v,data.message]);setDmDraft('');loadFriends().catch(()=>{})}catch(e){setError(e instanceof Error?e.message:'Could not send message')}finally{setBusy(false)}}
 async function uploadDmFile(file?:File){
  if(!file||!activeConversation||busy)return;
  setBusy(true);setError('');
  try{
   const mimeType=file.type||'application/octet-stream';
   const signed=await request<{storageKey:string;uploadUrl:string;mimeType:string;size:number}>(apiBase,'/uploads/sign',{method:'POST',body:JSON.stringify({fileName:file.name,mimeType,size:file.size,conversationId:activeConversation.id})});
   const uploaded=await fetch(signed.uploadUrl,{method:'PUT',headers:{'Content-Type':mimeType},body:file});
   if(!uploaded.ok)throw new Error('The file could not be uploaded to storage.');
   const posted=await request<{message:DM}>(apiBase,'/conversations/'+activeConversation.id+'/messages',{method:'POST',body:JSON.stringify({content:'Shared a file: '+file.name})});
   await request(apiBase,'/uploads/complete',{method:'POST',body:JSON.stringify({storageKey:signed.storageKey,fileName:file.name,mimeType:signed.mimeType,size:file.size,directMessageId:posted.message.id})});
   await loadConversation(activeConversation.id);
   onNotice('File shared.');
  }catch(e){setError(e instanceof Error?e.message:'Could not upload file')}
  finally{setBusy(false);if(dmFileRef.current)dmFileRef.current.value=''}
 }
 async function openDmAttachment(id:string){
  try{const result=await request<{url:string}>(apiBase,'/uploads/'+id+'/url');window.open(result.url,'_blank','noopener,noreferrer')}
  catch(e){setError(e instanceof Error?e.message:'Could not open attachment')}
 }
 async function createRole(e:FormEvent){e.preventDefault();if(!server)return;setBusy(true);try{await request(apiBase,'/servers/'+server.id+'/roles',{method:'POST',body:JSON.stringify({name:roleName,color:roleColor,permissions})});setRoleName('');setPermissions({});const data=await request<{roles:Role[]}>(apiBase,'/servers/'+server.id+'/roles');setRoles(data.roles);onNotice('Role created.')}catch(e){setError(e instanceof Error?e.message:'Could not create role')}finally{setBusy(false)}}
 function editRole(role:Role){setEditingRoleId(role.id);setRoleName(role.name);setRoleColor(role.color||'#e9bd18');setPermissions(role.permissions||{})}
 async function saveRole(e:FormEvent){e.preventDefault();if(!server||!editingRoleId)return;setBusy(true);try{await request(apiBase,'/servers/'+server.id+'/roles/'+editingRoleId,{method:'PATCH',body:JSON.stringify({name:roleName,color:roleColor,permissions})});const data=await request<{roles:Role[]}>(apiBase,'/servers/'+server.id+'/roles');setRoles(data.roles);setEditingRoleId(null);setRoleName('');setPermissions({});onNotice('Role updated.')}catch(e){setError(e instanceof Error?e.message:'Could not update role')}finally{setBusy(false)}}
 async function assignRole(memberId:string,roleId:string){if(!server)return;try{await request(apiBase,'/servers/'+server.id+'/members/'+memberId+'/role',{method:'PUT',body:JSON.stringify({roleId:roleId||null})});onNotice('Member role updated.')}catch(e){setError(e instanceof Error?e.message:'Could not assign role')}}
 async function assignCategory(channelId:string,categoryId:string){if(!server)return;try{await request(apiBase,'/servers/'+server.id+'/channels/'+channelId+'/category',{method:'PATCH',body:JSON.stringify({categoryId:categoryId||null})});const data=await request<{server:{channels:ServerChannel[]}}>(apiBase,'/servers/'+server.id);setServerChannels(data.server.channels);const cats=await request<{categories:Category[]}>(apiBase,'/servers/'+server.id+'/categories');setCategories(cats.categories)}catch(e){setError(e instanceof Error?e.message:'Could not assign category')}}
 async function saveChannelPermissions(e:FormEvent){e.preventDefault();if(!server||!permissionChannel||!permissionRole){setError('Choose a channel and role first.');return}setBusy(true);try{const deny=Object.fromEntries(Object.entries(permissionRules).map(([key,value])=>[key,!value]));await request(apiBase,'/servers/'+server.id+'/channels/'+permissionChannel+'/permissions',{method:'PUT',body:JSON.stringify({roleId:permissionRole,allow:permissionRules,deny})});onNotice('Channel permissions saved.')}catch(e){setError(e instanceof Error?e.message:'Could not save channel permissions')}finally{setBusy(false)}}
 async function createCategory(e:FormEvent){e.preventDefault();if(!server)return;setBusy(true);try{await request(apiBase,'/servers/'+server.id+'/categories',{method:'POST',body:JSON.stringify({name:categoryName})});setCategoryName('');const data=await request<{categories:Category[]}>(apiBase,'/servers/'+server.id+'/categories');setCategories(data.categories)}catch(e){setError(e instanceof Error?e.message:'Could not create category')}finally{setBusy(false)}}
 async function deleteCategory(category:Category){
  if(!server||!window.confirm('Delete the "'+category.name+'" category? Its channels will be moved to No category.'))return;
  setBusy(true);
  try{await request(apiBase,'/servers/'+server.id+'/categories/'+category.id,{method:'DELETE'});setCategories(v=>v.filter(item=>item.id!==category.id));setServerChannels(v=>v.map(channel=>channel.categoryId===category.id?{...channel,categoryId:null}:channel));onNotice('Category deleted.')}
  catch(e){setError(e instanceof Error?e.message:'Could not delete category')}
  finally{setBusy(false)}
 }
 async function deleteChannel(channel:ServerChannel){
  if(!server||!window.confirm('Delete the #'+channel.name+' channel? This cannot be undone.'))return;
  setBusy(true);
  try{await request(apiBase,'/servers/'+server.id+'/channels/'+channel.id,{method:'DELETE'});setServerChannels(v=>v.filter(item=>item.id!==channel.id));setCategories(v=>v.map(category=>({...category,channels:category.channels.filter(item=>item.id!==channel.id)})));if(permissionChannel===channel.id)setPermissionChannel('');onNotice('Channel deleted.')}
  catch(e){setError(e instanceof Error?e.message:'Could not delete channel')}
  finally{setBusy(false)}
 }
 async function createEvent(e:FormEvent){e.preventDefault();if(!server)return;setBusy(true);try{await request(apiBase,'/servers/'+server.id+'/events',{method:'POST',body:JSON.stringify({title:eventTitle,description:eventDescription,startsAt:new Date(eventDate).toISOString()})});setEventTitle('');setEventDescription('');const data=await request<{events:EventItem[]}>(apiBase,'/servers/'+server.id+'/events');setEvents(data.events)}catch(e){setError(e instanceof Error?e.message:'Could not create event')}finally{setBusy(false)}}
 async function reviewApplication(id:string,status:'APPROVED'|'REJECTED'){if(!server)return;try{await request(apiBase,'/servers/'+server.id+'/applications/'+id,{method:'PATCH',body:JSON.stringify({status})});setApplications(v=>v.map(a=>a.id===id?{...a,status}:a))}catch(e){setError(e instanceof Error?e.message:'Could not review application')}}
 async function moderate(e:FormEvent){e.preventDefault();if(!server)return;setBusy(true);try{await request(apiBase,'/servers/'+server.id+'/moderation',{method:'POST',body:JSON.stringify({username:targetUsername.trim().replace(/^@/, ''),action:targetAction,reason:reason||undefined})});setTargetUsername('');setReason('');onNotice('Moderation action recorded.');}catch(e){setError(e instanceof Error?e.message:'Could not moderate member')}finally{setBusy(false)}}

 const tabs=mode==='messages'?[['friends','Friends'],['requests','Friend requests']]:[]
 const managementPages:Record<string,{title:string;description:string}>={
  roles:{title:'Roles & permissions',description:'Create roles, configure their permissions, and manage member assignments.'},
  categories:{title:'Channels & categories',description:'Organize channels into categories and configure channel-specific access.'},
  events:{title:'Events',description:'Create and manage upcoming events for your community.'},
  applications:{title:'Applications',description:'Review membership applications and decide who can join your community.'},
  moderation:{title:'Moderation',description:'Review and record moderation actions for members of this server.'},
  audit:{title:'Audit log',description:'Review important actions and changes made across this server.'}
 }
 const page=managementPages[tab]||managementPages.roles
 return <div className={'hub-page '+(mode==='management'?'hub-dedicated-page':'')}>
  {mode==='messages'?<div className="dm-page-heading"><div><span className="hub-eyebrow">YOUR NETWORK</span><h1>Direct messages</h1><p>Keep up with your friends and conversations.</p></div><nav className="dm-page-tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}{id==='requests'&&friends.incoming.length>0?<span>{friends.incoming.length}</span>:null}</button>)}</nav></div>:<div className="hub-heading"><div><span className="hub-eyebrow">SERVER SETTINGS</span><h1>{page.title}</h1><p>{page.description}</p></div></div>}
  {error&&<div className="hub-error">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}
  {loading?<div className="hub-empty">Loading…</div>:mode==='messages'?<>
   {tab==='friends'&&<div className="dm-workspace">
    <aside className="dm-list-sidebar">
     <form className="dm-add-friend" onSubmit={submitFriend}><label htmlFor="dm-friend-username">Add a friend</label><div><input id="dm-friend-username" value={friendName} onChange={e=>setFriendName(e.target.value)} placeholder="username#4821" required/><button disabled={busy} aria-label="Send friend request"><UserPlus size={16}/></button></div></form>
     <section className="dm-list-section"><h2>Direct messages</h2>{conversations.map(conversation=>{const person=conversation.members.find(m=>m.user.id!==user.id)?.user;const selected=activeConversation?.id===conversation.id;return <button className={'dm-list-item '+(selected?'active':'')} key={conversation.id} onClick={()=>{setActiveConversation(conversation);void loadConversation(conversation.id)}}><span className={"presence-avatar-wrap "+(person&&presence[person.id]?.status==="ONLINE"?"is-online":"")}><span className="dm-list-avatar">{(person?.displayName||person?.username||'?')[0]?.toUpperCase()}</span><i className="presence-dot"/></span><span className="dm-list-copy"><strong>{person?.displayName||person?.username||'Conversation'}</strong><small>{conversation.messages?.[0]?.content||'No messages yet'}</small></span></button>})}{!conversations.length&&<p className="dm-list-empty">Your conversations will appear here.</p>}</section>
     <section className="dm-list-section dm-friends-section"><h2>Friends <span>{friends.friends.length}</span></h2>{friends.friends.map(person=><button className="dm-list-item" key={person.id} onClick={()=>void openConversation(person)} disabled={busy}><span className={"presence-avatar-wrap "+(presence[person.id]?.status==="ONLINE"?"is-online":"")}><span className="dm-list-avatar">{(person.displayName||person.username)[0]?.toUpperCase()}</span><i className="presence-dot"/></span><span className="dm-list-copy"><strong>{person.displayName||person.username}</strong><small>@{person.username}#{person.tag}</small></span><MessageCircle size={15}/></button>)}{!friends.friends.length&&<p className="dm-list-empty">No friends yet. Add someone above or check friend requests.</p>}</section>
    </aside>
    <section className="dm-chat-panel">{activeConversation?<><header className="dm-chat-header"><span className="dm-list-avatar">{(activeConversation.members.find(m=>m.user.id!==user.id)?.user.displayName||activeConversation.members.find(m=>m.user.id!==user.id)?.user.username||'?')[0]?.toUpperCase()}</span><div><strong>{activeConversation.members.find(m=>m.user.id!==user.id)?.user.displayName||activeConversation.members.find(m=>m.user.id!==user.id)?.user.username||'Conversation'}</strong><small>Direct message</small></div></header><div className="hub-dm-feed dm-chat-feed">{dmMessages.map(m=><article key={m.id}><strong>{m.author.displayName||m.author.username}</strong><small>@{m.author.username}#{m.author.tag}</small><time>{new Date(m.createdAt).toLocaleString()}</time><p>{m.content}</p>{m.attachments?.map(file=><button className="message-attachment" key={file.id} onClick={()=>void openDmAttachment(file.id)}><span>↗</span>{file.fileName}<small>{Math.max(1,Math.round(file.size/1024))} KB</small></button>)}</article>)}</div><form className="hub-inline-form dm-composer" onSubmit={sendDM}><input value={dmDraft} onChange={e=>setDmDraft(e.target.value)} placeholder="Message your friend…" maxLength={4000}/><button type="button" onClick={()=>dmFileRef.current?.click()} disabled={busy} aria-label="Attach a file">＋</button><button disabled={busy||!dmDraft.trim()} aria-label="Send message"><Send size={15}/></button></form><input ref={dmFileRef} type="file" hidden onChange={e=>void uploadDmFile(e.target.files?.[0])}/></>:<div className="dm-welcome"><div><MessageCircle size={28}/></div><h2>Your conversations, all in one place</h2><p>Select a conversation or choose a friend to start messaging.</p></div>}</section>
   </div>}
   {tab==='requests'&&<div className="dm-requests-page"><section className="hub-card"><h2>Incoming friend requests <span>{friends.incoming.length}</span></h2>{friends.incoming.map(r=><div className="hub-person" key={r.id}><div className="hub-avatar">{r.sender.username[0].toUpperCase()}</div><div><strong>{r.sender.displayName||r.sender.username}</strong><small>@{r.sender.username}#{r.sender.tag}</small></div><button onClick={()=>void answerRequest(r.id,'ACCEPTED')}><Check size={14}/> Accept</button><button className="hub-muted-button" onClick={()=>void answerRequest(r.id,'DECLINED')}><X size={14}/> Decline</button></div>)}{!friends.incoming.length&&<p className="hub-empty">No incoming requests.</p>}</section><section className="hub-card"><h2>Sent friend requests <span>{friends.outgoing.length}</span></h2>{friends.outgoing.map(r=><div className="hub-person" key={r.id}><div><strong>{r.receiver.displayName||r.receiver.username}</strong><small>@{r.receiver.username}#{r.receiver.tag} · Waiting for a response</small></div></div>)}{!friends.outgoing.length&&<p className="hub-empty">No outgoing requests.</p>}</section></div>}
  </>:!server?<div className="hub-empty">Select a server to manage.</div>:<>
   {tab==='roles'&&<div className="hub-grid"><section className="hub-card"><h2><Shield size={17}/> Existing roles</h2>{roles.map(role=><div className="hub-role" key={role.id}><i style={{background:role.color||'#777'}}/><strong>{role.name}</strong><small>{Object.values(role.permissions||{}).filter(Boolean).length} permissions</small><button type="button" onClick={()=>editRole(role)}>Edit</button></div>)}{!roles.length&&<p className="hub-empty">No custom roles have been created.</p>}<h2 className="hub-subheading">Assign member roles</h2>{serverMembers.map(member=><div className="hub-person" key={member.id}><div><strong>{member.user.displayName||member.user.username}</strong><small>@{member.user.username}#{member.user.tag}</small></div><select value={member.roleId||''} onChange={e=>void assignRole(member.id,e.target.value)} disabled={member.role==='OWNER'||member.role==='ADMIN'}><option value="">Default member</option>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></div>)}</section><section className="hub-card"><h2><Plus size={17}/> {editingRoleId?'Edit role':'Create a role'}</h2><form className="hub-form" onSubmit={editingRoleId?saveRole:createRole}><label>Role name<input value={roleName} onChange={e=>setRoleName(e.target.value)} placeholder="Community moderator" minLength={2} maxLength={32} required/></label><label>Role color<input type="color" value={roleColor} onChange={e=>setRoleColor(e.target.value)}/></label><h3>Permissions</h3><div className="hub-permissions">{PERMISSIONS.map(permission=><label key={permission}><input type="checkbox" checked={!!permissions[permission]} onChange={e=>setPermissions(v=>({...v,[permission]:e.target.checked}))}/>{permissionLabel(permission)}</label>)}</div><button disabled={busy}>{editingRoleId?'Save role':'Create role'}</button>{editingRoleId&&<button type="button" className="hub-muted-button" onClick={()=>{setEditingRoleId(null);setRoleName('');setPermissions({})}}>Cancel editing</button>}</form></section></div>}
   {tab==='categories'&&<div className="hub-grid"><section className="hub-card"><h2><FolderPlus size={17}/> Channel categories</h2>{categories.map(category=><div className="hub-category" key={category.id}><div className="hub-category-heading"><strong>{category.name}</strong><button type="button" className="hub-delete-button" onClick={()=>void deleteCategory(category)} disabled={busy} aria-label={'Delete '+category.name}><Trash2 size={14}/> Delete</button></div><small>{category.channels.length} channels</small>{category.channels.map(channel=><div className="hub-category-channel" key={channel.id}><span># {channel.name}</span><button type="button" className="hub-delete-button" onClick={()=>void deleteChannel({id:channel.id,name:channel.name,categoryId:category.id})} disabled={busy} aria-label={'Delete '+channel.name}><Trash2 size={13}/></button></div>)}</div>)}{!categories.length&&<p className="hub-empty">No categories yet.</p>}</section><section className="hub-card"><h2>Create a category</h2><form className="hub-inline-form" onSubmit={createCategory}><input value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="Category name" required/><button disabled={busy}>Create</button></form><h2 className="hub-subheading">Assign channels</h2>{serverChannels.map(channel=><div className="hub-person" key={channel.id}><strong># {channel.name}</strong><select value={channel.categoryId||''} onChange={e=>void assignCategory(channel.id,e.target.value)}><option value="">No category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select><button type="button" className="hub-delete-button" onClick={()=>void deleteChannel(channel)} disabled={busy} aria-label={'Delete '+channel.name}><Trash2 size={14}/> Delete</button></div>)}<h2 className="hub-subheading">Channel permission overrides</h2><form className="hub-form" onSubmit={saveChannelPermissions}><label>Channel<select value={permissionChannel} onChange={e=>setPermissionChannel(e.target.value)} required><option value="">Choose channel</option>{serverChannels.map(channel=><option key={channel.id} value={channel.id}># {channel.name}</option>)}</select></label><label>Role<select value={permissionRole} onChange={e=>setPermissionRole(e.target.value)} required><option value="">Choose role</option>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label>{Object.entries(permissionRules).map(([permission,allowed])=><label className="hub-check-row" key={permission}><input type="checkbox" checked={allowed} onChange={e=>setPermissionRules(v=>({...v,[permission]:e.target.checked}))}/>{permissionLabel(permission)}</label>)}<button disabled={busy}>Save channel permissions</button></form></section></div>}
   {tab==='events'&&<div className="hub-grid"><section className="hub-card"><h2><CalendarDays size={17}/> Upcoming events</h2>{events.map(event=><article className="hub-event" key={event.id}><strong>{event.title}</strong><time>{new Date(event.startsAt).toLocaleString()}</time>{event.description&&<p>{event.description}</p>}</article>)}{!events.length&&<p className="hub-empty">No events have been scheduled.</p>}</section><section className="hub-card"><h2>Create an event</h2><form className="hub-form" onSubmit={createEvent}><label>Event title<input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} required maxLength={100}/></label><label>Start date and time<input type="datetime-local" value={eventDate} onChange={e=>setEventDate(e.target.value)} required/></label><label>Description<textarea value={eventDescription} onChange={e=>setEventDescription(e.target.value)} maxLength={2000}/></label><button disabled={busy}>Publish event</button></form></section></div>}
   {tab==='applications'&&<section className="hub-card"><h2><ClipboardList size={17}/> Join applications</h2>{applications.map(application=><article className="hub-application" key={application.id}><div><strong>{application.user.displayName||application.user.username}</strong><small>@{application.user.username}#{application.user.tag} · {application.status}</small>{Object.entries(application.answers||{}).map(([q,a])=><p key={q}><b>{q}</b>: {a}</p>)}</div>{application.status==='PENDING'&&<div className="hub-actions"><button onClick={()=>void reviewApplication(application.id,'APPROVED')}><Check size={14}/> Approve</button><button className="hub-muted-button" onClick={()=>void reviewApplication(application.id,'REJECTED')}><X size={14}/> Reject</button></div>}</article>)}{!applications.length&&<p className="hub-empty">No applications to review, or you do not have permission to view them.</p>}</section>}
   {tab==='moderation'&&<div className="hub-grid"><section className="hub-card"><h2><Shield size={17}/> Moderation actions</h2><form className="hub-form" onSubmit={moderate}><label>Member username<input value={targetUsername} onChange={e=>setTargetUsername(e.target.value)} placeholder="username#4821" required/></label><label>Action<select value={targetAction} onChange={e=>setTargetAction(e.target.value as typeof targetAction)}>{['WARN','KICK','BAN','UNBAN','TIMEOUT'].map(action=><option key={action}>{action}</option>)}</select></label><label>Reason<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={500}/></label><button disabled={busy}>Record action</button></form></section><section className="hub-card"><h2>Recent moderation</h2>{audit.filter(entry=>entry.action.startsWith('MODERATION_')).slice(0,20).map(entry=><div className="hub-audit-row" key={entry.id}><strong>{entry.action.replace('MODERATION_','')}</strong><small>{entry.actor.username} · {new Date(entry.createdAt).toLocaleString()}</small></div>)}</section></div>}
   {tab==='audit'&&<section className="hub-card"><h2><ClipboardList size={17}/> Server audit log</h2>{audit.map(entry=><div className="hub-audit-row" key={entry.id}><strong>{entry.action.replaceAll('_',' ')}</strong><small>{entry.actor.displayName||entry.actor.username} · {new Date(entry.createdAt).toLocaleString()}</small>{entry.targetId&&<code>{entry.targetId}</code>}</div>)}{!audit.length&&<p className="hub-empty">No audit entries available, or your role cannot view them.</p>}</section>}
  </>}
 </div>
}
