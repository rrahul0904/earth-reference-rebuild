/* Reference-grade visual renderer. Replaces the prototype-looking companion art
   with a sharper photographic Earth pipeline and denser reference-style scenes. */
(() => {
  const app = document.getElementById('app');
  const viewport = document.querySelector('.viewport');
  const overlay = document.getElementById('overlay');
  if (!app || !viewport || typeof getSphereLayout !== 'function') return;

  app.dataset.visualGrade = 'reference-v3';
  document.querySelectorAll('.cinematic-canvas,.reviewed-cinematic-canvas').forEach(c => {
    c.style.opacity = '0';
    c.style.pointerEvents = 'none';
  });

  const originalLayout = getSphereLayout;
  function active(prefix, fallback = 'all') {
    const b = document.querySelector(`#experiencePills button.active[data-exp-control^="${prefix}-"]`);
    return b?.dataset.expControl.slice(prefix.length + 1) || fallback;
  }

  getSphereLayout = function referenceLayout() {
    const w = innerWidth, h = innerHeight, mobile = w <= 900;
    const mode = state.experience || 'planet';
    let radius;
    if (mode === 'orbit') {
      const overview = active('orbit') === 'all';
      radius = overview
        ? Math.min(w * (mobile ? .11 : .058), h * (mobile ? .085 : .095))
        : Math.min(w * (mobile ? .29 : .145), h * (mobile ? .20 : .235));
      return { w, h, cx: mobile ? w * .52 : w * .625, cy: mobile ? h * .29 : h * .465, radius: radius * state.zoom };
    }
    if (mode === 'earthquakes') {
      radius = Math.min(w * (mobile ? .37 : .195), h * (mobile ? .245 : .31));
      return { w, h, cx: mobile ? w * .52 : w * .615, cy: mobile ? h * .30 : h * .46, radius: radius * state.zoom };
    }
    if (mode === 'oceans') {
      radius = Math.min(w * (mobile ? .38 : .205), h * (mobile ? .25 : .325));
      return { w, h, cx: mobile ? w * .52 : w * .62, cy: mobile ? h * .30 : h * .46, radius: radius * state.zoom };
    }
    if (mode === 'planet' || mode === 'civilization') {
      radius = Math.min(w * (mobile ? .39 : .19), h * (mobile ? .26 : .305));
      return { w, h, cx: mobile ? w * .52 : w * .625, cy: mobile ? h * .30 : h * .46, radius: radius * state.zoom };
    }
    return originalLayout();
  };

  const earth = document.createElement('canvas');
  earth.className = 'reference-earth-canvas';
  earth.dataset.ready = 'loading';
  earth.setAttribute('aria-hidden', 'true');
  viewport.insertBefore(earth, document.querySelector('.vignette'));

  let eg = null, ep = null, eb = null, earthReady = false;
  const eu = {}, et = {};
  const evs = `#version 300 es
    in vec2 aPosition;
    out vec2 vUv;
    void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const efs = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uRadius;
    uniform float uYaw;
    uniform float uPitch;
    uniform float uMode;
    uniform float uTime;
    uniform sampler2D uDay;
    uniform sampler2D uNight;
    uniform sampler2D uCloud;
    #define PI 3.14159265359
    mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,-s,0.,s,c);}
    mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}
    void main(){
      vec2 frag=vUv*uResolution;
      vec2 q=(frag-uCenter)/uRadius;q.y=-q.y;
      float r2=dot(q,q);
      if(r2>1.0){outColor=vec4(0.0);return;}
      float z=sqrt(max(0.0,1.0-r2));
      vec3 n=normalize(vec3(q.x,q.y,z));
      vec3 gn=rotX(-uPitch)*rotY(-uYaw)*n;
      float lon=atan(gn.z,gn.x);
      float lat=asin(clamp(gn.y,-1.0,1.0));
      vec2 uv=vec2(fract(lon/(2.0*PI)+.5),lat/PI+.5);
      vec3 day=texture(uDay,uv).rgb;
      vec3 night=texture(uNight,uv).rgb;
      vec3 cloudTex=texture(uCloud,vec2(fract(uv.x+uTime*.0006),uv.y)).rgb;
      float cloud=smoothstep(.44,.78,max(max(cloudTex.r,cloudTex.g),cloudTex.b));
      vec3 sunDir=normalize(vec3(-.42,.22,.92));
      float ndl=dot(n,sunDir);
      float lit=smoothstep(-.16,.28,ndl);
      float soft=.28+.80*max(0.0,ndl);
      vec3 col;
      if(uMode>.5&&uMode<1.5){
        vec3 cities=pow(max(night,vec3(0.0)),vec3(.78))*1.28;
        vec3 faint=day*vec3(.022,.035,.045);
        col=mix(faint,cities,smoothstep(.06,.42,max(max(cities.r,cities.g),cities.b)));
        col+=vec3(.055,.14,.22)*pow(max(0.0,ndl),2.0)*.20;
        col=mix(col,vec3(.77,.82,.83),cloud*.10*(.18+.82*lit));
      } else {
        col=day*soft;
        if(uMode>1.5) col=mix(col,col*vec3(.58,.96,1.15)+vec3(.015,.055,.07),.45);
        col=mix(col,vec3(.94,.97,.96),cloud*.50*lit);
        col+=day*.12*pow(max(0.0,ndl),3.0);
      }
      float rim=pow(1.0-z,3.2);
      float edge=pow(1.0-z,8.0);
      vec3 atm=uMode>1.5?vec3(.12,.63,.78):vec3(.20,.48,.70);
      col+=atm*rim*.18+atm*edge*.28;
      float limb=smoothstep(.018,.10,z);
      outColor=vec4(pow(max(col,vec3(0.0)),vec3(.94)),limb);
    }`;

  function compile(gl, type, source) {
    const sh = gl.createShader(type); gl.shaderSource(sh, source); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }
  function solid(gl, rgba) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(rgba));
    return t;
  }
  function loadTexture(gl, url, fallback) {
    return new Promise(resolve => {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.decoding = 'async';
      img.onload = () => {
        try {
          const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
          gl.generateMipmap(gl.TEXTURE_2D); resolve(t);
        } catch { resolve(solid(gl,fallback)); }
      };
      img.onerror = () => resolve(solid(gl,fallback));
      img.src = url;
    });
  }
  async function initEarth() {
    try {
      eg = earth.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false});
      if (!eg) throw new Error('WebGL2 unavailable');
      ep=eg.createProgram(); eg.attachShader(ep,compile(eg,eg.VERTEX_SHADER,evs)); eg.attachShader(ep,compile(eg,eg.FRAGMENT_SHADER,efs)); eg.linkProgram(ep);
      if(!eg.getProgramParameter(ep,eg.LINK_STATUS))throw new Error(eg.getProgramInfoLog(ep));
      eg.useProgram(ep);
      eb=eg.createBuffer();eg.bindBuffer(eg.ARRAY_BUFFER,eb);eg.bufferData(eg.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),eg.STATIC_DRAW);
      const pos=eg.getAttribLocation(ep,'aPosition');eg.enableVertexAttribArray(pos);eg.vertexAttribPointer(pos,2,eg.FLOAT,false,0,0);
      ['uResolution','uCenter','uRadius','uYaw','uPitch','uMode','uTime','uDay','uNight','uCloud'].forEach(n=>eu[n]=eg.getUniformLocation(ep,n));
      eg.uniform1i(eu.uDay,0);eg.uniform1i(eu.uNight,1);eg.uniform1i(eu.uCloud,2);
      const dayURL='https://raw.githubusercontent.com/pjcigan/skyplothelper/main/examples/data/world.topo.bathy.200412.3x5400x2700.jpg';
      const nightURL='https://raw.githubusercontent.com/pjcigan/skyplothelper/main/examples/data/BlackMarble_2016_01deg.jpg';
      const cloudURL='https://raw.githubusercontent.com/turban/webgl-earth/master/images/fair_clouds_4k.png';
      const [day,night,cloud]=await Promise.all([
        loadTexture(eg,dayURL,[45,86,105,255]),
        loadTexture(eg,nightURL,[2,8,12,255]),
        loadTexture(eg,cloudURL,[0,0,0,255])
      ]);
      et.day=day;et.night=night;et.cloud=cloud;earthReady=true;earth.dataset.ready='true';app.dataset.hiresEarth='true';resizeLayers();
    } catch(e) {
      console.warn('Reference Earth layer unavailable; keeping core renderer.',e);
      earth.dataset.ready='fallback';
    }
  }

  const scene = document.createElement('canvas');
  scene.className = 'reference-scene-canvas';
  scene.setAttribute('aria-hidden','true');
  viewport.insertBefore(scene, document.querySelector('.vignette'));
  const x=scene.getContext('2d',{alpha:true});
  let w=innerWidth,h=innerHeight,dpr=1,phase=0,last=0;

  function resizeLayers(){
    w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    for(const c of [earth,scene]){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.style.width=`${w}px`;c.style.height=`${h}px`;}
    if(eg)eg.viewport(0,0,earth.width,earth.height);
    x.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize',resizeLayers);resizeLayers();

  function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
  const sr=seeded(331977);
  const stars=Array.from({length:320},()=>({u:sr(),v:sr(),r:.18+sr()*.52,a:.10+sr()*.52}));
  const or=seeded(71321);
  const orbitDots=Array.from({length:1150},(_,i)=>({ring:i%34,a:or()*Math.PI*2,tilt:(or()-.5)*1.82,spread:.88+or()*.24,sp:.010+or()*.055,hot:or()>.985}));
  const qr=seeded(9207), quakePoints=[];
  const quakePaths=[
    [[64,-155],[54,-136],[42,-126],[30,-116],[18,-104],[6,-89],[-16,-76],[-36,-73],[-53,-69]],
    [[58,165],[47,151],[37,142],[25,137],[13,125],[0,121],[-14,121],[-27,153],[-42,174]],
    [[8,96],[-3,101],[-9,112],[-13,126],[-18,142],[-22,157]],
    [[68,-21],[46,-31],[22,-35],[0,-25],[-25,-16],[-48,-9]],
    [[39,16],[40,31],[37,49],[31,66],[29,82],[31,97]],
    [[35,-8],[35,10],[34,28],[31,45],[28,62]]
  ];
  quakePaths.forEach((path,pi)=>{for(let n=0;n<150;n++){const i=Math.floor(qr()*(path.length-1)),t=qr();let a=path[i][1],b=path[i+1][1],d=b-a;if(d>180)d-=360;if(d<-180)d+=360;let lon=a+d*t;if(lon>180)lon-=360;if(lon<-180)lon+=360;quakePoints.push({lat:path[i][0]+(path[i+1][0]-path[i][0])*t+(qr()-.5)*4.4,lon:lon+(qr()-.5)*4.4,m:2.2+Math.pow(qr(),3.2)*7.1,depth:qr()*700,path:pi});}});

  const currentPaths={
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
    eastAus:[[-15,151],[-24,154],[-34,151],[-41,145]]
  };

  const solar=[
    {n:'Mercury',d:.11,sz:2.7,c:'#aaa8a0',sp:2.0},
    {n:'Venus',d:.17,sz:4.1,c:'#d0aa76',sp:1.5},
    {n:'Earth',d:.24,sz:4.6,c:'#6aaed0',sp:1.14},
    {n:'Mars',d:.32,sz:3.4,c:'#b95f46',sp:.91},
    {n:'Jupiter',d:.46,sz:10.5,c:'#c8a889',sp:.47},
    {n:'Saturn',d:.60,sz:8.7,c:'#c9bb8d',sp:.34},
    {n:'Uranus',d:.75,sz:6.3,c:'#81c1c6',sp:.25},
    {n:'Neptune',d:.90,sz:6.1,c:'#536fa9',sp:.20}
  ];

  function clearScene(){x.clearRect(0,0,w,h);}
  function drawStars(mult=.68){x.save();x.fillStyle='#f4f8f5';for(const s of stars){x.globalAlpha=s.a*mult;x.beginPath();x.arc(s.u*w,s.v*h,s.r,0,Math.PI*2);x.fill();}x.restore();}
  function ellipse(cx,cy,rx,ry,rot,alpha=.14,width=.6){x.save();x.translate(cx,cy);x.rotate(rot);x.strokeStyle=`rgba(199,222,217,${alpha})`;x.lineWidth=width;x.beginPath();x.ellipse(0,0,rx,ry,0,0,Math.PI*2);x.stroke();x.restore();}

  function renderEarth(now){
    if(!earthReady||!eg)return;
    const exp=state.experience||'planet';
    const earthMode=['planet','civilization','orbit','earthquakes','oceans'].includes(exp);
    const use=earthMode && (state.ageMa<=.35 || exp!=='planet');
    earth.style.opacity=use?'1':'0';
    if(exp==='moon'||exp==='solar') els.globe.style.opacity='0';
    else if(use) els.globe.style.opacity='0';
    else if(exp==='planet'||exp==='civilization') els.globe.style.opacity='1';
    if(!use)return;
    const L=getSphereLayout();
    eg.useProgram(ep);
    eg.uniform2f(eu.uResolution,earth.width,earth.height);
    eg.uniform2f(eu.uCenter,L.cx*dpr,(L.h-L.cy)*dpr);
    eg.uniform1f(eu.uRadius,L.radius*dpr);
    eg.uniform1f(eu.uYaw,state.yaw);eg.uniform1f(eu.uPitch,state.pitch);
    const mode=exp==='earthquakes'?1:exp==='oceans'?2:(state.mode==='dark'?1:state.mode==='blue'?2:0);
    eg.uniform1f(eu.uMode,mode);eg.uniform1f(eu.uTime,now*.001);
    eg.activeTexture(eg.TEXTURE0);eg.bindTexture(eg.TEXTURE_2D,et.day);
    eg.activeTexture(eg.TEXTURE1);eg.bindTexture(eg.TEXTURE_2D,et.night);
    eg.activeTexture(eg.TEXTURE2);eg.bindTexture(eg.TEXTURE_2D,et.cloud);
    eg.drawArrays(eg.TRIANGLES,0,3);
  }

  function drawPlanet(){clearScene();drawStars(.34);}
  function drawOrbit(t){
    clearScene();drawStars(.54);
    const L=getSphereLayout(),filter=active('orbit'),overview=filter==='all';
    const orbitBase=overview?Math.min(w*.23,h*.36):L.radius*1.18;
    const cx=L.cx,cy=L.cy;
    const rings=overview?34:(filter==='crewed'?4:22);
    for(let i=0;i<rings;i++){
      const f=overview?(.48+i/rings*.92):(1+i/rings*.75);
      const rx=overview?orbitBase*f:L.radius*f;
      const ry=rx*(overview?(.12+.16*((i%7)/7)):(.10+.08*((i%6)/6)));
      ellipse(cx,cy,rx,ry,(i-rings/2)*.082,.038+(i%8===0?.065:0),.48);
    }
    x.save();x.globalCompositeOperation='screen';
    for(const p of orbitDots){
      if(filter==='crewed'&&p.ring>3)continue;
      if(filter==='active'&&p.ring%4===0)continue;
      if(filter==='constellations'&&p.ring%3!==0)continue;
      const rr=overview?orbitBase*(.52+p.ring/34*.86)*p.spread:L.radius*(1.12+p.ring*.024)*p.spread;
      const ang=p.a+t*p.sp;
      const py=Math.sin(ang)*rr*(.12+.18*((p.ring%8)/8));
      const px=Math.cos(ang)*rr, c=Math.cos(p.tilt),s=Math.sin(p.tilt);
      const xx=cx+px*c-py*s,yy=cy+px*s+py*c;
      x.globalAlpha=p.hot?.95:(overview?.33:.25);x.fillStyle=p.hot?'#f2fff8':'#a9d0ca';
      x.beginPath();x.arc(xx,yy,p.hot?1.05:(overview?.47:.42),0,Math.PI*2);x.fill();
    }
    x.restore();
    if(overview){
      x.font='500 7px ui-sans-serif,system-ui';x.fillStyle='rgba(225,239,233,.42)';
      x.fillText('LEO',cx-orbitBase*.48,cy+orbitBase*.23);
      x.fillText('MEO',cx+orbitBase*.37,cy-orbitBase*.16);
      x.fillText('GEO',cx+orbitBase*.82,cy+4);
    }
  }

  function drawSmallEarth(cx,cy,r){
    const g=x.createRadialGradient(cx-r*.35,cy-r*.35,1,cx,cy,r);g.addColorStop(0,'#cceef0');g.addColorStop(.13,'#5ab0c7');g.addColorStop(.52,'#1d708b');g.addColorStop(1,'#06191e');
    x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();
    x.globalAlpha=.65;x.fillStyle='#9bae79';x.beginPath();x.ellipse(cx-r*.12,cy-r*.07,r*.26,r*.14,-.5,0,Math.PI*2);x.fill();x.globalAlpha=1;
  }
  function drawMoonScene(){clearScene();drawStars(.38);const mobile=w<=900;const r=Math.min(w*(mobile?.36:.255),h*(mobile?.25:.40)),cx=mobile?w*.56:w*.63,cy=mobile?h*.30:h*.465;drawSmallEarth(cx-r*1.28,cy-r*.69,r*.075);}

  function drawSolar(t){
    clearScene();drawStars(.36);
    const mobile=w<=900,cx=mobile?w*.55:w*.615,cy=mobile?h*.33:h*.46;
    const base=Math.min(w,h)*(mobile?.43:.56),focus=active('solar');
    solar.forEach((p,i)=>ellipse(cx,cy,base*p.d,base*p.d*.29,-.085,.075+(i===2?.035:0),.52));
    x.save();
    x.shadowColor='rgba(255,157,45,.62)';x.shadowBlur=32;
    const sg=x.createRadialGradient(cx-5,cy-6,1,cx,cy,21);sg.addColorStop(0,'#fff8db');sg.addColorStop(.22,'#ffd66f');sg.addColorStop(.65,'#ed8b28');sg.addColorStop(1,'#9d320e');
    x.fillStyle=sg;x.beginPath();x.arc(cx,cy,18,0,Math.PI*2);x.fill();x.shadowBlur=0;
    solar.forEach((p,i)=>{
      const a=.25+i*.74+t*.040*p.sp,rx=base*p.d,ry=rx*.29;
      const xx=cx+Math.cos(a)*rx,yy=cy+Math.sin(a)*ry;
      const selected=(focus==='all'&&p.n==='Earth')||focus===p.n.toLowerCase();
      const size=p.sz*(selected?1.28:1);
      const g=x.createRadialGradient(xx-size*.35,yy-size*.35,.2,xx,yy,size*1.12);g.addColorStop(0,'#f4efe7');g.addColorStop(.30,p.c);g.addColorStop(1,'#111817');
      x.fillStyle=g;x.beginPath();x.arc(xx,yy,size,0,Math.PI*2);x.fill();
      if(p.n==='Saturn'){x.strokeStyle='rgba(221,206,164,.78)';x.lineWidth=1;x.beginPath();x.ellipse(xx,yy,size*1.9,size*.42,-.16,0,Math.PI*2);x.stroke();}
      x.font=`500 ${selected?8:6.5}px ui-sans-serif,system-ui`;x.fillStyle=selected?'rgba(242,248,244,.90)':'rgba(230,239,234,.48)';x.textAlign='center';x.fillText(p.n,xx,yy+size+12);
      if(selected){x.strokeStyle='rgba(221,238,229,.36)';x.lineWidth=.55;x.beginPath();x.arc(xx,yy,size+6,0,Math.PI*2);x.stroke();}
    });
    x.restore();x.textAlign='left';
    if(!mobile){
      const y=h-102;let xx=w*.41;
      solar.forEach(p=>{x.fillStyle=p.c;x.beginPath();x.arc(xx,y,2.6,0,Math.PI*2);x.fill();x.font='500 6px ui-sans-serif,system-ui';x.fillStyle='rgba(232,240,235,.43)';x.fillText(p.n,xx+7,y+2);xx+=Math.max(56,p.n.length*5+24);});
    }
  }

  function drawQuakes(t){
    clearScene();drawStars(.27);const filter=active('quake');
    x.save();x.globalCompositeOperation='screen';
    for(const q of quakePoints){
      if(filter==='pacific'&&q.path>2)continue;if(filter==='deep'&&q.depth<350)continue;
      const p=projectGeo(q.lat,q.lon);if(!p)continue;
      const a=.20+Math.min(.52,(q.m-2.4)/8.8),r=Math.max(.55,(q.m-2.0)*.40);
      x.fillStyle=q.depth>350?`rgba(154,131,216,${a})`:q.m>6?`rgba(255,207,92,${a})`:`rgba(248,233,137,${a})`;
      x.beginPath();x.arc(p.x,p.y,r,0,Math.PI*2);x.fill();
    }
    if(filter==='japan'){
      const p=projectGeo(38.3,142.4);if(p)for(let i=0;i<4;i++){const rr=6+i*9+((t*9)%9);x.strokeStyle=`rgba(255,210,103,${.65-i*.12})`;x.lineWidth=.8;x.beginPath();x.arc(p.x,p.y,rr,0,Math.PI*2);x.stroke();}
    }
    x.restore();
  }

  function lonLerp(a,b,t){let d=b-a;if(d>180)d-=360;if(d<-180)d+=360;let v=a+d*t;if(v>180)v-=360;if(v<-180)v+=360;return v;}
  function sample(path,t,latOffset=0,lonOffset=0){const n=path.length-1,i=Math.min(n-1,Math.floor(t*n)),u=t*n-i;return[path[i][0]+(path[i+1][0]-path[i][0])*u+latOffset,lonLerp(path[i][1],path[i+1][1],u)+lonOffset];}
  function flow(path,strong,t,offset=0){
    x.save();x.globalCompositeOperation='screen';x.lineCap='round';x.lineJoin='round';
    const latOff=(offset-5.5)*.85,lonOff=Math.sin(offset*2.2)*.7;
    x.strokeStyle=strong?'rgba(91,239,224,.58)':'rgba(77,197,190,.20)';x.lineWidth=strong?1.15:.62;
    x.beginPath();let started=false;
    for(let i=0;i<=120;i++){const ll=sample(path,i/120,latOff,lonOff),p=projectGeo(ll[0],ll[1]);if(!p){started=false;continue;}if(!started){x.moveTo(p.x,p.y);started=true;}else x.lineTo(p.x,p.y);}x.stroke();
    const count=strong?18:8;for(let i=0;i<count;i++){const ll=sample(path,(i/count+t*(strong?.055:.032)+offset*.013)%1,latOff,lonOff),p=projectGeo(ll[0],ll[1]);if(!p)continue;x.fillStyle=strong?'rgba(207,255,248,.92)':'rgba(126,231,219,.48)';x.beginPath();x.arc(p.x,p.y,strong?1.15:.65,0,Math.PI*2);x.fill();}
    x.restore();
  }
  function drawOceans(t){
    clearScene();drawStars(.20);const focus=active('ocean','global');
    Object.entries(currentPaths).forEach(([name,path])=>{
      const match=focus==='global'||name===focus||(focus==='pacific'&&(name==='pacific'||name==='kuroshio'))||(focus==='southern'&&name==='southern');
      if(!match)return;const strong=focus!=='global';
      const layers=strong?14:8;for(let o=0;o<layers;o++)flow(path,strong,t,o);
    });
  }

  function applyComposition(){
    const mode=state.experience||'planet';
    if(overlay)overlay.style.opacity=mode==='civilization'?'1':'0';
    state.targetZoom=1;
    if(mode==='planet'){state.yaw=-.36;state.pitch=.10;}
    if(mode==='orbit'){state.yaw=-.62;state.pitch=.08;}
    if(mode==='earthquakes'){state.yaw=-1.02;state.pitch=.10;}
    if(mode==='oceans'){state.yaw=-1.05;state.pitch=.07;}
  }
  new MutationObserver(applyComposition).observe(app,{attributes:true,attributeFilter:['data-experience']});
  document.addEventListener('click',e=>{if(e.target.closest('[data-exp-control]'))setTimeout(applyComposition,0);});
  applyComposition();

  function frame(now){
    const dt=Math.min(.08,(now-last)/1000||0);last=now;phase+=dt;
    renderEarth(now);
    switch(state.experience){
      case 'planet':case 'civilization':drawPlanet();break;
      case 'orbit':drawOrbit(phase);break;
      case 'moon':drawMoonScene();break;
      case 'solar':drawSolar(phase);break;
      case 'earthquakes':drawQuakes(phase);break;
      case 'oceans':drawOceans(phase);break;
      default:clearScene();
    }
    requestAnimationFrame(frame);
  }

  initEarth();
  requestAnimationFrame(frame);
})();
