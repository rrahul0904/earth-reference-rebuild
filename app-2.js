const vs=`#version 300 es
in vec2 aPosition;out vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const fs=`#version 300 es
precision highp float;in vec2 vUv;out vec4 outColor;
uniform vec2 uResolution;uniform vec2 uCenter;uniform float uRadius;uniform float uYaw;uniform float uPitch;uniform float uMix;uniform float uAge;uniform float uMode;uniform float uProcedural;uniform sampler2D uTexA;uniform sampler2D uTexB;
#define PI 3.14159265359
float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,-s,0.,s,c);}mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}
vec3 palette(float t){return mix(vec3(.10,.25,.28),vec3(.42,.46,.28),smoothstep(.2,.72,t));}
void main(){
  vec2 frag=vUv*uResolution;vec2 q=(frag-uCenter)/uRadius;q.y=-q.y;float r2=dot(q,q);
  if(r2>1.){vec2 cell=floor(frag/3.);float h=hash21(cell);float star=step(.9965,h)*(0.35+0.65*hash21(cell+9.1));float haze=.018*(1.-length((frag/uResolution)-.5));outColor=vec4(vec3(star+haze),1.);return;}
  float z=sqrt(max(0.,1.-r2));vec3 screenN=normalize(vec3(q.x,q.y,z));vec3 geoN=rotX(-uPitch)*rotY(-uYaw)*screenN;
  float lon=atan(geoN.z,geoN.x);float lat=asin(clamp(geoN.y,-1.,1.));vec2 uv=vec2(fract(lon/(2.*PI)+.5),lat/PI+.5);
  vec3 a=texture(uTexA,uv).rgb,b=texture(uTexB,uv).rgb;vec3 base=mix(a,b,uMix);
  if(uProcedural>.5){
    float n=hash21(floor(uv*vec2(440.,220.)));float bands=sin((uv.y+n*.08)*32.)*.5+.5;float hot=smoothstep(1700.,4540.,uAge);vec3 ocean=vec3(.025,.10,.14);vec3 stone=palette(n*.7+bands*.3);base=mix(ocean,stone,smoothstep(.44,.58,n+bands*.12));base=mix(base,vec3(.58,.17,.045)*(1.1+.3*bands),hot*.82);
  }
  float ndl=max(0.,dot(screenN,normalize(vec3(-.34,.22,.91))));float light=.18+.88*ndl;float rim=pow(1.-z,2.6);
  float snow=smoothstep(620.,760.,uAge)*(1.-smoothstep(780.,900.,uAge));base=mix(base,vec3(.72,.80,.82),snow*.48);
  if(uMode>.5&&uMode<1.5){float city=pow(max(0.,base.r-base.b*.48),3.)*hash21(floor(uv*vec2(1100.,550.)));vec3 night=base*(.035+.18*ndl)+vec3(1.,.48,.13)*city*4.0;base=night;light=1.;}
  if(uMode>1.5){base=mix(base,vec3(.12,.34,.48),.30);light=.32+.62*ndl;}
  vec3 col=base*light;float ageHeat=smoothstep(3000.,4540.,uAge);col+=vec3(.75,.13,.02)*ageHeat*pow(max(0.,1.-z),1.6)*.38;col+=vec3(.18,.55,.78)*rim*(uMode>1.5?.42:.22);
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
