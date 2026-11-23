// Procedural cartoon sky dome (Roblox default-sky style): saturated zenith-to-horizon gradient, soft cumulus layer
// drifting in time, big soft sun disc + glare, horizon haze band, stars + moon at night, and the height-fog "void"
// below the horizon. Rendered at infinity (xyww) and centred on the camera; the same material is captured into the
// PMREM environment (sun disc suppressed) so IBL fill and reflections match the visible sky, like Roblox's IBL.
// Colours are authored as DISPLAY colours: `gain` (= 1/exposure) undoes the exposure applied in tone mapping.
import * as THREE from 'three';

const vert = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
  gl_Position = p.xyww;
}`;

const frag = /* glsl */`
uniform vec3 zenith, horizon, groundCol, hazeColor, sunDir, sunColor, moonDir, cloudColor, cloudShade, hfColor;
uniform float haze, sunSize, sunGlow, sunDisc, clouds, cloudScale, cloudSoft, stars, moon, gain, time, cloudSpeed;
uniform vec4 hfParams;
varying vec3 vDir;

float hash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float hash3( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
float vnoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), f.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), f.x ), f.y );
}
float fbm( vec2 p ) {
  float a = 0.5, s = 0.0;
  for ( int i = 0; i < 6; i++ ) { s += a * vnoise( p ); p = p * 2.03 + vec2( 1.7, 9.2 ); a *= 0.5; }
  return s;
}
// puffy cumulus density: domain-warped fbm, billowed
float cloudField( vec2 p ) {
  vec2 w = vec2( fbm( p * 0.5 + 3.1 ), fbm( p * 0.5 + 7.7 ) );
  float n = fbm( p + w * 1.2 );
  return n;
}

void main() {
  vec3 d = normalize( vDir );
  float h = d.y;
  vec3 col = mix( horizon, zenith, pow( clamp( h, 0.0, 1.0 ), 0.5 ) );
  if ( h < 0.0 ) col = mix( horizon, groundCol, smoothstep( 0.0, 0.25, -h ) );

  // cloud layer on a virtual plane
  if ( clouds > 0.0 && h > 0.0 ) {
    vec2 uv = d.xz / ( h + 0.15 ) * cloudScale + vec2( time * cloudSpeed, time * cloudSpeed * 0.35 );
    float n = cloudField( uv );
    float thr = 1.0 - clouds * 0.62 - 0.12;
    float c = smoothstep( thr, thr + cloudSoft, n );
    vec2 sd = normalize( sunDir.xz + vec2( 1e-4 ) ) * 0.18;
    float n2 = cloudField( uv + sd );
    float lit = clamp( 0.62 + ( n - n2 ) * 5.0, 0.0, 1.0 );
    float core = smoothstep( thr + cloudSoft, thr + cloudSoft + 0.25, n ); // thick centres are slightly greyer
    vec3 cc = mix( cloudShade, cloudColor, lit * ( 1.0 - 0.25 * core ) );
    float fade = smoothstep( 0.0, 0.18, h );
    col = mix( col, cc, c * fade );
  }

  // horizon haze band (Roblox Atmosphere.Haze)
  float tsky = exp2( - haze * 0.18 / ( 0.002 + pow( max( h, 0.0 ), 0.65 ) ) );
  col = mix( hazeColor, col, h < 0.0 ? 0.0 : tsky );

  // sun disc + glare
  float cs = dot( d, sunDir );
  float r = cos( radians( sunSize ) );
  col += sunColor * ( smoothstep( r, mix( r, 1.0, 0.3 ), cs ) * 14.0 * sunDisc
         + pow( max( cs, 0.0 ), 180.0 ) * sunGlow * 2.0 + pow( max( cs, 0.0 ), 10.0 ) * sunGlow * 0.18 );

  // stars and moon
  if ( stars > 0.0 && h > 0.0 ) {
    vec3 p = d * 220.0;
    vec3 ip = floor( p );
    float rnd = hash3( ip );
    float st = step( 0.992, rnd ) * smoothstep( 0.45, 0.0, length( fract( p ) - 0.5 ) ) * ( 0.5 + 0.5 * hash3( ip + 7.0 ) );
    col += vec3( st * stars * 2.0 ) * smoothstep( 0.0, 0.2, h );
  }
  if ( moon > 0.0 ) {
    float cm = dot( d, moonDir );
    col += vec3( 0.9, 0.95, 1.0 ) * ( smoothstep( 0.9993, 0.9995, cm ) * 3.0 + pow( max( cm, 0.0 ), 300.0 ) * 0.3 ) * moon;
  }

  // height-fog void below the horizon
  if ( hfParams.z > 0.5 ) col = mix( col, hfColor, smoothstep( 0.03, -0.1, h ) * hfParams.w );

  gl_FragColor = vec4( col * gain, 1.0 );
}`;

export function createSkyMaterial() {
  const u = (v) => ({ value: v });
  return new THREE.ShaderMaterial({
    name: 'world:sky',
    uniforms: {
      zenith: u(new THREE.Color()), horizon: u(new THREE.Color()), groundCol: u(new THREE.Color()), hazeColor: u(new THREE.Color()),
      sunDir: u(new THREE.Vector3(0, 1, 0)), sunColor: u(new THREE.Color()), moonDir: u(new THREE.Vector3(0, 1, 0)),
      cloudColor: u(new THREE.Color()), cloudShade: u(new THREE.Color()), hfColor: u(new THREE.Color()), hfParams: u(new THREE.Vector4()),
      haze: u(0), sunSize: u(3), sunGlow: u(1), sunDisc: u(1), clouds: u(0.5), cloudScale: u(1.6), cloudSoft: u(0.12),
      stars: u(0), moon: u(0), gain: u(1), time: u(0), cloudSpeed: u(0.01),
    },
    vertexShader: vert, fragmentShader: frag,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  });
}

export function createSkyMesh(material) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
  m.frustumCulled = false;
  m.renderOrder = -1e9;
  m.name = 'world:sky';
  m.userData.noShadowFit = true;
  return m;
}
