const MAX_AGE_MA = 4540;
const PALEO_SLICES = [
  {ageMa:750,file:'93.jpg'},{ageMa:600,file:'90.jpg'},{ageMa:542,file:'88.jpg'},{ageMa:500,file:'84.jpg'},
  {ageMa:419.5,file:'73.jpg'},{ageMa:359.2,file:'65.jpg'},{ageMa:301.2,file:'57.jpg'},{ageMa:251,file:'49.jpg'},
  {ageMa:199.6,file:'43.jpg'},{ageMa:145.5,file:'32.jpg'},{ageMa:91.1,file:'21.jpg'},{ageMa:65.5,file:'16.jpg'},
  {ageMa:31.1,file:'9.jpg'},{ageMa:3.7,file:'3.jpg'},{ageMa:0,file:'1.jpg'}
].map(x=>({...x,url:`/assets/paleo/${x.file}`}));
const PRESENT_TEXTURE_URL = '/assets/earth/earth_atmos_2048.jpg';
const CRATON_SHAPES_URL = '/assets/data/craton-shapes.json';
const CRATON_ROTATIONS_URL = '/assets/data/craton-rotations.json';

const STOPS = [
  {ageMa:4540,label:'4.54 Ga',era:'Hadean',title:'A world begins.',eyebrow:'The making of Earth',copy:'Rock, metal and dust collide into a hot young planet. The surface is molten, the atmosphere violent, and the Moon is still being born.',facts:{Surface:'Predominantly molten',Atmosphere:'Steam, carbon dioxide, nitrogen',Record:'Zircons preserve the earliest clues'}},
  {ageMa:2400,label:'2.4 Ga',era:'Paleoproterozoic',title:'The air changes.',eyebrow:'Great Oxidation Event',copy:'Photosynthetic life transforms the chemistry of the ocean and atmosphere. Oxygen becomes a force that will reshape the planet.',facts:{Atmosphere:'Oxygen rises',Life:'Microbial ecosystems',Climate:'Major glaciations'}},
  {ageMa:1100,label:'1.1 Ga',era:'Mesoproterozoic',title:'Continents gather.',eyebrow:'Rodinia',copy:'Ancient continental cores assemble into Rodinia, a supercontinent reconstructed from paleomagnetic and geological evidence.',facts:{Supercontinent:'Rodinia',Reconstruction:'Vector craton model',Evidence:'Paleomagnetism + geology'}},
  {ageMa:750,label:'750 Ma',era:'Neoproterozoic',title:'A planet of extremes.',eyebrow:'Rodinia breaks apart',copy:'Continents fragment while Earth enters episodes of severe global cooling. The geography beneath the ice is already changing.',facts:{Surface:'Reconstructed paleogeography',Climate:'Cryogenian glaciations',Oceans:'Global circulation reorganizes'}},
  {ageMa:500,label:'500 Ma',era:'Cambrian',title:'Life becomes visible.',eyebrow:'Cambrian worlds',copy:'Shallow seas spread across continental margins while complex animal body plans diversify dramatically in the fossil record.',facts:{Life:'Rapid animal diversification',Seas:'Widespread shallow seas',Record:'Exceptional fossil deposits'}},
  {ageMa:300,label:'300 Ma',era:'Carboniferous–Permian',title:'Pangaea closes in.',eyebrow:'Supercontinent assembly',copy:'Continents converge into Pangaea. Vast interior regions dry while coal forests and changing seas redraw the carbon cycle.',facts:{Supercontinent:'Pangaea',Climate:'Strong continentality',Life:'Forests, reptiles, insects'}},
  {ageMa:200,label:'200 Ma',era:'Jurassic dawn',title:'Pangaea opens.',eyebrow:'A new ocean begins',copy:'Rifting splits the supercontinent. New ocean basins form and the long rearrangement toward the modern world accelerates.',facts:{Tectonics:'Atlantic rifting begins',Life:'Dinosaurs diversify',Climate:'Generally warm greenhouse'}},
  {ageMa:66,label:'66 Ma',era:'Cenozoic threshold',title:'A sudden boundary.',eyebrow:'End-Cretaceous',copy:'A mass extinction closes the age of non-avian dinosaurs. Mammals and birds inherit ecosystems on a rapidly changing planet.',facts:{Boundary:'K–Pg extinction',Cause:'Large impact + environmental disruption',Aftermath:'Mammalian radiation'}},
  {ageMa:0.125,label:'125 ka',era:'Late Pleistocene',title:'People spread.',eyebrow:'Human dispersal',copy:'Homo sapiens expands through Africa and beyond. Routes unfold across the globe as climates, coastlines and opportunities shift.',facts:{Species:'Homo sapiens',Layer:'Schematic dispersal routes',Caution:'Routes summarize broad evidence, not single journeys'}},
  {ageMa:0,label:'Now',era:'Holocene',title:'Explore our planet.',eyebrow:'A living archive',copy:'The world beneath us is the latest frame in a 4.54-billion-year story. Drag, zoom, scrub and move backward through the record.',facts:{Surface:'Present-day Earth imagery',Mode:'Natural / After dark / Blue hour',Interaction:'Orbit, zoom, scrub, autoplay'}}
];

const MIGRATION_ROUTES = [
  {startMa:.18,from:[8.9,38.7],to:[-1.3,36.8],label:'East Africa'},
  {startMa:.12,from:[9,38.7],to:[15.5,39.7],label:'Horn of Africa'},
  {startMa:.09,from:[15.5,39.7],to:[31.8,35.2],label:'Levant'},
  {startMa:.075,from:[31.8,35.2],to:[23.6,77.2],label:'South Asia'},
  {startMa:.065,from:[23.6,77.2],to:[13.7,100.5],label:'Southeast Asia'},
  {startMa:.055,from:[13.7,100.5],to:[-17,133],label:'Sahul'},
  {startMa:.05,from:[31.8,35.2],to:[45.5,12.3],label:'Europe'},
  {startMa:.05,from:[13.7,100.5],to:[34.3,108.9],label:'East Asia'},
  {startMa:.035,from:[34.3,108.9],to:[61,128],label:'Siberia'},
  {startMa:.025,from:[61,128],to:[65.8,-168.5],label:'Beringia'},
  {startMa:.018,from:[65.8,-168.5],to:[49,-114],label:'North America'},
  {startMa:.014,from:[49,-114],to:[-13.5,-71.9],label:'South America'}
];

const $ = (id)=>document.getElementById(id);
const els = {
  app:$('app'), globe:$('globe'), overlay:$('overlay'), loading:$('loading'), loadingBar:$('loadingBar'), loadingText:$('loadingText'), fallback:$('fallback'),
  storyTitle:$('storyTitle'), eyebrow:$('eyebrow'), storyCopy:$('storyCopy'), nowAge:$('nowAge'), nowEra:$('nowEra'), timeline:$('timeline'), mobileTimeline:$('mobileTimeline'), timelineProgress:$('timelineProgress'), timelineStops:$('timelineStops'), centerAge:$('centerAge'),
  playButton:$('playButton'), playIcon:$('playIcon'), prevStop:$('prevStop'), nextStop:$('nextStop'), speedButton:$('speedButton'), backInTime:$('backInTime'), readRecord:$('readRecord'),
  zoomIn:$('zoomIn'), zoomOut:$('zoomOut'), coordLat:$('coordLat'), coordLon:$('coordLon'), distanceReadout:$('distanceReadout'), interactionHint:$('interactionHint'),
  exploreButton:$('exploreButton'), exploreMenu:$('exploreMenu'), closeExplore:$('closeExplore'), sourcesButton:$('sourcesButton'), sourcesDialog:$('sourcesDialog'), recordDialog:$('recordDialog'), recordTitle:$('recordTitle'), recordBody:$('recordBody'), recordFacts:$('recordFacts'),
  brandButton:$('brandButton'), mobileAge:$('mobileAge'), mobileTitle:$('mobileTitle'), mobileCopy:$('mobileCopy'), mobilePrev:$('mobilePrev'), mobileNext:$('mobileNext'), mobilePlay:$('mobilePlay'), mobileMode:$('mobileMode'), sheetHandle:$('sheetHandle'), srStatus:$('srStatus')
};

const state = {
  ageMa:0, yaw:-0.32, pitch:0.08, zoom:1, targetZoom:1, velocityYaw:0, velocityPitch:0,
  dragging:false, pointerId:null, lastX:0, lastY:0, lastMoveTime:0, playing:false, speed:1, mode:'natural',
  lastFrame:performance.now(), lastInteraction:performance.now(), textureKey:'', reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
  currentStop:STOPS.length-1, cratonData:null, cratonRotations:null, cratonTextureCache:new Map(), activeTextures:null, glReady:false
};

function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function smoothstep(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
function deg(v){return v*Math.PI/180;}
function radToDeg(v){return v*180/Math.PI;}
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}

function ageToVisual(age){
  if(age<=1){const t=Math.log10(age*1e6+1)/Math.log10(1e6+1);return .18*t;}
  const segments=[
    {a:1,b:66,p0:.18,p1:.37},{a:66,b:251,p0:.37,p1:.56},{a:251,b:541,p0:.56,p1:.69},{a:541,b:1000,p0:.69,p1:.78},{a:1000,b:2500,p0:.78,p1:.90},{a:2500,b:4540,p0:.90,p1:1}
  ];
  const s=segments.find(x=>age>=x.a&&age<=x.b)||segments.at(-1);return lerp(s.p0,s.p1,(age-s.a)/(s.b-s.a));
}
function visualToAge(p){
  p=clamp(p,0,1);
  if(p<=.18){const t=p/.18;return (Math.pow(10,t*Math.log10(1e6+1))-1)/1e6;}
  const segments=[
    {a:1,b:66,p0:.18,p1:.37},{a:66,b:251,p0:.37,p1:.56},{a:251,b:541,p0:.56,p1:.69},{a:541,b:1000,p0:.69,p1:.78},{a:1000,b:2500,p0:.78,p1:.90},{a:2500,b:4540,p0:.90,p1:1}
  ];
  const s=segments.find(x=>p>=x.p0&&p<=x.p1)||segments.at(-1);return lerp(s.a,s.b,(p-s.p0)/(s.p1-s.p0));
}
function ageToSlider(age){return Math.round((1-ageToVisual(age))*10000)}
function sliderToAge(value){return visualToAge(1-Number(value)/10000)}
function formatAge(age){
  if(age===0||age<.000001)return 'Present day';
  if(age<.001)return `${Math.round(age*1e6).toLocaleString()} years ago`;
  if(age<1)return `${Math.round(age*1000)} thousand years ago`;
  if(age<1000)return `${Math.round(age)} million years ago`;
  return `${(age/1000).toFixed(age>=4000?2:1)} billion years ago`;
}
function closestStopIndex(age){let best=0,d=Infinity;STOPS.forEach((s,i)=>{const x=Math.abs(Math.log10(s.ageMa+.000001)-Math.log10(age+.000001));if(x<d){d=x;best=i}});return best}

function renderStops(){
  els.timelineStops.innerHTML='';
  STOPS.forEach((s,i)=>{const n=document.createElement('i');n.className='timeline-stop';n.style.left=`${ageToSlider(s.ageMa)/100}%`;n.dataset.index=i;n.title=s.label;els.timelineStops.appendChild(n)});
}
function setStoryForAge(age,{announce=false}={}){
  const i=closestStopIndex(age), stop=STOPS[i]; state.currentStop=i;
  els.eyebrow.textContent=stop.eyebrow;els.storyTitle.textContent=stop.title;els.storyCopy.textContent=stop.copy;els.nowAge.textContent=formatAge(age);els.nowEra.textContent=stop.era;els.centerAge.textContent=formatAge(age);
  els.mobileAge.textContent=formatAge(age);els.mobileTitle.textContent=stop.title;els.mobileCopy.textContent=stop.copy;
  els.timelineStops.querySelectorAll('.timeline-stop').forEach((n,idx)=>n.classList.toggle('active',idx===i));
  if(announce)els.srStatus.textContent=`${formatAge(age)}. ${stop.title} ${stop.copy}`;
}
function setAge(age,{fromInput=false,announce=false}={}){
  state.ageMa=clamp(age,0,MAX_AGE_MA); const v=ageToSlider(state.ageMa); if(!fromInput){els.timeline.value=v;els.mobileTimeline.value=v} els.timelineProgress.style.width=`${v/100}%`;setStoryForAge(state.ageMa,{announce});requestTextureState();drawOverlay();
}
function goToStop(i){i=clamp(i,0,STOPS.length-1);setAge(STOPS[i].ageMa,{announce:true})}
