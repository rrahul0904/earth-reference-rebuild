/* Final sharp lunar overlay. Uses NASA SVS's 2026 plain full-disk Moon render to avoid visible mosaic tiling. */
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
  image.src='https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/preview_plain.jpg';
  let w=innerWidth,h=innerHeight,dpr=1;

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

  function render(){
    ctx.clearRect(0,0,w,h);
    if(app.dataset.experience!=='moon'||!image.complete||!image.naturalWidth)return;
    const mobile=w<=900;
    const r=Math.min(w*(mobile?.36:.255),h*(mobile?.25:.40));
    const cx=mobile?w*.56:w*.63,cy=mobile?h*.30:h*.465;
    const side=Math.min(image.naturalHeight*.93,image.naturalWidth);
    const sx=(image.naturalWidth-side)/2,sy=(image.naturalHeight-side)/2;

    ctx.save();
    ctx.shadowColor='rgba(208,220,214,.12)';ctx.shadowBlur=18;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
    ctx.filter='contrast(1.05) brightness(.82) saturate(.78)';
    ctx.drawImage(image,sx,sy,side,side,cx-r,cy-r,r*2,r*2);
    ctx.filter='none';
    const shade=ctx.createLinearGradient(cx-r*.82,cy-r*.45,cx+r*.92,cy+r*.52);
    shade.addColorStop(0,'rgba(255,255,255,.025)');
    shade.addColorStop(.60,'rgba(0,0,0,0)');
    shade.addColorStop(1,'rgba(0,5,6,.30)');
    ctx.fillStyle=shade;ctx.fillRect(cx-r,cy-r,r*2,r*2);
    ctx.restore();

    ctx.strokeStyle='rgba(231,240,234,.18)';ctx.lineWidth=.55;
    ctx.beginPath();ctx.arc(cx,cy,r+.35,0,Math.PI*2);ctx.stroke();

    const m=mission();
    if(m!=='overview'&&m!=='far'){
      const label=m==='apollo11'?'Apollo 11':m==='apollo17'?'Apollo 17':'Chang’e 4';
      const mx=cx+r*(m==='apollo17'?.08:.19),my=cy+r*(m==='apollo17'?.16:.08);
      ctx.fillStyle='#eff8f2';ctx.beginPath();ctx.arc(mx,my,1.8,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(235,244,238,.48)';ctx.lineWidth=.5;
      ctx.beginPath();ctx.moveTo(mx+4,my);ctx.lineTo(mx+31,my);ctx.stroke();
      ctx.font='500 6.5px ui-sans-serif,system-ui';ctx.fillStyle='rgba(240,247,242,.76)';
      ctx.fillText(label,mx+36,my+2.2);
    }
  }

  image.addEventListener('load',()=>{canvas.dataset.ready='true';render()});
  image.addEventListener('error',()=>{canvas.dataset.ready='error'});
  addEventListener('resize',resize);
  new MutationObserver(render).observe(app,{attributes:true,attributeFilter:['data-experience']});
  document.addEventListener('click',e=>{if(e.target.closest('[data-exp-control^="moon-"]'))setTimeout(render,0)});
  resize();
})();
