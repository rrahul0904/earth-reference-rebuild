const YEAR=360;
const LIMITS=Object.freeze({population:200,tick:1_000_000,events:100_000,people:10_000,households:25_000,snapshotBytes:16_000_000});
const integer=(value,min,max,label)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(`${label} must be an integer ${min}..${max}`);return value};
const boundedString=(value,max,label)=>{if(typeof value!=='string'||value.length>max)throw Error(`${label} must be a string of at most ${max} characters`);return value};
const reserveEvents=(w,count)=>{if(w.events.length+count>LIMITS.events)throw Error('event ledger capacity reached')};
function experimentTokens(value,label){if(!Array.isArray(value)||value.length>16)throw Error(`${label} must contain at most 16 tokens`);for(const token of value)boundedString(token,64,label);return sorted(value)}
const KNOWLEDGE={
 firemaking:{title:'Firemaking',req:[],recipe:[['dry_tinder','wood'],['friction','oxygen']]},
 pottery:{title:'Fired pottery',req:['firemaking'],recipe:[['clay'],['shape','sustained_heat']]},
 weaving:{title:'Weaving',req:[],recipe:[['fiber'],['tension_frame']]},
 navigation:{title:'Coastal navigation',req:[],recipe:[['shoreline','stars'],['observe','compare']]},
 charcoal:{title:'Charcoal making',req:['firemaking'],recipe:[['wood'],['low_oxygen_fire']]},
 copperworking:{title:'Copper working',req:['charcoal'],recipe:[['copper_ore','charcoal'],['hammer','high_heat']]}
};
const copy=v=>structuredClone(v);
const sorted=a=>[...new Set(a)].sort();
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const stable=v=>JSON.stringify(canon(v));
const seedHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0||1};
const rand=w=>(w.rng=(Math.imul(w.rng,1664525)+1013904223)>>>0)/4294967296;
const pick=(w,a)=>a.length?a[Math.floor(rand(w)*a.length)]:null;
const livingCache=new WeakMap();
const invalidateLiving=w=>{if(livingCache.has(w))livingCache.set(w,null)};
const living=w=>{let people=livingCache.get(w);if(!people){people=Object.values(w.people).filter(p=>p.alive).sort((a,b)=>a.id.localeCompare(b.id));if(livingCache.has(w))livingCache.set(w,people)}return people};
const age=(w,p)=>(w.tick-p.born)/YEAR;
function emit(w,type,payload={},significance=1){reserveEvents(w,1);const e={id:`e${w.next.event++}`,tick:w.tick,type,significance,payload:copy(payload)};w.events.push(e);return e}
function settlement(w,name,lat,lon,parent=null){const id=`s${w.next.settlement++}`;w.settlements[id]={id,name,lat,lon,parent,founded:w.tick};return id}
function household(w,settlementId){const id=`h${w.next.household++}`;w.households[id]={id,settlementId,members:[]};return id}
function person(w,{settlementId,householdId,born,parents=[]}){const id=`p${w.next.person++}`;w.people[id]={id,name:`Person ${id.slice(1)}`,born,died:null,alive:true,parents:[...parents],settlementId,householdId,skills:{},memories:[]};w.households[householdId].members.push(id);invalidateLiving(w);return id}
function refreshKnowledge(w,k){const carriers=living(w).some(p=>p.skills[k]);const s=w.knowledgeState[k];if(carriers||w.written[k]){s.status='known';s.lost=null}else if(s.discovered!==null&&s.status!=='lost'){s.status='lost';s.lost=w.tick;emit(w,'knowledge_lost',{knowledgeId:k},5)}}
function grant(w,personId,k,source,eventIds=[],sourcePersonId=null){const p=w.people[personId];if(!p?.alive)throw Error('carrier must be living');if(!w.knowledge[k])throw Error('unknown knowledge');if(p.skills[k])return false;p.skills[k]={learned:w.tick,source,sourcePersonId,eventIds:[...eventIds]};const s=w.knowledgeState[k];if(s.discovered===null)s.discovered=w.tick;s.status='known';s.lost=null;return true}
export function teachKnowledge(w,teacherId,learnerId,k){const t=w.people[teacherId],l=w.people[learnerId];if(!t?.alive||!l?.alive)throw Error('teacher and learner must live');if(!t.skills[k])throw Error('teacher lacks knowledge');if(t.settlementId!==l.settlementId)throw Error('different settlements');if(l.skills[k])return null;const e=emit(w,'knowledge_taught',{teacherId,learnerId,knowledgeId:k},2);grant(w,learnerId,k,'teaching',[e.id],teacherId);l.memories.push({tick:w.tick,kind:'learning',knowledgeId:k,eventIds:[e.id]});return e}
export function killPerson(w,id,reason='natural'){boundedString(reason,256,'death reason');const p=w.people[id];if(!p?.alive)return null;reserveEvents(w,1+Object.keys(p.skills).length);p.alive=false;p.died=w.tick;invalidateLiving(w);const e=emit(w,'death',{personId:id,settlementId:p.settlementId,reason},3);for(const k of Object.keys(p.skills))refreshKnowledge(w,k);return e}
function matches(recipe,inputs,process){return stable(sorted(recipe[0]))===stable(sorted(inputs))&&stable(sorted(recipe[1]))===stable(sorted(process))}
export function runExperiment(w,id,{inputs=[],process=[]}={}){inputs=experimentTokens(inputs,'inputs');process=experimentTokens(process,'process');const p=w.people[id];if(!p?.alive)throw Error('experimenter must live');const hit=Object.entries(w.knowledge).find(([,k])=>matches(k.recipe,inputs,process)&&k.req.every(r=>p.skills[r]));reserveEvents(w,hit&&!p.skills[hit[0]]?2:1);const e=emit(w,'experiment',{personId:id,inputs:sorted(inputs),process:sorted(process),outcome:hit?.[0]??null},hit?3:1);if(!hit)return{event:e,discovered:null};const k=hit[0];if(!grant(w,id,k,'experiment',[e.id]))return{event:e,discovered:null};const d=emit(w,'knowledge_discovered',{personId:id,knowledgeId:k,experimentEventId:e.id},5);p.skills[k].eventIds.push(d.id);return{event:e,discovered:k,discoveryEvent:d}}
export function createLivingWorld({seed='world-sim-clean-room',population=30,settlementCount=3,maxPopulation=120}={}){integer(population,20,LIMITS.population,'population');integer(settlementCount,2,8,'settlements');integer(maxPopulation,population,LIMITS.population,'maxPopulation');boundedString(seed,256,'seed');const w={schema:1,seed:String(seed),tick:0,rng:seedHash(seed),maxPopulation,next:{event:1,settlement:1,household:1,person:1},people:{},households:{},settlements:{},knowledge:copy(KNOWLEDGE),knowledgeState:Object.fromEntries(Object.keys(KNOWLEDGE).map(k=>[k,{status:'unknown',discovered:null,lost:null}])),written:{},events:[]};const coords=[[30,31],[42,12],[19,73],[41,-74],[36,140],[-24,-47],[-34,18],[-34,151]];const sets=[];for(let i=0;i<settlementCount;i++)sets.push(settlement(w,`Settlement ${i+1}`,coords[i][0],coords[i][1]));for(let i=0;i<population;i++){const sid=sets[i%sets.length],hid=household(w,sid),years=18+Math.floor(rand(w)*48);person(w,{settlementId:sid,householdId:hid,born:-years*YEAR-Math.floor(rand(w)*YEAR)})}const ids=Object.keys(w.people);for(const [id,k] of [[ids[0],'firemaking'],[ids[0],'pottery'],[ids[1],'firemaking'],[ids[1],'weaving'],[ids[2],'navigation'],[ids[3],'charcoal']]){const e=emit(w,'knowledge_seeded',{personId:id,knowledgeId:k});grant(w,id,k,'initial',[e.id])}emit(w,'world_created',{population,settlementCount,seed:w.seed},5);return w}
function choose(w,pred=()=>true){return pick(w,living(w).filter(pred))}
function teaching(w){const t=pick(w,living(w).filter(p=>Object.keys(p.skills).length));if(!t)return;const k=pick(w,Object.keys(t.skills).sort());const l=choose(w,p=>p.id!==t.id&&p.settlementId===t.settlementId&&!p.skills[k]);if(l)teachKnowledge(w,t.id,l.id,k)}
// A move changes one person's household; other members retain their own location.
function relocate(w,p,to){const previous=w.households[p.householdId];previous.members=previous.members.filter(id=>id!==p.id);p.settlementId=to;p.householdId=household(w,to);w.households[p.householdId].members.push(p.id)}
function migrate(w){const p=choose(w,x=>age(w,x)>=16);if(!p)return;const ids=Object.keys(w.settlements).sort().filter(x=>x!==p.settlementId),to=pick(w,ids);if(!to)return;reserveEvents(w,1);const from=p.settlementId;relocate(w,p,to);emit(w,'migration',{personId:p.id,fromSettlementId:from,toSettlementId:to},2)}
function birth(w){if(living(w).length>=w.maxPopulation)return;const sid=pick(w,Object.keys(w.settlements).sort());const adults=living(w).filter(p=>p.settlementId===sid&&age(w,p)>=20&&age(w,p)<=45);if(adults.length<2)return;reserveEvents(w,1);const a=pick(w,adults),b=pick(w,adults.filter(p=>p.id!==a.id)),hid=w.people[a.id].householdId,id=person(w,{settlementId:sid,householdId:hid,born:w.tick,parents:[a.id,b.id].sort()});emit(w,'birth',{personId:id,parentIds:[a.id,b.id].sort(),settlementId:sid},3)}
function death(w){const old=living(w).filter(p=>age(w,p)>=55);const p=pick(w,old);if(!p)return;const chance=Math.min(.85,.08+Math.max(0,age(w,p)-55)*.015);if(rand(w)<chance)killPerson(w,p.id)}
function split(w){const ids=Object.keys(w.settlements).sort();if(ids.length>=6)return;const ranked=ids.map(id=>[id,living(w).filter(p=>p.settlementId===id).length]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));if(!ranked[0]||ranked[0][1]<10)return;reserveEvents(w,1);const [src]=ranked[0],base=w.settlements[src],sid=settlement(w,`Colony ${w.next.settlement-1}`,Math.max(-80,Math.min(80,base.lat+(rand(w)-.5)*16)),((base.lon+(rand(w)-.5)*28+540)%360)-180,src),m=living(w).filter(p=>p.settlementId===src).slice(0,4);for(const p of m)relocate(w,p,sid);emit(w,'settlement_founded',{settlementId:sid,parentSettlementId:src,founderIds:m.map(p=>p.id)},5)}
function rediscover(w){const lost=Object.entries(w.knowledgeState).filter(([,s])=>s.status==='lost').map(([k])=>k).sort(),k=pick(w,lost);if(!k)return;const spec=w.knowledge[k],p=choose(w,x=>spec.req.every(r=>x.skills[r]));if(p)runExperiment(w,p.id,{inputs:spec.recipe[0],process:spec.recipe[1]})}
export function tickLivingWorld(w,steps=1){integer(steps,0,LIMITS.tick-w.tick,'steps');livingCache.set(w,null);try{for(let i=0;i<steps;i++){w.tick++;if(w.tick%30===0)teaching(w);if(w.tick%90===0)migrate(w);if(w.tick%180===0)birth(w);if(w.tick%360===0)death(w);if(w.tick%720===0)split(w);if(w.tick%240===0)rediscover(w)}}finally{livingCache.delete(w)}return w}
export const snapshotLivingWorld=w=>stable(w);
// Restoration accepts bounded JSON data and checks references before exposing a world.
function validateSnapshot(w){
 let nodes=0;
 function tree(value,depth=0){
  if(++nodes>1_000_000||depth>12)throw Error('snapshot structure exceeds limits');
  if(value===null||typeof value==='boolean')return;
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error('non-finite snapshot number');return}
  if(typeof value==='string'){boundedString(value,1024,'snapshot value');return}
  if(typeof value!=='object')throw Error('snapshot must contain JSON data');
  if(Array.isArray(value)){for(const item of value)tree(item,depth+1);return}
  if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw Error('snapshot must contain plain objects');
  for(const key of Object.keys(value)){
   if(['__proto__','prototype','constructor'].includes(key))throw Error('unsafe snapshot key');
   if(!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))throw Error('snapshot accessors unsupported');
   tree(value[key],depth+1);
  }
 }
 tree(w);
 if(JSON.stringify(w).length>LIMITS.snapshotBytes)throw Error('snapshot too large');
 const object=(v,label)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error(`invalid ${label}`);return v};
 const list=(v,max,label)=>{if(!Array.isArray(v)||v.length>max)throw Error(`invalid ${label}`);return v};
 const reference=(table,id,label)=>{if(typeof id!=='string'||!Object.hasOwn(table,id))throw Error(`missing ${label}`)};
 const time=(v,label)=>integer(v,0,w.tick,label);
 object(w,'world');if(w.schema!==1)throw Error('unsupported schema');
 boundedString(w.seed,256,'seed');integer(w.tick,0,LIMITS.tick,'tick');integer(w.rng,0,4294967295,'rng');integer(w.maxPopulation,20,LIMITS.population,'maxPopulation');
 object(w.next,'counters');
 for(const key of ['people','households','settlements','knowledge','knowledgeState','written'])object(w[key],key);
 list(w.events,LIMITS.events,'events');
 if(stable(w.knowledge)!==stable(KNOWLEDGE))throw Error('unsupported knowledge definitions');
 if(stable(Object.keys(w.knowledgeState).sort())!==stable(Object.keys(KNOWLEDGE).sort()))throw Error('invalid knowledge states');
 const entityTable=(table,prefix,max,next)=>{
  const entries=Object.entries(table);if(entries.length>max)throw Error('entity capacity exceeded');
  integer(next,1,max+1,'next entity counter');
  for(const [id,item] of entries){object(item,'entity');if(!new RegExp(`^${prefix}[1-9][0-9]*$`).test(id)||item.id!==id||Number(id.slice(1))>=next)throw Error('invalid entity id or counter')}
 };
 entityTable(w.people,'p',LIMITS.people,w.next.person);entityTable(w.households,'h',LIMITS.households,w.next.household);entityTable(w.settlements,'s',8,w.next.settlement);
 if(Object.keys(w.settlements).length<2)throw Error('missing settlements');
 integer(w.next.event,1,LIMITS.events+1,'next event counter');if(w.next.event!==w.events.length+1)throw Error('invalid event counter');
 const eventIds=new Set();let previousTick=0;
 for(const [index,event] of w.events.entries()){
  object(event,'event');if(event.id!==`e${index+1}`)throw Error('invalid event sequence');time(event.tick,'event tick');if(event.tick<previousTick)throw Error('event time moved backward');previousTick=event.tick;
  boundedString(event.type,64,'event type');integer(event.significance,1,5,'event significance');object(event.payload,'event payload');eventIds.add(event.id);
 }
 for(const settlement of Object.values(w.settlements)){
  boundedString(settlement.name,128,'settlement name');time(settlement.founded,'settlement founded');
  if(!Number.isFinite(settlement.lat)||Math.abs(settlement.lat)>90||!Number.isFinite(settlement.lon)||Math.abs(settlement.lon)>180)throw Error('invalid settlement coordinates');
  if(settlement.parent!==null){reference(w.settlements,settlement.parent,'parent settlement');if(settlement.parent===settlement.id)throw Error('self-parent settlement')}
 }
 const memberships=new Set();
 for(const h of Object.values(w.households)){
  reference(w.settlements,h.settlementId,'household settlement');list(h.members,LIMITS.people,'household members');
  for(const id of h.members){reference(w.people,id,'household member');const p=w.people[id];if(memberships.has(id)||p.householdId!==h.id||p.settlementId!==h.settlementId)throw Error('inconsistent household membership');memberships.add(id)}
 }
 let alive=0;
 for(const p of Object.values(w.people)){
  boundedString(p.name,128,'person name');integer(p.born,-100*YEAR,w.tick,'birth tick');if(typeof p.alive!=='boolean')throw Error('invalid alive flag');
  if(p.alive){alive++;if(p.died!==null)throw Error('living person has death tick')}else{time(p.died,'death tick');if(p.died<p.born)throw Error('death before birth')}
  reference(w.settlements,p.settlementId,'person settlement');reference(w.households,p.householdId,'person household');if(!memberships.has(p.id))throw Error('person absent from household');
  list(p.parents,2,'parents');if(new Set(p.parents).size!==p.parents.length)throw Error('duplicate parent');
  for(const id of p.parents){reference(w.people,id,'parent');const parent=w.people[id];if(parent.born>=p.born||parent.died!==null&&parent.died<p.born)throw Error('invalid parent chronology')}
  object(p.skills,'skills');list(p.memories,LIMITS.events,'memories');
  for(const [k,skill] of Object.entries(p.skills)){
   reference(KNOWLEDGE,k,'knowledge');object(skill,'skill');time(skill.learned,'learning tick');if(skill.learned<p.born||p.died!==null&&skill.learned>p.died)throw Error('invalid learning chronology');
   if(!['initial','teaching','experiment'].includes(skill.source))throw Error('invalid knowledge source');
   if(skill.source==='teaching')reference(w.people,skill.sourcePersonId,'teacher');else if(skill.sourcePersonId!==null)throw Error('unexpected teacher');
   list(skill.eventIds,2,'skill events');if(!skill.eventIds.length||skill.eventIds.some(id=>!eventIds.has(id)))throw Error('missing provenance event');
  }
  for(const memory of p.memories){object(memory,'memory');time(memory.tick,'memory tick');reference(KNOWLEDGE,memory.knowledgeId,'memory knowledge');list(memory.eventIds,2,'memory events');if(memory.eventIds.some(id=>!eventIds.has(id)))throw Error('missing memory event')}
 }
 if(alive>w.maxPopulation)throw Error('population exceeds bound');
 for(const [k,value] of Object.entries(w.written)){reference(KNOWLEDGE,k,'written knowledge');if(value!==true)throw Error('invalid written knowledge')}
 for(const [k,state] of Object.entries(w.knowledgeState)){
  object(state,'knowledge state');if(!['unknown','known','lost'].includes(state.status))throw Error('invalid knowledge status');
  if(state.discovered!==null)time(state.discovered,'discovery tick');if(state.lost!==null)time(state.lost,'loss tick');
  const known=Object.values(w.people).some(p=>p.alive&&Object.hasOwn(p.skills,k))||w.written[k]===true;
  if(known!==(state.status==='known')||state.status==='unknown'&&(state.discovered!==null||state.lost!==null)||state.status==='known'&&(state.discovered===null||state.lost!==null)||state.status==='lost'&&(state.discovered===null||state.lost===null||state.lost<state.discovered))throw Error('inconsistent knowledge state');
 }
}
export function restoreLivingWorld(s){if(typeof s==='string'&&s.length>LIMITS.snapshotBytes)throw Error('snapshot too large');const w=typeof s==='string'?JSON.parse(s):s;validateSnapshot(w);return copy(w)}
export function hashLivingWorld(w){let h=2166136261;for(const c of snapshotLivingWorld(w)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}
export function livingWorldStats(w){return{tick:w.tick,livingPopulation:living(w).length,totalPeople:Object.keys(w.people).length,settlements:Object.keys(w.settlements).length,knownKnowledge:Object.values(w.knowledgeState).filter(s=>s.status==='known').length,lostKnowledge:Object.values(w.knowledgeState).filter(s=>s.status==='lost').length,events:w.events.length}}
