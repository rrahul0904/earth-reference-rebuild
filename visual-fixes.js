/* Reference-v3 companion scene renderer.
   Earth surface is owned by cinematic-overhaul.js; Moon surface by moon-fidelity.js. */
(() => {
  const app=document.getElementById('app');
  const viewport=document.querySelector('.viewport');
  const overlay=document.getElementById('overlay');
  if(!app||!viewport||typeof getSphereLayout!=='function')return;
  app.dataset.visualGrade='reference-v3';

  const legacy=document.getElementById('experienceCanvas');
  if(legacy){legacy.style.setProperty('display','none','important');legacy.setAttribute('aria-hidden','true')}
  document.querySelectorAll('.reviewed-cinematic-canvas').forEach(c=>c.remove());

  function active(prefix,fallback='all'){
    const b=document.querySelector(`#experiencePills button.active[data-exp-control^="${prefix}-"]`);
    return b?.dataset.expControl.slice(prefix.length+1)||fallback;
  }

  const inheritedLayout=getSphereLayout;
  getSphereLayout=function referenceV3Layout(){
    const w=innerWidth,h=innerHeight,mobile=w<=900,e=state.experience||'planet';
    let r;
    if(e==='orbit'){
      const overview=active('orbit')==='all';
      r=overview?Math.min(w*(mobile?.11:.058),h*(mobile?.085:.095)):Math.min(w*(mobile?.29:.145),h*(mobile?.20:.235));
      return{w,h,cx:mobile?w*.52:w*.625,cy:mobile?h*.29:h*.465,radius:r*state.zoom};
    }
    if(e==='earthquakes'){
      r=Math.min(w*(mobile?.37:.195),h*(mobile?.245:.31));
      return{w,h,cx:mobile?w*.52:w*.615,cy:mobile?h*.30:h*.46,radius:r*state.zoom};
    }
    if(e==='oceans'){
      r=Math.min(w*(mobile?.38:.205),h*(mobile?.25:.325));
      return{w,h,cx:mobile?w*.52:w*.62,cy:mobile?h*.30:h*.46,radius:r*state.zoom};
    }
    if(e==='planet'||e==='civilization'){
      r=Math.min(w*(mobile?.39:.19),h*(mobile?.26:.305));
      return{w,h,cx:mobile?w*.52:w*.625,cy:mobile?h*.30:h*.46,radius:r*state.zoom};
    }
    return inheritedLayout();
  };

  const canvas=document.createElement('canvas');
  canvas.className='reference-scene-canvas';
  canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',zIndex:'7'});
  viewport.insertBefore(canvas,document.querySelector('.vignette'));
  const x=canvas.getContext('2d',{alpha:true});
  let w=innerWidth,h=innerHeight,dpr=1,phase=0,last=0;

  function resize(){
    w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;x.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize',resize);resize();

  function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
  const sr=seeded(331977);
  const stars=Array.from({length:300},()=>({u:sr(),v:sr(),r:.18+sr()*.48,a:.08+sr()*.46}));
  const or=seeded(71321);
  const orbitDots=Array.from({length:1320},(_,i)=>({ring:i%36,a:or()*Math.PI*2,tilt:(or()-.5)*1.82,spread:.88+or()*.24,sp:.010+or()*.055,hot:or()>.985}));
  const qr=seeded(9207),quakePoints=[];
  const quakePaths=[
    [[64,-155],[54,-136],[42,-126],[30,-116],[18,-104],[6,-89],[-16,-76],[-36,-73],[-53,-69]],
    [[58,165],[47,151],[37,142],[25,137],[13,125],[0,121],[-14,121],[-27,153],[-42,174]],
    [[8,96],[-3,101],[-9,112],[-13,126],[-18,142],[-22,157]],
    [[68,-21],[46,-31],[22,-35],[0,-25],[-25,-16],[-48,-9]],
    [[39,16],[40,31],[37,49],[31,66],[29,82],[31,97]],
    [[35,-8],[35,10],[34,28],[31,45],[28,62]]
  ];
  quakePaths.forEach((path,pi)=>{for(let n=0;n<165;n++){
    const i=Math.floor(qr()*(path.length-1)),t=qr();let a=path[i][1],b=path[i+1][1],d=b-a;
    if(d>180)d-=360;if(d<-180)d+=360;let lon=a+d*t;if(lon>180)lon-=360;if(lon<-180)lon+=360;
    quakePoints.push({lat:path[i][0]+(path[i+1][0]-path[i][0])*t+(qr()-.5)*4.2,lon:lon+(qr()-.5)*4.2,m:2.2+Math.pow(qr(),3.2)*7.1,depth:qr()*700,path:pi});
  }});

  const currents={
    gulf:[[18,-84],[23,-80],[30,-76],[36,-69],[43,-58],[49,-43],[55,-27],[58,-10]],
    kuroshio:[[13,127],[22,132],[30,138],[37,145],[43,157],[45,170]],
    pacific:[[20,147],[25,162],[28,178],[30,-164],[29,-146],[24,-130],[18,-118]],
    southern:[[-51,-178],[-53,-145],[-54,-108],[-52,-70],[-54,-25],[-52,22],[-54,68],[-53,110],[-55,150],[-52,179]],
    brazil:[[-8,-33],[-17,-38],[-27,-43],[-37,-49]],
    agulhas:[[-34,20],[-38,28],[-40,39],[-37,49],[-31,55]],
    equatorial:[[5,-30],[3,5],[1,42],[-1,80],[-2,118],[0,155],[2,178],[0,-145],[-1,-108],[0,-70],[-1,-36]],
    canary:[[44,-15],[36,-19],[28,-21],[20,-19]],
    california:[[45,-128],[37,-125],[29,-121],[21,-114]],
    benguela:[[-18,10],[-26,7],[-34,10]],
    eastAus:[[-15,151],[-24,154],[-34,151],[-41,145]],
    northAtlantic:[[52,-48],[58,-33],[62,-17],[58,2]],
    northPacific:[[38,-165],[44,-150],[48,-135],[45,-120]]
  };

  const solar=[
    {n:'Mercury',d:.11,sz:2.7,c:'#aaa8a0',sp:2.0},{n:'Venus',d:.17,sz:4.1,c:'#d0aa76',sp:1.5},
    {n:'Earth',d:.24,sz:4.6,c:'#6aaed0',sp:1.14},{n:'Mars',d:.32,sz:3.4,c:'#b95f46',sp:.91},
    {n:'Jupiter',d:.46,sz:10.5,c:'#c8a889',sp:.47},{n:'Saturn',d:.60,sz:8.7,c:'#c9bb8d',sp:.34},
    {n:'Uranus',d:.75,sz:6.3,c:'#81c1c6',sp:.25},{n:'Neptune',d:.90,sz:6.1,c:'#536fa9',sp:.20}
  ];

  function clear(){x.clearRect(0,0,w,h)}
  function isEarthMode(){return['planet','civilization','orbit','earthquakes','oceans'].includes(state.experience||'planet')}
  function starField(mult=.65){
    const L=isEarthMode()?getSphereLayout():null;
    x.save();x.fillStyle='#f2f7f3';
    for(const s of stars){const px=s.u*w,py=s.v*h;if(L&&Math.hypot(px-L.cx,py-L.cy)<L.radius*1.035)continue;x.globalAlpha=s.a*mult;x.beginPath();x.arc(px,py,s.r,0,Math.PI*2);x.fill()}
    x.restore();
  }
  function ellipse(cx,cy,rx,ry,rot,a=.12,lw=.55){x.save();x.translate(cx,cy);x.rotate(rot);x.strokeStyle=`rgba(190,218,213,${a})`;x.lineWidth=lw;x.beginPath();x.ellipse(0,0,rx,ry,0,0,Math.PI*2);x.stroke();x.restore()}

  function drawPlanet(){clear();starField(.32)}
  function drawOrbit(t){
    clear();starField(.52);const L=getSphereLayout(),filter=active('orbit'),overview=filter==='all';
    const base=overview?Math.min(w*.235,h*.37):L.radius*1.16,rings=overview?36:(filter==='crewed'?5:24);
    for(let i=0;i<rings;i++){
      const f=overview?(.43+i/rings*.98):(1+i/rings*.78),rx=overview?base*f:L.radius*f,ry=rx*(overview?(.11+.16*((i%8)/8)):(.10+.09*((i%7)/7)));
      ellipse(L.cx,L.cy,rx,ry,(i-rings/2)*.079,.042+(i%8===0?.07:0),.5);
    }
    x.save();x.globalCompositeOperation='screen';
    for(const p of orbitDots){
      if(filter==='crewed'&&p.ring>4)continue;if(filter==='active'&&p.ring%4===0)continue;if(filter==='constellations'&&p.ring%3!==0)continue;
      const rr=overview?base*(.46+p.ring/36*.91)*p.spread:L.radius*(1.11+p.ring*.022)*p.spread,ang=p.a+t*p.sp;
      const py=Math.sin(ang)*rr*(.11+.18*((p.ring%9)/9)),px=Math.cos(ang)*rr,c=Math.cos(p.tilt),s=Math.sin(p.tilt),xx=L.cx+px*c-py*s,yy=L.cy+px*s+py*c;
      x.globalAlpha=p.hot?.96:(overview?.35:.26);x.fillStyle=p.hot?'#f4fff9':'#add4ce';x.beginPath();x.arc(xx,yy,p.hot?1.08:(overview?.48:.42),0,Math.PI*2);x.fill();
    }
    x.restore();
    if(overview){x.font='500 6.5px ui-sans-serif,system-ui';x.fillStyle='rgba(226,239,233,.43)';x.fillText('LEO',L.cx-base*.45,L.cy+base*.22);x.fillText('MEO',L.cx+base*.37,L.cy-base*.15);x.fillText('GEO',L.cx+base*.82,L.cy+3)}
  }

  function smallEarth(cx,cy,r){
    const g=x.createRadialGradient(cx-r*.35,cy-r*.38,1,cx,cy,r);g.addColorStop(0,'#e0f3f1');g.addColorStop(.12,'#61adc6');g.addColorStop(.50,'#246f88');g.addColorStop(1,'#071a1f');x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();
    x.fillStyle='rgba(148,164,102,.66)';x.beginPath();x.ellipse(cx-r*.13,cy-r*.07,r*.27,r*.14,-.48,0,Math.PI*2);x.fill();
  }
  function drawMoon(){clear();starField(.35);const mobile=w<=900,r=Math.min(w*(mobile?.36:.255),h*(mobile?.25:.40)),cx=mobile?w*.56:w*.63,cy=mobile?h*.30:h*.465;smallEarth(cx-r*1.28,cy-r*.69,r*.075)}

  function drawSolar(t){
    clear();starField(.34);const mobile=w<=900,cx=mobile?w*.55:w*.615,cy=mobile?h*.33:h*.46,base=Math.min(w,h)*(mobile?.43:.56),focus=active('solar');
    solar.forEach((p,i)=>ellipse(cx,cy,base*p.d,base*p.d*.29,-.085,.078+(i===2?.036:0),.52));
    x.save();x.shadowColor='rgba(255,157,45,.62)';x.shadowBlur=32;const sg=x.createRadialGradient(cx-5,cy-6,1,cx,cy,21);sg.addColorStop(0,'#fff8db');sg.addColorStop(.22,'#ffd66f');sg.addColorStop(.65,'#ed8b28');sg.addColorStop(1,'#9d320e');x.fillStyle=sg;x.beginPath();x.arc(cx,cy,18,0,Math.PI*2);x.fill();x.shadowBlur=0;
    solar.forEach((p,i)=>{const a=.25+i*.74+t*.040*p.sp,rx=base*p.d,ry=rx*.29,xx=cx+Math.cos(a)*rx,yy=cy+Math.sin(a)*ry,selected=(focus==='all'&&p.n==='Earth')||focus===p.n.toLowerCase(),size=p.sz*(selected?1.28:1);const g=x.createRadialGradient(xx-size*.35,yy-size*.35,.2,xx,yy,size*1.12);g.addColorStop(0,'#f4efe7');g.addColorStop(.30,p.c);g.addColorStop(1,'#111817');x.fillStyle=g;x.beginPath();x.arc(xx,yy,size,0,Math.PI*2);x.fill();if(p.n==='Saturn'){x.strokeStyle='rgba(221,206,164,.78)';x.lineWidth=1;x.beginPath();x.ellipse(xx,yy,size*1.9,size*.42,-.16,0,Math.PI*2);x.stroke()}x.font=`500 ${selected?8:6.5}px ui-sans-serif,system-ui`;x.fillStyle=selected?'rgba(242,248,244,.90)':'rgba(230,239,234,.48)';x.textAlign='center';x.fillText(p.n,xx,yy+size+12);if(selected){x.strokeStyle='rgba(221,238,229,.36)';x.lineWidth=.55;x.beginPath();x.arc(xx,yy,size+6,0,Math.PI*2);x.stroke()}});x.restore();x.textAlign='left';
    if(!mobile){const y=h-88;let xx=w*.40;solar.forEach(p=>{x.fillStyle=p.c;x.beginPath();x.arc(xx,y,2.5,0,Math.PI*2);x.fill();x.font='500 6px ui-sans-serif,system-ui';x.fillStyle='rgba(232,240,235,.43)';x.fillText(p.n,xx+7,y+2);xx+=Math.max(57,p.n.length*5+25)})}
  }

  function drawQuakes(t){
    clear();starField(.22);const filter=active('quake');x.save();x.globalCompositeOperation='screen';
    for(const q of quakePoints){if(filter==='pacific'&&q.path>2)continue;if(filter==='deep'&&q.depth<350)continue;const p=projectGeo(q.lat,q.lon);if(!p)continue;const a=.20+Math.min(.55,(q.m-2.4)/8.5),r=Math.max(.55,(q.m-2.0)*.43);x.fillStyle=q.depth>350?`rgba(154,131,216,${a})`:q.m>6?`rgba(255,207,92,${a})`:`rgba(248,233,137,${a})`;x.beginPath();x.arc(p.x,p.y,r,0,Math.PI*2);x.fill()}
    if(filter==='japan'){const p=projectGeo(38.3,142.4);if(p)for(let i=0;i<4;i++){const rr=6+i*9+((t*9)%9);x.strokeStyle=`rgba(255,210,103,${.66-i*.12})`;x.lineWidth=.8;x.beginPath();x.arc(p.x,p.y,rr,0,Math.PI*2);x.stroke()}}
    x.restore();
  }

  function lonLerp(a,b,t){let d=b-a;if(d>180)d-=360;if(d<-180)d+=360;let v=a+d*t;if(v>180)v-=360;if(v<-180)v+=360;return v}
  function sample(path,t,latOff=0,lonOff=0){const n=path.length-1,i=Math.min(n-1,Math.floor(t*n)),u=t*n-i;return[path[i][0]+(path[i+1][0]-path[i][0])*u+latOff,lonLerp(path[i][1],path[i+1][1],u)+lonOff]}
  function flow(path,strong,t,offset=0){
    x.save();x.globalCompositeOperation='screen';x.lineCap='round';x.lineJoin='round';const latOff=(offset-6.5)*.72,lonOff=Math.sin(offset*2.1)*.65;x.strokeStyle=strong?'rgba(83,237,222,.66)':'rgba(72,197,190,.22)';x.lineWidth=strong?1.05:.58;x.beginPath();let started=false;
    for(let i=0;i<=130;i++){const ll=sample(path,i/130,latOff,lonOff),p=projectGeo(ll[0],ll[1]);if(!p){started=false;continue}if(!started){x.moveTo(p.x,p.y);started=true}else x.lineTo(p.x,p.y)}x.stroke();
    const count=strong?20:8;for(let i=0;i<count;i++){const ll=sample(path,(i/count+t*(strong?.060:.034)+offset*.013)%1,latOff,lonOff),p=projectGeo(ll[0],ll[1]);if(!p)continue;x.fillStyle=strong?'rgba(211,255,249,.94)':'rgba(126,231,219,.50)';x.beginPath();x.arc(p.x,p.y,strong?1.13:.62,0,Math.PI*2);x.fill()}x.restore();
  }
  function drawOceans(t){
    clear();starField(.18);const focus=active('ocean','global');
    Object.entries(currents).forEach(([name,path])=>{const match=focus==='global'||name===focus||(focus==='pacific'&&(name==='pacific'||name==='kuroshio'||name==='northPacific'))||(focus==='southern'&&name==='southern');if(!match)return;const strong=focus!=='global',layers=strong?14:7;for(let o=0;o<layers;o++)flow(path,strong,t,o)});
  }

  function frame(now){
    if(now-last<30){requestAnimationFrame(frame);return}
    const dt=Math.min(.08,(now-last)/1000||0);last=now;phase+=dt;
    if(overlay)overlay.style.opacity=state.experience==='civilization'?'1':'0';
    switch(state.experience){case'planet':case'civilization':drawPlanet();break;case'orbit':drawOrbit(phase);break;case'moon':drawMoon();break;case'solar':drawSolar(phase);break;case'earthquakes':drawQuakes(phase);break;case'oceans':drawOceans(phase);break;default:clear()}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
