/* Earth Convergence Engine
   Clean-room consolidation of the reusable capabilities identified across:
   Earth History Explorer, Moonstake, Orbital Speeders, Infinite City,
   Agent Atlas / Census Molty, Where Is Mr. Kim, deterministic procedural
   animation, Hypit semantic timing, and Orshot-style motion composition.
   This module deliberately excludes land sales, racing economies, leaderboards,
   surveillance collection, and unrelated product surfaces. */
(function(){
  'use strict';

  var VERSION = '2026.09-convergence-1';
  var EARTH_RADIUS_KM = 6371;
  var MU_KM3_S2 = 398600.4418;
  var layerRegistry = new Map();
  var activeLayers = new Set();
  var runtime = {
    drawerOpen:false,
    tab:'layers',
    selectedPlace:null,
    search:'',
    dataTime:1,
    dataPlaying:false,
    region:'global',
    hoverPlace:null,
    events:[],
    last:performance.now(),
    sim:{ enabled:false, altitudeKm:420, inclinationDeg:51.6, elapsed:0, playing:true, speed:1, track:false },
    story:{ playing:false, time:0, speed:1, scene:-1, lastScene:-1 },
    pointer:null
  };

  var CITIES = [
    {id:'cairo',name:'Cairo',region:'Africa',lat:30.0444,lon:31.2357,detail:'Nile corridor · layered ancient and modern city history',time:.08},
    {id:'lagos',name:'Lagos',region:'Africa',lat:6.5244,lon:3.3792,detail:'Coastal megacity · Gulf of Guinea',time:.72},
    {id:'london',name:'London',region:'Europe',lat:51.5072,lon:-0.1276,detail:'Thames crossing · Roman to global city',time:.20},
    {id:'istanbul',name:'Istanbul',region:'Europe / Asia',lat:41.0082,lon:28.9784,detail:'Bosphorus crossing · continental hinge',time:.18},
    {id:'mumbai',name:'Mumbai',region:'Asia',lat:19.0760,lon:72.8777,detail:'Arabian Sea port · dense coastal metropolis',time:.52},
    {id:'beijing',name:'Beijing',region:'Asia',lat:39.9042,lon:116.4074,detail:'North China Plain · long urban continuity',time:.28},
    {id:'tokyo',name:'Tokyo',region:'Asia',lat:35.6762,lon:139.6503,detail:'Pacific megacity · rail-centered urban fabric',time:.63},
    {id:'new-york',name:'New York',region:'North America',lat:40.7128,lon:-74.0060,detail:'Atlantic harbor · global metropolitan network',time:.55},
    {id:'mexico-city',name:'Mexico City',region:'North America',lat:19.4326,lon:-99.1332,detail:'High-basin metropolis · pre-Columbian urban lineage',time:.38},
    {id:'sao-paulo',name:'São Paulo',region:'South America',lat:-23.5505,lon:-46.6333,detail:'Continental megacity · industrial and services hub',time:.66},
    {id:'sydney',name:'Sydney',region:'Oceania',lat:-33.8688,lon:151.2093,detail:'Pacific harbor city · coastal urban system',time:.58}
  ];

  var MOON_LANDMARKS = [
    {id:'apollo11',name:'Apollo 11',region:'Mare Tranquillitatis',lat:.674,lon:23.473,detail:'First crewed lunar landing · 20 July 1969',control:'moon-apollo11'},
    {id:'apollo17',name:'Apollo 17',region:'Taurus–Littrow',lat:20.191,lon:30.772,detail:'Final Apollo landing · field geology on the Moon',control:'moon-apollo17'},
    {id:'change4',name:'Chang’e 4',region:'Von Kármán crater',lat:-45.457,lon:177.589,detail:'First soft landing on the lunar far side',control:'moon-change4'},
    {id:'tycho',name:'Tycho',region:'Southern highlands',lat:-43.31,lon:-11.36,detail:'Young ray crater · about 85 km across'},
    {id:'copernicus',name:'Copernicus',region:'Oceanus Procellarum',lat:9.62,lon:-20.08,detail:'Prominent impact crater and ray system'},
    {id:'imbrium',name:'Mare Imbrium',region:'Near side',lat:32.8,lon:-15.6,detail:'Large basaltic plain inside the Imbrium basin'},
    {id:'shackleton',name:'Shackleton',region:'Lunar south pole',lat:-89.90,lon:0,detail:'Polar crater with persistently shadowed terrain'},
    {id:'aristarchus',name:'Aristarchus',region:'Oceanus Procellarum',lat:23.73,lon:-47.49,detail:'High-albedo crater and volcanic province'}
  ];

  var SEISMIC = [
    {id:'tohoku',name:'Tōhoku 2011',lat:38.3,lon:142.4,m:9.1,time:.94},
    {id:'sumatra',name:'Sumatra–Andaman 2004',lat:3.316,lon:95.854,m:9.1,time:.82},
    {id:'valdivia',name:'Valdivia 1960',lat:-38.24,lon:-73.05,m:9.5,time:.42},
    {id:'alaska',name:'Alaska 1964',lat:61.02,lon:-147.65,m:9.2,time:.47},
    {id:'maule',name:'Maule 2010',lat:-35.91,lon:-72.73,m:8.8,time:.92},
    {id:'nepal',name:'Gorkha 2015',lat:28.23,lon:84.73,m:7.8,time:.97},
    {id:'turkey',name:'Türkiye–Syria 2023',lat:37.17,lon:37.03,m:7.8,time:1}
  ];

  var OCEAN_PATHS = {
    gulf:[[18,-82],[25,-78],[32,-73],[40,-62],[48,-42],[54,-22],[57,-5]],
    kuroshio:[[12,128],[22,132],[30,138],[38,145],[43,158]],
    acc:[[-52,-170],[-54,-120],[-52,-70],[-55,-20],[-52,35],[-55,90],[-54,145],[-52,179]],
    agulhas:[[-35,20],[-38,28],[-41,38],[-36,48],[-28,55]]
  };

  var STORY_SCENES = [
    {at:0,duration:7,exp:'planet',label:'Earth through time',age:750,camera:{yaw:-1.15,pitch:.16,zoom:.92},copy:'Begin with a reconstructed Earth and move forward through the planetary record.'},
    {at:7,duration:7,exp:'civilization',label:'Human Earth',age:.125,camera:{yaw:-.62,pitch:.08,zoom:1.08},copy:'Follow human dispersal, then reveal cities as persistent geographic anchors.'},
    {at:14,duration:7,exp:'orbit',control:'orbit-constellations',label:'Near Earth',camera:{yaw:-.18,pitch:.02,zoom:.96},copy:'Move from the surface into orbital infrastructure and predicted trajectories.'},
    {at:21,duration:7,exp:'moon',control:'moon-apollo11',label:'Moon',place:'apollo11',camera:{yaw:.12,pitch:.04,zoom:1.03},copy:'Cross to the lunar surface and anchor exploration in real mission landmarks.'},
    {at:28,duration:7,exp:'earthquakes',control:'quake-japan',label:'Living Earth',camera:{yaw:-.52,pitch:.10,zoom:1.08},copy:'Read tectonic events as spatial signals across a moving planet.'},
    {at:35,duration:7,exp:'oceans',control:'ocean-gulf',label:'Connected ocean',camera:{yaw:.66,pitch:-.08,zoom:1.08},copy:'Trace circulation as animated pathways carrying heat between basins.'},
    {at:42,duration:7,exp:'solar',control:'solar-earth',label:'Perspective',camera:{yaw:0,pitch:0,zoom:.90},copy:'End by placing Earth inside the larger orbital system.'}
  ];
  var STORY_DURATION = STORY_SCENES.reduce(function(m,s){return Math.max(m,s.at+s.duration);},0);

  var canvas, ctx, drawer, trigger, toast;

  function seeded(seed){
    var n=seed>>>0;
    return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  }
  function stringSeed(value){
    var h=2166136261,s=String(value);
    for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function cityNeighborhoods(id){
    return {
      cairo:['Historic Cairo','Zamalek','Heliopolis'],
      london:['Westminster','South Bank','City of London'],
      'new-york':['Lower Manhattan','Brooklyn Waterfront','Queens'],
      tokyo:['Chiyoda','Shibuya','Asakusa'],
      mumbai:['Fort','Bandra','Colaba'],
      'sao-paulo':['Centro','Paulista','Pinheiros']
    }[id]||['Historic core','Urban center','Regional corridor'];
  }

  function projection(lat,lon){
    try{return projectGeo(lat,lon);}catch(e){return null;}
  }

  function lineSample(path,t){
    var n=path.length-1;
    var scaled=Math.min(n-.000001,Math.max(0,t*n));
    var i=Math.floor(scaled),u=scaled-i;
    var a=path[i],b=path[Math.min(i+1,n)];
    var d=b[1]-a[1];
    if(d>180)d-=360;
    if(d<-180)d+=360;
    var lon=a[1]+d*u;
    if(lon>180)lon-=360;
    if(lon<-180)lon+=360;
    return [a[0]+(b[0]-a[0])*u,lon];
  }

  function visibleByTime(item){return item.time===undefined || item.time<=runtime.dataTime+.0001;}
  function regionBucket(item){
    var named=String(item.region||'').toLowerCase();
    if(named.indexOf('north america')>=0||named.indexOf('south america')>=0)return 'americas';
    if(named.indexOf('africa')>=0||named.indexOf('middle east')>=0)return 'africa-middle-east';
    if(named.indexOf('europe')>=0)return 'europe';
    if(named.indexOf('asia')>=0||named.indexOf('oceania')>=0)return 'asia-pacific';
    var lon=Number(item.lon)||0,lat=Number(item.lat)||0;
    if(lon>=60 || lon<=-150)return 'asia-pacific';
    if(lon<-25)return 'americas';
    if(lat>=25 && lon>=-25 && lon<60)return 'europe';
    return 'africa-middle-east';
  }
  function visibleByRegion(item){return runtime.region==='global' || regionBucket(item)===runtime.region;}
  function visibleFeature(item){return visibleByTime(item)&&visibleByRegion(item);}

  function registerLayer(id,spec){
    layerRegistry.set(id,Object.assign({id:id,label:id,description:'',kind:'points'},spec||{}));
    renderLayerButtons();
    updateMetrics();
  }

  function setLayer(id,on){
    if(!layerRegistry.has(id))return false;
    if(on===undefined)on=!activeLayers.has(id);
    if(on)activeLayers.add(id);else activeLayers.delete(id);
    renderLayerButtons();
    updateMetrics();
    return activeLayers.has(id);
  }

  function clearLayers(){
    activeLayers.clear();
    renderLayerButtons();
    updateMetrics();
  }

  function drawDot(p,r,alpha){
    if(!p)return;
    ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);
    ctx.fillStyle='rgba(211,247,248,'+alpha+')';ctx.fill();
    ctx.beginPath();ctx.arc(p.x,p.y,r+4,0,Math.PI*2);
    ctx.strokeStyle='rgba(132,226,232,'+(alpha*.28)+')';ctx.lineWidth=1;ctx.stroke();
  }

  function drawLabel(p,title,sub){
    if(!p)return;
    ctx.save();
    ctx.font='11px system-ui, -apple-system, sans-serif';
    var w=Math.max(ctx.measureText(title).width,sub?ctx.measureText(sub).width:0)+18;
    var x=p.x+10,y=p.y-17;
    ctx.fillStyle='rgba(3,11,14,.82)';ctx.strokeStyle='rgba(203,242,245,.18)';ctx.lineWidth=1;
    roundRect(ctx,x,y,w,sub?37:23,8);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(237,250,251,.92)';ctx.fillText(title,x+9,y+14);
    if(sub){ctx.font='9px system-ui, -apple-system, sans-serif';ctx.fillStyle='rgba(220,240,242,.54)';ctx.fillText(sub,x+9,y+28);}
    ctx.restore();
  }

  function roundRect(c,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
  }

  function drawCities(){
    CITIES.forEach(function(city){
      if(!visibleFeature(city))return;
      var p=projection(city.lat,city.lon);if(!p)return;
      drawDot(p,2.4,.72);
    });
  }

  function drawUrbanInset(){
    var city=runtime.selectedPlace;
    if(!city||city.type!=='city'||!activeLayers.has('cities')||state.zoom<1.12)return;
    var p=projection(city.lat,city.lon);if(!p)return;
    var rand=seeded(stringSeed(city.id)),dark=state.mode==='dark';
    ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,58,0,Math.PI*2);ctx.clip();
    ctx.fillStyle=dark?'rgba(4,15,21,.28)':'rgba(219,238,235,.035)';ctx.fillRect(p.x-58,p.y-58,116,116);
    for(var i=0;i<14;i++){
      var a=rand()*Math.PI,r=18+rand()*46,offset=(rand()-.5)*42;
      ctx.beginPath();
      ctx.moveTo(p.x-Math.cos(a)*r+Math.sin(a)*offset,p.y-Math.sin(a)*r-Math.cos(a)*offset);
      ctx.lineTo(p.x+Math.cos(a)*r+Math.sin(a)*offset,p.y+Math.sin(a)*r-Math.cos(a)*offset);
      ctx.strokeStyle=dark?'rgba(210,242,178,'+(0.08+rand()*.12)+')':'rgba(205,239,241,'+(0.06+rand()*.1)+')';
      ctx.lineWidth=rand()>.82?1.4:.65;ctx.stroke();
    }
    ctx.restore();
    var names=cityNeighborhoods(city.id);
    names.forEach(function(name,i){
      var angle=(-.9+i*.9),r=24+i*8,q={x:p.x+Math.cos(angle)*r,y:p.y+Math.sin(angle)*r};
      ctx.beginPath();ctx.arc(q.x,q.y,1.4,0,Math.PI*2);ctx.fillStyle=dark?'rgba(232,250,191,.72)':'rgba(211,246,248,.64)';ctx.fill();
      if(state.zoom>1.28){ctx.font='8px system-ui, sans-serif';ctx.fillStyle='rgba(225,246,247,.52)';ctx.fillText(name,q.x+4,q.y+3);}
    });
  }

  function drawMigration(){
    if(typeof MIGRATION_ROUTES==='undefined')return;
    ctx.save();ctx.lineCap='round';ctx.lineWidth=1.2;
    MIGRATION_ROUTES.forEach(function(route,idx){
      var start=route.startMa||0;
      var normalized=Math.max(0,Math.min(1,(runtime.dataTime-(idx/(MIGRATION_ROUTES.length+3)))*1.7));
      if(normalized<=0)return;
      ctx.beginPath();var started=false;
      for(var i=0;i<=50;i++){
        var u=(i/50)*normalized;
        var lat=route.from[0]+(route.to[0]-route.from[0])*u;
        var d=route.to[1]-route.from[1];if(d>180)d-=360;if(d<-180)d+=360;
        var lon=route.from[1]+d*u;if(lon>180)lon-=360;if(lon<-180)lon+=360;
        var p=projection(lat,lon);
        if(!p){started=false;continue;}
        if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle='rgba(198,238,242,'+(0.18+0.34*normalized)+')';ctx.stroke();
    });
    ctx.restore();
  }

  function drawSeismic(){
    SEISMIC.forEach(function(q){
      if(!visibleFeature(q))return;
      var p=projection(q.lat,q.lon);if(!p)return;
      var r=2+(q.m-7)*2.1;
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);
      ctx.fillStyle='rgba(244,205,132,.58)';ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,r+5,0,Math.PI*2);
      ctx.strokeStyle='rgba(244,205,132,.2)';ctx.stroke();
    });
  }

  function heatPoints(){
    return CITIES.concat(SEISMIC).filter(visibleFeature).map(function(item){return {item:item,p:projection(item.lat,item.lon)};}).filter(function(x){return !!x.p;});
  }

  function drawHeatmap(){
    ctx.save();ctx.globalCompositeOperation='lighter';
    heatPoints().forEach(function(entry){
      var p=entry.p,r=entry.item.m?28+entry.item.m*2:26;
      var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
      g.addColorStop(0,'rgba(111,224,231,.20)');
      g.addColorStop(.45,'rgba(102,198,224,.10)');
      g.addColorStop(1,'rgba(64,131,168,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
    });
    ctx.restore();
  }

  function drawClusters(){
    var bins=new Map();
    CITIES.concat(SEISMIC).filter(visibleFeature).forEach(function(item){
      var p=projection(item.lat,item.lon);if(!p)return;
      var key=Math.floor(p.x/90)+':'+Math.floor(p.y/90);
      var b=bins.get(key)||{x:0,y:0,n:0};b.x+=p.x;b.y+=p.y;b.n++;bins.set(key,b);
    });
    bins.forEach(function(b){
      var x=b.x/b.n,y=b.y/b.n,r=7+Math.min(12,b.n*1.8);
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(7,24,30,.82)';ctx.fill();
      ctx.strokeStyle='rgba(164,237,241,.45)';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='rgba(234,252,253,.9)';ctx.font='10px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(b.n),x,y);
    });
    ctx.textAlign='start';ctx.textBaseline='alphabetic';
  }

  function drawEvents(){
    runtime.events.filter(visibleFeature).forEach(function(event){
      var p=projection(event.lat,event.lon);if(!p)return;
      var age=Math.max(0,Math.min(1,1-Math.abs(runtime.dataTime-event.time)*3));
      var r=2.4+(event.weight||1)*1.6;
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle='rgba(245,225,156,'+(0.35+age*.4)+')';ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,r+5+Math.sin(runtime.sim.elapsed*2+event.phase)*2,0,Math.PI*2);ctx.strokeStyle='rgba(245,225,156,'+(0.08+age*.16)+')';ctx.stroke();
    });
  }

  function ingestEvent(input){
    input=input||{};
    var lat=Number(input.lat),lon=Number(input.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)throw new Error('Event requires valid lat/lon');
    var event={
      id:String(input.id||('event-'+(runtime.events.length+1))),
      name:String(input.name||input.label||'Event'),
      region:String(input.region||''),
      lat:lat,lon:lon,
      time:Number.isFinite(Number(input.time))?Math.max(0,Math.min(1,Number(input.time))):runtime.dataTime,
      weight:Math.max(.25,Math.min(4,Number(input.weight)||1)),
      phase:seeded(stringSeed(String(input.id||input.label||runtime.events.length)))()*Math.PI*2,
      type:'event'
    };
    runtime.events.push(event);if(runtime.events.length>500)runtime.events.splice(0,runtime.events.length-500);
    updateMetrics();return Object.assign({},event);
  }

  function drawOcean(){
    Object.keys(OCEAN_PATHS).forEach(function(name,pi){
      var path=OCEAN_PATHS[name];ctx.beginPath();var started=false;
      for(var i=0;i<=70;i++){
        var u=i/70,p=projection.apply(null,lineSample(path,u));
        if(!p){started=false;continue;}
        if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle='rgba(132,238,233,.26)';ctx.lineWidth=1;ctx.stroke();
      for(var j=0;j<8;j++){
        var phase=(j/8+runtime.sim.elapsed*.003+pi*.07)%1;
        var pp=projection.apply(null,lineSample(path,phase));if(!pp)continue;
        ctx.beginPath();ctx.arc(pp.x,pp.y,1.5,0,Math.PI*2);ctx.fillStyle='rgba(173,250,244,.68)';ctx.fill();
      }
    });
  }

  function drawGroundTrack(){
    ctx.save();ctx.beginPath();var started=false;
    var inc=runtime.sim.inclinationDeg*Math.PI/180;
    for(var i=0;i<=140;i++){
      var u=i/140,theta=u*Math.PI*4+runtime.sim.elapsed*.1;
      var lat=Math.asin(Math.sin(inc)*Math.sin(theta))*180/Math.PI;
      var lon=((theta*180/Math.PI*1.08-runtime.sim.elapsed*1.2+540)%360)-180;
      var p=projection(lat,lon);
      if(!p){started=false;continue;}
      if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle='rgba(194,236,247,.34)';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  }

  function moonPosition(place){
    var w=innerWidth,h=innerHeight,mobile=w<=900;
    var r=Math.min(w*(mobile?.39:.31),h*(mobile?.26:.42));
    var cx=mobile?w*.56:w*.64,cy=mobile?h*.31:h*.48;
    var lon=place.lon,lat=place.lat;
    var far=Math.abs(lon)>90;
    var x=cx+r*(Math.max(-1,Math.min(1,lon/180))*.82);
    var y=cy-r*(Math.max(-1,Math.min(1,lat/90))*.82);
    return {x:x,y:y,visible:runtime.selectedPlace && runtime.selectedPlace.id===place.id ? true : !far};
  }

  function drawSelected(){
    var place=runtime.selectedPlace||runtime.hoverPlace;if(!place)return;
    var p=null;
    if(place.type==='moon'){
      p=moonPosition(place);
      if(!p.visible && state.experience==='moon')return;
    }else if(place.lat!==undefined){
      p=projection(place.lat,place.lon);
    }
    if(!p)return;
    var pulse=5+Math.sin(runtime.sim.elapsed*2.6)*1.8;
    ctx.beginPath();ctx.arc(p.x,p.y,pulse,0,Math.PI*2);ctx.strokeStyle=runtime.selectedPlace&&runtime.selectedPlace.id===place.id?'rgba(230,255,255,.9)':'rgba(200,240,243,.46)';ctx.lineWidth=1.4;ctx.stroke();
    ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,Math.PI*2);ctx.fillStyle='rgba(238,255,255,.95)';ctx.fill();
    drawLabel(p,place.name,place.region||'');
  }

  function orbitPeriodSeconds(altitudeKm){
    var a=EARTH_RADIUS_KM+altitudeKm;
    return 2*Math.PI*Math.sqrt((a*a*a)/MU_KM3_S2);
  }

  function gravityAt(x,y){
    var r=Math.hypot(x,y)||1,f=-MU_KM3_S2/(r*r*r);
    return {x:x*f,y:y*f};
  }

  function predictOrbit(altitudeKm,samples){
    samples=Math.max(24,Math.min(720,Math.round(samples||180)));
    var radius=EARTH_RADIUS_KM+Math.max(160,Number(altitudeKm)||420);
    var period=orbitPeriodSeconds(radius-EARTH_RADIUS_KM),dt=period/samples;
    var x=radius,y=0,vx=0,vy=Math.sqrt(MU_KM3_S2/radius),points=[{x:x,y:y,t:0}];
    var a=gravityAt(x,y);
    for(var i=1;i<=samples;i++){
      x+=vx*dt+.5*a.x*dt*dt;y+=vy*dt+.5*a.y*dt*dt;
      var next=gravityAt(x,y);
      vx+=.5*(a.x+next.x)*dt;vy+=.5*(a.y+next.y)*dt;a=next;
      points.push({x:x,y:y,t:i*dt});
    }
    return {periodSeconds:period,radiusKm:radius,points:points};
  }

  function drawOrbitSimulation(){
    if(!runtime.sim.enabled || state.experience!=='orbit')return;
    var L=getSphereLayout(),alt=runtime.sim.altitudeKm;
    var normalized=Math.min(1.8,.23+alt/42000);
    var rx=L.radius*(1.18+normalized*.55),ry=rx*(.17+.22*Math.cos(runtime.sim.inclinationDeg*Math.PI/180));
    var tilt=-.22+runtime.sim.inclinationDeg/180*.55;
    var prediction=predictOrbit(alt,180),radius=prediction.radiusKm;
    ctx.save();ctx.translate(L.cx,L.cy);ctx.rotate(tilt);
    ctx.beginPath();
    prediction.points.forEach(function(point,i){
      var sx=point.x/radius*rx,sy=point.y/radius*ry;
      if(i===0)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);
    });
    ctx.strokeStyle='rgba(207,244,250,.48)';ctx.lineWidth=1.2;ctx.stroke();
    var period=prediction.periodSeconds,phase=((runtime.sim.elapsed*runtime.sim.speed)%period)/period;
    var index=Math.min(prediction.points.length-1,Math.floor(phase*(prediction.points.length-1))),current=prediction.points[index];
    var sx=current.x/radius*rx,sy=current.y/radius*ry;
    ctx.beginPath();ctx.arc(sx,sy,3,0,Math.PI*2);ctx.fillStyle='rgba(245,255,255,.96)';ctx.fill();ctx.restore();
  }

  function drawStoryParticles(){
    if(!runtime.story.playing && runtime.story.time===0)return;
    var scene=sceneAt(runtime.story.time),local=scene?((runtime.story.time-scene.at)/scene.duration):0;
    var edge=Math.min(local,1-local);
    if(edge>.16)return;
    var amount=(.16-edge)/.16;
    var rand=seeded((runtime.story.scene+7)*991);
    ctx.save();
    for(var i=0;i<36;i++){
      var x=rand()*innerWidth,y=rand()*innerHeight,r=.4+rand()*1.4;
      ctx.fillStyle='rgba(212,246,247,'+(amount*(.08+rand()*.18))+')';
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function sceneAt(t){
    for(var i=STORY_SCENES.length-1;i>=0;i--)if(t>=STORY_SCENES[i].at)return STORY_SCENES[i];
    return STORY_SCENES[0];
  }

  function sceneIndexAt(t){
    for(var i=STORY_SCENES.length-1;i>=0;i--)if(t>=STORY_SCENES[i].at)return i;
    return 0;
  }

  function lerp(a,b,t){return a+(b-a)*t;}
  function lerpAngle(a,b,t){var d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;return a+d*t;}
  function applyStoryCamera(t){
    var idx=sceneIndexAt(t),scene=STORY_SCENES[idx],next=STORY_SCENES[Math.min(idx+1,STORY_SCENES.length-1)];
    if(!scene.camera||typeof state==='undefined')return;
    var u=Math.max(0,Math.min(1,(t-scene.at)/Math.max(.001,scene.duration))),e=u*u*(3-2*u);
    var a=scene.camera,b=next.camera||a;
    state.yaw=lerpAngle(a.yaw,b.yaw,e);state.pitch=lerp(a.pitch,b.pitch,e);state.targetZoom=lerp(a.zoom,b.zoom,e);
  }

  function clickExperience(name){
    var b=document.querySelector('[data-experience-nav="'+name+'"]');
    if(b && state.experience!==name)b.click();
  }

  function clickControl(value){
    var b=document.querySelector('[data-exp-control="'+value+'"]');
    if(b && !b.classList.contains('active'))b.click();
  }

  function applyStoryScene(index){
    if(index<0||index>=STORY_SCENES.length)return;
    var scene=STORY_SCENES[index];
    runtime.story.scene=index;
    document.getElementById('app').dataset.convergenceStory='true';
    clickExperience(scene.exp);
    if(scene.place){
      var selected=MOON_LANDMARKS.find(function(x){return x.id===scene.place;});
      if(selected)selectPlace(Object.assign({type:'moon'},selected),false);
    }
    setTimeout(function(){
      if(scene.age!==undefined && typeof setAge==='function')setAge(scene.age);
      if(scene.control)clickControl(scene.control);
      refreshStoryUI();
    },0);
  }

  function renderAt(seconds){
    runtime.story.time=Math.max(0,Math.min(STORY_DURATION,Number(seconds)||0));
    var idx=sceneIndexAt(runtime.story.time);
    runtime.story.lastScene=idx;applyStoryScene(idx);applyStoryCamera(runtime.story.time);
    refreshStoryUI();
    return snapshot();
  }

  function snapshot(){
    return {
      version:VERSION,
      experience:state.experience,
      activeLayers:Array.from(activeLayers).sort(),
      dataTime:Number(runtime.dataTime.toFixed(4)),
      region:runtime.region,
      eventCount:runtime.events.length,
      selectedPlace:runtime.selectedPlace?runtime.selectedPlace.id:null,
      camera:{yaw:Number(state.yaw.toFixed(5)),pitch:Number(state.pitch.toFixed(5)),targetZoom:Number(state.targetZoom.toFixed(5))},
      orbit:{enabled:runtime.sim.enabled,altitudeKm:runtime.sim.altitudeKm,inclinationDeg:runtime.sim.inclinationDeg,periodSeconds:Number(orbitPeriodSeconds(runtime.sim.altitudeKm).toFixed(3))},
      story:{time:Number(runtime.story.time.toFixed(3)),scene:runtime.story.scene,playing:runtime.story.playing}
    };
  }

  function selectPlace(place,announce){
    runtime.selectedPlace=place;
    document.getElementById('app').dataset.convergenceSelected=place.id;
    if(place.type==='moon'){
      clickExperience('moon');
      setTimeout(function(){if(place.control)clickControl(place.control);},0);
    }else{
      if(state.experience!=='planet' && state.experience!=='civilization')clickExperience('civilization');
      if(typeof state.yaw==='number'){
        state.yaw=(place.lon*Math.PI/180)-Math.PI/2;
        state.pitch=Math.max(-.72,Math.min(.72,(place.lat||0)*Math.PI/360));
        state.targetZoom=Math.max(state.targetZoom||1,1.34);
      }
    }
    renderPlaces();
    if(announce!==false)showToast(place.name+' selected');
  }

  function nearestSelectable(x,y){
    var candidates=[];
    if(state.experience==='moon'){
      MOON_LANDMARKS.forEach(function(p){var q=moonPosition(p);if(q.visible)candidates.push({place:Object.assign({type:'moon'},p),p:q});});
    }else if(activeLayers.has('cities') || state.experience==='civilization'){
      CITIES.forEach(function(p){var q=projection(p.lat,p.lon);if(q)candidates.push({place:Object.assign({type:'city'},p),p:q});});
      if(activeLayers.has('events'))runtime.events.filter(visibleFeature).forEach(function(p){var q=projection(p.lat,p.lon);if(q)candidates.push({place:p,p:q});});
    }else if(activeLayers.has('events')){
      runtime.events.filter(visibleFeature).forEach(function(p){var q=projection(p.lat,p.lon);if(q)candidates.push({place:p,p:q});});
    }
    var best=null,dist=Infinity;
    candidates.forEach(function(c){var d=Math.hypot(c.p.x-x,c.p.y-y);if(d<dist){dist=d;best=c.place;}});
    return dist<=18?best:null;
  }

  function interactionEnabled(){return runtime.drawerOpen||activeLayers.size>0||!!runtime.selectedPlace;}
  function installInteraction(){
    var viewport=document.querySelector('.viewport');
    viewport.addEventListener('pointermove',function(e){
      if(runtime.pointer||!interactionEnabled()){runtime.hoverPlace=null;viewport.style.cursor='';return;}
      runtime.hoverPlace=nearestSelectable(e.clientX,e.clientY);
      viewport.style.cursor=runtime.hoverPlace?'pointer':'';
    },true);
    viewport.addEventListener('pointerleave',function(){runtime.hoverPlace=null;viewport.style.cursor='';},true);
    viewport.addEventListener('pointerdown',function(e){runtime.pointer={x:e.clientX,y:e.clientY};},true);
    viewport.addEventListener('pointerup',function(e){
      if(!runtime.pointer)return;
      var d=Math.hypot(e.clientX-runtime.pointer.x,e.clientY-runtime.pointer.y);runtime.pointer=null;
      if(d>6||!interactionEnabled())return;
      var place=nearestSelectable(e.clientX,e.clientY);
      if(place)selectPlace(place,true);
    },true);
  }

  function setTab(tab){
    runtime.tab=tab;
    drawer.querySelectorAll('[data-convergence-tab]').forEach(function(b){b.classList.toggle('active',b.dataset.convergenceTab===tab);});
    drawer.querySelectorAll('.convergence-section').forEach(function(s){s.classList.toggle('active',s.dataset.section===tab);});
    if(tab==='places')renderPlaces();
    if(tab==='simulation')refreshSimulationUI();
    if(tab==='story')refreshStoryUI();
  }

  function renderLayerButtons(){
    if(!drawer)return;
    var grid=drawer.querySelector('#convergenceLayerGrid');if(!grid)return;
    grid.innerHTML='';
    layerRegistry.forEach(function(layer,id){
      var b=document.createElement('button');b.type='button';b.className='convergence-chip'+(activeLayers.has(id)?' active':'');
      b.dataset.layer=id;b.textContent=layer.label;b.title=layer.description||layer.label;
      b.addEventListener('click',function(){setLayer(id);});
      grid.appendChild(b);
    });
  }

  function layerVisibleCount(id){
    if(id==='cities')return CITIES.filter(visibleFeature).length;
    if(id==='seismic')return SEISMIC.filter(visibleFeature).length;
    if(id==='heatmap'||id==='clusters')return CITIES.concat(SEISMIC).filter(visibleFeature).length;
    if(id==='events')return runtime.events.filter(visibleFeature).length;
    if(id==='migration')return typeof MIGRATION_ROUTES==='undefined'?0:Math.round(MIGRATION_ROUTES.length*runtime.dataTime);
    if(id==='ocean')return Object.keys(OCEAN_PATHS).length;
    if(id==='groundtrack')return 1;
    return 0;
  }

  function updateMetrics(){
    if(!drawer)return;
    var a=drawer.querySelector('#convergenceMetricLayers'),b=drawer.querySelector('#convergenceMetricFeatures'),c=drawer.querySelector('#convergenceMetricTime');
    if(a)a.textContent=String(activeLayers.size);
    var n=0;activeLayers.forEach(function(id){n+=layerVisibleCount(id);});if(b)b.textContent=String(n);
    if(c)c.textContent=Math.round(runtime.dataTime*100)+'%';
  }

  function renderPlaceDetail(){
    if(!drawer)return;
    var box=drawer.querySelector('#convergencePlaceDetail');if(!box)return;
    var p=runtime.selectedPlace;
    if(!p){box.hidden=true;box.innerHTML='';return;}
    var extra='';
    if(p.type==='city'){
      var neighborhoods=cityNeighborhoods(p.id);
      extra='<div class="convergence-detail-tags">'+neighborhoods.map(function(n){return '<span>'+n+'</span>';}).join('')+'</div>'+
        '<ol class="convergence-history"><li>Early settlement and geographic anchor</li><li>Regional network expansion</li><li>Modern metropolitan system</li></ol>';
    }else{
      extra='<div class="convergence-detail-tags"><span>'+p.lat.toFixed(2)+'° lat</span><span>'+p.lon.toFixed(2)+'° lon</span></div>';
    }
    box.hidden=false;box.innerHTML='<strong>'+p.name+'</strong><p>'+p.detail+'</p>'+extra;
  }

  function renderPlaces(){
    if(!drawer)return;
    var list=drawer.querySelector('#convergencePlaceList'),title=drawer.querySelector('#convergencePlaceContext');if(!list)return;
    var items,context;
    if(state.experience==='moon'){
      items=MOON_LANDMARKS.map(function(p){return Object.assign({type:'moon'},p);});context='Lunar landmarks';
    }else{
      items=CITIES.map(function(p){return Object.assign({type:'city'},p);});context='Cities & human geography';
    }
    if(title)title.textContent=context;
    var q=(runtime.search||'').trim().toLowerCase();
    if(q)items=items.filter(function(p){return (p.name+' '+p.region+' '+p.detail).toLowerCase().indexOf(q)>=0;});
    list.innerHTML='';
    items.forEach(function(place){
      var b=document.createElement('button');b.type='button';b.className='convergence-place'+(runtime.selectedPlace&&runtime.selectedPlace.id===place.id?' active':'');
      var strong=document.createElement('strong');strong.textContent=place.name;
      var small=document.createElement('small');small.textContent=place.detail;
      var side=document.createElement('span');side.textContent=place.region;
      b.appendChild(strong);b.appendChild(small);b.appendChild(side);
      b.addEventListener('click',function(){selectPlace(place,true);});
      list.appendChild(b);
    });
    renderPlaceDetail();
  }

  function formatPeriod(sec){
    var min=sec/60;if(min<180)return min.toFixed(1)+' min';
    return (min/60).toFixed(2)+' h';
  }

  function setOrbitPreset(alt,inc){
    runtime.sim.enabled=true;runtime.sim.altitudeKm=alt;runtime.sim.inclinationDeg=inc;runtime.sim.elapsed=0;runtime.sim.playing=true;
    refreshSimulationUI();showToast('Orbit preset loaded');
  }

  function refreshSimulationUI(){
    if(!drawer)return;
    var period=orbitPeriodSeconds(runtime.sim.altitudeKm);
    var alt=drawer.querySelector('#convergenceOrbitAltitude'),inc=drawer.querySelector('#convergenceOrbitInclination'),per=drawer.querySelector('#convergenceOrbitPeriod');
    if(alt)alt.textContent=runtime.sim.altitudeKm.toLocaleString()+' km';
    if(inc)inc.textContent=runtime.sim.inclinationDeg.toFixed(1)+'°';
    if(per)per.textContent=formatPeriod(period);
    var toggle=drawer.querySelector('#convergenceSimToggle');if(toggle)toggle.textContent=runtime.sim.playing?'Pause replay':'Play replay';
  }

  function refreshStoryUI(){
    if(!drawer)return;
    var scene=sceneAt(runtime.story.time),idx=sceneIndexAt(runtime.story.time);
    var title=drawer.querySelector('#convergenceStoryTitle'),copy=drawer.querySelector('#convergenceStoryCopy'),range=drawer.querySelector('#convergenceStoryRange'),time=drawer.querySelector('#convergenceStoryTime'),bar=drawer.querySelector('#convergenceStoryBar'),toggle=drawer.querySelector('#convergenceStoryToggle');
    if(title)title.textContent=scene.label;
    if(copy)copy.textContent=scene.copy;
    if(range)range.value=String(runtime.story.time);
    if(time)time.textContent=Math.round(runtime.story.time)+'s / '+STORY_DURATION+'s';
    if(bar)bar.style.width=(runtime.story.time/STORY_DURATION*100)+'%';
    if(toggle)toggle.textContent=runtime.story.playing?'Pause story':'Play story';
    drawer.querySelectorAll('[data-story-scene]').forEach(function(b){b.classList.toggle('active',Number(b.dataset.storyScene)===idx);});
  }

  function showToast(message){
    if(!toast)return;toast.textContent=message;toast.classList.add('show');
    clearTimeout(showToast.timer);showToast.timer=setTimeout(function(){toast.classList.remove('show');},1500);
  }

  function installUI(){
    var exploreGrid=document.querySelector('#exploreMenu .drawer-grid');
    trigger=document.createElement('button');trigger.type='button';trigger.className='convergence-trigger';trigger.id='convergenceTrigger';trigger.innerHTML='<span>07</span><strong>Systems</strong><small>Layers & simulations</small>';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','convergenceDrawer');
    exploreGrid.appendChild(trigger);

    drawer=document.createElement('aside');drawer.className='convergence-drawer';drawer.id='convergenceDrawer';drawer.hidden=true;
    drawer.innerHTML=
      '<div class="convergence-head"><div><p>Earth systems</p><strong>Explore connected layers</strong></div><button class="convergence-close" type="button" aria-label="Close Earth systems">×</button></div>'+
      '<div class="convergence-tabs">'+
        '<button type="button" class="active" data-convergence-tab="layers">Layers</button>'+
        '<button type="button" data-convergence-tab="places">Places</button>'+
        '<button type="button" data-convergence-tab="simulation">Orbit</button>'+
        '<button type="button" data-convergence-tab="story">Story</button>'+
      '</div>'+
      '<div class="convergence-body">'+
        '<section class="convergence-section active" data-section="layers">'+
          '<h3>Geospatial data engine</h3><p class="hint">Toggle deterministic local layers over the existing globe. This is an extensible layer registry, not a claim of live telemetry.</p>'+
          '<div class="convergence-layer-grid" id="convergenceLayerGrid"></div>'+
          '<div class="convergence-row"><label for="convergenceRegion">Region</label><select id="convergenceRegion"><option value="global">Global</option><option value="americas">Americas</option><option value="europe">Europe</option><option value="africa-middle-east">Africa + Middle East</option><option value="asia-pacific">Asia-Pacific</option></select></div>'+
          '<div class="convergence-metrics">'+
            '<div class="convergence-metric"><span>Layers</span><strong id="convergenceMetricLayers">0</strong></div>'+
            '<div class="convergence-metric"><span>Features</span><strong id="convergenceMetricFeatures">0</strong></div>'+
            '<div class="convergence-metric"><span>Time</span><strong id="convergenceMetricTime">100%</strong></div>'+
          '</div>'+
          '<div class="convergence-row"><label for="convergenceDataTime">Time pulse</label><input id="convergenceDataTime" type="range" min="0" max="1000" value="1000"></div>'+
          '<div class="convergence-actions"><button class="convergence-action" id="convergenceDataPlay" type="button">Play time</button><button class="convergence-action" id="convergenceClearLayers" type="button">Clear</button></div>'+
          '<p class="convergence-provenance">Capability lineage: Agent Atlas / Census Molty aggregation and temporal filtering, Infinite City geographic exploration, and the existing Earth reconstruction engine. All bundled examples are deterministic and local.</p>'+
        '</section>'+
        '<section class="convergence-section" data-section="places">'+
          '<h3 id="convergencePlaceContext">Cities & human geography</h3><p class="hint">Select a place from the list or directly from a visible marker. Moon mode automatically switches this catalog to lunar landmarks.</p>'+
          '<input class="convergence-search" id="convergencePlaceSearch" type="search" placeholder="Search places or landmarks">'+
          '<div class="convergence-place-list" id="convergencePlaceList"></div>'+
          '<div class="convergence-place-detail" id="convergencePlaceDetail" hidden></div>'+
          '<p class="convergence-provenance">Capability lineage: Moonstake landmark exploration plus Infinite City and Where Is Mr. Kim selection/camera interaction. Commerce, land ownership and game scoring are intentionally excluded.</p>'+
        '</section>'+
        '<section class="convergence-section" data-section="simulation">'+
          '<h3>Deterministic orbit simulation</h3><p class="hint">Representative two-body orbital presets use Earth radius and standard gravitational parameter to compute period and render a reproducible replay.</p>'+
          '<div class="convergence-sim-card"><strong>Current orbit</strong><p><span id="convergenceOrbitAltitude">420 km</span> altitude · <span id="convergenceOrbitInclination">51.6°</span> inclination · <span id="convergenceOrbitPeriod"></span> period</p></div>'+
          '<div class="convergence-actions">'+
            '<button class="convergence-action" type="button" data-orbit-preset="leo">LEO</button>'+
            '<button class="convergence-action" type="button" data-orbit-preset="meo">MEO</button>'+
            '<button class="convergence-action" type="button" data-orbit-preset="geo">GEO</button>'+
          '</div>'+
          '<div class="convergence-actions"><button class="convergence-action" id="convergenceSimToggle" type="button">Pause replay</button><button class="convergence-action" id="convergenceSimTrack" type="button">Track spacecraft</button><button class="convergence-action" id="convergenceSimReset" type="button">Reset</button></div>'+
          '<p class="convergence-provenance">Capability lineage: Orbital Speeders fixed-step/replay and trajectory-prediction concepts. Racing, fuel economy, leaderboards and competitive mechanics are excluded.</p>'+
        '</section>'+
        '<section class="convergence-section" data-section="story">'+
          '<h3>Cinematic story compiler</h3><p class="hint">A deterministic semantic timeline choreographs the existing Earth experiences. Scrubbing to the same time always resolves to the same scene and state.</p>'+
          '<div class="convergence-story-card"><strong id="convergenceStoryTitle">Earth through time</strong><p id="convergenceStoryCopy"></p><div class="convergence-progress"><i id="convergenceStoryBar"></i></div></div>'+
          '<div class="convergence-row"><label id="convergenceStoryTime">0s / '+STORY_DURATION+'s</label><input id="convergenceStoryRange" type="range" min="0" max="'+STORY_DURATION+'" step=".1" value="0"></div>'+
          '<div class="convergence-actions" id="convergenceStoryScenes"></div>'+
          '<div class="convergence-actions"><button class="convergence-action" id="convergenceStoryToggle" type="button">Play story</button><button class="convergence-action" id="convergenceStoryReset" type="button">Reset</button></div>'+
          '<p class="convergence-provenance">Capability lineage: deterministic procedural render(t), Hypit semantic timing and Orshot-style motion composition. The engine orchestrates this project’s own scenes rather than importing unrelated video-product UI.</p>'+
        '</section>'+
      '</div>';
    document.getElementById('app').appendChild(drawer);

    toast=document.createElement('div');toast.className='convergence-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.appendChild(toast);

    function closeConvergence(){
      drawer.hidden=true;runtime.drawerOpen=false;runtime.hoverPlace=null;trigger.setAttribute('aria-expanded','false');
    }
    trigger.addEventListener('click',function(){
      var explore=document.getElementById('exploreMenu'),exploreButton=document.getElementById('exploreButton');
      if(explore)explore.hidden=true;if(exploreButton)exploreButton.setAttribute('aria-expanded','false');
      drawer.hidden=!drawer.hidden;runtime.drawerOpen=!drawer.hidden;trigger.setAttribute('aria-expanded',runtime.drawerOpen?'true':'false');
      if(runtime.drawerOpen){renderPlaces();refreshSimulationUI();refreshStoryUI();}
    });
    drawer.querySelector('.convergence-close').addEventListener('click',closeConvergence);
    var primaryExplore=document.getElementById('exploreButton');
    if(primaryExplore)primaryExplore.addEventListener('click',function(){if(runtime.drawerOpen)closeConvergence();});
    drawer.querySelectorAll('[data-convergence-tab]').forEach(function(b){b.addEventListener('click',function(){setTab(b.dataset.convergenceTab);});});
    drawer.querySelector('#convergenceDataTime').addEventListener('input',function(e){runtime.dataTime=Number(e.target.value)/1000;updateMetrics();});
    drawer.querySelector('#convergenceRegion').addEventListener('change',function(e){runtime.region=e.target.value;updateMetrics();renderPlaces();showToast(e.target.options[e.target.selectedIndex].text+' filter');});
    drawer.querySelector('#convergenceDataPlay').addEventListener('click',function(e){runtime.dataPlaying=!runtime.dataPlaying;e.target.textContent=runtime.dataPlaying?'Pause time':'Play time';});
    drawer.querySelector('#convergenceClearLayers').addEventListener('click',clearLayers);
    drawer.querySelector('#convergencePlaceSearch').addEventListener('input',function(e){runtime.search=e.target.value;renderPlaces();});
    drawer.querySelectorAll('[data-orbit-preset]').forEach(function(b){b.addEventListener('click',function(){
      var p=b.dataset.orbitPreset;if(p==='leo')setOrbitPreset(420,51.6);if(p==='meo')setOrbitPreset(20200,55);if(p==='geo')setOrbitPreset(35786,0);
      clickExperience('orbit');setLayer('groundtrack',true);
    });});
    drawer.querySelector('#convergenceSimToggle').addEventListener('click',function(){runtime.sim.playing=!runtime.sim.playing;refreshSimulationUI();});
    drawer.querySelector('#convergenceSimTrack').addEventListener('click',function(e){runtime.sim.track=!runtime.sim.track;e.target.classList.toggle('active',runtime.sim.track);e.target.textContent=runtime.sim.track?'Tracking spacecraft':'Track spacecraft';});
    drawer.querySelector('#convergenceSimReset').addEventListener('click',function(){runtime.sim.elapsed=0;refreshSimulationUI();});
    drawer.querySelector('#convergenceStoryRange').addEventListener('input',function(e){runtime.story.playing=false;renderAt(Number(e.target.value));});
    drawer.querySelector('#convergenceStoryToggle').addEventListener('click',function(){runtime.story.playing=!runtime.story.playing;if(runtime.story.time>=STORY_DURATION)runtime.story.time=0;document.getElementById('app').dataset.convergenceStory=runtime.story.playing?'true':'false';refreshStoryUI();});
    drawer.querySelector('#convergenceStoryReset').addEventListener('click',function(){runtime.story.playing=false;runtime.story.lastScene=-1;renderAt(0);document.getElementById('app').dataset.convergenceStory='false';});

    var storyButtons=drawer.querySelector('#convergenceStoryScenes');
    STORY_SCENES.forEach(function(s,i){var b=document.createElement('button');b.type='button';b.className='convergence-action';b.dataset.storyScene=String(i);b.textContent=String(i+1).padStart(2,'0');b.title=s.label;b.addEventListener('click',function(){runtime.story.playing=false;renderAt(s.at);});storyButtons.appendChild(b);});

    var observer=new MutationObserver(function(){renderPlaces();refreshSimulationUI();});
    observer.observe(document.getElementById('app'),{attributes:true,attributeFilter:['data-experience']});
  }

  function installCanvas(){
    canvas=document.createElement('canvas');canvas.className='convergence-canvas';canvas.id='convergenceCanvas';canvas.setAttribute('aria-hidden','true');
    var viewport=document.querySelector('.viewport');viewport.appendChild(canvas);ctx=canvas.getContext('2d');resizeCanvas();
    addEventListener('resize',resizeCanvas);
  }

  function resizeCanvas(){
    if(!canvas||!ctx)return;var dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function frame(now){
    var dt=Math.min(.05,(now-runtime.last)/1000);runtime.last=now;
    if(runtime.dataPlaying){runtime.dataTime=(runtime.dataTime+dt*.045)%1;var dr=drawer&&drawer.querySelector('#convergenceDataTime');if(dr)dr.value=String(Math.round(runtime.dataTime*1000));updateMetrics();}
    if(runtime.sim.playing)runtime.sim.elapsed+=dt;
    if(runtime.sim.track && state.experience==='orbit'){
      var trackPhase=runtime.sim.elapsed/Math.max(1,orbitPeriodSeconds(runtime.sim.altitudeKm))*Math.PI*2;
      state.yaw=-trackPhase*.55;state.pitch=Math.sin(trackPhase)*Math.min(.6,runtime.sim.inclinationDeg*Math.PI/360);
    }
    if(runtime.story.playing){
      runtime.story.time+=dt*runtime.story.speed;
      if(runtime.story.time>=STORY_DURATION){runtime.story.time=STORY_DURATION;runtime.story.playing=false;document.getElementById('app').dataset.convergenceStory='false';}
      var idx=sceneIndexAt(runtime.story.time);
      if(idx!==runtime.story.lastScene){runtime.story.lastScene=idx;applyStoryScene(idx);}
      applyStoryCamera(runtime.story.time);refreshStoryUI();
    }

    var dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);
    activeLayers.forEach(function(id){var layer=layerRegistry.get(id);if(layer&&layer.draw)layer.draw();});
    drawUrbanInset();drawOrbitSimulation();drawSelected();drawStoryParticles();
    requestAnimationFrame(frame);
  }

  registerLayer('cities',{label:'Cities',description:'Persistent city and civilization markers',draw:drawCities});
  registerLayer('migration',{label:'Migration',description:'Human dispersal pathways through time',draw:drawMigration});
  registerLayer('seismic',{label:'Seismic',description:'Curated major earthquake signals',draw:drawSeismic});
  registerLayer('heatmap',{label:'Heatmap',description:'Density field derived from visible geographic features',draw:drawHeatmap});
  registerLayer('clusters',{label:'Clusters',description:'Screen-space aggregation of visible geographic features',draw:drawClusters});
  registerLayer('events',{label:'Events',description:'Bounded push-event stream for live or simulated geographic signals',draw:drawEvents});
  registerLayer('ocean',{label:'Currents',description:'Modeled large-scale circulation paths',draw:drawOcean});
  registerLayer('groundtrack',{label:'Ground track',description:'Representative deterministic orbital ground track',draw:drawGroundTrack});

  function init(){
    if(document.getElementById('convergenceTrigger'))return;
    installCanvas();installUI();installInteraction();renderLayerButtons();renderPlaces();refreshSimulationUI();refreshStoryUI();
    document.getElementById('app').dataset.convergenceReady='true';
    window.EarthConvergence={
      version:VERSION,
      registerLayer:registerLayer,
      setLayer:setLayer,
      clearLayers:clearLayers,
      renderAt:renderAt,
      snapshot:snapshot,
      selectCity:function(id){var p=CITIES.find(function(x){return x.id===id;});if(p)selectPlace(Object.assign({type:'city'},p),true);return !!p;},
      selectMoonLandmark:function(id){var p=MOON_LANDMARKS.find(function(x){return x.id===id;});if(p)selectPlace(Object.assign({type:'moon'},p),true);return !!p;},
      setOrbit:function(altitudeKm,inclinationDeg){runtime.sim.enabled=true;runtime.sim.altitudeKm=Math.max(160,Number(altitudeKm)||420);runtime.sim.inclinationDeg=Math.max(0,Math.min(180,Number(inclinationDeg)||0));runtime.sim.elapsed=0;refreshSimulationUI();return snapshot().orbit;},
      setSimulationTime:function(seconds){runtime.sim.enabled=true;runtime.sim.elapsed=Math.max(0,Number(seconds)||0);return snapshot().orbit;},
      predictOrbit:function(altitudeKm,samples){return predictOrbit(altitudeKm,samples);},
      ingestEvent:ingestEvent,
      clearEvents:function(){runtime.events.length=0;updateMetrics();},
      setRegion:function(region){var allowed=['global','americas','europe','africa-middle-east','asia-pacific'];runtime.region=allowed.indexOf(region)>=0?region:'global';var select=drawer&&drawer.querySelector('#convergenceRegion');if(select)select.value=runtime.region;updateMetrics();return runtime.region;},
      listLayers:function(){return Array.from(layerRegistry.values()).map(function(x){return {id:x.id,label:x.label,description:x.description};});},
      listCities:function(){return CITIES.slice();},
      listMoonLandmarks:function(){return MOON_LANDMARKS.slice();},
      storyDuration:STORY_DURATION
    };
    requestAnimationFrame(frame);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0);},{once:true});else setTimeout(init,0);
})();