/* Final reference-polish layer: organic ocean flow fields and a photographic mini-Earth beside the Moon. */
(() => {
  const app=document.getElementById('app');
  const viewport=document.querySelector('.viewport');
  if(!app||!viewport)return;

  const canvas=document.createElement('canvas');
  canvas.className='reference-polish-canvas';
  canvas.dataset.ready='loading';
  canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',zIndex:'9'});
  viewport.insertBefore(canvas,document.querySelector('.vignette'));
  const ctx=canvas.getContext('2d',{alpha:true});

  let w=innerWidth,h=innerHeight,dpr=1,phase=0,last=0;
  const OCEAN_SAMPLE_STEPS=72;
  const OCEAN_FRAME_MS=45;
  const blueMarble=new Image();
  blueMarble.decoding='async';
  blueMarble.src='/assets/earth/earth_atmos_2048.jpg';
  blueMarble.addEventListener('load',()=>{canvas.dataset.ready='true';app.dataset.referencePolish='true';});
  blueMarble.addEventListener('error',()=>{canvas.dataset.ready='fallback';app.dataset.referencePolish='fallback';});

  function resize(){
    w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize',resize);resize();

  function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
  const starRnd=seeded(902177);
  const stars=Array.from({length:180},()=>({u:starRnd(),v:starRnd(),r:.15+starRnd()*.42,a:.08+starRnd()*.34}));
  const strandRnd=seeded(447731);
  const strandNoise=Array.from({length:96},()=>({p1:strandRnd()*Math.PI*2,p2:strandRnd()*Math.PI*2,a:.62+strandRnd()*.65,w:.32+strandRnd()*.32,s:.75+strandRnd()*.7}));

  const currents={
    gulf:[[23,-81],[27,-79],[32,-76],[36,-72],[39,-66],[42,-59],[45,-50],[48,-40],[50,-30],[52,-20],[54,-10]],
    kuroshio:[[13,127],[20,130],[27,135],[33,140],[38,147],[42,156],[44,166]],
    pacific:[[20,145],[24,157],[28,171],[30,-175],[30,-160],[28,-145],[24,-131],[19,-119]],
    southern:[[-52,-178],[-53,-148],[-54,-115],[-53,-78],[-54,-38],[-52,4],[-53,45],[-54,86],[-53,126],[-54,158],[-52,179]],
    brazil:[[-8,-34],[-15,-37],[-23,-40],[-31,-45],[-39,-50]],
    agulhas:[[-34,20],[-37,27],[-40,36],[-40,44],[-36,51],[-29,56]],
    equatorial:[[4,-30],[3,6],[1,43],[-1,80],[-2,118],[0,155],[2,178],[0,-145],[-1,-108],[0,-71],[-1,-36]],
    canary:[[44,-15],[38,-18],[31,-20],[24,-20],[18,-17]],
    california:[[45,-128],[39,-126],[32,-123],[25,-119],[20,-114]],
    benguela:[[-18,10],[-24,8],[-30,8],[-35,11]],
    eastAus:[[-15,151],[-22,153],[-29,154],[-36,151],[-41,145]],
    northAtlantic:[[50,-48],[55,-39],[59,-29],[61,-18],[58,-5]],
    northPacific:[[39,-166],[43,-156],[47,-145],[49,-133],[45,-121]]
  };

  function clear(){ctx.clearRect(0,0,w,h)}
  function active(prefix,fallback='global'){
    const b=document.querySelector(`#experiencePills button.active[data-exp-control^="${prefix}-"]`);
    return b?.dataset.expControl.slice(prefix.length+1)||fallback;
  }
  function hideLegacyForPolishedMode(mode){
    const scene=document.querySelector('.reference-scene-canvas');
    if(scene)scene.style.opacity=(mode==='oceans'||mode==='moon')?'0':'1';
  }
  function sparseStars(mult=.26,exclusions=[]){
    ctx.save();ctx.fillStyle='#eff7f3';
    for(const s of stars){
      const px=s.u*w,py=s.v*h;
      if(exclusions.some(c=>Math.hypot(px-c.x,py-c.y)<c.r))continue;
      ctx.globalAlpha=s.a*mult;ctx.beginPath();ctx.arc(px,py,s.r,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function lonLerp(a,b,t){let d=b-a;if(d>180)d-=360;if(d<-180)d+=360;let v=a+d*t;if(v>180)v-=360;if(v<-180)v+=360;return v}
  function sample(path,t){
    const n=path.length-1,i=Math.min(n-1,Math.floor(t*n)),u=t*n-i;
    return [path[i][0]+(path[i+1][0]-path[i][0])*u,lonLerp(path[i][1],path[i+1][1],u)];
  }
  function strandPoint(path,u,index,count){
    const base=sample(path,Math.max(0,Math.min(1,u)));
    const meta=strandNoise[index%strandNoise.length];
    const normalized=count<=1?0:(index/(count-1)-.5)*2;
    const envelope=Math.sin(Math.PI*Math.max(0,Math.min(1,u)));
    const latSpread=normalized*1.75*envelope;
    const curl=Math.sin(u*Math.PI*3.4+meta.p1)*.34*envelope+Math.sin(u*Math.PI*7.2+meta.p2)*.12*envelope;
    const lonCurl=Math.sin(u*Math.PI*2.3+meta.p2)*.32*envelope+normalized*.28*envelope;
    return [base[0]+latSpread+curl,base[1]+lonCurl];
  }
  function project(path,u,index,count){
    if(typeof projectGeo!=='function')return null;
    const ll=strandPoint(path,u,index,count);return projectGeo(ll[0],ll[1]);
  }
  function drawStrand(path,index,count,strong,t){
    const meta=strandNoise[index%strandNoise.length];
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle=strong?`rgba(76,211,202,${.072+meta.a*.050})`:`rgba(65,178,174,${.032+meta.a*.028})`;
    ctx.lineWidth=(strong?.42:.27)*meta.w/.48;
    ctx.shadowColor=strong?'rgba(87,236,222,.22)':'rgba(70,190,184,.08)';ctx.shadowBlur=strong?2:1;
    ctx.beginPath();let begun=false;
    for(let i=0;i<=OCEAN_SAMPLE_STEPS;i++){
      const u=i/OCEAN_SAMPLE_STEPS,p=project(path,u,index,count);
      if(!p){begun=false;continue}
      if(!begun){ctx.moveTo(p.x,p.y);begun=true}else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();ctx.shadowBlur=0;

    const movers=strong?4:1;
    for(let k=0;k<movers;k++){
      const u=(t*(strong?.028:.018)*meta.s+k/movers+index*.037)%1;
      const p1=project(path,u,index,count),p2=project(path,Math.min(.999,u+.014),index,count);
      if(!p1||!p2)continue;
      ctx.strokeStyle=strong?'rgba(183,252,242,.64)':'rgba(122,225,215,.30)';
      ctx.lineWidth=strong?.70:.42;ctx.shadowColor='rgba(139,255,239,.48)';ctx.shadowBlur=strong?3.4:1.8;
      ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
      ctx.fillStyle=strong?'rgba(220,255,249,.70)':'rgba(160,235,226,.36)';ctx.beginPath();ctx.arc(p2.x,p2.y,strong?.58:.38,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function drawCurrentFamily(path,strong,t){
    const count=strong?18:6;
    for(let i=0;i<count;i++)drawStrand(path,i,count,strong,t);
  }
  function drawOceanTint(L){
    ctx.save();
    const g=ctx.createRadialGradient(L.cx-L.radius*.22,L.cy-L.radius*.20,L.radius*.15,L.cx,L.cy,L.radius*1.03);
    g.addColorStop(0,'rgba(0,34,46,.05)');g.addColorStop(.70,'rgba(0,25,39,.10)');g.addColorStop(1,'rgba(0,10,20,.22)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(L.cx,L.cy,L.radius,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(93,211,218,.10)';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(L.cx,L.cy,L.radius+.4,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  function drawOceans(t){
    clear();const L=typeof getSphereLayout==='function'?getSphereLayout():null;
    if(L)drawOceanTint(L);
    sparseStars(.10,L?[{x:L.cx,y:L.cy,r:L.radius*1.035}]:[]);
    const focus=active('ocean','global');
    Object.entries(currents).forEach(([name,path])=>{
      const match=focus==='global'||name===focus||(focus==='pacific'&&(name==='pacific'||name==='kuroshio'||name==='northPacific'))||(focus==='southern'&&name==='southern');
      if(!match)return;drawCurrentFamily(path,focus!=='global',t);
    });
  }

  function drawPhotographicMiniEarth(cx,cy,r){
    ctx.save();
    ctx.shadowColor='rgba(97,190,222,.22)';ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
    if(blueMarble.complete&&blueMarble.naturalWidth){
      const iw=blueMarble.naturalWidth,ih=blueMarble.naturalHeight;
      const sx=iw*.18,sy=ih*.12,sw=iw*.58,sh=ih*.76;
      ctx.filter='saturate(1.08) contrast(1.05) brightness(.93)';
      ctx.drawImage(blueMarble,sx,sy,sw,sh,cx-r,cy-r,r*2,r*2);ctx.filter='none';
    }else{
      const g=ctx.createRadialGradient(cx-r*.35,cy-r*.38,1,cx,cy,r);g.addColorStop(0,'#8dccdf');g.addColorStop(.55,'#246b89');g.addColorStop(1,'#061519');ctx.fillStyle=g;ctx.fillRect(cx-r,cy-r,r*2,r*2);
    }
    const shade=ctx.createRadialGradient(cx-r*.30,cy-r*.30,r*.08,cx+r*.18,cy+r*.18,r*1.08);shade.addColorStop(0,'rgba(255,255,255,.06)');shade.addColorStop(.56,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,5,8,.68)');ctx.fillStyle=shade;ctx.fillRect(cx-r,cy-r,r*2,r*2);
    ctx.restore();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(104,196,222,.38)';ctx.lineWidth=.65;ctx.beginPath();ctx.arc(cx,cy,r+.55,0,Math.PI*2);ctx.stroke();
  }
  function drawMoon(){
    clear();
    const mobile=w<=900,r=Math.min(w*(mobile?.36:.255),h*(mobile?.25:.40)),cx=mobile?w*.56:w*.63,cy=mobile?h*.30:h*.465;
    const er=r*(mobile?.105:.115),ex=cx-r*1.28,ey=cy-r*.69;
    sparseStars(.24,[{x:cx,y:cy,r:r*1.02},{x:ex,y:ey,r:er*1.15}]);
    drawPhotographicMiniEarth(ex,ey,er);
  }

  function frame(now){
    if(now-last<OCEAN_FRAME_MS){requestAnimationFrame(frame);return}
    const dt=Math.min(.08,(now-last)/1000||0);last=now;phase+=dt;
    const mode=app.dataset.experience||state.experience||'planet';hideLegacyForPolishedMode(mode);
    if(mode==='oceans')drawOceans(phase);else if(mode==='moon')drawMoon();else clear();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();