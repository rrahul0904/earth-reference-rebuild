/* Final composition pass after screenshot comparison with the supplied reference video.
   Keeps Oceans dark/cinematic and removes non-reference card clutter. */
(() => {
  const app=document.getElementById('app');
  const viewport=document.querySelector('.viewport');
  if(!app||!viewport)return;

  const shade=document.createElement('canvas');
  shade.className='reference-finalizer-canvas';
  shade.dataset.ready='true';
  shade.setAttribute('aria-hidden','true');
  Object.assign(shade.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',zIndex:'8'});
  const vignette=document.querySelector('.vignette');
  viewport.insertBefore(shade,vignette);
  const x=shade.getContext('2d',{alpha:true});
  let w=innerWidth,h=innerHeight,dpr=1;

  function resize(){
    w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    shade.width=Math.round(w*dpr);shade.height=Math.round(h*dpr);
    shade.style.width=`${w}px`;shade.style.height=`${h}px`;
    x.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  addEventListener('resize',resize);

  function active(prefix,fallback='all'){
    const b=document.querySelector(`#experiencePills button.active[data-exp-control^="${prefix}-"]`);
    return b?.dataset.expControl.slice(prefix.length+1)||fallback;
  }

  function tuneChrome(){
    const e=app.dataset.experience||'planet';
    const card=document.getElementById('experienceCard');
    if(!card)return;
    let show=true;
    if(e==='moon'||e==='solar'||e==='oceans')show=false;
    else if(e==='orbit'&&active('orbit','all')==='all')show=false;
    else if(e==='earthquakes'&&active('quake','all')==='all')show=false;
    card.style.display=show?'':'none';

    const panel=document.getElementById('experiencePanel');
    if(panel){
      panel.style.width=(e==='moon'||e==='solar'||e==='oceans')?'auto':'';
      panel.style.maxWidth=(e==='moon'||e==='solar'||e==='oceans')?'230px':'';
    }
  }

  function drawOceanShade(){
    if(typeof getSphereLayout!=='function')return;
    const L=getSphereLayout();
    x.save();
    x.beginPath();x.arc(L.cx,L.cy,L.radius,0,Math.PI*2);x.clip();

    // Reference Oceans view is deliberately subdued: surface detail remains visible,
    // while the ocean-flow filaments become the principal visual signal.
    x.fillStyle='rgba(0,8,15,.48)';x.fillRect(L.cx-L.radius,L.cy-L.radius,L.radius*2,L.radius*2);
    const g=x.createRadialGradient(L.cx-L.radius*.16,L.cy+L.radius*.03,L.radius*.04,L.cx,L.cy,L.radius*1.02);
    g.addColorStop(0,'rgba(19,98,119,.22)');
    g.addColorStop(.28,'rgba(5,44,59,.13)');
    g.addColorStop(.67,'rgba(0,16,27,.12)');
    g.addColorStop(1,'rgba(0,3,8,.42)');
    x.fillStyle=g;x.fillRect(L.cx-L.radius,L.cy-L.radius,L.radius*2,L.radius*2);
    x.restore();

    x.save();
    x.strokeStyle='rgba(63,175,205,.30)';x.lineWidth=.7;
    x.shadowColor='rgba(40,159,202,.22)';x.shadowBlur=12;
    x.beginPath();x.arc(L.cx,L.cy,L.radius+.35,0,Math.PI*2);x.stroke();
    x.restore();
  }

  function draw(){
    x.clearRect(0,0,w,h);
    if((app.dataset.experience||'planet')==='oceans')drawOceanShade();
    tuneChrome();
  }

  const observer=new MutationObserver(draw);
  observer.observe(app,{attributes:true,attributeFilter:['data-experience']});
  const pills=document.getElementById('experiencePills');
  if(pills)observer.observe(pills,{subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',()=>setTimeout(draw,0));
  app.dataset.referenceFinalizer='true';
  resize();
})();
