/* High-fidelity visual layer for the reference-video companion modes. */
(() => {
  const app=document.getElementById('app');
  const viewport=document.querySelector('.viewport');
  if(!app||!viewport)return;
  const canvas=document.createElement('canvas');
  canvas.className='cinematic-canvas';
  canvas.setAttribute('aria-hidden','true');
  viewport.insertBefore(canvas,document.querySelector('.vignette'));
  const x=canvas.getContext('2d',{alpha:true});
  let dpr=1,w=innerWidth,h=innerHeight,phase=0,last=performance.now();

  function resize(){
    w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
    x.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize',resize);resize();

  function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
  const starRnd=seeded(81813);
  const stars=Array.from({length:185},()=>({u:starRnd(),v:starRnd(),r:.2+starRnd()*.55,a:.08+starRnd()*.38}));
  const orbitRnd=seeded(22981);
  const orbitDots=Array.from({length:760},(_,i)=>({ring:i%24,a:orbitRnd()*Math.PI*2,s:.35+orbitRnd()*.9,sp:.025+orbitRnd()*.085,tilt:(orbitRnd()-.5)*1.52,spread:.94+orbitRnd()*.33,bright:orbitRnd()>.965}));
  const craterRnd=seeded(58411);
  const craters=Array.from({length:360},()=>({px:craterRnd()*2-1,py:craterRnd()*2-1,r:.003+Math.pow(craterRnd(),2.2)*.055,d:craterRnd(),e:.45+craterRnd()*.55})).filter(c=>c.px*c.px+c.py*c.py<.94);
  const maria=[[-.34,-.18,.29,.13,-.28],[-.06,-.31,.17,.11,.14],[.24,-.08,.21,.16,.33],[.16,.23,.14,.09,-.5],[-.26,.22,.13,.085,.44]];
  const quakePaths=[[[60,-150],[50,-130],[38,-123],[22,-106],[8,-84],[-20,-72],[-45,-74],[-55,-68]],[[55,160],[45,150],[35,140],[25,135],[15,125],[0,120],[-15,120],[-30,165],[-45,175]],[[-5,100],[-8,115],[-12,130],[-15,145],[-20,155]],[[65,-20],[45,-30],[20,-35],[0,-25],[-20,-15],[-45,-10]],[[38,20],[38,35],[35,50],[30,65],[28,80],[30,95]]];
  const quakeRnd=seeded(4417),quakePoints=[];
  quakePaths.forEach((path,pi)=>{for(let n=0;n<155;n++){const i=Math.floor(quakeRnd()*(path.length-1)),t=quakeRnd();let lonA=path[i][1],lonB=path[i+1][1],dl=lonB-lonA;if(dl>180)dl-=360;if(dl<-180)dl+=360;let lon=lonA+dl*t;if(lon>180)lon-=360;if(lon<-180)lon+=360;quakePoints.push({lat:path[i][0]+(path[i+1][0]-path[i][0])*t+(quakeRnd()-.5)*5.2,lon:lon+(quakeRnd()-.5)*5.2,m:2.5+Math.pow(quakeRnd(),3)*6.6,depth:quakeRnd()*700,path:pi})}});
  const currents={gulf:[[18,-82],[25,-78],[32,-73],[40,-62],[48,-42],[54,-22],[57,-5]],pacific:[[18,145],[24,160],[30,178],[34,-165],[32,-145],[26,-130],[18,-118]],southern:[[-52,-170],[-54,-120],[-52,-70],[-55,-20],[-52,35],[-55,90],[-54,145],[-52,179]],brazil:[[-8,-34],[-18,-39],[-30,-45],[-40,-50]],agulhas:[[-35,20],[-38,28],[-41,38],[-36,48],[-28,55]],kuroshio:[[12,128],[22,132],[30,138],[38,145],[43,158]],equatorial:[[4,-25],[2,15],[0,55],[-2,95],[-1,135],[2,175],[-1,-145],[-2,-105],[-1,-65]]};

  function clear(){x.clearRect(0,0,w,h)}
  function current(prefix){const b=document.querySelector(`#experiencePills button.active[data-exp-control^="${prefix}-"]`);return b?.dataset.expControl.slice(prefix.length+1)||'all'}
  function sparseStars(mult=1){
    x.save();
    for(const s of stars){x.globalAlpha=s.a*mult;x.fillStyle='#eef5f1';x.beginPath();x.arc(s.u*w,s.v*h,s.r,0,Math.PI*2);x.fill()}
    x.restore();
  }
  function ring(cx,cy,rx,ry,rot,alpha=.12){x.save();x.translate(cx,cy);x.rotate(rot);x.strokeStyle=`rgba(181,218,216,${alpha})`;x.lineWidth=.55;x.beginPath();x.ellipse(0,0,rx,ry,0,0,Math.PI*2);x.stroke();x.restore()}

  function drawOrbit(t){
    clear();
    if(typeof getSphereLayout!=='function')return;
    const L=getSphereLayout();
    const filter=current('orbit');
    x.save();
    for(let i=0;i<24;i++){
      const s=1.13+i*.035;
      ring(L.cx,L.cy,L.radius*s,L.radius*(.13+.021*(i%8)),(i-12)*.128,.045+(i%5===0?.05:0));
    }
    x.globalCompositeOperation='screen';
    for(const p of orbitDots){
      if(filter==='crewed'&&p.ring>2)continue;
      if(filter==='active'&&p.ring%4===0)continue;
      if(filter==='constellations'&&p.ring%2)continue;
      const rr=L.radius*(1.16+p.ring*.033)*p.spread,ang=p.a+t*p.sp;
      const px=Math.cos(ang)*rr,py=Math.sin(ang)*rr*(.13+.01*(p.ring%8));
      const c=Math.cos(p.tilt),s=Math.sin(p.tilt),xx=L.cx+px*c-py*s,yy=L.cy+px*s+py*c;
      x.globalAlpha=p.bright?.88:.21;
      x.fillStyle=p.bright?'#effff8':'#b5d7d5';
      x.fillRect(xx,yy,p.bright?1.5:.7,p.bright?1.5:.7);
    }
    x.globalCompositeOperation='source-over';x.globalAlpha=1;
    x.strokeStyle='rgba(203,231,225,.24)';x.lineWidth=.7;x.setLineDash([2,4]);
    x.beginPath();x.arc(L.cx,L.cy,L.radius*1.015,0,Math.PI*2);x.stroke();x.setLineDash([]);
    x.restore();
  }

  function drawMoon(){
    clear();sparseStars(.34);
    const mobile=w<=900;
    const mission=current('moon');
    const r=Math.min(w*(mobile?.37:.265),h*(mobile?.255:.405));
    const cx=mobile?w*.56:w*.63,cy=mobile?h*.31:h*.47;
    x.save();
    x.shadowColor='rgba(205,220,213,.16)';x.shadowBlur=22;
    x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.clip();
    const base=x.createRadialGradient(cx-r*.38,cy-r*.42,r*.03,cx+r*.18,cy+r*.16,r*1.12);
    base.addColorStop(0,'#e5e3dc');base.addColorStop(.26,'#c7c5bf');base.addColorStop(.58,'#8a8b87');base.addColorStop(.86,'#555854');base.addColorStop(1,'#242928');
    x.fillStyle=base;x.fillRect(cx-r,cy-r,r*2,r*2);
    x.globalCompositeOperation='multiply';
    for(const m of maria){x.save();x.translate(cx+m[0]*r,cy+m[1]*r);x.rotate(m[4]);const g=x.createRadialGradient(0,0,0,0,0,m[2]*r);g.addColorStop(0,'rgba(31,36,35,.45)');g.addColorStop(.72,'rgba(47,51,49,.31)');g.addColorStop(1,'rgba(45,48,46,0)');x.scale(1,m[3]/m[2]);x.fillStyle=g;x.beginPath();x.arc(0,0,m[2]*r,0,Math.PI*2);x.fill();x.restore()}
    x.globalCompositeOperation='source-over';
    for(const c of craters){
      const px=cx+c.px*r,py=cy+c.py*r,rr=c.r*r*(mission==='far'?1.16:1);
      const shade=.05+c.d*.09;
      x.fillStyle=`rgba(35,39,38,${shade})`;x.beginPath();x.ellipse(px+rr*.18,py+rr*.2,rr,rr*c.e,0,0,Math.PI*2);x.fill();
      x.strokeStyle=`rgba(244,243,235,${.035+c.d*.075})`;x.lineWidth=Math.max(.35,rr*.055);x.beginPath();x.ellipse(px-rr*.10,py-rr*.12,rr*.94,rr*.88*c.e,0,0,Math.PI*2);x.stroke();
    }
    const term=x.createLinearGradient(cx-r*.8,cy-r*.4,cx+r*.9,cy+r*.4);term.addColorStop(0,'rgba(255,255,255,.07)');term.addColorStop(.58,'rgba(0,0,0,0)');term.addColorStop(1,'rgba(0,6,7,.46)');x.fillStyle=term;x.fillRect(cx-r,cy-r,r*2,r*2);
    x.restore();
    x.strokeStyle='rgba(230,239,234,.17)';x.lineWidth=.65;x.beginPath();x.arc(cx,cy,r+.5,0,Math.PI*2);x.stroke();

    const er=r*.082,ex=cx-r*1.24,ey=cy-r*.68;
    const eg=x.createRadialGradient(ex-er*.38,ey-er*.42,1,ex,ey,er);eg.addColorStop(0,'#edf6ef');eg.addColorStop(.07,'#86bad0');eg.addColorStop(.45,'#2a738d');eg.addColorStop(.72,'#174c65');eg.addColorStop(1,'#08171b');x.fillStyle=eg;x.beginPath();x.arc(ex,ey,er,0,Math.PI*2);x.fill();
    x.strokeStyle='rgba(122,201,220,.22)';x.beginPath();x.arc(ex,ey,er+1,0,Math.PI*2);x.stroke();

    if(mission!=='overview'&&mission!=='far'){
      const label=mission==='apollo11'?'Apollo 11':mission==='apollo17'?'Apollo 17':'Chang’e 4';
      const mx=cx+r*(mission==='apollo17'?.08:.18),my=cy+r*(mission==='apollo17'?.18:.09);
      x.fillStyle='#e8f3ec';x.beginPath();x.arc(mx,my,2.1,0,Math.PI*2);x.fill();
      x.strokeStyle='rgba(232,243,236,.42)';x.lineWidth=.6;x.beginPath();x.moveTo(mx+5,my);x.lineTo(mx+35,my);x.stroke();
      x.font='500 7px ui-sans-serif, system-ui';x.fillStyle='rgba(239,246,241,.72)';x.fillText(label,mx+40,my+2.5);
    }
  }

  const solar=[
    {n:'Mercury',d:.13,sz:2.2,c:'#9b9b96',sp:1.9},
    {n:'Venus',d:.20,sz:3.3,c:'#c9a77b',sp:1.45},
    {n:'Earth',d:.29,sz:3.6,c:'#6ba6be',sp:1.13},
    {n:'Mars',d:.38,sz:2.8,c:'#b7684b',sp:.92},
    {n:'Jupiter',d:.53,sz:8.2,c:'#c4a487',sp:.46},
    {n:'Saturn',d:.67,sz:6.7,c:'#c8b98d',sp:.34},
    {n:'Uranus',d:.81,sz:5.1,c:'#84b9ba',sp:.25},
    {n:'Neptune',d:.94,sz:5.0,c:'#5573ab',sp:.20}
  ];
  function drawSolar(t){
    clear();sparseStars(.26);
    const mobile=w<=900,cx=mobile?w*.55:w*.60,cy=mobile?h*.34:h*.47,base=Math.min(w,h)*(mobile?.45:.56);
    const focus=current('solar');
    x.save();
    solar.forEach((p,i)=>ring(cx,cy,base*p.d,base*p.d*.33,-.11,.075+(i===2?.04:0)));
    x.shadowColor='rgba(255,170,62,.52)';x.shadowBlur=34;
    const sg=x.createRadialGradient(cx-5,cy-6,2,cx,cy,19);sg.addColorStop(0,'#fff4c8');sg.addColorStop(.22,'#ffd06b');sg.addColorStop(.58,'#f39a2f');sg.addColorStop(1,'#b94817');x.fillStyle=sg;x.beginPath();x.arc(cx,cy,16,0,Math.PI*2);x.fill();x.shadowBlur=0;
    solar.forEach((p,i)=>{
      const a=.25+i*.71+t*.038*p.sp,rx=base*p.d,ry=rx*.33,xx=cx+Math.cos(a)*rx*Math.cos(.11)-Math.sin(a)*ry*Math.sin(-.11),yy=cy+Math.cos(a)*rx*Math.sin(-.11)+Math.sin(a)*ry*Math.cos(.11);
      const selected=(focus==='all'&&p.n==='Earth')||focus===p.n.toLowerCase();
      const g=x.createRadialGradient(xx-p.sz*.35,yy-p.sz*.35,.2,xx,yy,p.sz*1.15);g.addColorStop(0,'#f0eee8');g.addColorStop(.28,p.c);g.addColorStop(1,'rgba(10,15,15,.92)');x.fillStyle=g;x.beginPath();x.arc(xx,yy,p.sz*(selected?1.15:1),0,Math.PI*2);x.fill();
      if(p.n==='Saturn'){x.strokeStyle='rgba(214,203,166,.62)';x.lineWidth=1.1;x.beginPath();x.ellipse(xx,yy,p.sz*1.9,p.sz*.48,-.18,0,Math.PI*2);x.stroke()}
      if(selected){x.strokeStyle='rgba(216,236,226,.50)';x.lineWidth=.65;x.beginPath();x.arc(xx,yy,p.sz+7,0,Math.PI*2);x.stroke();x.font='500 6.5px ui-sans-serif, system-ui';x.fillStyle='rgba(239,246,241,.66)';x.fillText(p.n,xx+p.sz+12,yy+2)}
    });
    x.restore();
  }

  function drawQuakes(t){
    clear();if(typeof projectGeo!=='function')return;
    const filter=current('quake');
    x.save();x.globalCompositeOperation='screen';
    for(const q of quakePoints){
      if(filter==='pacific'&&q.path>2)continue;if(filter==='deep'&&q.depth<350)continue;
      const p=projectGeo(q.lat,q.lon);if(!p)continue;
      const a=.12+Math.min(.48,(q.m-2.5)/9),r=Math.max(.45,(q.m-2.1)*.34);
      x.fillStyle=q.depth>350?`rgba(162,133,204,${a})`:q.m>6?`rgba(255,205,112,${a})`:`rgba(230,222,137,${a})`;
      x.beginPath();x.arc(p.x,p.y,r,0,Math.PI*2);x.fill();
    }
    if(filter==='japan'){
      const p=projectGeo(38.3,142.4);if(p){for(let i=0;i<3;i++){const rr=7+i*8+((t*8)%8);x.strokeStyle=`rgba(246,200,110,${.54-i*.13})`;x.lineWidth=.7;x.beginPath();x.arc(p.x,p.y,rr,0,Math.PI*2);x.stroke()}}
    }
    x.restore();
  }

  function lerpLon(a,b,t){let d=b-a;if(d>180)d-=360;if(d<-180)d+=360;let v=a+d*t;if(v>180)v-=360;if(v<-180)v+=360;return v}
  function sample(path,t){const n=path.length-1,i=Math.min(n-1,Math.floor(t*n)),u=t*n-i;return[path[i][0]+(path[i+1][0]-path[i][0])*u,lerpLon(path[i][1],path[i+1][1],u)]}
  function currentPath(path,strong,t){
    x.save();x.lineCap='round';x.lineJoin='round';x.globalCompositeOperation='screen';
    x.strokeStyle=strong?'rgba(92,231,220,.56)':'rgba(92,206,200,.17)';x.lineWidth=strong?1.05:.62;x.beginPath();let started=false;
    for(let i=0;i<=120;i++){const ll=sample(path,i/120),p=projectGeo(ll[0],ll[1]);if(!p){started=false;continue}if(!started){x.moveTo(p.x,p.y);started=true}else x.lineTo(p.x,p.y)}x.stroke();
    const count=strong?28:14;for(let i=0;i<count;i++){const u=(i/count+t*(strong?.035:.022))%1,ll=sample(path,u),p=projectGeo(ll[0],ll[1]);if(!p)continue;x.fillStyle=strong?'rgba(178,255,243,.86)':'rgba(130,228,218,.42)';x.beginPath();x.arc(p.x,p.y,strong?1.2:.72,0,Math.PI*2);x.fill()}
    x.restore();
  }
  function drawOceans(t){
    clear();if(typeof projectGeo!=='function')return;
    const focus=current('ocean');
    Object.entries(currents).forEach(([name,path])=>{const strong=focus!=='global'&&(name===focus||(focus==='pacific'&&name==='kuroshio'));if(focus!=='global'&&!strong)return;currentPath(path,strong,t)});
  }

  function frame(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;phase+=dt;
    switch(app.dataset.experience){
      case'orbit':drawOrbit(phase);break;
      case'moon':drawMoon();break;
      case'solar':drawSolar(phase);break;
      case'earthquakes':drawQuakes(phase);break;
      case'oceans':drawOceans(phase);break;
      default:clear();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
