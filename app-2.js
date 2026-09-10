const vs=`#version 300 es
in vec2 aPosition;out vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const fs=`#version 300 es
precision highp float;in vec2 vUv;out vec4 outColor;
uniform vec2 uResolution;uniform vec2 uCenter;uniform float uRadius;uniform float uYaw;uniform float uPitch;uniform float uMix;uniform float uAge;uniform float uMode;uniform float uProcedural;uniform sampler2D uTexA;uniform sampler2D uTexB;
#define PI 3.14159265359
float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash21(i),b=hash21(i+vec2(1.,0.)),c=hash21(i+vec2(0.,1.)),d=hash21(i+vec2(1.,1.));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.52;for(int i=0;i<5;i++){v+=a*noise21(p);p=p*2.03+17.31;a*=.48;}return v;}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,-s,0.,s,c);}mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}
vec3 palette(float t){return mix(vec3(.075,.17,.18),vec3(.33,.34,.22),smoothstep(.18,.80,t));}
void main(){
  vec2 frag=vUv*uResolution;vec2 q=(frag-uCenter)/uRadius;q.y=-q.y;float r2=dot(q,q);
  if(r2>1.){vec2 cell=floor(frag/7.);float h=hash21(cell);float star=step(.9987,h)*(.22+.52*hash21(cell+9.1));float haze=.0025*max(0.,1.-length((frag/uResolution)-.5)*1.35);outColor=vec4(vec3(star+haze),1.);return;}
  float z=sqrt(max(0.,1.-r2));vec3 screenN=normalize(vec3(q.x,q.y,z));vec3 geoN=rotX(-uPitch)*rotY(-uYaw)*screenN;
  float lon=atan(geoN.z,geoN.x);float lat=asin(clamp(geoN.y,-1.,1.));vec2 uv=vec2(fract(lon/(2.*PI)+.5),lat/PI+.5);
  vec3 a=texture(uTexA,uv).rgb,b=texture(uTexB,uv).rgb;vec3 base=mix(a,b,uMix);
  if(uProcedural>.5){
    vec2 p=uv*vec2(7.2,3.6);float n=fbm(p);float n2=fbm(p*2.7+vec2(13.4,2.8));float ridges=1.-abs(2.*noise21(p*4.4)-1.);float hot=smoothstep(1700.,4540.,uAge);
    vec3 ocean=vec3(.022,.075,.085);vec3 stone=palette(n*.76+n2*.24);float land=smoothstep(.48,.61,n+n2*.08);base=mix(ocean,stone,land);
    float lava=smoothstep(.72,.92,ridges*n2)*hot;base=mix(base,vec3(.95,.22,.035),lava*.68);base=mix(base,vec3(.28,.075,.025),hot*.42);
  }
  vec3 sunDir=normalize(vec3(-.42,.26,.87));float ndl=max(0.,dot(screenN,sunDir));float soft=pow(ndl,.78);float light=.075+.96*soft;float rim=pow(1.-z,3.4);float edge=pow(1.-z,8.0);
  float snow=smoothstep(620.,760.,uAge)*(1.-smoothstep(780.,900.,uAge));base=mix(base,vec3(.72,.80,.82),snow*.44);
  if(uMode>.5&&uMode<1.5){float city=pow(max(0.,base.r-base.b*.48),3.)*hash21(floor(uv*vec2(1100.,550.)));vec3 night=base*(.018+.11*soft)+vec3(1.,.47,.12)*city*3.2;base=night;light=1.;}
  if(uMode>1.5){base=mix(base,vec3(.075,.27,.37),.24);light=.17+.73*soft;}
  base=pow(max(base,vec3(0.)),vec3(.93));vec3 col=base*light;
  float ageHeat=smoothstep(3000.,4540.,uAge);col+=vec3(.88,.18,.025)*ageHeat*pow(max(0.,1.-z),2.0)*.20;
  vec3 atm=uMode>1.5?vec3(.20,.68,.86):vec3(.25,.61,.78);col+=atm*rim*(uMode>1.5?.30:.15)+atm*edge*.15;
  float alpha=smoothstep(1.,.985,z+.01);outColor=vec4(col,alpha);
}`;

let gl, program, loc={}, buffer, texA, texB, textureCache=new Map();
function compile(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'Shader compile failed');return sh}
function initWebGL(){
  gl=els.globe.getContext('webgl2',{antialias:true,alpha:false,premultipliedAlpha:false});if(!gl)throw new Error('WebGL2 unavailable');
  program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Shader link failed');
  gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  ['uResolution','uCenter','uRadius','uYaw','uPitch','uMix','uAge','uMode','uProcedural','uTexA','uTexB'].forEach(n=>loc[n]=gl.getUniformLocation(program,n));gl.uniform1i(loc.uTexA,0);gl.uniform1i(loc.uTexB,1);
  texA=createSolidTexture([52,94,108,255]);texB=createSolidTexture([55,91,99,255]);state.activeTextures={a:texA,b:texB,mix:0,procedural:1};state.glReady=true;resize();
}
function createSolidTexture(rgba){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(rgba));return t}
function textureFromSource(source){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.generateMipmap(gl.TEXTURE_2D);return t}
async function loadTexture(url){if(textureCache.has(url))return textureCache.get(url);const p=new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{resolve(textureFromSource(img))}catch(e){reject(e)}};img.onerror=reject;img.src=url});textureCache.set(url,p);return p}
function fallbackCanvas(seed='earth'){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#446c72');g.addColorStop(.5,'#1d4a56');g.addColorStop(1,'#0a2634');x.fillStyle=g;x.fillRect(0,0,512,256);let s=parseInt(hashString(seed).slice(0,8),16)||1;function rnd(){s=(s*1664525+1013904223)>>>0;return s/4294967296}for(let i=0;i<85;i++){x.beginPath();const cx=rnd()*512,cy=rnd()*256,rx=12+rnd()*64,ry=5+rnd()*28;x.ellipse(cx,cy,rx,ry,rnd()*Math.PI,0,Math.PI*2);x.fillStyle=`rgba(${105+Math.round(rnd()*55)},${105+Math.round(rnd()*65)},${75+Math.round(rnd()*45)},${.25+rnd()*.45})`;x.fill()}return c}
async function safeTexture(url,key=url){try{return await loadTexture(url)}catch{const cacheKey=`fallback:${key}`;if(textureCache.has(cacheKey))return textureCache.get(cacheKey);const p=Promise.resolve(textureFromSource(fallbackCanvas(key)));textureCache.set(cacheKey,p);return p}}

function findRasterPair(age){const sorted=[...PALEO_SLICES].sort((a,b)=>a.ageMa-b.ageMa);if(age<=0)return [sorted[0],sorted[0],0];let lo=sorted[0],hi=sorted.at(-1);for(let i=0;i<sorted.length-1;i++){if(age>=sorted[i].ageMa&&age<=sorted[i+1].ageMa){lo=sorted[i];hi=sorted[i+1];break}}const t=hi.ageMa===lo.ageMa?0:(age-lo.ageMa)/(hi.ageMa-lo.ageMa);return[lo,hi,t]}