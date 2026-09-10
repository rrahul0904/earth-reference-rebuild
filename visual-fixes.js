/* Screenshot-review fixes: precise scale, pin-point stars, photographic Moon, and cleaner companion scenes. */
(() => {
  const app=document.getElementById('app');
  const viewport=document.querySelector('.viewport');
  const overlay=document.getElementById('overlay');
  if(!app||!viewport||typeof getSphereLayout!=='function')return;

  /* The first fidelity pass remains as a fallback renderer, but this reviewed layer owns the visible companion art. */
  document.querySelectorAll('.cinematic-canvas').forEach(c=>{c.style.opacity='0';c.style.pointerEvents='none'});

  const inheritedLayout=getSphereLayout;
  getSphereLayout=function(){
    const width=innerWidth,height=innerHeight,mobile=width<=900;
    if(state.experience==='orbit'){
      const radius=(mobile?Math.min(width*.34,height*.23):Math.min(width*.19,height*.29))*state.zoom;
      return {w:width,h:height,cx:mobile?width*.52:width*.605,cy:mobile?height*.30:height*.465,radius};
    }
    if(state.experience==='earthquakes'||state.experience==='oceans'){
      const radius=(mobile?Math.min(width*.37,height*.245):Math.min(width*.185,height*.285))*state.zoom;
      return {w:width,h:height,cx:mobile?width*.52:width*.615,cy:mobile?height*.30:height*.46,radius};
    }
    return inheritedLayout();
  };

  const canvas=document.createElement('canvas');
  canvas.className='reviewed-cinematic-canvas';
  canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',zIndex:'7'});
  viewport.insertBefore(canvas,document.querySelector('.vignette'));
  const x=canvas.getContext('2d',{alpha:true});
  let w=innerWidth,h=innerHeight,dpr=1,last=0,phase=0;

  const moonImage=new Image();
  moonImage.decoding='async';
  moonImage.src='https://svs.gsfc.nasa.gov/vis/a000000/a005000/a005001/moon_mosaic_print.jpg';

  function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
  const sr=seeded(77131);
  const stars=Array.from({length:215},()=>({u:sr(),v:sr(),r:.18+sr()*.43,a:.09+sr()*.42}));
  const odr=seeded(48129);
  const orbitDots=Array.from({length:920},(_,i)=>({ring:i%26,a:odr()*Math.PI*2,tilt:(odr()-.5)*1.58,spread:.91+odr()*.27,speed:.018+odr()*.065,bright:odr()>.973}));
  const qr=seeded(9207),quakePoints=[];
  const quakePaths=[
    [[60,-150],[50,-130],[38,-123],[22,-106],[8,-84],[-20,-72],[-45,-74],[-55,-68]],
    [[55,160],[45,150],[35,140],[25,135],[15,125],[0,120],[-15,120],[-30,165],[-45,175]],
    [[-5,100],[-8,115],[-12,130],[-15,145],[-20,155]],
    [[65,-20],[45,-30],[20,-35],[0,-25],[-20,-15],[-45,-10]],
    [[38,20],[38,35],[35,50],[30,65],[28,80],[30,95]]
  ];
  quakePaths.forEach((path,pi)=>{for(let n=0;n<120;n++){const i=Math.floor(qr()*(path.length-1)),t=qr();let a=path[i][1],b=path[i+1][1],d=b-a;if(d>180)d-=360;if(d<-180)d+=360;let lon=a+d*t;if(lon>180)lon-=360;if(lon<-180)lon+=360;quakePoints.push({lat:path[i][0]+(path[i+1][0]-path[i][0])*t+(qr()-.5)*5,lon:lon+(qr()-.5)*5,m:2.5+Math.pow(qr(),3)*6.7,depth:qr()*700,path:pi})}});
  const currents={
    gulf:[[18,-82],[25,-78],[32,-73],[40,-62],[48,-42],[54,-22],[57,-5]],
    pacific:[[18,145],[24,160],[30,178],[34,-165],[32,-145],[26,-130],[18,-118]],
    southern:[[-52,-170],[-54,-120],[-52,-70],[-55,-20],[-52,35],[-55,90],[-54,145],[-52,179]],
    brazil:[[-8,-34],[-18,-39],[-30,-45],[-40,-50]],
    agulhas:[[-35,20],[-38,28],[-41,38],[-36,48],[-28,55]],
    kuroshio:[[12,128],[22,132],[30,138],[38,145],[43,158]],
    equatorial:[[4,-25],[2,15],[0,55],[-2,95],[-1,135],[2,175],[-1,-145],[-2,-105],[-1,-65]]
  };

  const solar=[
    {n:'Mercury',d:.13,sz:1.7,c:'#aaa9a3',sp:1.9},
    {n:'Venus',d:.20,sz:2.7,c:'#c9a87a',sp:1.45},
    {n:'Earth',d:.29,sz:3.0,c:'#6ba6be',sp:1.13},
    {n:'Mars',d:.38,sz:2.2,c:'#b7684b',sp:.92},
    {n:'Jupiter',d:.53,sz:6.6,c:'#c3a283',sp:.46},
    {n:'Saturn',d:.67,sz:5.4,c:'#c8b98d',sp:.34},
    {n:'Uranus',d:.81,sz:4.0,c:'#84b9ba',sp:.25},
    {n:'Neptune',d:.94,sz:3.9,c:'#5573ab',sp:.20}
  ];

  function resize(){
    w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
    x.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize',resize);resize();

  function active(prefix,fallback='all'){
    const b=document.querySelector(`#experiencePills button.active[data-exp-control^="${prefix}-"]`);
    return b?.dataset.expControl.slice(prefix.length+1)||fallback;
  }
  function clear(){x.clearRect(0,0,w,h)}
  function starField(mult=.75){
    x.save();x.fillStyle='#edf6f1';
    for(const s of stars){x.globalAlpha=s.a*mult;x.beginPath();x.arc(s.u*w,s.v*h,s.r,0,Math.PI*2);x.fill()}
    x.restore();
  }
  function cleanAroundGlobe(){
    if(typeof getSphereLayout!=='function')return;
    const L=getSphereLayout();
    x.save();x.globalCompositeOperation='source-over';x.fillStyle='#020708';x.fillRect(0,0,w,h);
    x.globalCompositeOperation='destination-out';x.beginPath();x.arc(L.cx,L.cy,L.radius+2.5,0,Math.PI*2);x.fill();x.restore();
    starField(.60);
  }
  function ellipse(cx,cy,rx,ry,rot,a=.12){x.save();x.translate(cx,cy);x.rotate(rot);x.strokeStyle=`rgba(184,218,214,${a})`;x.lineWidth=.48;x.beginPath();x.ellipse(0,0,rx,ry,0,0,Math.PI*2);x.stroke();x.restore()}

  function drawPlanet(){clear();cleanAroundGlobe()}
  function drawOrbit(t){
    clear();cleanAroundGlobe();
    const L=getSphereLayout(),filter=active('orbit');
    for(let i=0;i<26;i++){
      const scale=1.16+i*.042;
      ellipse(L.cx,L.cy,L.radius*scale,L.radius*(.13+.016*(i%9)),(i-13)*.12,.035+(i%6===0?.04:0));
    }
    x.save();x.globalCompositeOperation='screen';
    for(const p of orbitDots){
      if(filter==='crewed'&&p.ring>2)continue;if(filter==='active'&&p.ring%4===0)continue;if(filter==='constellations'&&p.ring%2)continue;
      const rr=L.radius*(1.15+p.ring*.041)*p.spread,ang=p.a+t*p.speed;
      const px=Math.cos(ang)*rr,py=Math.sin(ang)*rr*(.12+.011*(p.ring%8)),c=Math.cos(p.tilt),s=Math.sin(p.tilt),xx=L.cx+px*c-py*s,yy=L.cy+px*s+py*c;
      x.globalAlpha=p.bright?.88:.23;x.fillStyle=p.bright?'#f2fff8':'#b6d8d4';x.beginPath();x.arc(xx,yy,p.bright?1.05:.42,0,Math.PI*2);x.fill();
    }
    x.restore();
  }

  function fallbackMoon(cx,cy,r){
    const g=x.createRadialGradient(cx-r*.32,cy-r*.36,r*.04,cx+r*.15,cy+r*.1,r*1.05);g.addColorStop(0,'#d9d6ce');g.addColorStop(.48,'#8c8c87');g.addColorStop(1,'#303432');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
    const rr=seeded(6301);for(let i=0;i<190;i++){const px=(rr()*2-1)*r,py=(rr()*2-1)*r;if(px*px+py*py>r*r*.94)continue;const cr=(.003+rr()*.028)*r;x.fillStyle=`rgba(24,27,26,${.05+rr()*.12})`;x.beginPath();x.arc(cx+px,cy+py,cr,0,Math.PI*2);x.fill()}
  }
  function drawMoon(){
    clear();x.fillStyle='#020708';x.fillRect(0,0,w,h);starField(.42);
    const mobile=w<=900,mission=active('moon','overview');
    const r=Math.min(w*(mobile?.36:.255),h*(mobile?.25:.40));
    const cx=mobile?w*.56:w*.63,cy=mobile?h*.30:h*.465;
    x.save();x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.clip();
    if(moonImage.complete&&moonImage.naturalWidth){
      x.filter='contrast(1.09) brightness(.86)';
      x.drawImage(moonImage,cx-r,cy-r,r*2,r*2);
      x.filter='none';
      const shade=x.createLinearGradient(cx-r*.85,cy-r*.45,cx+r*.92,cy+r*.5);shade.addColorStop(0,'rgba(255,255,255,.06)');shade.addColorStop(.53,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,6,7,.48)');x.fillStyle=shade;x.fillRect(cx-r,cy-r,r*2,r*2);
    }else fallbackMoon(cx,cy,r);
    x.restore();
    x.strokeStyle='rgba(231,240,234,.18)';x.lineWidth=.55;x.beginPath();x.arc(cx,cy,r+.3,0,Math.PI*2);x.stroke();

    const er=r*.075,ex=cx-r*1.27,ey=cy-r*.68;
    const eg=x.createRadialGradient(ex-er*.35,ey-er*.4,.4,ex,ey,er);eg.addColorStop(0,'#e8f4ef');eg.addColorStop(.10,'#77afc5');eg.addColorStop(.52,'#22657d');eg.addColorStop(1,'#071519');x.fillStyle=eg;x.beginPath();x.arc(ex,ey,er,0,Math.PI*2);x.fill();
    if(mission!=='overview'&&mission!=='far'){
      const label=mission==='apollo11'?'Apollo 11':mission==='apollo17'?'Apollo 17':'Chang’e 4',mx=cx+r*(mission==='apollo17'?.08:.19),my=cy+r*(mission==='apollo17'?.16:.08);
      x.fillStyle='#eff8f2';x.beginPath();x.arc(mx,my,1.8,0,Math.PI*2);x.fill();x.strokeStyle='rgba(235,244,238,.48)';x.lineWidth=.5;x.beginPath();x.moveTo(mx+4,my);x.lineTo(mx+31,my);x.stroke();x.font='500 6.5px ui-sans-serif,system-ui';x.fillStyle='rgba(240,247,242,.72)';x.fillText(label,mx+36,my+2.2);
    }
  }

  function drawSolar(t){
    clear();x.fillStyle='#020708';x.fillRect(0,0,w,h);starField(.35);
    const mobile=w<=900,cx=mobile?w*.54:w*.60,cy=mobile?h*.34:h*.465,base=Math.min(w,h)*(mobile?.44:.54),focus=active('solar');
    solar.forEach((p,i)=>ellipse(cx,cy,base*p.d,base*p.d*.32,-.10,.07+(i===2?.025:0)));
    x.save();x.shadowColor='rgba(255,163,46,.45)';x.shadowBlur=27;const sg=x.createRadialGradient(cx-4,cy-5,1,cx,cy,16);sg.addColorStop(0,'#fff5cc');sg.addColorStop(.25,'#ffd06b');sg.addColorStop(.62,'#ec8d28');sg.addColorStop(1,'#a83b12');x.fillStyle=sg;x.beginPath();x.arc(cx,cy,14,0,Math.PI*2);x.fill();x.shadowBlur=0;
    solar.forEach((p,i)=>{const a=.28+i*.73+t*.034*p.sp,rx=base*p.d,ry=rx*.32,xx=cx+Math.cos(a)*rx*Math.cos(.10)-Math.sin(a)*ry*Math.sin(-.10),yy=cy+Math.cos(a)*rx*Math.sin(-.10)+Math.sin(a)*ry*Math.cos(.10),selected=(focus==='all'&&p.n==='Earth')||focus===p.n.toLowerCase();const g=x.createRadialGradient(xx-p.sz*.35,yy-p.sz*.35,.2,xx,yy,p.sz*1.12);g.addColorStop(0,'#efede7');g.addColorStop(.30,p.c);g.addColorStop(1,'#121817');x.fillStyle=g;x.beginPath();x.arc(xx,yy,p.sz*(selected?1.14:1),0,Math.PI*2);x.fill();if(p.n==='Saturn'){x.strokeStyle='rgba(216,204,166,.64)';x.lineWidth=.8;x.beginPath();x.ellipse(xx,yy,p.sz*1.9,p.sz*.45,-.17,0,Math.PI*2);x.stroke()}if(selected){x.strokeStyle='rgba(223,240,231,.42)';x.lineWidth=.5;x.beginPath();x.arc(xx,yy,p.sz+6,0,Math.PI*2);x.stroke();x.font='500 6px ui-sans-serif,system-ui';x.fillStyle='rgba(239,246,241,.65)';x.fillText(p.n,xx+p.sz+10,yy+2)}});x.restore();
  }

  function drawQuakes(t){
    clear();cleanAroundGlobe();const filter=active('quake');x.save();x.globalCompositeOperation='screen';
    for(const q of quakePoints){if(filter==='pacific'&&q.path>2)continue;if(filter==='deep'&&q.depth<350)continue;const p=projectGeo(q.lat,q.lon);if(!p)continue;const a=.14+Math.min(.42,(q.m-2.5)/9),r=Math.max(.42,(q.m-2.1)*.31);x.fillStyle=q.depth>350?`rgba(161,131,202,${a})`:q.m>6?`rgba(255,199,95,${a})`:`rgba(233,224,139,${a})`;x.beginPath();x.arc(p.x,p.y,r,0,Math.PI*2);x.fill()}
    if(filter==='japan'){const p=projectGeo(38.3,142.4);if(p)for(let i=0;i<3;i++){const rr=5+i*7+((t*7)%7);x.strokeStyle=`rgba(251,203,104,${.54-i*.13})`;x.lineWidth=.6;x.beginPath();x.arc(p.x,p.y,rr,0,Math.PI*2);x.stroke()}}x.restore();
  }

  function lonLerp(a,b,t){let d=b-a;if(d>180)d-=360;if(d<-180)d+=360;let v=a+d*t;if(v>180)v-=360;if(v<-180)v+=360;return v}
  function sample(path,t){const n=path.length-1,i=Math.min(n-1,Math.floor(t*n)),u=t*n-i;return[path[i][0]+(path[i+1][0]-path[i][0])*u,lonLerp(path[i][1],path[i+1][1],u)]}
  function drawFlow(path,strong,t){x.save();x.globalCompositeOperation='screen';x.lineCap='round';x.lineJoin='round';x.strokeStyle=strong?'rgba(92,229,217,.60)':'rgba(91,203,196,.19)';x.lineWidth=strong?.9:.52;x.beginPath();let started=false;for(let i=0;i<=100;i++){const ll=sample(path,i/100),p=projectGeo(ll[0],ll[1]);if(!p){started=false;continue}if(!started){x.moveTo(p.x,p.y);started=true}else x.lineTo(p.x,p.y)}x.stroke();const count=strong?24:10;for(let i=0;i<count;i++){const ll=sample(path,(i/count+t*(strong?.034:.021))%1),p=projectGeo(ll[0],ll[1]);if(!p)continue;x.fillStyle=strong?'rgba(184,255,244,.82)':'rgba(132,228,217,.40)';x.beginPath();x.arc(p.x,p.y,strong?1.0:.55,0,Math.PI*2);x.fill()}x.restore()}
  function drawOceans(t){clear();cleanAroundGlobe();const focus=active('ocean','global');Object.entries(currents).forEach(([name,path])=>{const strong=focus!=='global'&&(name===focus||(focus==='pacific'&&name==='kuroshio'));if(focus!=='global'&&!strong)return;drawFlow(path,strong,t)})}

  function applyModeComposition(){
    const mode=app.dataset.experience;
    if(overlay)overlay.style.opacity=mode==='civilization'?'1':'0';
    if(mode==='orbit'){state.yaw=-1.05;state.pitch=.07}
    if(mode==='earthquakes'){state.yaw=-.28;state.pitch=.06}
    if(mode==='oceans'){state.yaw=-1.08;state.pitch=.04}
  }
  new MutationObserver(applyModeComposition).observe(app,{attributes:true,attributeFilter:['data-experience']});
  applyModeComposition();

  function frame(now){
    /* Cap this cosmetic layer near 30fps; real browser GPU rendering remains smooth without wasting work. */
    if(now-last<32){requestAnimationFrame(frame);return}
    const dt=Math.min(.08,(now-last)/1000||0);last=now;phase+=dt;
    switch(app.dataset.experience){case'planet':case'civilization':drawPlanet();break;case'orbit':drawOrbit(phase);break;case'moon':drawMoon();break;case'solar':drawSolar(phase);break;case'earthquakes':drawQuakes(phase);break;case'oceans':drawOceans(phase);break;default:clear()}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
