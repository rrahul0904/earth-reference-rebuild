/* Reference-video inspired companion experiences: orbit, Moon, solar system,
   earthquakes and ocean circulation. Designed to layer on the core Earth renderer. */
(() => {
  const EXPERIENCE_DEFS = {
    planet:{nav:'The Planet',eyebrow:'A living archive',title:'Explore our planet.',copy:'Travel through deep time, from a molten young world to the planet we know now.',kind:'earth'},
    civilization:{nav:'Civilization',eyebrow:'Human journeys',title:'A world becoming connected.',copy:'Follow broad dispersal routes as people move across continents and coastlines through the late Pleistocene.',kind:'earth'},
    orbit:{nav:'Orbit',eyebrow:'01 / A world in orbit',title:'A world in orbit.',copy:'Thousands of objects circle the planet. Explore the orbital infrastructure surrounding our home.',kind:'globe'},
    moon:{nav:'Moon',eyebrow:'02 / Our celestial companion',title:'Another world. Within reach.',copy:'A landscape written by impacts. Explore the Moon through a sequence of landmark missions and places.',kind:'canvas'},
    earthquakes:{nav:'Earthquakes',eyebrow:'03 / The ground is moving',title:'Earthquakes. A planet in motion.',copy:'Every signal is a recorded disturbance. Together they trace the restless edges and interiors of a changing planet.',kind:'globe'},
    oceans:{nav:'Oceans',eyebrow:'04 / A planet connected by water',title:'An ocean. Always moving.',copy:'Beneath a familiar blue surface, water is always on the move. Follow the currents that connect our ocean basins.',kind:'globe'},
    solar:{nav:'Solar System',eyebrow:'05 / Beyond our world',title:'Everything in motion.',copy:'Eight worlds. One star. A celestial dance shaped by gravity and time.',kind:'canvas'}
  };
  const NAV_ORDER=['planet','civilization','orbit','moon','earthquakes','oceans','solar'];
  const experienceState={playing:true,phase:0,selected:null,filter:'all',moonZoom:1,moonMission:'overview',solarPlanet:'earth',oceanCurrent:'global',last:performance.now()};
  state.experience='planet';

  const viewport=document.querySelector('.viewport');
  const expCanvas=document.createElement('canvas');
  expCanvas.id='experienceCanvas'; expCanvas.className='experience-canvas'; expCanvas.setAttribute('aria-hidden','true');
  viewport.insertBefore(expCanvas, document.querySelector('.vignette'));
  els.app.insertAdjacentHTML('beforeend', `
    <aside class="experience-panel" id="experiencePanel" hidden>
      <div class="experience-kicker" id="experienceKicker"></div>
      <strong class="experience-stat" id="experienceStat"></strong>
      <span class="experience-stat-label" id="experienceStatLabel"></span>
      <div class="experience-card" id="experienceCard"></div>
    </aside>
    <footer class="experience-footer" id="experienceFooter" hidden>
      <div class="experience-pills" id="experiencePills"></div>
      <div class="experience-timeline">
        <span id="experienceTimelineLabel"></span><i><b id="experienceTimelineProgress"></b></i>
      </div>
      <button class="experience-play" id="experiencePlay" type="button">Pause</button>
    </footer>`);
  const panel=document.getElementById('experiencePanel'), footer=document.getElementById('experienceFooter');
  const exp={
    kicker:document.getElementById('experienceKicker'), stat:document.getElementById('experienceStat'), statLabel:document.getElementById('experienceStatLabel'), card:document.getElementById('experienceCard'),
    pills:document.getElementById('experiencePills'), timelineLabel:document.getElementById('experienceTimelineLabel'), progress:document.getElementById('experienceTimelineProgress'), play:document.getElementById('experiencePlay')
  };
  const expCtx=expCanvas.getContext('2d');

  const oldGetSphereLayout=getSphereLayout;
  getSphereLayout=function(){
    const w=innerWidth,h=innerHeight,mobile=w<=900;
    if(state.experience==='orbit') return {w,h,cx:mobile?w*.5:w*.60,cy:mobile?h*.31:h*.47,radius:(mobile?Math.min(w*.38,h*.25):Math.min(w*.285,h*.36))*state.zoom};
    if(state.experience==='earthquakes'||state.experience==='oceans') return {w,h,cx:mobile?w*.5:w*.61,cy:mobile?h*.31:h*.47,radius:(mobile?Math.min(w*.42,h*.28):Math.min(w*.31,h*.40))*state.zoom};
    return oldGetSphereLayout();
  };

  function rebuildNavigation(){
    const desktop=document.querySelector('.desktop-nav');
    desktop.innerHTML=NAV_ORDER.map(k=>`<button class="nav-link ${k==='planet'?'is-active':''}" type="button" data-experience-nav="${k}">${EXPERIENCE_DEFS[k].nav}</button>`).join('');
    const grid=document.querySelector('.drawer-grid');
    grid.innerHTML=NAV_ORDER.map((k,i)=>`<button data-experience-nav="${k}"><span>${String(i+1).padStart(2,'0')}</span><strong>${EXPERIENCE_DEFS[k].nav}</strong><small>${EXPERIENCE_DEFS[k].eyebrow.replace(/^\d+ \/ /,'')}</small></button>`).join('');
    document.querySelectorAll('[data-experience-nav]').forEach(b=>b.addEventListener('click',()=>routeExperience(b.dataset.experienceNav)));
  }

  function setHero(def){els.eyebrow.textContent=def.eyebrow;els.storyTitle.textContent=def.title;els.storyCopy.textContent=def.copy;els.mobileTitle.textContent=def.title;els.mobileCopy.textContent=def.copy}
  function setActiveNav(name){document.querySelectorAll('[data-experience-nav]').forEach(n=>n.classList.toggle('is-active',n.dataset.experienceNav===name))}
  function showExperienceChrome(show){panel.hidden=!show;footer.hidden=!show;expCanvas.hidden=!show}
  function setPlanetVisibility(visible){els.globe.style.opacity=visible?'1':'0';els.overlay.style.opacity=(state.experience==='planet'||state.experience==='civilization')?'1':'0'}
  function pill(label,value,active=false){return `<button type="button" data-exp-control="${value}" class="${active?'active':''}">${label}</button>`}
  function renderPills(items){exp.pills.innerHTML=items.join('');exp.pills.querySelectorAll('[data-exp-control]').forEach(b=>b.addEventListener('click',()=>handleControl(b.dataset.expControl)))}
  function setPanel({kicker='',stat='',statLabel='',card=''}){exp.kicker.textContent=kicker;exp.stat.textContent=stat;exp.statLabel.textContent=statLabel;exp.card.innerHTML=card}

  function routeExperience(name){
    if(!EXPERIENCE_DEFS[name]) name='planet';
    state.experience=name; els.app.dataset.experience=name; setActiveNav(name); closeExplore();
    experienceState.selected=null; experienceState.filter='all'; experienceState.phase=0; experienceState.playing=true; exp.play.textContent='Pause';
    const def=EXPERIENCE_DEFS[name]; setHero(def);
    if(name==='planet'){
      showExperienceChrome(false);setPlanetVisibility(true);setMode('natural');setAge(0);document.querySelector('.story-actions').hidden=false;return;
    }
    if(name==='civilization'){
      showExperienceChrome(false);setPlanetVisibility(true);setMode('natural');setAge(.125);document.querySelector('.story-actions').hidden=true;return;
    }
    document.querySelector('.story-actions').hidden=true;showExperienceChrome(true);setAge(0);
    if(name==='orbit'){setPlanetVisibility(true);setMode('natural');setupOrbit()}
    if(name==='moon'){setPlanetVisibility(false);setupMoon()}
    if(name==='solar'){setPlanetVisibility(false);setupSolar()}
    if(name==='earthquakes'){setPlanetVisibility(true);setMode('dark');setupEarthquakes()}
    if(name==='oceans'){setPlanetVisibility(true);setMode('blue');setupOceans()}
    resizeExperience();
  }

  function setupOrbit(){
    setPanel({kicker:'Cataloged objects in Earth orbit',stat:'19,847',statLabel:'visualized orbital objects',card:`<span class="card-label">Orbital perspective</span><strong>One Earth. Many distances.</strong><p>Zoom out to read orbital shells from low Earth orbit to geosynchronous altitude.</p><button data-card-action="satellite">Inspect a satellite</button>`});
    renderPills([pill('All satellites','orbit-all',true),pill('Active only','orbit-active'),pill('Constellations','orbit-constellations'),pill('Crewed','orbit-crewed')]);
    exp.timelineLabel.textContent='Low Earth orbit → geosynchronous orbit';exp.progress.style.width='92%';
  }
  function setupMoon(){
    experienceState.moonMission='overview';experienceState.moonZoom=1;setPanel({kicker:'Average distance from Earth',stat:'384,400 km',statLabel:'our celestial companion',card:`<span class="card-label">Missions & landings</span><strong>Footprints in context.</strong><p>Select a mission below to move across the lunar record.</p>`});
    renderPills([pill('Near side','moon-overview',true),pill('Far side','moon-far'),pill('Apollo 11','moon-apollo11'),pill('Apollo 17','moon-apollo17'),pill('Chang’e 4','moon-change4')]);
    exp.timelineLabel.textContent='Lunar exploration';exp.progress.style.width='42%';
  }
  function setupSolar(){
    experienceState.solarPlanet='earth';setPanel({kicker:'Our solar system',stat:'8 worlds',statLabel:'one star · billions of years in motion',card:`<span class="card-label">Selected world</span><strong>Earth</strong><p>1.00 AU from the Sun · 365.25 day orbital period.</p>`});
    renderPills([pill('Solar System','solar-all',true),pill('Mercury','solar-mercury'),pill('Earth','solar-earth'),pill('Mars','solar-mars'),pill('Jupiter','solar-jupiter'),pill('Saturn','solar-saturn')]);
    exp.timelineLabel.textContent='Orbital time · 01 / 25 / 2026';exp.progress.style.width='18%';
  }
  function setupEarthquakes(){
    setPanel({kicker:'Recorded event visualization',stat:'3,875',statLabel:'events across the displayed period',card:`<span class="card-label">Tectonic signal</span><strong>Plate boundaries emerge.</strong><p>Clusters follow subduction zones, ridges and continental fault systems.</p><button data-card-action="quake">Inspect strongest event</button>`});
    renderPills([pill('All earthquakes','quake-all',true),pill('Pacific rim','quake-pacific'),pill('Japan 2011','quake-japan'),pill('Deep Earth','quake-deep')]);
    exp.timelineLabel.textContent='Through 2025 · magnitude encoded by size';exp.progress.style.width='98%';
  }
  function setupOceans(){
    experienceState.oceanCurrent='global';setPanel({kicker:'Surface currents · modeled view',stat:'One connected ocean',statLabel:'currents link every basin',card:`<span class="card-label">Global circulation</span><strong>Water carries heat.</strong><p>Animated streamlines reveal broad current systems and the connected circulation of the world ocean.</p>`});
    renderPills([pill('Ocean planet','ocean-global',true),pill('Gulf Stream','ocean-gulf'),pill('Pacific','ocean-pacific'),pill('Southern Ocean','ocean-southern')]);
    exp.timelineLabel.textContent='Flow speed';exp.progress.style.width='73%';
  }

  function activatePill(prefix,value){exp.pills.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.expControl===`${prefix}-${value}`))}
  function handleControl(value){
    if(value.startsWith('orbit-')){experienceState.filter=value.slice(6);activatePill('orbit',experienceState.filter);if(experienceState.filter==='crewed')setPanel({kicker:'Crewed orbital layer',stat:'Low Earth orbit',statLabel:'human presence above Earth',card:`<span class="card-label">Crewed systems</span><strong>Humanity in orbit.</strong><p>Highlight the narrow orbital neighborhood occupied by crewed spacecraft and stations.</p>`})}
    if(value.startsWith('moon-')){const m=value.slice(5);experienceState.moonMission=m;activatePill('moon',m);const stories={overview:['Another world. Within reach.','Average distance from Earth','384,400 km','Explore the Moon as a landscape shaped by billions of years of impacts.'],far:['The side we never see.','Synchronous rotation','Far side','The Moon keeps one hemisphere turned away from Earth, revealing a different crustal record.'],apollo11:['One small step. A new record.','20 JUL 1969','Apollo 11','Humans first walked on another world at Mare Tranquillitatis.'],apollo17:['A geologist. Another world.','11 DEC 1972','Apollo 17','Harrison Schmitt explored Taurus–Littrow, bringing field geology to another world.'],change4:['A landing beyond Earth’s view.','03 JAN 2019','Chang’e 4','The first soft landing on the lunar far side opened a new observational perspective.']};const s=stories[m];els.storyTitle.textContent=s[0];setPanel({kicker:s[1],stat:s[2],statLabel:'lunar exploration milestone',card:`<span class="card-label">Mission record</span><strong>${s[0]}</strong><p>${s[3]}</p>`})}
    if(value.startsWith('solar-')){const p=value.slice(6);experienceState.solarPlanet=p==='all'?'earth':p;activatePill('solar',p);const data={mercury:['Mercury','.39 AU','88 days'],earth:['Earth','1.00 AU','365.25 days'],mars:['Mars','1.52 AU','687 days'],jupiter:['Jupiter','5.20 AU','11.86 years'],saturn:['Saturn','9.58 AU','29.45 years']};if(data[experienceState.solarPlanet]){const d=data[experienceState.solarPlanet];setPanel({kicker:'Selected world',stat:d[0],statLabel:`${d[1]} from the Sun`,card:`<span class="card-label">Orbit</span><strong>${d[0]}</strong><p>Approximate orbital period: ${d[2]}.</p>`})}}
    if(value.startsWith('quake-')){experienceState.filter=value.slice(6);activatePill('quake',experienceState.filter);if(experienceState.filter==='japan')setPanel({kicker:'11 MAR 2011 · Tōhoku',stat:'M 9.1',statLabel:'off the Pacific coast of Japan',card:`<span class="card-label">Major event</span><strong>A rupture across a plate boundary.</strong><p>A large subduction-zone earthquake generated destructive shaking and tsunami waves.</p>`})}
    if(value.startsWith('ocean-')){experienceState.oceanCurrent=value.slice(6);activatePill('ocean',experienceState.oceanCurrent);const labels={global:'One connected ocean',gulf:'Gulf Stream',pacific:'Pacific circulation',southern:'Antarctic Circumpolar Current'};setPanel({kicker:'Current focus',stat:labels[experienceState.oceanCurrent],statLabel:'surface-current visualization',card:`<span class="card-label">Moving water</span><strong>${labels[experienceState.oceanCurrent]}</strong><p>Animated paths emphasize broad circulation patterns rather than real-time measurements.</p>`})}
  }

  document.addEventListener('click',e=>{const action=e.target.closest('[data-card-action]')?.dataset.cardAction;if(action==='satellite')setPanel({kicker:'Spacecraft / debris',stat:'STARLINK-33688',statLabel:'example low-Earth-orbit object',card:`<span class="card-label">Spacecraft</span><strong>STARLINK-33688</strong><p>Visualized with a representative low-Earth orbital shell. This demo does not claim live orbital telemetry.</p><dl><dt>Orbit</dt><dd>LEO</dd><dt>Status</dt><dd>Operational example</dd><dt>Layer</dt><dd>Constellation</dd></dl>`});if(action==='quake')handleControl('quake-japan')});
  exp.play.addEventListener('click',()=>{experienceState.playing=!experienceState.playing;exp.play.textContent=experienceState.playing?'Pause':'Play'});

  function resizeExperience(){const dpr=Math.min(devicePixelRatio||1,2);expCanvas.width=Math.round(innerWidth*dpr);expCanvas.height=Math.round(innerHeight*dpr);expCanvas.style.width=`${innerWidth}px`;expCanvas.style.height=`${innerHeight}px`;expCtx.setTransform(dpr,0,0,dpr,0,0)}

  function seeded(n){return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296}}
  const satRand=seeded(29384),satellites=Array.from({length:420},(_,i)=>({ring:i%18,a:satRand()*Math.PI*2,speed:.04+satRand()*.16,tilt:(satRand()-.5)*1.4,scale:.98+satRand()*.85,size:satRand()>.97?2.1:.7}));
  const crRand=seeded(1729),craters=Array.from({length:150},()=>({x:crRand()*2-1,y:crRand()*2-1,r:.006+crRand()*.055,d:crRand()})).filter(c=>c.x*c.x+c.y*c.y<.9);
  const quakePaths=[
    [[60,-150],[50,-130],[38,-123],[22,-106],[8,-84],[-20,-72],[-45,-74],[-55,-68]],
    [[55,160],[45,150],[35,140],[25,135],[15,125],[0,120],[-15,120],[-30,165],[-45,175]],
    [[-5,100],[-8,115],[-12,130],[-15,145],[-20,155]],
    [[65,-20],[45,-30],[20,-35],[0,-25],[-20,-15],[-45,-10]],
    [[38,20],[38,35],[35,50],[30,65],[28,80],[30,95]]
  ];
  const qr=seeded(9001),quakes=[];quakePaths.forEach((path,pi)=>{for(let s=0;s<110;s++){const a=Math.floor(qr()*(path.length-1)),t=qr();quakes.push({lat:lerp(path[a][0],path[a+1][0],t)+(qr()-.5)*6,lon:interpolateLon(path[a][1],path[a+1][1],t)+(qr()-.5)*6,m:2.5+Math.pow(qr(),3)*6.7,depth:qr()*700,path:pi})}});
  const currents={
    gulf:[[18,-82],[25,-78],[32,-73],[40,-62],[48,-42],[54,-22],[57,-5]],
    pacific:[[18,145],[24,160],[30,178],[34,-165],[32,-145],[26,-130],[18,-118]],
    southern:[[-52,-170],[-54,-120],[-52,-70],[-55,-20],[-52,35],[-55,90],[-54,145],[-52,179]],
    brazil:[[-8,-34],[-18,-39],[-30,-45],[-40,-50]],
    agulhas:[[-35,20],[-38,28],[-41,38],[-36,48],[-28,55]],
    kuroshio:[[12,128],[22,132],[30,138],[38,145],[43,158]]
  };
  const planets=[['Mercury',.12,2.4,'#b9b4aa'],['Venus',.18,1.8,'#d5aa69'],['Earth',.25,1.4,'#8ac2d7'],['Mars',.32,1.15,'#c56e4b'],['Jupiter',.46,.62,'#d8b692'],['Saturn',.61,.45,'#d2c195'],['Uranus',.76,.32,'#8ac8c9'],['Neptune',.88,.25,'#5575c6']];

  function clearExp(){expCtx.clearRect(0,0,innerWidth,innerHeight)}
  function drawOrbit(t){clearExp();const L=getSphereLayout(),x=expCtx; x.save();x.strokeStyle='rgba(198,231,244,.10)';x.lineWidth=1;for(let i=0;i<18;i++){const s=1.16+i*.055;x.beginPath();x.ellipse(L.cx,L.cy,L.radius*s,L.radius*(.22+.028*(i%7)),(i-9)*.16,0,Math.PI*2);x.stroke()}for(const s of satellites){if(experienceState.filter==='crewed'&&s.ring>2)continue;if(experienceState.filter==='active'&&s.ring%3===0)continue;if(experienceState.filter==='constellations'&&s.ring%2)continue;const rr=L.radius*(1.18+s.ring*.048)*s.scale,ang=s.a+(experienceState.playing?t*s.speed:experienceState.phase*s.speed);const ca=Math.cos(s.tilt),sa=Math.sin(s.tilt),px=Math.cos(ang)*rr,py=Math.sin(ang)*rr*.27;const xx=L.cx+px*ca-py*sa,yy=L.cy+px*sa+py*ca;x.fillStyle=s.size>1?'rgba(233,250,255,.9)':'rgba(190,226,239,.28)';x.fillRect(xx,yy,s.size,s.size)}x.restore()}
  function drawMoon(t){clearExp();const x=expCtx,w=innerWidth,h=innerHeight,mobile=w<=900,r=Math.min(w*(mobile?.39:.31),h*(mobile?.26:.42))*experienceState.moonZoom,cx=mobile?w*.56:w*.64,cy=mobile?h*.31:h*.48;x.save();x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.clip();const g=x.createRadialGradient(cx-r*.32,cy-r*.38,r*.06,cx,cy,r);g.addColorStop(0,'#d8d4c9');g.addColorStop(.48,'#99978f');g.addColorStop(1,'#4a4b49');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);for(const c of craters){const px=cx+c.x*r,py=cy+c.y*r,rr=c.r*r*(experienceState.moonMission==='far'?1.2:1);x.beginPath();x.arc(px,py,rr,0,Math.PI*2);x.fillStyle=`rgba(${c.d>.6?55:190},${c.d>.6?56:187},${c.d>.6?54:178},${.10+c.d*.16})`;x.fill();x.strokeStyle='rgba(245,242,228,.08)';x.stroke()}x.restore();const er=r*.12,ex=cx-r*1.15,ey=cy-r*.68;const eg=x.createRadialGradient(ex-er*.3,ey-er*.3,2,ex,ey,er);eg.addColorStop(0,'#87bad2');eg.addColorStop(.5,'#225b78');eg.addColorStop(1,'#07141d');x.fillStyle=eg;x.beginPath();x.arc(ex,ey,er,0,Math.PI*2);x.fill();if(experienceState.moonMission!=='overview'&&experienceState.moonMission!=='far'){x.fillStyle='#e7f7ff';x.beginPath();x.arc(cx+r*.13,cy+r*.12,3,0,Math.PI*2);x.fill();x.font='10px Arial';x.fillStyle='rgba(255,255,255,.72)';x.fillText(experienceState.moonMission.replace('apollo','Apollo ').replace('change4','Chang’e 4'),cx+r*.13+8,cy+r*.12+3)}}
  function drawSolar(t){clearExp();const x=expCtx,w=innerWidth,h=innerHeight,mobile=w<=900,cx=mobile?w*.52:w*.61,cy=mobile?h*.34:h*.48,base=Math.min(w,h)*(mobile?.28:.44);x.save();x.strokeStyle='rgba(200,225,236,.13)';x.lineWidth=1;for(const p of planets){x.beginPath();x.ellipse(cx,cy,base*p[1]*1.38,base*p[1]*.42,-.18,0,Math.PI*2);x.stroke()}const sg=x.createRadialGradient(cx-4,cy-4,2,cx,cy,18);sg.addColorStop(0,'#fff2b7');sg.addColorStop(.35,'#f7ad38');sg.addColorStop(1,'rgba(238,104,12,.05)');x.fillStyle=sg;x.beginPath();x.arc(cx,cy,21,0,Math.PI*2);x.fill();planets.forEach((p,i)=>{const ang=.4+i*.83+(experienceState.playing?t*.08*p[2]:experienceState.phase*.08*p[2]),rx=base*p[1]*1.38,ry=base*p[1]*.42,xx=cx+Math.cos(ang)*rx*Math.cos(.18)-Math.sin(ang)*ry*Math.sin(-.18),yy=cy+Math.cos(ang)*rx*Math.sin(-.18)+Math.sin(ang)*ry*Math.cos(.18),sel=p[0].toLowerCase()===experienceState.solarPlanet;x.fillStyle=p[3];x.beginPath();x.arc(xx,yy,sel?7:(i>3?5:3),0,Math.PI*2);x.fill();if(sel){x.strokeStyle='rgba(221,246,255,.5)';x.beginPath();x.arc(xx,yy,12,0,Math.PI*2);x.stroke();x.fillStyle='rgba(255,255,255,.68)';x.font='9px Arial';x.fillText(p[0],xx+14,yy+3)}});x.restore()}
  function drawQuakes(t){clearExp();const x=expCtx;for(const q of quakes){if(experienceState.filter==='pacific'&&q.path!==0&&q.path!==1&&q.path!==2)continue;if(experienceState.filter==='deep'&&q.depth<350)continue;const p=projectGeo(q.lat,q.lon);if(!p)continue;const alpha=.23+Math.min(.55,(q.m-2.5)/8);x.fillStyle=q.depth>350?`rgba(186,126,239,${alpha})`:q.m>6?`rgba(255,185,78,${alpha})`:`rgba(232,232,148,${alpha})`;x.beginPath();x.arc(p.x,p.y,Math.max(.7,(q.m-2)*.42),0,Math.PI*2);x.fill()}if(experienceState.filter==='japan'){const p=projectGeo(38.3,142.4);if(p){const pulse=8+Math.sin(t*4)*4;x.strokeStyle='rgba(255,201,104,.8)';x.lineWidth=1.2;x.beginPath();x.arc(p.x,p.y,pulse,0,Math.PI*2);x.stroke()}}}
  function samplePath(path,t){const n=path.length-1,s=Math.min(n-1,Math.floor(t*n)),u=t*n-s;return[lerp(path[s][0],path[s+1][0],u),interpolateLon(path[s][1],path[s+1][1],u)]}
  function drawCurrentPath(path,color,t,particles=16){const x=expCtx;x.strokeStyle=color;x.lineWidth=1;x.beginPath();let started=false;for(let i=0;i<=80;i++){const ll=samplePath(path,i/80),p=projectGeo(ll[0],ll[1]);if(!p){started=false;continue}if(!started){x.moveTo(p.x,p.y);started=true}else x.lineTo(p.x,p.y)}x.stroke();for(let i=0;i<particles;i++){const u=(i/particles+(experienceState.playing?t*.025:experienceState.phase*.025))%1,ll=samplePath(path,u),p=projectGeo(ll[0],ll[1]);if(!p)continue;x.fillStyle='rgba(167,245,240,.72)';x.beginPath();x.arc(p.x,p.y,1.4,0,Math.PI*2);x.fill()}}
  function drawOceans(t){clearExp();const focus=experienceState.oceanCurrent,all=focus==='global';Object.entries(currents).forEach(([name,path])=>{if(!all&&name!==focus&&!(focus==='pacific'&&name==='kuroshio'))return;drawCurrentPath(path,all?'rgba(110,224,221,.26)':'rgba(142,247,240,.64)',t,all?11:22)})}
  function renderExperience(now){const dt=Math.min(.05,(now-experienceState.last)/1000);experienceState.last=now;if(experienceState.playing)experienceState.phase+=dt;const t=experienceState.phase;switch(state.experience){case'orbit':drawOrbit(t);break;case'moon':drawMoon(t);break;case'solar':drawSolar(t);break;case'earthquakes':drawQuakes(t);break;case'oceans':drawOceans(t);break;default:clearExp()}requestAnimationFrame(renderExperience)}

  expCanvas.addEventListener('wheel',e=>{if(state.experience!=='moon')return;e.preventDefault();experienceState.moonZoom=clamp(experienceState.moonZoom-Math.sign(e.deltaY)*.08,.72,1.6)},{passive:false});
  els.brandButton.addEventListener('click',()=>routeExperience('planet'));
  window.addEventListener('resize',resizeExperience);
  rebuildNavigation();resizeExperience();routeExperience('planet');requestAnimationFrame(renderExperience);
})();
