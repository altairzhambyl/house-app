import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, Users } from 'lucide-react'
import type { Language } from './locales/translations'
import './chat.css'

type Message = { id: string; author: string; text: string; time: string; mine?: boolean }
const copy = {
  en: { title:'Building group chat', subtitle:'Neighbours of your residential complex', members:'Group conversation', today:'Today', placeholder:'Write a message...', send:'Send message', demo:'Demo chat · Messages are stored only in this browser', empty:'Start the conversation', you:'You' },
  ru: { title:'Общий чат дома', subtitle:'Соседи вашего жилого комплекса', members:'Групповая беседа', today:'Сегодня', placeholder:'Напишите сообщение...', send:'Отправить сообщение', demo:'Демо-чат · Сообщения хранятся только в этом браузере', empty:'Начните общение', you:'Вы' },
  kk: { title:'Үйдің ортақ чаты', subtitle:'Тұрғын үй кешенінің көршілері', members:'Топтық әңгіме', today:'Бүгін', placeholder:'Хабарлама жазыңыз...', send:'Хабарлама жіберу', demo:'Демо-чат · Хабарламалар тек осы браузерде сақталады', empty:'Әңгімені бастаңыз', you:'Сіз' },
}
const seed: Message[] = [
  {id:'s1',author:'Aigerim S.',text:'Hello, neighbours! Has anyone heard about the elevator maintenance?',time:'09:24'},
  {id:'s2',author:'Dias K.',text:'Yes, the maintenance is complete. Both elevators are working now.',time:'09:27'},
  {id:'s3',author:'Madina A.',text:'Great, thank you for the update!',time:'09:31'},
  {id:'s4',author:'Timur B.',text:'Hi everyone! Reminder: community cleaning day is coming up soon.',time:'10:05'},
]
const colors=['#DDEDD9','#FCE7C8','#DCEAF8','#F2DFF1','#F7E6D7']
function Avatar({name,large=false}:{name:string;large?:boolean}) {
  const initials=name.trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join('')
  const color=colors[Array.from(name).reduce((a,c)=>a+c.charCodeAt(0),0)%colors.length]
  return <span aria-label={name} title={name} className={`chat-avatar ${large?'chat-avatar-large':''}`} style={{backgroundColor:color}}>{initials}</span>
}
export default function GroupChat({language, userName, building}:{language:Language;userName:string;building:string}) {
  const t=copy[language]
  const key=`homeapp-chat-${building}-${userName}`
  const [messages,setMessages]=useState<Message[]>(()=>{
    try {const saved=localStorage.getItem(key);return saved?JSON.parse(saved) as Message[]:seed} catch {return seed}
  })
  const [draft,setDraft]=useState('')
  const bottom=useRef<HTMLDivElement>(null)
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(messages))}catch{}},[messages,key])
  useEffect(()=>{bottom.current?.scrollIntoView({block:'end',behavior:'smooth'})},[messages.length])
  function send(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const text=draft.trim()
    if(!text)return
    setMessages(prev=>[...prev,{id:`m-${Date.now()}-${prev.length}`,author:userName,text,time:new Date().toLocaleTimeString(language==='ru'?'ru-RU':language==='kk'?'kk-KZ':'en-GB',{hour:'2-digit',minute:'2-digit'}),mine:true}])
    setDraft('')
  }
  return <section className="group-chat" aria-label={t.title}>
    <header className="chat-header"><div className="chat-group-icon"><Users size={24}/></div><div className="chat-heading"><h1>{t.title}</h1><p>{building} · {t.subtitle}</p></div><div className="chat-header-label"><MessageCircle size={16}/><span>{t.members}</span></div></header>
    <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
      <div className="chat-day"><span>{t.today}</span></div>
      {messages.length===0&&<p className="chat-empty">{t.empty}</p>}
      {messages.map(m=><article key={m.id} className={`chat-message ${m.mine?'chat-message-mine':''}`}>
        <Avatar name={m.author}/><div className="chat-bubble"><div className="chat-message-top"><strong>{m.mine?t.you:m.author}</strong><time>{m.time}</time></div><p>{m.text}</p></div>
      </article>)}
      <div ref={bottom}/>
    </div>
    <footer className="chat-footer"><form onSubmit={send} className="chat-compose"><input aria-label={t.placeholder} placeholder={t.placeholder} value={draft} maxLength={2000} onChange={e=>setDraft(e.target.value)}/><button type="submit" disabled={!draft.trim()} aria-label={t.send} title={t.send}><Send size={19}/><span>{t.send}</span></button></form><p>{t.demo}</p></footer>
  </section>
}
