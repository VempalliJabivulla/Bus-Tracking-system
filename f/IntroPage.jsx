import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VERTEX_SHADER_SRC = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
#ifdef GL_ES
precision highp float;
#endif

uniform vec3 iResolution;
uniform float iTime;
uniform float uScroll;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

out vec4 fragColorOut;

// The far plane.
#define FAR 65.

// Frequencies and amplitudes of the "path" function.
const float freqA = .15/3.75;
const float freqB = .25/2.75 * 0.25;
const float freqC = .025;
const float ampA = 20. * 2.0;
const float ampB = 4. * 4.0;
const float ampC = 3.;

// Scene object ID.
float objID;

// 2x2 matrix rotation.
mat2 rot2( float th ){ vec2 a = sin(vec2(1.5707963, 0) + th); return mat2(a, -a.y, a.x); }

// 1x1 and 3x1 hash functions.
float hash(float n){ return fract(cos(mod(n, 6.2831853))*45758.5453); }
float hash(vec3 p){ return fract(sin(mod(dot(p, vec3(7, 157, 113)), 6.2831853))*45758.5453); }

// Grey scale.
float getGrey(vec3 p){ return dot(p, vec3(0.299, 0.587, 0.114)); }

// IQ's smooth minimum function. 
float sminP(float a, float b , float s){
    float h = clamp(.5 + .5*(b - a)/s, 0., 1.);
    return mix(b, a, h) - h*(1.0-h)*s;
}

// Smooth maximum.
float smaxP(float a, float b, float s){
    float h = clamp(.5 + .5*(a - b)/s, 0., 1.);
    return mix(b, a, h) + h*(1. - h)*s;
}

// The path function.
vec2 path(in float z){ return vec2(ampA*sin(z * freqA), ampB*cos(z * freqB) + ampC*(sin(z * freqC)) - 12.0); }

float Depth(in float y) { return max(0.0, 4.0 - y); }

float Swivel(in float z) {
    vec2 p = path(z);
    return -p.x * Depth(p.y) * 0.0006;
}

// The canyon scene SDF.
float map(in vec3 p){
    objID = 0.0;
    
    // Pebbled texture detail
    float tx = textureLod(iChannel0, p.xz/16. + p.xy/80., 0.).x;
  
    // Sinusoidal layers for hills
    vec3 q = p*.25;
    float h = dot(sin(q)*cos(q.yzx), vec3(.222)) + dot(sin(q*1.5)*cos(q.yzx*1.5), vec3(.111));
    
    // Terrain and underground caves
    float d = max(p.y, sminP(-p.y - 20.0, p.y + 28.0, 5.0)) + h*6.;
  
    // Tunnel base layer
    q = sin(p*.5 + h);
    h = q.x*q.y*q.z;
  
	// Single winding tunnel
    vec2 pPath = path(p.z);
    p.xy -= pPath;
    float tnl = 1.5 - length(p.xy*vec2(.33, .66)) + h + (1. - tx)*.25;
    
    p.z += p.x * tanh(cos(p.z * freqA) * ampA * freqA) * 0.5;

	// Combine terrain and tunnel
    float v = smaxP(d, tnl, 2.) - tx*.5 + tnl*.8;
    
    // Minecart track
    mat2 rot = rot2(Swivel(p.z));
    vec3 pRot = p;
    pRot.xy = rot * pRot.xy;
    
    float vLOD = max(pRot.y + 0.64, abs(pRot.x - 0.7 * rot[1].x) + pRot.y * 0.5 - 0.3);
    if (vLOD < v) {
        // Tracks
        float vTracks =  length(pRot.xy + vec2(-0.3, 0.7)) - 0.05;
        vTracks = min(vTracks, length(pRot.xy + vec2( 0.3, 0.7)) - 0.05);
        if (vTracks < v) {
            objID = 2.0;
            v = vTracks;
        }

        vec3 n124 = vec3(1.0, 2.0, 4.0);
        vec3 fr = fract((p.z) / n124 + 0.5);
        vec3 repeat = (max(fr, 1.0 - fr) - 0.5) * n124;
        float rand = hash(floor(p.z + 0.5));

        // Ties
        float vTies = max(abs(pRot.y + 0.78) - 0.05, max(abs(pRot.x + (rand - 0.5) * 0.2) - 0.55, repeat.x - 0.15));
        if (vTies < v) {
            objID = 1.0;
            v = vTies;
        }

        // Scaffolding
        vec2 attach = (rot * vec2(0.35, 0.85)) * vec2(-1.0, 1.0);
        for (int i = 0; i < 2; i++) {
            float vScaffolding = length(vec3(p.x + attach.x + (attach.y + p.y) * (0.5 - float(i)) * rand, max(0.0, p.y + attach.y), repeat.y)) - 0.1;
            if (vScaffolding < v) {
                objID = 1.0;
                v = vScaffolding;
            }
            attach = (rot * vec2(-0.35, 0.8)) * vec2(-1.0, 1.0);
        }
    }
    return v;
}

// Tracer
const int MAX_ITER = 140;
const float PLANCK = 0.005;
float trace(vec3 pos, vec3 dir) {
    const float MIN_JUMP = PLANCK * 10.0;
    const float MIN_JUMP_FACTOR = 0.003;
    float min_d = 100000.0;
    float min_t = 0.0;
    
    float t = 0.0;
    for (int i = 0; i < MAX_ITER; i ++) {
        float d = map(pos + dir * t);
        
        if (abs(d) < PLANCK * t * 0.1) {
            return t;
        } else if (d < min_d) {
            min_d = d;
            min_t = t;
        } else if (t > FAR) {
            return FAR;
        }
        t += d * (0.85 + t * MIN_JUMP_FACTOR + MIN_JUMP);
    }
    return min_t;
}

// Tetrahedral normal
vec3 normal(in vec3 p) {  
    vec2 e = vec2(-1, 1)*.001;   
	return normalize(e.yxx*map(p + e.yxx) + e.xxy*map(p + e.xxy) + 
					 e.xyx*map(p + e.xyx) + e.yyy*map(p + e.yyy) );   
}

// Tri-Planar blending
vec3 tex3D( sampler2D tex, in vec3 p, in vec3 n ){
    n = max(n*n, .001);
    n /= (n.x + n.y + n.z );  
	return (texture(tex, p.yz)*n.x + texture(tex, p.zx)*n.y + texture(tex, p.xy)*n.z).xyz;
}

// Bump mapping
vec3 doBumpMap( sampler2D tex, in vec3 p, in vec3 nor, float bumpfactor){
    const float eps = .001;
    vec3 grad = vec3( getGrey(tex3D(tex, vec3(p.x - eps, p.y, p.z), nor)),
                      getGrey(tex3D(tex, vec3(p.x, p.y - eps, p.z), nor)),
                      getGrey(tex3D(tex, vec3(p.x, p.y, p.z - eps), nor)));
    grad = (grad - getGrey(tex3D(tex, p, nor)))/eps; 
    grad -= nor*dot(nor, grad);          
    return normalize(nor + grad*bumpfactor);
}

// Soft shadow
float softShadow(in vec3 ro, in vec3 rd, in float start, in float end, in float k){
    float shade = 1.;
    const int maxIterationsShad = 10; 
    float dist = start;
    float stepDist = end/float(maxIterationsShad);

    for (int i=0; i<maxIterationsShad; i++){
        float h = map(ro + rd*dist);
        shade = min(shade, smoothstep(0., 1., k*h/dist));
        dist += clamp(h, .2, stepDist*2.);
        if (abs(h)<.001 || dist > end) break; 
    }
    return min(max(shade, 0.) + .1, 1.); 
}

// Ambient occlusion
float calculateAO( in vec3 p, in vec3 n, float maxDist ) {
	float ao = 0., l;
	const float nbIte = 6.;
    for(float i=1.; i< nbIte+.5; i++){
        l = (i + hash(i))*.5/nbIte*maxDist;
        ao += (l - map( p + n*l))/(1. + l);
    }
    return clamp(1. - ao/nbIte, 0., 1.);
}

// 3D Noise
float noise3D(in vec3 p){
	const vec3 s = vec3(7, 157, 113);
	vec3 ip = floor(p);
    vec4 h = vec4(0., s.yz, s.y + s.z) + dot(ip, s);
	p -= ip;
    p = p*p*(3. - 2.*p);
    h = mix(fract(sin(mod(h, 6.2831853))*43758.5453), 
            fract(sin(mod(h + s.x, 6.2831853))*43758.5453), p.x);
    h.xy = mix(h.xz, h.yw, p.y);
    return mix(h.x, h.y, p.z);
}

// fBm
float fbm(in vec3 p){
    return .5333*noise3D(p) + .2667*noise3D(p*2.02) + .1333*noise3D(p*4.03) + .0667*noise3D(p*8.03);
}

// Sky
vec3 getSky(in vec3 ro, in vec3 rd, vec3 sunDir){
	float sun = max(dot(rd, sunDir), 0.);
	float horiz = pow(1.0-max(rd.y, 0.), 3.)*.35;
	vec3 col = mix(vec3(.25, .35, .5), vec3(.4, .375, .35), sun*.75);
	col = mix(col, vec3(1, .9, .7), horiz);
	col += .25*vec3(1, .7, .4)*pow(sun, 5.);
	col += .25*vec3(1, .8, .6)*pow(sun, 64.);
	col += .2*vec3(1, .9, .7)*max(pow(sun, 512.), .3);
    col = clamp(col + hash(rd)*.05 - .025, 0., 1.);
	vec3 sc = ro + rd*FAR*100.; sc.y *= 3.;
	return mix( col, vec3(1, .95, 1), .5*smoothstep(.5, 1., fbm(.001*sc)) * clamp(rd.y*4., 0., 1.) );
}

// Curvature
float curve(in vec3 p){
    const float eps = .05, amp = 4., ampInit = .5;
    vec2 e = vec2(-1, 1)*eps;
    float t1 = map(p + e.yxx), t2 = map(p + e.xxy);
    float t3 = map(p + e.xyx), t4 = map(p + e.yyy);
    return clamp((t1 + t2 + t3 + t4 - 4.*map(p))*amp + ampInit, 0., 1.);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
	vec2 u = (fragCoord - iResolution.xy*.5)/iResolution.y;
    
    // posZ controlled by scroll uniform
    float posZ = uScroll;
    
    // Speed up when going down and slow down when going up
    posZ += ampB * -sin(posZ * freqB) + ampC * cos(posZ * freqC);
	
	// Camera Setup.
	vec3 lookAt = vec3(0, 0, posZ);
    float swivel = Swivel(lookAt.z);
	vec3 ro = lookAt + vec3(0, 0, -.25);
    
    vec2 pPath = path(lookAt.z);
	lookAt.xy += pPath;
	ro.xy += path(ro.z);
    lookAt.y = ro.y + (lookAt.y - ro.y) * 0.5;
    
    // Screen shake when turning while going fast
    float depth = Depth(pPath.y);
    lookAt.y += sin(lookAt.z * 15.0) * 0.004 * smoothstep(15.0, 30.0, depth) * abs(swivel);

    float FOV = 3.14159/3.;
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(vec3(forward.z, 0, -forward.x )); 
    vec3 up = cross(forward, right);

    vec3 rd = normalize(forward + FOV*u.x*right + FOV*u.y*up);
	rd.xy = rot2(swivel * -0.5)*rd.xy;
    
    vec3 lp = vec3(FAR*.5, FAR, FAR) + vec3(0, 0, ro.z);
	float t = trace(ro, rd);
    float svObjID = objID;
    
    vec3 sky = getSky(ro, rd, normalize(lp - ro)) * 1.7 * clamp(15.0 - depth, 0.0, 1.0);
    vec3 col = sky;
    float alt = 1.0;
    
    if (t < FAR){
        vec3 sp = ro+t*rd;
        vec3 sn = normal(sp);
        alt = clamp((sp.y+25.)*.05, 0.0, 1.0);
        vec3 ld = lp-sp;
        ld /= max(length(ld), 0.001);
        
        const float tSize1 = 1./6.;
        sn = doBumpMap(iChannel1, sp*tSize1, sn, .007/((1. + t/FAR) * (1.0 + svObjID)));
        
        float shd = softShadow(sp, ld, .05, FAR, 8.);
        shd *= 0.5 + 0.5 * alt;
        float curv = curve(sp)*.9 +.1;
        float ao = calculateAO(sp, sn, 4.);
        
        float dif = max( dot( ld, sn ), 0.);
        float spe = pow(max( dot( reflect(-ld, sn), -rd ), 0. ), 5.* (svObjID + 1.0));
        float fre = clamp(1.0 + dot(rd, sn), 0., 1.);

		float Schlick = pow( 1. - max(dot(rd, normalize(rd + ld)), 0.), 5.);
		float fre2 = mix(.2 * (svObjID + 1.0), 1., Schlick);
        float amb = fre*fre2 + .06*ao;
        
        col = clamp(mix(vec3(.8, .5, .3), vec3(.5, .25, .125), alt), vec3(.5, .25, .125)*0.0, vec3(1));
        col =  smoothstep(-.5, 1., tex3D(iChannel1, sp*tSize1, sn))*(col + .25);
        float noise = noise3D(sp*48.);
        col = clamp(col + noise *.3 - .15, 0., 1.);
        
        if (svObjID == 1.0)
            col = vec3(0.7, 0.5, 0.4);
        if (svObjID == 2.0)
            col = vec3(0.35);
        
        col = pow(col, vec3(1.5));
        curv = smoothstep(0., .7, curv);
        col *= vec3(curv, curv*.95, curv*.85);
 
        col += getSky(sp, reflect(rd, sn), ld)*fre*fre2*.5;
        col = 2.0 * (col*(dif + .1) + fre2*spe)*shd*ao + amb*col;
    }
    
    col = mix(col, sky, sqrt(smoothstep(FAR - 15., FAR, t)));
    col = pow(max(col, 0.), vec3(.75));

    u = fragCoord/iResolution.xy;
    col *= pow(16.*u.x*u.y*(1. - u.x)*(1. - u.y) , .0625);

	fragColor = vec4(clamp(col, 0., 1.), 1);
}

void main() {
  mainImage(fragColorOut, gl_FragCoord.xy);
}
`;

// Helper to compile shader
const compileShader = (gl, source, type) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Shader compilation error:\n' + info);
  }
  return shader;
};

// Helper to create program
const createProgram = (gl, vsSource, fsSource) => {
  const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Program linking error:\n' + info);
  }
  return program;
};

// Helper to generate a procedural noise texture
const createNoiseTexture = (gl, size = 256) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.floor(Math.random() * 256);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
};

export default function IntroPage() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // Scroll tracking refs
  const targetScrollZRef = useRef(0);
  const currentScrollZRef = useRef(0);
  const isScrollingRef = useRef(false);
  const firstScrollTimeRef = useRef(null);
  const scrollActiveTimeRef = useRef(0);
  const transitionTriggeredRef = useRef(false);

  // React state for fade effects and progress display
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showScrollTip, setShowScrollTip] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use WebGL2
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) {
      console.error('WebGL 2 is not supported on this browser.');
      return;
    }

    let program;
    try {
      program = createProgram(gl, VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC);
    } catch (e) {
      console.error(e);
      return;
    }

    // Full screen quad geometry
    const positionAttributeLocation = gl.getAttribLocation(program, 'position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Create noise textures
    const noiseTex0 = createNoiseTexture(gl, 128);
    const noiseTex1 = createNoiseTexture(gl, 256);

    // Uniform locations
    const resolutionLoc = gl.getUniformLocation(program, 'iResolution');
    const timeLoc = gl.getUniformLocation(program, 'iTime');
    const scrollLoc = gl.getUniformLocation(program, 'uScroll');
    const channel0Loc = gl.getUniformLocation(program, 'iChannel0');
    const channel1Loc = gl.getUniformLocation(program, 'iChannel1');

    let animationFrameId;
    const startTime = performance.now();
    let lastTime = startTime;

    const render = (now) => {
      const elapsedSeconds = (now - startTime) / 1000;
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      // Handle canvas resize
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      // Smooth scroll interpolation (momentum/inertia)
      currentScrollZRef.current += (targetScrollZRef.current - currentScrollZRef.current) * 0.08;

      // Track active scrolling duration
      // If targetScrollZ is not 0 (meaning user started scrolling) and target/current hasn't fully settled
      if (targetScrollZRef.current > 0) {
        if (firstScrollTimeRef.current === null) {
          firstScrollTimeRef.current = now;
        }
        // Accumulate active scroll time
        scrollActiveTimeRef.current += deltaTime;
      }

      // Calculate progress percentage
      // Track length corresponds to 120.0 units
      const progress = Math.min(targetScrollZRef.current / 120.0, 1.0);
      setScrollProgress(progress);

      // Hide scroll down message after user starts scrolling
      if (progress > 0.02 && showScrollTip) {
        setShowScrollTip(false);
      }

      // Check transition conditions
      // Transition if progress reaches 95% OR cumulative scroll time reaches 4.5 seconds
      const isTimeUp = firstScrollTimeRef.current !== null && (scrollActiveTimeRef.current >= 4.5);
      const isProgressReached = progress >= 0.95;

      if ((isTimeUp || isProgressReached) && !transitionTriggeredRef.current) {
        transitionTriggeredRef.current = true;
        setIsFadingOut(true);
        // Navigate to Login after 1s fade-out animation completes
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1000);
      }

      // Clear & Bind
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      // Bind textures
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, noiseTex0);
      gl.uniform1i(channel0Loc, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, noiseTex1);
      gl.uniform1i(channel1Loc, 1);

      // Set uniforms
      gl.uniform3f(resolutionLoc, canvas.width, canvas.height, 1.0);
      gl.uniform1f(timeLoc, elapsedSeconds);
      gl.uniform1f(scrollLoc, currentScrollZRef.current);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Scroll listener on window
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      const pct = maxScrollY > 0 ? scrollY / maxScrollY : 0;
      
      // Map percentage to camera track position (0.0 to 120.0)
      targetScrollZRef.current = pct * 120.0;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', handleScroll);
      if (gl) {
        gl.deleteBuffer(positionBuffer);
        gl.deleteVertexArray(vao);
        gl.deleteTexture(noiseTex0);
        gl.deleteTexture(noiseTex1);
        if (program) {
          gl.deleteProgram(program);
        }
      }
    };
  }, [navigate, showScrollTip]);

  const progressPercent = Math.round(scrollProgress * 100);

  return (
    <div className="relative min-h-[400vh] w-full font-body-lg text-on-surface select-none">
      {/* Background canvas container fixed behind */}
      <div 
        className={`fixed inset-0 w-full h-full z-0 transition-opacity duration-1000 ease-in-out ${
          isFadingOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
        style={{ willChange: 'opacity, transform' }}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Floating Header UI */}
      <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-md text-center transition-all duration-700 ease-in-out ${
        isFadingOut ? 'opacity-0 -translate-y-4' : 'opacity-100'
      }`}>
        <div className="bg-primary/20 backdrop-blur-md border border-primary-container/30 px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center">
          <span className="material-symbols-outlined text-secondary text-3xl mb-1 animate-pulse">
            rocket_launch
          </span>
          <h1 className="font-display-lg text-title-md tracking-wider text-on-primary font-bold">
            CAMPUS TRANSIT
          </h1>
          <p className="font-body-sm text-sm text-surface-variant/80 mt-1">
            Real-time bus tracking system for Jain University FET
          </p>
        </div>
      </div>

      {/* Scroll indicator overlay */}
      {showScrollTip && (
        <div className="fixed inset-0 flex flex-col items-center justify-center z-10 bg-gradient-to-t from-primary/60 via-transparent to-transparent pointer-events-none transition-opacity duration-700 ease-in-out">
          <div className="absolute bottom-24 flex flex-col items-center gap-3">
            {/* Mouse scrolling micro-animation */}
            <div className="w-6 h-10 border-2 border-on-primary/60 rounded-full flex justify-center p-1.5 shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              <div className="w-1.5 h-2.5 bg-secondary rounded-full animate-bounce" />
            </div>
            <p className="font-label-bold text-label-bold tracking-widest text-on-primary/80 animate-pulse text-center">
              SCROLL DOWN TO INITIATE RIDE
            </p>
          </div>
        </div>
      )}

      {/* Ride Progress Overlay */}
      {!showScrollTip && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-sm transition-all duration-700 ease-in-out ${
          isFadingOut ? 'opacity-0 translate-y-4' : 'opacity-100'
        }`}>
          <div className="bg-primary/40 backdrop-blur-md border border-primary-container/20 px-5 py-3 rounded-lg shadow-xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-label-bold tracking-wider text-on-primary/70">
              <span>TRACK RIDE PROGRESS</span>
              <span className="text-secondary font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-primary-container/40 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-secondary h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_#fc6c29]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Full screen black overlay for fade transition */}
      <div 
        className={`fixed inset-0 z-50 bg-[#071b3b] pointer-events-none transition-opacity duration-1000 ease-in-out ${
          isFadingOut ? 'opacity-100' : 'opacity-0'
        }`} 
      />
    </div>
  );
}
