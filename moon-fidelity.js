/* Final sharp lunar overlay. Uses NASA SVS's 2026 plain full-disk Moon render with a deterministic procedural fallback. */
(() => {
  const app=document.getElementById('app');
  const viewport=document.querySelector('.viewport');
  if(!app||!viewport)return;

  const canvas=document.createElement('canvas');
  canvas.className='moon-fidelity-canvas';
  canvas.setAttribute('aria-hidden','true');
  canvas.dataset.ready='false';
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',zIndex:'9'});
  viewport.insertBefore(canvas,document.querySelector('.vignette'));
  const ctx=canvas.getContext('2d',{alpha:true});
  const image=new Image();
  image.decoding='async';
  let w=innerWidth,h=innerHeight,dpr=1,useFallback=false,loadSettled=false;

  function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
  const rnd=seeded(5587);
  const craters=Array.from({length:260},()=>({x:rnd()*2-1,y:rnd()*2-1,r:.006+Math.pow(rnd(),2.2)*.045,a:.04+rnd()*.10})).filter(c=>c.x*c.x+c.y*c.y<.91);
  const maria=[[-.34,-.18,.30,.15],[-.06,-.31,.19,.12],[.24,-.08,.22,.16],[.15,.23,.14,.09],[-.25,.22,.14,.09]];

  function resize(){
    w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    render();
  }

  function mission(){
    const b=document.querySelector('#experiencePills button.active[data-exp-control^="moon-"]');
    return b?.dataset.expControl.slice(5)||'overview';
  }

  function drawFallbackMoon(cx,cy,r){
    const base=ctx.createRadialGradient(cx-r*.38,cy-r*.42,r*.02,cx+r*.14,cy+r*.12,r*1.13);
    base.addColorStop(0,'#deddd7');base.addColorStop(.30,'#b8b8b3');base.addColorStop(.64,'#777b78');base.addColorStop(1,'#252a29');
    ctx.fillStyle=base;ctx.fillRect(cx-r,cy-r,r*2,r*2);
    ctx.save();ctx.globalCompositeOperation='multiply';
    for(const m of maria){const g=ctx.createRadialGradient(cx+m[0]*r,cy+m[1]*r,0,cx+m[0]*r,cy+m[1]*r,m[2]*r);g.addColorStop(0,'rgba(41,45,44,.44)');g.addColorStop(1,'rgba(46,50,48,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx+m[0]*r,cy+m[1]*r,m[2]*r,m[3]*r,0,0,Math.PI*2);ctx.fill()}
    ctx.restore();
    for(const c of craters){const rr=c.r*r,px=cx+c.x*r,py=cy+c.y*r;ctx.fillStyle=`rgba(34,38,37,${c.a})`;ctx.beginPath();ctx.ellipse(px+rr*.18,py+rr*.18,rr,rr*.72,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(245,244,237,${c.a*.72})`;ctx.lineWidth=Math.max(.3,rr*.05);ctx.beginPath();ctx.ellipse(px-rr*.09,py-rr*.10,rr*.92,rr*.66,0,0,Math.PI*2);ctx.stroke()}
  }

  function render(){
    ctx.clearRect(0,0,w,h);
    if(app.dataset.experience!=='moon')return;
    const hasPhoto=image.complete&&image.naturalWidth&&!useFallback;
    if(!hasPhoto&&!useFallback)return;
    const mobile=w<=900;
    const r=Math.min(w*(mobile?.36:.255),h*(mobile?.25:.40));
    const cx=mobile?w*.56:w*.63,cy=mobile?h*.30:h*.465;

    ctx.save();
    ctx.shadowColor='rgba(208,220,214,.12)';ctx.shadowBlur=18;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
    if(hasPhoto){
      const side=Math.min(image.naturalHeight*.93,image.naturalWidth);
      const sx=(image.naturalWidth-side)/2,sy=(image.naturalHeight-side)/2;
      ctx.filter='contrast(1.05) brightness(.82) saturate(.78)';
      ctx.drawImage(image,sx,sy,side,side,cx-r,cy-r,r*2,r*2);
      ctx.filter='none';
    }else drawFallbackMoon(cx,cy,r);
    const shade=ctx.createLinearGradient(cx-r*.82,cy-r*.45,cx+r*.92,cy+r*.52);
    shade.addColorStop(0,'rgba(255,255,255,.025)');shade.addColorStop(.60,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,5,6,.30)');
    ctx.fillStyle=shade;ctx.fillRect(cx-r,cy-r,r*2,r*2);ctx.restore();

    ctx.strokeStyle='rgba(231,240,234,.18)';ctx.lineWidth=.55;ctx.beginPath();ctx.arc(cx,cy,r+.35,0,Math.PI*2);ctx.stroke();
    const m=mission();
    if(m!=='overview'&&m!=='far'){
      const label=m==='apollo11'?'Apollo 11':m==='apollo17'?'Apollo 17':'Chang’e 4';
      const mx=cx+r*(m==='apollo17'?.08:.19),my=cy+r*(m==='apollo17'?.16:.08);
      ctx.fillStyle='#eff8f2';ctx.beginPath();ctx.arc(mx,my,1.8,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(235,244,238,.48)';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(mx+4,my);ctx.lineTo(mx+31,my);ctx.stroke();
      ctx.font='500 6.5px ui-sans-serif,system-ui';ctx.fillStyle='rgba(240,247,242,.76)';ctx.fillText(label,mx+36,my+2.2);
    }
  }

  const fallbackTimer=setTimeout(()=>{
    if(loadSettled)return;
    useFallback=true;
    canvas.dataset.ready='fallback';
    app.dataset.moonSource='fallback-timeout';
    render();
  },4500);

  image.addEventListener('load',()=>{loadSettled=true;clearTimeout(fallbackTimer);useFallback=false;canvas.dataset.ready='true';app.dataset.moonSource='nasa';render()});
  image.addEventListener('error',()=>{loadSettled=true;clearTimeout(fallbackTimer);useFallback=true;canvas.dataset.ready='fallback';app.dataset.moonSource='fallback';render()});
  image.src='https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/preview_plain.jpg';
  addEventListener('resize',resize);
  new MutationObserver(render).observe(app,{attributes:true,attributeFilter:['data-experience']});
  document.addEventListener('click',e=>{if(e.target.closest('[data-exp-control^="moon-"]'))setTimeout(render,0)});
  resize();
})();