/* Final photographic Earth surface. This layer intentionally owns the visible
   present-day planet while the core renderer remains responsible for deep time. */
(() => {
  const app=document.getElementById('app');
  const viewport=document.querySelector('.viewport');
  if(!app||!viewport||typeof getSphereLayout!=='function')return;

  const legacyExperienceCanvas=document.getElementById('experienceCanvas');
  if(legacyExperienceCanvas){legacyExperienceCanvas.style.display='none';legacyExperienceCanvas.setAttribute('aria-hidden','true')}

  const canvas=document.createElement('canvas');
  canvas.className='final-earth-canvas';
  canvas.dataset.ready='loading';
  canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',zIndex:'6'});
  viewport.insertBefore(canvas,document.querySelector('.vignette'));

  let gl=null,program=null,buffer=null,dayTex=null,nightTex=null,ready=false;
  const loc={};
  const vs=`#version 300 es
  in vec2 aPosition;out vec2 vUv;
  void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const fs=`#version 300 es
  precision highp float;
  in vec2 vUv;out vec4 outColor;
  uniform vec2 uResolution;uniform vec2 uCenter;uniform float uRadius;
  uniform float uYaw;uniform float uPitch;uniform float uMode;
  uniform sampler2D uDay;uniform sampler2D uNight;
  #define PI 3.14159265359
  mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,-s,0.,s,c);}
  mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}
  vec3 saturateColor(vec3 c,float s){float l=dot(c,vec3(.299,.587,.114));return mix(vec3(l),c,s);}
  void main(){
    vec2 frag=vUv*uResolution;
    vec2 q=(frag-uCenter)/uRadius;q.y=-q.y;
    float r2=dot(q,q);
    if(r2>1.){outColor=vec4(0.);return;}
    float z=sqrt(max(0.,1.-r2));
    vec3 n=normalize(vec3(q.x,q.y,z));
    vec3 gn=rotX(-uPitch)*rotY(-uYaw)*n;
    float lon=atan(gn.z,gn.x),lat=asin(clamp(gn.y,-1.,1.));
    vec2 uv=vec2(fract(lon/(2.*PI)+.5),lat/PI+.5);
    vec3 day=texture(uDay,uv).rgb;
    vec3 night=texture(uNight,uv).rgb;
    day=saturateColor(day,1.18);
    day=pow(max(day,vec3(0.)),vec3(.88));
    vec3 sun=normalize(vec3(-.46,.22,.86));
    float ndl=dot(n,sun);
    float light=.48+.68*max(0.,ndl);
    float twilight=smoothstep(-.18,.18,ndl);
    vec3 col;
    if(uMode>.5&&uMode<1.5){
      vec3 ncol=saturateColor(night,1.12);
      ncol=pow(max(ncol,vec3(0.)),vec3(.78))*1.15;
      col=ncol*(.36+.64*smoothstep(-.32,.30,-ndl));
      col+=day*vec3(.025,.034,.052)*twilight;
    }else{
      col=day*light;
      col+=day*.13*pow(max(0.,ndl),3.2);
      if(uMode>1.5){
        col=mix(col,col*vec3(.48,.90,1.14)+vec3(.006,.038,.070),.42);
        col*=.91;
      }
    }
    float rim=pow(1.-z,3.15),edge=pow(1.-z,8.5);
    vec3 atm=uMode>1.5?vec3(.08,.58,.79):vec3(.10,.43,.72);
    col+=atm*rim*.18+atm*edge*.30;
    float alpha=smoothstep(.012,.075,z);
    outColor=vec4(col,alpha);
  }`;

  function compile(type,source){
    const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'shader compile failed');
    return sh;
  }
  function loadTexture(url){
    return new Promise((resolve,reject)=>{
      const img=new Image();img.crossOrigin='anonymous';img.decoding='async';
      img.onload=()=>{try{
        const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);resolve(t);
      }catch(e){reject(e)}};
      img.onerror=()=>reject(new Error(`texture failed: ${url}`));img.src=url;
    });
  }
  async function init(){
    try{
      gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false});
      if(!gl)throw new Error('WebGL2 unavailable');
      program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'program link failed');
      gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      ['uResolution','uCenter','uRadius','uYaw','uPitch','uMode','uDay','uNight'].forEach(n=>loc[n]=gl.getUniformLocation(program,n));
      gl.uniform1i(loc.uDay,0);gl.uniform1i(loc.uNight,1);

      // The critical rendering path is fully repository-local. Night imagery is
      // an optional enhancement and never blocks the Earth from becoming usable.
      dayTex=await loadTexture('/assets/earth/earth_atmos_2048.jpg');
      nightTex=dayTex;
      app.dataset.dayEarth='bundled';
      app.dataset.nightEarth='day-fallback';
      ready=true;canvas.dataset.ready='true';app.dataset.finalEarth='true';resize();

      const nightUrl='https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg';
      loadTexture(nightUrl).then(texture=>{
        nightTex=texture;
        app.dataset.nightEarth='photographic';
      }).catch(()=>{
        app.dataset.nightEarth='day-fallback';
      });
    }catch(e){canvas.dataset.ready='error';console.warn('Final photographic Earth unavailable; reference fallback remains active.',e)}
  }

  function resize(){
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);canvas.style.width=`${innerWidth}px`;canvas.style.height=`${innerHeight}px`;if(gl)gl.viewport(0,0,canvas.width,canvas.height);
  }
  addEventListener('resize',resize);resize();

  function shouldShow(){
    const e=state.experience||'planet';
    return ['orbit','earthquakes','oceans'].includes(e)||((e==='planet'||e==='civilization')&&state.ageMa<=.35);
  }
  function suppressFallbackLayers(show){
    const ref=document.querySelector('.reference-earth-canvas');if(ref)ref.style.setProperty('display','none','important');
    if(legacyExperienceCanvas)legacyExperienceCanvas.style.setProperty('display','none','important');
    if(elemsGlobe())elemsGlobe().style.opacity=show?'0':((state.experience==='moon'||state.experience==='solar')?'0':'1');
  }
  function elemsGlobe(){return document.getElementById('globe')}
  function modeNum(){const e=state.experience||'planet';return e==='earthquakes'?1:e==='oceans'?2:(state.mode==='dark'?1:state.mode==='blue'?2:0)}
  function render(){
    if(!ready||!gl)return;
    const show=shouldShow();canvas.style.opacity=show?'1':'0';suppressFallbackLayers(show);if(!show)return;
    const dpr=Math.min(devicePixelRatio||1,2),L=getSphereLayout();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
    gl.uniform2f(loc.uResolution,canvas.width,canvas.height);gl.uniform2f(loc.uCenter,L.cx*dpr,(L.h-L.cy)*dpr);gl.uniform1f(loc.uRadius,L.radius*dpr);
    gl.uniform1f(loc.uYaw,state.yaw);gl.uniform1f(loc.uPitch,state.pitch);gl.uniform1f(loc.uMode,modeNum());
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,dayTex);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,nightTex);gl.drawArrays(gl.TRIANGLES,0,3);
  }

  function finalComposition(){
    const e=state.experience||'planet';
    state.targetZoom=1;
    if(e==='planet'){state.yaw=-.36;state.pitch=.10;}
    else if(e==='orbit'){state.yaw=-.62;state.pitch=.08;}
    else if(e==='earthquakes'){state.yaw=.92;state.pitch=.08;}
    else if(e==='oceans'){
      const b=document.querySelector('#experiencePills button.active[data-exp-control^="ocean-"]');const f=b?.dataset.expControl.slice(6)||'global';
      state.yaw=f==='gulf'?-2.62:f==='pacific'?.92:f==='southern'?0:.92;state.pitch=f==='southern'?-0.18:.07;
    }
  }
  function settleComposition(){setTimeout(finalComposition,18)}
  new MutationObserver(settleComposition).observe(app,{attributes:true,attributeFilter:['data-experience']});
  document.addEventListener('click',e=>{if(e.target.closest('[data-exp-control], [data-experience-nav]'))settleComposition()});
  settleComposition();

  let last=0;
  function frame(t){if(t-last>20){last=t;render()}requestAnimationFrame(frame)}
  init();requestAnimationFrame(frame);
})();