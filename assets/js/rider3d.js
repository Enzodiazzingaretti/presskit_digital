import{$ as fn,A as Ve,B as Qt,C as ne,D as je,E as Ye,F as en,G as he,H as tn,I as lt,J as fe,K as zt,L as nn,N as ve,O as Et,P as At,Q as on,S as rn,T as sn,U as an,V as ln,W as Ze,X as cn,a as jt,b as Yt,ba as Rt,c as Zt,ca as dn,d as Kt,da as Ke,f as vt,fa as un,i as st,j as X,k as b,m as Ne,n as p,o as Xe,p as it,q as Ce,r as $t,s as ce,t as at,u as qt,v as Oe,w as Jt,x as q,y as Ue,z as Mt}from"./gl/chunk-5ENTPAGM.js";function pn(i){let e=new lt,t=[],n=(s,a,l,c,f=[0,0,0],d=Zt)=>{let u=new at({color:new ce(a).multiplyScalar(l),side:d}),h=new q(s,u);h.position.set(...c),h.rotation.set(...f),e.add(h),t.push(s,u)};n(new Ue(24,12,24),"#3c3c41",1,[0,5,0],[0,0,0],Yt),n(new ne(24,24),"#55524f",1,[0,-.9,0],[-Math.PI/2,0,0]),n(new ne(9,5),"#ffffff",6,[0,10.8,1],[Math.PI/2,0,0]),n(new ne(1.1,8),"#ffffff",7,[-8.5,5,3],[0,Math.PI/2,0]),n(new ne(1.1,8),"#eef0ff",5,[8.5,5,-2],[0,-Math.PI/2,0]),n(new ne(7,2.2),"#fff1e2",2.2,[0,3.5,11.5],[0,Math.PI,0]);let r=new en(i),o=r.fromScene(e,.035).texture;return r.dispose(),t.forEach(s=>s.dispose()),o}var hn=new Xe,ct=new p,oe=class extends dn{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";let e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new Oe(e,3)),this.setAttribute("uv",new Oe(t,2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Ke(t,6,1);return this.setAttribute("instanceStart",new fe(n,3,0)),this.setAttribute("instanceEnd",new fe(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Ke(t,6,1);return this.setAttribute("instanceColorStart",new fe(n,3,0)),this.setAttribute("instanceColorEnd",new fe(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new ln(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Xe);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),hn.setFromBufferAttribute(t),this.boundingBox.union(hn))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new it),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let o=0,s=e.count;o<s;o++)ct.fromBufferAttribute(e,o),r=Math.max(r,n.distanceToSquared(ct)),ct.fromBufferAttribute(t,o),r=Math.max(r,n.distanceToSquared(ct));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}};je.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new b(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Ye.line={uniforms:Mt.merge([je.common,je.fog,je.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};var Me=class extends Ve{constructor(e){super({type:"LineMaterial",uniforms:Mt.clone(Ye.line.uniforms),vertexShader:Ye.line.vertexShader,fragmentShader:Ye.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1))}};var mn=new p,xn=new p,U=new Ne,D=new Ne,re=new Ne,Tt=new p,Bt=new Ce,_=new un,gn=new p,ft=new Xe,dt=new it,se=new Ne,ie,ze;function wn(i,e,t){return se.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),se.multiplyScalar(1/se.w),se.x=ze/t.width,se.y=ze/t.height,se.applyMatrix4(i.projectionMatrixInverse),se.multiplyScalar(1/se.w),Math.abs(Math.max(se.x,se.y))}function Qn(i,e){let t=i.matrixWorld,n=i.geometry,r=n.attributes.instanceStart,o=n.attributes.instanceEnd,s=Math.min(n.instanceCount,r.count);for(let a=0,l=s;a<l;a++){_.start.fromBufferAttribute(r,a),_.end.fromBufferAttribute(o,a),_.applyMatrix4(t);let c=new p,f=new p;ie.distanceSqToSegment(_.start,_.end,f,c),f.distanceTo(c)<ze*.5&&e.push({point:f,pointOnLine:c,distance:ie.origin.distanceTo(f),object:i,face:null,faceIndex:a,uv:null,uv1:null})}}function eo(i,e,t){let n=e.projectionMatrix,o=i.material.resolution,s=i.matrixWorld,a=i.geometry,l=a.attributes.instanceStart,c=a.attributes.instanceEnd,f=Math.min(a.instanceCount,l.count),d=-e.near;ie.at(1,re),re.w=1,re.applyMatrix4(e.matrixWorldInverse),re.applyMatrix4(n),re.multiplyScalar(1/re.w),re.x*=o.x/2,re.y*=o.y/2,re.z=0,Tt.copy(re),Bt.multiplyMatrices(e.matrixWorldInverse,s);for(let u=0,h=f;u<h;u++){if(U.fromBufferAttribute(l,u),D.fromBufferAttribute(c,u),U.w=1,D.w=1,U.applyMatrix4(Bt),D.applyMatrix4(Bt),U.z>d&&D.z>d)continue;if(U.z>d){let W=U.z-D.z,le=(U.z-d)/W;U.lerp(D,le)}else if(D.z>d){let W=D.z-U.z,le=(D.z-d)/W;D.lerp(U,le)}U.applyMatrix4(n),D.applyMatrix4(n),U.multiplyScalar(1/U.w),D.multiplyScalar(1/D.w),U.x*=o.x/2,U.y*=o.y/2,D.x*=o.x/2,D.y*=o.y/2,_.start.copy(U),_.start.z=0,_.end.copy(D),_.end.z=0;let v=_.closestPointToPointParameter(Tt,!0);_.at(v,gn);let I=X.lerp(U.z,D.z,v),P=I>=-1&&I<=1,tt=Tt.distanceTo(gn)<ze*.5;if(P&&tt){_.start.fromBufferAttribute(l,u),_.end.fromBufferAttribute(c,u),_.start.applyMatrix4(s),_.end.applyMatrix4(s);let W=new p,le=new p;ie.distanceSqToSegment(_.start,_.end,le,W),t.push({point:le,pointOnLine:W,distance:ie.origin.distanceTo(le),object:i,face:null,faceIndex:u,uv:null,uv1:null})}}}var me=class extends q{constructor(e=new oe,t=new Me({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let s=0,a=0,l=t.count;s<l;s++,a+=2)mn.fromBufferAttribute(t,s),xn.fromBufferAttribute(n,s),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+mn.distanceTo(xn);let o=new Ke(r,2,1);return e.setAttribute("instanceDistanceStart",new fe(o,1,0)),e.setAttribute("instanceDistanceEnd",new fe(o,1,1)),this}raycast(e,t){let n=this.material.worldUnits,r=e.camera;r===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let o=e.params.Line2!==void 0&&e.params.Line2.threshold||0;ie=e.ray;let s=this.matrixWorld,a=this.geometry,l=this.material;ze=l.linewidth+o,a.boundingSphere===null&&a.computeBoundingSphere(),dt.copy(a.boundingSphere).applyMatrix4(s);let c;if(n)c=ze*.5;else{let d=Math.max(r.near,dt.distanceToPoint(ie.origin));c=wn(r,d,l.resolution)}if(dt.radius+=c,ie.intersectsSphere(dt)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),ft.copy(a.boundingBox).applyMatrix4(s);let f;if(n)f=ze*.5;else{let d=Math.max(r.near,ft.distanceToPoint(ie.origin));f=wn(r,d,l.resolution)}ft.expandByScalar(f),ie.intersectsBox(ft)!==!1&&(n?Qn(this,t):eo(this,r,t))}};var de=new ce("#0e0d0c"),It=new ce("#e0102d"),Ee={uInk:{value:0},uDot:{value:5},uSpan:{value:1900}},bn=`
uniform float uInk;
uniform float uDot;
uniform float uSpan;
varying vec3 vKxW;
float kxHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float kxNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kxHash(i), kxHash(i + vec3(1, 0, 0)), f.x), mix(kxHash(i + vec3(0, 1, 0)), kxHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(kxHash(i + vec3(0, 0, 1)), kxHash(i + vec3(1, 0, 1)), f.x), mix(kxHash(i + vec3(0, 1, 1)), kxHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// > 0: todav\xEDa es tinta; < 0: ya es real
float kxFront() {
  vec3 p = vKxW * 0.0042;
  float n = kxNoise(p) * 0.55 + kxNoise(p * 2.7 + 3.1) * 0.3 + kxNoise(p * 7.3 + 9.7) * 0.15;
  float q = clamp(vKxW.x / uSpan + 0.5, 0.0, 1.0) * 0.55 + n * 0.45 + vKxW.z * 0.00008;
  return q - (uInk * 1.25 - 0.12);
}
`,Sn=`
{
  float kxF = kxFront();
  if (kxF > 0.0) {
    if (kxF < 0.010) gl_FragColor = vec4(${It.r.toFixed(4)}, ${It.g.toFixed(4)}, ${It.b.toFixed(4)}, 1.0);
    else if (kxF < 0.085) {
      float kxC = 1.0 - (kxF - 0.010) / 0.075;
      vec2 kxG = mod(gl_FragCoord.xy, uDot) / uDot - 0.5;
      gl_FragColor = length(kxG) < kxC * 0.62 ? vec4(${de.r.toFixed(4)}, ${de.g.toFixed(4)}, ${de.b.toFixed(4)}, 1.0) : vec4(0.0);
    } else gl_FragColor = vec4(0.0);
  } else {
    gl_FragColor = vec4(gl_FragColor.rgb * KX_ALPHA, KX_ALPHA);
  }
}
`,to=`
{
  if (kxFront() <= 0.0) discard;
  gl_FragColor = vec4(${de.r.toFixed(4)}, ${de.g.toFixed(4)}, ${de.b.toFixed(4)}, 1.0);
}
`,yn=`varying vec3 vKxW;
`;function vn(i,e){return yn+i.replace(/}\s*$/,`  vKxW = ${e};
}
`)}function Mn(i,e){return bn+i.replace(/}\s*$/,e+`
}
`)}function Ae(i,e="1.0"){return i.polygonOffset=!0,i.polygonOffsetFactor=1,i.polygonOffsetUnits=2,i.onBeforeCompile=t=>{Object.assign(t.uniforms,Ee),t.vertexShader=vn(t.vertexShader,"(modelMatrix * vec4(transformed, 1.0)).xyz"),t.fragmentShader=Mn(t.fragmentShader,Sn.replace(/KX_ALPHA/g,`(${e})`))},i.customProgramCacheKey=()=>"kx-surface-"+e,i}function Pt(i){return i.onBeforeCompile=e=>{Object.assign(e.uniforms,Ee),e.vertexShader=vn(e.vertexShader,"(modelMatrix * vec4(position.y < 0.5 ? instanceStart : instanceEnd, 1.0)).xyz"),e.fragmentShader=Mn(e.fragmentShader,to)},i.customProgramCacheKey=()=>"kx-line",i}var De={PARS:bn,VERT_PARS:yn,SURFACE:Sn};var $e=new p;function J(i,e,t,n,r,o){let s=2*Math.PI*r/4,a=Math.max(o-2*r,0),l=Math.PI/4;$e.copy(e),$e[n]=0,$e.normalize();let c=.5*s/(s+a),f=1-$e.angleTo(i)/l;return Math.sign($e[t])===1?f*c:a/(s+a)+c+c*(1-f)}var ut=class extends Ue{constructor(e=1,t=1,n=1,r=2,o=.1){if(r=r*2+1,o=Math.min(e/2,t/2,n/2,o),super(1,1,1,r,r,r),r===1)return;let s=this.toNonIndexed();this.index=null,this.attributes.position=s.attributes.position,this.attributes.normal=s.attributes.normal,this.attributes.uv=s.attributes.uv;let a=new p,l=new p,c=new p(e,t,n).divideScalar(2).subScalar(o),f=this.attributes.position.array,d=this.attributes.normal.array,u=this.attributes.uv.array,h=f.length/6,g=new p,v=.5/r;for(let I=0,P=0;I<f.length;I+=3,P+=2)switch(a.fromArray(f,I),l.copy(a),l.x-=Math.sign(l.x)*v,l.y-=Math.sign(l.y)*v,l.z-=Math.sign(l.z)*v,l.normalize(),f[I+0]=c.x*Math.sign(a.x)+l.x*o,f[I+1]=c.y*Math.sign(a.y)+l.y*o,f[I+2]=c.z*Math.sign(a.z)+l.z*o,d[I+0]=l.x,d[I+1]=l.y,d[I+2]=l.z,Math.floor(I/h)){case 0:g.set(1,0,0),u[P+0]=J(g,l,"z","y",o,n),u[P+1]=1-J(g,l,"y","z",o,t);break;case 1:g.set(-1,0,0),u[P+0]=1-J(g,l,"z","y",o,n),u[P+1]=1-J(g,l,"y","z",o,t);break;case 2:g.set(0,1,0),u[P+0]=1-J(g,l,"x","z",o,e),u[P+1]=J(g,l,"z","x",o,n);break;case 3:g.set(0,-1,0),u[P+0]=1-J(g,l,"x","z",o,e),u[P+1]=1-J(g,l,"z","x",o,n);break;case 4:g.set(0,0,1),u[P+0]=1-J(g,l,"x","y",o,e),u[P+1]=1-J(g,l,"y","x",o,t);break;case 5:g.set(0,0,-1),u[P+0]=J(g,l,"x","y",o,e),u[P+1]=1-J(g,l,"y","x",o,t);break}}};function En(i,e=!1){let t=i[0].index!==null,n=new Set(Object.keys(i[0].attributes)),r=new Set(Object.keys(i[0].morphAttributes)),o={},s={},a=i[0].morphTargetsRelative,l=new Jt,c=0;for(let f=0;f<i.length;++f){let d=i[f],u=0;if(t!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+f+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let h in d.attributes){if(!n.has(h))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+f+'. All geometries must have compatible attributes; make sure "'+h+'" attribute exists among all geometries, or in none of them.'),null;o[h]===void 0&&(o[h]=[]),o[h].push(d.attributes[h]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+f+". Make sure all geometries have the same number of attributes."),null;if(a!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+f+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let h in d.morphAttributes){if(!r.has(h))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+f+".  .morphAttributes must be consistent throughout all geometries."),null;s[h]===void 0&&(s[h]=[]),s[h].push(d.morphAttributes[h])}if(e){let h;if(t)h=d.index.count;else if(d.attributes.position!==void 0)h=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+f+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,h,f),c+=h}}if(t){let f=0,d=[];for(let u=0;u<i.length;++u){let h=i[u].index;for(let g=0;g<h.count;++g)d.push(h.getX(g)+f);f+=i[u].attributes.position.count}l.setIndex(d)}for(let f in o){let d=zn(o[f]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+f+" attribute."),null;l.setAttribute(f,d)}for(let f in s){let d=s[f][0].length;if(d===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[f]=[];for(let u=0;u<d;++u){let h=[];for(let v=0;v<s[f].length;++v)h.push(s[f][v][u]);let g=zn(h);if(!g)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+f+" morphAttribute."),null;l.morphAttributes[f].push(g)}}return l}function zn(i){let e,t,n,r=-1,o=0;for(let c=0;c<i.length;++c){let f=i[c];if(f.isInterleavedBufferAttribute)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. InterleavedBufferAttributes are not supported."),null;if(e===void 0&&(e=f.array.constructor),e!==f.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=f.itemSize),t!==f.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=f.normalized),n!==f.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(r===-1&&(r=f.gpuType),r!==f.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=f.array.length}let s=new e(o),a=0;for(let c=0;c<i.length;++c)s.set(i[c].array,a),a+=i[c].array.length;let l=new qt(s,t,n);return r!==void 0&&(l.gpuType=r),l}var kt=new Ce,no=new $t;function w(i,e=0,t=0,n=0,r=0,o=0,s=0){return kt.makeRotationFromEuler(no.set(r,o,s)),kt.setPosition(e,t,n),i.applyMatrix4(kt),i}function oo(i){for(let t of Object.keys(i.attributes))t!=="position"&&t!=="normal"&&t!=="uv"&&i.deleteAttribute(t);let e=i.attributes.position.count;return i.attributes.uv||i.setAttribute("uv",new Oe(new Float32Array(e*2),2)),i.attributes.normal||i.computeVertexNormals(),i.index||i.setIndex(Array.from({length:e},(t,n)=>n)),i.morphAttributes={},i}var j=class{constructor(e=1){this.seg=e,this.parts=new Map,this.ln=[],this.foot=[]}n(e,t=8){return Math.max(t,Math.round(e*this.seg))}add(e,t){return this.parts.has(e)||this.parts.set(e,[]),this.parts.get(e).push(oo(t)),this}seg2(e,t){this.ln.push(e.x,e.y,e.z,t.x,t.y,t.z)}poly(e,t=!0){for(let n=0;n<e.length-(t?0:1);n++)this.seg2(e[n],e[(n+1)%e.length])}rect(e,t,n,r,o){let s=r/2,a=o/2;this.poly([new p(e-s,t,n-a),new p(e+s,t,n-a),new p(e+s,t,n+a),new p(e-s,t,n+a)])}circle(e,t,n,r,o=40){let s=[];for(let a=0;a<o;a++){let l=a/o*Math.PI*2;s.push(new p(e+Math.cos(l)*r,t,n+Math.sin(l)*r))}this.poly(s)}box(e,t,n,r,o,s){this.rect(e,t,n,r,s),this.rect(e,t+o,n,r,s);let a=r/2,l=s/2;[[-a,-l],[a,-l],[a,l],[-a,l]].forEach(([c,f])=>this.seg2(new p(e+c,t,n+f),new p(e+c,t+o,n+f)))}build(){let e=[];for(let[t,n]of this.parts)e.push({key:t,geo:En(n,!1)});return{meshes:e,lines:new Float32Array(this.ln)}}},Q=(i,e,t,n,r=2)=>new ut(i,e,t,r,Math.min(n,i/2-.01,e/2-.01,t/2-.01));function ro(i,e,t,n=18,r=!0){let o=[];r?o.push(new b(e*1.32,0),new b(e*1.32,1),new b(e*1.12,2),new b(e*1.02,2.4)):o.push(new b(e*1.04,0),new b(e*1.02,.8)),o.push(new b(e,t*.25),new b(e*.97,t-1.8),new b(e*.9,t-.5),new b(e*.8,t),new b(0,t));let s=i.n(n*4,24),a=new ve(o,s),l=a.attributes.position,c=r?2.6:1,f=t-1.9;for(let d=0;d<l.count;d++){let u=l.getY(d);if(u<c||u>f)continue;let h=l.getX(d),g=l.getZ(d),v=Math.atan2(g,h),I=1-.06*Math.pow(Math.max(0,Math.cos(v*n)),3);l.setX(d,h*I),l.setZ(d,g*I)}return a.computeVertexNormals(),a}function so(i,e,t){let n=[new b(e,0),new b(e,t-1.2),new b(e-.7,t-.2),new b(e-1.4,t),new b(0,t)];return new ve(n,i.n(36,16))}function pt(i,e,t,n,r){let o=[new b(e,n),new b(t,n),new b(t,n+r),new b(e,n+r),new b(e,n)];return new ve(o,i.n(48,20))}var xe=(i,e,t,n=32)=>new At(e,e,t,i.n(n,10),1),ue=(i,e)=>new ne(i,e).rotateX(-Math.PI/2),An=(i,e,t,n=64)=>new sn(e,t,6,i.n(n,24)).rotateX(Math.PI/2),L=(i,e,t)=>new Ue(i,e,t);function C(i,e,t,n,r,o,s,a={}){let l=ro(i,r,o,a.ridges||18,a.skirt!==!1);i.add(a.mat||"knob",w(l,e,t,n,0,-s,0));let c=r*.78,f=L(Math.max(.9,r*.11),.5,c).translate(0,o+.05,-c/2-r*.1).rotateY(-s).translate(e,t,n);i.add("mark",f),a.cap&&i.add(a.cap,w(new At(r*.62,r*.62,.6,i.n(28,12)),e,t+o+.1,n)),i.circle(e,t+o,n,r*.8,28),i.circle(e,t,n,(a.skirt!==!1?1.32:1.04)*r,32),i.foot.push({x:e,z:n,r:r*1.32,h:o});let d=new p(Math.sin(s),0,-Math.cos(s));i.seg2(new p(e+d.x*r*.15,t+o,n+d.z*r*.15),new p(e+d.x*r*.78,t+o,n+d.z*r*.78))}function V(i,e,t,n,r,o,s,a={}){var l;i.add(a.mat||"rubber",w(Q(r,s,o,(l=a.r)!=null?l:1.4),e,t+s/2,n)),a.led&&i.add(a.led,w(L(r*.62,.4,Math.min(1.6,o*.18)),e,t+s+.05,n-o*.28)),i.box(e,t,n,r,s,o),i.foot.push({x:e,z:n,w:r,d:o,h:s})}function B(i,e,t,n,r,o,s={}){s.bezel&&i.add(s.bezel,w(pt(i,r+.4,r+2.4,0,2.2),e,t,n)),s.ring&&i.add(s.ring,w(pt(i,r+.05,r+.9,0,o*.8),e,t+.4,n)),i.add(s.mat||"rubber",w(so(i,r,o),e,t,n)),i.circle(e,t+o,n,r-1.2,32),i.circle(e,t,n,r+(s.bezel?2.4:0),36),i.foot.push({x:e,z:n,r:r+(s.bezel?2.4:0),h:o})}function qe(i,e,t,n,r,o="z",s=3.2){let[a,l]=o==="z"?[s,r]:[r,s];i.add("slot",w(L(a,.6,l),e,t+.05,n)),i.rect(e,t+.4,n,a,l)}function Je(i,e,t){let n=Q(i,e,t,1.2,2);w(n,0,e/2+3,0);let r=L(2,3.2,2);return w(r,0,1.6,0),[n,r]}function ht(i,e,t,n="cable"){let r=new nn(e.map(s=>new p(...s)));i.add(n,new an(r,i.n(48,16),t,i.n(10,6),!1));let o=24;for(let s=0;s<o;s++)i.seg2(r.getPoint(s/o),r.getPoint((s+1)/o))}var ge="#ece6d8",Y="#e0102d",io='"Archivo", "Arial Narrow", "Helvetica Neue", Arial, sans-serif';function Le(i){let e=i>>>0||1;return()=>(e=e*1664525+1013904223>>>0)/4294967296}function Re(i,e=4){let t=new zt(i);return t.colorSpace=st,t.anisotropy=e,t}function $(i,e,t=700,n="condensed"){i.font=`${t} ${e}px ${io}`;try{i.fontStretch=n}catch{}}var _e=class{constructor(e,t,n,r=7){this.W=e,this.D=t,this.k=n,this.ops=[],this.seed=r}X(e){return(e+this.W/2)*this.k}Z(e){return(e+this.D/2)*this.k}text(e,t,n,r={}){return this.ops.push(["text",e,t,n,r]),this}scale(e,t,n,r={}){return this.ops.push(["scale",e,t,n,r]),this}frame(e,t,n,r,o={}){return this.ops.push(["frame",e,t,n,r,o]),this}line(e,t,n,r,o={}){return this.ops.push(["line",e,t,n,r,o]),this}fill(e,t,n,r,o){return this.ops.push(["fill",e,t,n,r,o]),this}image(e,t,n,r,o={}){return this.ops.push(["image",e,t,n,r,o]),this}shadows(e){return this.feet=e,this}draw(){let{k:e}=this,t=document.createElement("canvas");t.width=Math.round(this.W*e),t.height=Math.round(this.D*e);let n=t.getContext("2d"),r=n.createLinearGradient(0,0,t.width,t.height);r.addColorStop(0,"#1a1a1d"),r.addColorStop(.55,"#121214"),r.addColorStop(1,"#0d0d0f"),n.fillStyle=r,n.fillRect(0,0,t.width,t.height);let o=Le(this.seed);for(let s=0;s<t.height*1.4;s++){let a=o()*t.height;n.fillStyle=`rgba(255,255,255,${(.006+o()*.022).toFixed(3)})`,n.fillRect(o()*t.width*.3-t.width*.15,a,t.width*(.4+o()*.9),Math.max(1,e*.12))}for(let s of this.feet||[]){let a=this.X(s.x),l=this.Z(s.z),c=(2.4+(s.h||6)*.35)*e;if(s.r){let f=s.r*e,d=n.createRadialGradient(a,l+c*.25,f*.6,a,l+c*.25,f+c);d.addColorStop(0,"rgba(0,0,0,.62)"),d.addColorStop(1,"rgba(0,0,0,0)"),n.fillStyle=d,n.beginPath(),n.arc(a,l+c*.25,f+c,0,Math.PI*2),n.fill()}else n.save(),n.filter=`blur(${(c*.5).toFixed(1)}px)`,n.fillStyle="rgba(0,0,0,.55)",n.fillRect(a-s.w/2*e-c*.3,l-s.d/2*e-c*.1,s.w*e+c*.6,s.d*e+c*.7),n.restore()}for(let s of this.ops)this[s[0]+"Op"](n,...s.slice(1));return Re(t,8)}textOp(e,t,n,r,o){var a;let{k:s}=this;e.save(),e.translate(this.X(n),this.Z(r)),o.rot&&e.rotate(o.rot),$(e,(o.size||2.6)*s,o.weight||700,o.stretch||"condensed");try{e.letterSpacing=`${(((a=o.track)!=null?a:.06)*(o.size||2.6)*s).toFixed(1)}px`}catch{}if(e.textAlign=o.align||"center",e.textBaseline="middle",e.fillStyle=o.color||"rgba(236,230,216,.82)",o.box){let l=e.measureText(t).width+(o.size||2.6)*s*.9,c=(o.size||2.6)*s*1.45;e.fillStyle=o.box,e.fillRect(-l/2,-c/2,l,c),e.fillStyle=o.color||"#0e0d0c"}e.fillText(t,0,0),e.restore()}scaleOp(e,t,n,r,o){var f,d;let{k:s}=this,a=o.n||11,l=(f=o.a0)!=null?f:-2.45,c=(d=o.a1)!=null?d:2.45;e.fillStyle=o.color||"rgba(236,230,216,.7)";for(let u=0;u<a;u++){let h=l+(c-l)*(u/(a-1)),g=(r+1.6)*s,v=u===0||u===a-1||u===(a-1)/2;e.beginPath(),e.arc(this.X(t)+Math.sin(h)*g,this.Z(n)-Math.cos(h)*g,(v?.55:.36)*s,0,Math.PI*2),e.fill()}o.min&&this.textOp(e,o.min,t+Math.sin(l)*(r+4.4),n-Math.cos(l)*(r+4.4)+1.2,{size:1.9,weight:600}),o.max&&this.textOp(e,o.max,t+Math.sin(c)*(r+4.4),n-Math.cos(c)*(r+4.4)+1.2,{size:1.9,weight:600})}frameOp(e,t,n,r,o,s){var f;let{k:a}=this;e.strokeStyle=s.color||"rgba(236,230,216,.28)",e.lineWidth=(s.width||.32)*a;let l=this.X(t-r/2),c=this.Z(n-o/2);e.beginPath(),e.roundRect?e.roundRect(l,c,r*a,o*a,((f=s.radius)!=null?f:1.6)*a):e.rect(l,c,r*a,o*a),e.stroke()}lineOp(e,t,n,r,o,s){e.strokeStyle=s.color||"rgba(236,230,216,.28)",e.lineWidth=(s.width||.32)*this.k,e.beginPath(),e.moveTo(this.X(t),this.Z(n)),e.lineTo(this.X(r),this.Z(o)),e.stroke()}fillOp(e,t,n,r,o,s){e.fillStyle=s,e.fillRect(this.X(t-r/2),this.Z(n-o/2),r*this.k,o*this.k)}imageOp(e,t,n,r,o,s){var l;if(!t)return;let a=o*(t.height/t.width);e.save(),e.globalAlpha=(l=s.alpha)!=null?l:1,e.drawImage(t,this.X(n-o/2),this.Z(r-a/2),o*this.k,a*this.k),e.restore()}};function Rn(i,e,t=512){if(!i)return null;let n=document.createElement("canvas"),r=i.height/i.width;n.width=t,n.height=Math.round(t*r);let o=n.getContext("2d");return o.drawImage(i,0,0,n.width,n.height),o.globalCompositeOperation="source-in",o.fillStyle=e,o.fillRect(0,0,n.width,n.height),n}function ao(i,e,t){let n=e%t/t,r=Math.exp(-n*7)*(.75+i()*.1),o=.28+.12*Math.sin(e*.07)+i()*.08,s=(e+t/2)%t/t<.12?.35+i()*.2:i()*.14;return{low:Math.min(1,r+o*.35),mid:.18+o*.5+i()*.12,hi:s}}function Tn(i,e=2048,t=160){let n=document.createElement("canvas");n.width=e,n.height=t;let r=n.getContext("2d");r.fillStyle="#060607",r.fillRect(0,0,e,t);let o=Le(i),s=t/2,a=64;for(let c=0;c<e;c++){let f=ao(o,c,a);r.fillStyle="rgba(224,16,45,.95)",r.fillRect(c,s-f.low*s*.92,1,f.low*s*1.84),r.fillStyle="rgba(236,230,216,.78)",r.fillRect(c,s-f.mid*s*.7,1,f.mid*s*1.4),r.fillStyle="rgba(255,255,255,.95)",r.fillRect(c,s-f.hi*s*.45,1,f.hi*s*.9)}r.fillStyle="rgba(236,230,216,.18)";for(let c=0;c<e;c+=a)r.fillRect(c,0,1,c%(a*4)===0?t:10);let l=Re(n);return l.wrapS=vt,l}function Bn(i){let n=document.createElement("canvas");n.width=1024,n.height=576;let r=n.getContext("2d");r.fillStyle="#050506",r.fillRect(0,0,1024,576),r.fillStyle=Y,r.fillRect(14,14,64,58),$(r,44,900),r.fillStyle="#0e0d0c",r.textAlign="center",r.textBaseline="middle",r.fillText(String(i.n),46,45),r.textAlign="left",$(r,30,800),r.fillStyle=ge,r.fillText(i.title,94,32),$(r,21,600),r.fillStyle="rgba(236,230,216,.62)",r.fillText("KEXXY  \xB7  "+i.genre,94,60),$(r,20,700),r.textAlign="right",r.fillStyle="rgba(236,230,216,.7)",r.fillText("USB  \xB7  "+i.key,1006,32),r.fillStyle=i.playing?Y:"rgba(236,230,216,.4)",r.fillText(i.playing?"\u25CF ON AIR":"CUED",1006,60),r.strokeStyle="rgba(236,230,216,.2)",r.lineWidth=2,r.strokeRect(12,148,1e3,184),$(r,18,600),r.textAlign="left",r.fillStyle="rgba(236,230,216,.55)",r.fillText("REMAIN",22,362),r.fillText("TEMPO",430,362),r.fillText("BPM",700,362),$(r,70,800),r.fillStyle="#ffffff",r.fillText(i.time,18,414),$(r,44,700),r.fillStyle=ge,r.fillText(i.tempo,428,414),r.fillStyle=Y,r.fillRect(694,378,316,76),$(r,70,900),r.fillStyle="#0e0d0c",r.textAlign="right",r.fillText(i.bpm,996,418);let o=Le(i.n*31),s=470,a=86,l=i.pos;for(let c=14;c<1010;c+=2){let f=(.25+.55*Math.abs(Math.sin(c*.011+i.n))+o()*.2)*(c>700&&c<760?.35:1);r.fillStyle=c/1024<l?"rgba(236,230,216,.28)":"rgba(236,230,216,.82)",r.fillRect(c,s+a/2-f*a/2,1.4,f*a)}r.fillStyle=Y,r.fillRect(1024*l,s-6,3,a+12);for(let c=0;c<6;c++)r.fillStyle=c%2?ge:Y,r.fillRect(40+c*150+i.n*23%60,s-12,10,8);return Re(n)}function In(i){let t=document.createElement("canvas");t.width=t.height=512;let n=t.getContext("2d");if(n.fillStyle="#070708",n.fillRect(0,0,512,512),n.strokeStyle=Y,n.lineWidth=22,n.beginPath(),n.arc(512/2,512/2,512/2-26,0,Math.PI*2),n.stroke(),n.strokeStyle="rgba(236,230,216,.85)",n.lineWidth=4,n.beginPath(),n.arc(512/2,512/2,512/2-52,-Math.PI*.5,Math.PI*.9),n.stroke(),i){let o=286.72*(i.width/i.height);n.drawImage(i,(512-o)/2,(512-286.72)/2,o,286.72)}return Re(t)}function Pn(){let e=document.createElement("canvas");e.width=e.height=1024;let t=e.getContext("2d"),n=t.createRadialGradient(1024/2,1024/2,1024*.05,1024/2,1024/2,1024/2);n.addColorStop(0,"#111113"),n.addColorStop(1,"#070708"),t.fillStyle=n,t.fillRect(0,0,1024,1024);let r=Le(5);for(let o=1024*.18;o<1024*.5;o+=2.2)t.strokeStyle=`rgba(255,255,255,${(.02+r()*.04).toFixed(3)})`,t.lineWidth=1,t.beginPath(),t.arc(1024/2,1024/2,o,0,Math.PI*2),t.stroke();return Re(e,8)}function kn(){let t=document.createElement("canvas");t.width=512,t.height=352;let n=t.getContext("2d");n.fillStyle="#050506",n.fillRect(0,0,512,352),$(n,26,700),n.fillStyle="rgba(236,230,216,.6)",n.textBaseline="middle",n.fillText("BEAT FX",22,34),n.textAlign="right",n.fillText("CH 1\u20134",490,34),n.textAlign="left",$(n,68,900),n.fillStyle=ge,n.fillText("ECHO",20,104),n.textAlign="right",n.fillStyle=Y,n.fillText("150",492,104),$(n,20,700),n.fillStyle="rgba(236,230,216,.6)",n.fillText("BPM",490,146),n.textAlign="center",["1/4","1/2","3/4","1","2"].forEach((r,o)=>{let s=60+o*98;o===1&&(n.fillStyle=Y,n.fillRect(s-40,172,80,46)),n.strokeStyle="rgba(236,230,216,.4)",n.lineWidth=2,n.strokeRect(s-40,172,80,46),$(n,26,800),n.fillStyle=o===1?"#0e0d0c":ge,n.fillText(r,s,196)}),n.strokeStyle=ge,n.lineWidth=3,n.beginPath(),n.moveTo(24,326);for(let r=24;r<488;r++)n.lineTo(r,326-Math.pow((r-24)/464,1.6)*92);return n.stroke(),Re(t)}function Cn(i,e,t,n=0){let o=document.createElement("canvas");o.width=Math.round(i*1.2),o.height=Math.round(e*1.2);let s=o.getContext("2d");s.fillStyle="#19181a",s.fillRect(0,0,o.width,o.height);let a=Le(11);for(let l=0;l<9e3;l++)s.fillStyle=`rgba(${a()>.5?"255,255,255":"0,0,0"},${(a()*.05).toFixed(3)})`,s.fillRect(a()*o.width,a()*o.height,1+a()*2,1+a()*2);s.filter="blur(10px)",s.fillStyle="rgba(0,0,0,.5)";for(let l of t)s.fillRect((l.x-l.w/2+i/2)*1.2-4,(l.z-n-l.d/2+e/2)*1.2-2,l.w*1.2+8,l.d*1.2+10);return s.filter="none",Re(o)}function On(i){return new Promise(e=>{if(!i)return e(null);let t=new Image;t.onload=()=>e(t),t.onerror=()=>e(null),t.src=i})}function Ct(i=3){let t=document.createElement("canvas");t.width=t.height=512;let n=t.getContext("2d");n.fillStyle="rgb(0,118,0)",n.fillRect(0,0,512,512);let r=Le(i);for(let s=0;s<2600;s++){let a=70+Math.floor(r()*110);n.fillStyle=`rgba(0,${a},0,${(.25+r()*.5).toFixed(2)})`;let l=r()*512,c=40+r()*400,f=r()*512;n.fillRect(f,l,c,1),f+c>512&&n.fillRect(f-512,l,c,1)}let o=new zt(t);return o.wrapS=o.wrapT=vt,o.anisotropy=8,o}var be={W:329,D:453,H:118,FEET:14,PY:96},{W:mt,D:xt,FEET:Te,PY:ae}=be,y={z0:-224,z1:-72,y0:118,y1:102,x0:-150,x1:150},Ot=1.6,Ut=(y.y0-y.y1)/(y.z1-y.z0),Ge=Math.atan(Ut),we={x:-6,z:-148};we.y=y.y0-(we.z-y.z0)*Ut;var O={x:6,z:112,R:103},A={x:145,z:150,len:110};function Un(i,e,t){let n=new p(0,Math.cos(Ge),Math.sin(Ge)),r=new p(0,-Math.sin(Ge),Math.cos(Ge)),o=new p(i,we.y,we.z).addScaledVector(r,e).addScaledVector(n,t+Ot);return new Ce().makeRotationX(Ge).setPosition(o)}function Dn(i){let e=new j(i),t=new _e(mt-4,xt-4,i<1?3.1:4.6,13);e.add("body",w(Q(mt,ae-Te-1,xt,5,3),0,Te+(ae-Te-1)/2,0)),e.box(0,Te,0,mt,ae-Te,xt);for(let[l,c]of[[-118,-176],[118,-176],[-118,176],[118,176]])e.add("alu",w(xe(e,21,Te-2,40),l,(Te-2)/2+2,c)),e.add("rubber",w(xe(e,19,2,32),l,1,c));let n=new on;n.moveTo(y.z0,ae-1),n.lineTo(y.z0,y.y0),n.lineTo(y.z1,y.y1),n.lineTo(y.z1,ae-1);let r=new rn(n,{depth:y.x1-y.x0,bevelEnabled:!0,bevelThickness:Ot,bevelSize:Ot,bevelSegments:2,curveSegments:1});r.rotateY(-Math.PI/2).translate(y.x1,0,0),e.add("body",r);{let l=f=>y.y0-(f-y.z0)*Ut,c=[new p(y.x0,l(y.z0),y.z0),new p(y.x1,l(y.z0),y.z0),new p(y.x1,l(y.z1),y.z1),new p(y.x0,l(y.z1),y.z1)];e.poly(c);for(let f of c)e.seg2(f,new p(f.x,ae,f.z));e.seg2(new p(y.x0,ae,y.z1),new p(y.x1,ae,y.z1))}e.add("plate",w(ue(mt-4,xt-4),0,ae+.02,0));let o=new j(i);o.add("bezel",L(224,1.2,138).translate(we.x,.6,0)),o.rect(we.x,1.2,0,224,138),o.rect(we.x,1.25,0,214,128),o.add("slot",L(20,1,10).translate(-136,.5,-46)),o.add("ledRed",L(12,.5,1.6).translate(-136,.4,-36)),o.rect(-136,1,-46,20,10),["SOURCE","BROWSE","MENU"].forEach((l,c)=>V(o,-136,0,-12+c*20,18,8,4,{led:c===0?"ledBone":null})),C(o,127,0,-4,11.5,15,.6,{mat:"knob",cap:"alu",ridges:22}),[[117,-44],[138,-44],[117,34],[138,34]].forEach(([l,c])=>V(o,l,0,c,17,9,4));let s=Un(0,0,0);for(let[l,c]of o.parts)c.forEach(f=>e.add(l,f.applyMatrix4(s)));for(let l=0;l<o.ln.length;l+=3){let c=new p(o.ln[l],o.ln[l+1],o.ln[l+2]).applyMatrix4(s);e.ln.push(c.x,c.y,c.z)}let a=ae;for(let l=0;l<8;l++){let c=-108.5+l*31;V(e,c,a,-50,26,13,4.2,{mat:"pad",r:1.8}),t.text(String.fromCharCode(65+l),c-10,-59.5,{size:2.2,align:"left"})}t.frame(0,-50,252,26).text("PERFORMANCE PADS",0,-66,{size:2.3}),B(e,-140,a,-22,8,5,{mat:"capBone",ring:"ledBone"}),B(e,-116,a,-22,8,5,{mat:"capBone",ring:"ledBone"}),B(e,-93,a,-22,6,4,{mat:"rubber"}),t.text("IN",-140,-34,{size:2.4}).text("OUT",-116,-34,{size:2.4}).text("EXIT",-93,-34,{size:2.2}),V(e,-140,a,2,16,8,4),V(e,-116,a,2,16,8,4),t.text("\xBD LOOP",-140,11,{size:2}).text("2\xD7 LOOP",-116,11,{size:2}).line(-150,16,-104,16),V(e,-146,a,28,12,8,4),V(e,-130,a,28,12,8,4),t.text("\u25C4",-146,28,{size:2.6,color:"rgba(14,13,12,0)"}).text("BEAT JUMP",-138,37,{size:2.1}),e.add("rubber",w(Q(30,3,18,1.2),-138,a+1.5,62)),e.box(-138,a,62,30,3,18),e.add("alu",w(Q(5,10,5,1.2),-146,a+6,62,0,0,.35)),t.text("FWD",-124,57,{size:2}).text("REV",-124,67,{size:2,color:Y}).text("DIRECTION",-138,49,{size:2.1}),[[92,"TRACK SEARCH"],[122,"SEARCH"]].forEach(([l,c])=>{B(e,-147,a,l,7.5,4.5),B(e,-129,a,l,7.5,4.5),t.text(c,-138,l-11.5,{size:2.1})}),B(e,-138,a,152,18.5,6.5,{mat:"capBlack",bezel:"alu",ring:"ledBone"}),B(e,-138,a,198,18.5,6.5,{mat:"capBlack",bezel:"alu",ring:"playRing"}),t.text("CUE",-138,152,{size:3.2,color:"rgba(236,230,216,0)"}).text("PLAY / PAUSE",-138,175.5,{size:2.2}),B(e,93,a,-22,5,3.5),B(e,112,a,-22,5,3.5),t.text("MEMORY",93,-31,{size:1.9}).text("DELETE",112,-31,{size:1.9}),V(e,141,a,-22,22,10,4,{led:"ledRed"}),t.text("VINYL / CDJ",141,-33,{size:2}),V(e,129,a,4,19,10,4,{led:"ledBone"}),V(e,151,a,4,19,10,4,{led:"ledRed"}),t.text("SYNC",129,-6,{size:2.1}).text("MASTER",151,-6,{size:2.1}),V(e,140,a,28,30,9,4,{led:"ledBone"}),t.text("KEY SYNC",140,38,{size:2.1}),C(e,103,a,34,7,11,-.9,{mat:"knob",ridges:14}),t.scale(103,34,9.3,{n:7,min:"LIGHT",max:"HEAVY"}).text("JOG ADJUST",103,20,{size:2}),B(e,133,a,56,4.5,3.5),B(e,152,a,56,4.5,3.5,{ring:"ledRed"}),t.text("RANGE",133,48,{size:1.8}).text("M.TEMPO",152,48,{size:1.8}),qe(e,A.x,a,A.z,A.len,"z",4),t.frame(A.x,A.z,22,A.len+10,{radius:2});for(let l=0;l<=16;l++){let c=A.z-A.len/2+3+l*((A.len-6)/16);t.line(A.x-10,c,A.x-(l%4===0?5:7),c,{width:l%4===0?.4:.25})}return t.text("\u2212",A.x+8.5,A.z-A.len/2+2,{size:2.6}).text("+",A.x+8.5,A.z+A.len/2-2,{size:2.6}),t.text("TEMPO",A.x,A.z+A.len/2+9,{size:2.3}),B(e,118,a,206,4,3.5),t.text("RESET",118,214,{size:1.8}),e.add("slot",w(pt(e,O.R+.6,O.R+4.5,0,.5),O.x,a,O.z)),e.circle(O.x,a,O.z,O.R+4.5,72),t.text("REV",O.x-86,O.z+92,{size:2.2,rot:.75}).text("FWD",O.x+86,O.z+92,{size:2.2,rot:-.75}),t.text("KEXXY",30,214,{size:6,weight:900,track:.18,color:"rgba(236,230,216,.9)"}),t.text("RIDER MULTI PLAYER",62,214,{size:2.2,align:"left"}),t.text("KX-P1",150,214,{size:3.4,weight:800,align:"right",color:Y}),e.foot.push({x:O.x,z:O.z,r:O.R+3,h:18},{x:A.x,z:A.z,w:6,d:A.len,h:1}),t.shadows(e.foot),{kit:e,panel:t}}function _n(i){let e=new j(i),t=O.R,n=[new b(t-9,0),new b(t,0),new b(t,13.6),new b(t-.9,15),new b(t-9,15)],r=e.n(360,120),o=new ve(n,r),s=o.attributes.position;for(let a=0;a<s.count;a++){let l=s.getX(a),c=s.getZ(a),f=Math.hypot(l,c),d=s.getY(a);if(f<t-1.2||d<1||d>13.4)continue;let u=Math.atan2(c,l),h=1-.011*Math.pow(Math.max(0,Math.cos(u*120)),2);s.setX(a,l*h),s.setZ(a,c*h)}return o.computeVertexNormals(),e.add("alu",o),e.add("gloss",new ve([new b(t-9.2,0),new b(t-9.2,16.2),new b(t-10.4,17.6),new b(0,17.6)],e.n(96,40))),e.add("platter",w(new Et(t-10.6,e.n(96,40)).rotateX(-Math.PI/2),0,17.66,0)),e.add("jogDisp",w(new Et(30,e.n(64,32)).rotateX(-Math.PI/2),0,17.72,0)),e.add("ledRed",w(An(e,t-9.6,.75,96),0,16.7,0)),e.circle(0,0,0,t,72),e.circle(0,15,0,t,72),e.circle(0,15,0,t-9,72),e.circle(0,17.6,0,t-10.5,64),e.circle(0,17.75,0,30,40),e.seg2(new p(0,17.7,-33),new p(0,17.7,-(t-13))),e}function Ln(i){let e=new j(i),[t,n]=Je(28,8,14);return e.add("capBlack",t),e.add("rubber",n),e.add("mark",L(26,.4,1.1).translate(0,11.25,0)),e.box(0,3,0,28,8,14),e}var Qe={tilt:Ge,center:we,podMatrix:Un};var te={W:437.6,D:467,H:107.9,FEET:5,PY:86},{W:Se,D:ee,FEET:Be,PY:gt}=te,Dt=[0,1,2,3,4,5].map(i=>-127+i*38),ye={z:98,len:86},Z={x:-32,z:198,len:72},et=[],lo=["HI","HI MID","LOW MID","LOW"];function Gn(i){let e=new j(i),t=new _e(Se-4,ee-4,i<1?2.8:4.2,29);et.length=0;let n=gt;e.add("body",w(Q(Se,gt-Be,ee,3.5,3),0,Be+(gt-Be)/2,0)),e.box(0,Be,0,Se,gt-Be,ee);for(let[o,s]of[[-190,-205],[190,-205],[-190,205],[190,205]])e.add("rubber",w(xe(e,14,Be,24),o,Be/2,s));e.add("plate",w(ue(Se-4,ee-4),0,n+.02,0));let r=(o,s,a,l=0,c=0)=>e.add("alu",w(xe(e,2.1,.8,14),o,s,a,l,0,c));for(let o of[-1,1])for(let s of[-1,1])r(o*(Se/2-7),n+.35,s*(ee/2-7));for(let o of[-150,-50,50,150])r(-Se/2+7,n+.35,o),r(Se/2-7,n+.35,o);for(let o of[-180,-60,60,180])for(let s of[-1,1])r(s*(Se/2+.3),60,o,0,Math.PI/2);for(let o of[-170,-60,60,170])r(o,64,ee/2+.3,Math.PI/2),r(o,30,ee/2+.3,Math.PI/2);for(let o of[-198,-176])e.add("alu",w(xe(e,6.5,2,28),o,46,ee/2+1,Math.PI/2)),e.add("slot",w(xe(e,o===-198?3.4:2,2.2,20),o,46,ee/2+1.2,Math.PI/2));t.frame(-182,0,64,ee-24,{radius:2.5}),t.frame(-32,-118,232,210,{radius:2.5}),t.frame(151,-20,126,ee-72,{radius:2.5}),t.text("USB A",-196,-221,{size:1.9}).text("USB B",-168,-221,{size:1.9});for(let o of[-196,-168])e.add("slot",w(L(13,1,11),o,n+.4,-208)),e.rect(o,n+1,-208,13,11),e.add("ledRed",w(L(8,.5,1.4),o,n+.3,-199));return t.text("MIC",-182,-188,{size:2.6,weight:800}),[-196,-168].forEach((o,s)=>{C(e,o,n,-173,6.2,11,-.6+s*.4,{ridges:14}),t.scale(o,-173,8.2,{n:9}).text(s?"MIC 2":"MIC 1",o,-162.5,{size:1.8})}),[-196,-168].forEach((o,s)=>{C(e,o,n,-144,6,10,s?.4:-.3,{ridges:14}),t.scale(o,-144,8,{n:7}).text(s?"HI":"LOW",o,-133.5,{size:1.8})}),e.add("rubber",w(Q(20,2.5,8,1),-182,n+1.25,-118)),e.box(-182,n,-118,20,2.5,8),e.add("alu",w(L(5,5,4),-188,n+3,-118)),t.text("OFF   ON   TALK",-182,-110,{size:1.6}),t.text("FILTER",-182,-98,{size:2.6,weight:800}),B(e,-196,n,-84,6,3.5,{ring:"ledRed"}),B(e,-168,n,-84,6,3.5,{ring:"ledRed"}),t.text("LPF",-196,-75,{size:1.9}).text("HPF",-168,-75,{size:1.9}),C(e,-182,n,-56,8,13,.9,{ridges:16}),t.scale(-182,-56,10.5,{n:11,min:"MIN",max:"MAX"}).text("RESONANCE",-182,-42,{size:1.9}),t.text("SEND",-182,-30,{size:2.6,weight:800}),[[-196,-16],[-168,-16],[-196,4],[-168,4]].forEach(([o,s],a)=>{B(e,o,n,s,5.2,3.2,{ring:a===0?"ledBone":null})}),t.text("DELAY   ECHO",-182,14,{size:1.6}),[-196,-168].forEach((o,s)=>{C(e,o,n,34,6.5,11,s?.6:-.5,{ridges:14}),t.scale(o,34,8.5,{n:9}).text(s?"TIME":"TONE",o,45,{size:1.8})}),t.text("HEADPHONES A",-182,62,{size:2.4,weight:800}),[-196,-168].forEach((o,s)=>{C(e,o,n,80,7.5,12,s?1.2:0,{ridges:16}),t.scale(o,80,9.5,{n:9,min:s?"":"CUE",max:s?"":"MST"}).text(s?"LEVEL":"MIX",o,93,{size:1.9})}),B(e,-196,n,110,4.8,3.2,{mat:"capBone",ring:"ledBone"}),B(e,-168,n,110,4.8,3.2),t.text("LINK",-196,119,{size:1.7}).text("SPLIT",-168,119,{size:1.7}),t.text("PHONES A",-187,226,{size:1.9}),Dt.forEach((o,s)=>{let a=s<4;t.line(o+19,-224,o+19,214,{color:"rgba(236,230,216,.14)"}),C(e,o,n,-211,5.6,9,-1.4+s%3*1.4,{skirt:!1,ridges:10}),t.text(a?"USB":"LINE",o+11,-211,{size:1.6,align:"left"}),C(e,o,n,-185,7.2,12,a?.25:-.9,{ridges:16}),t.scale(o,-185,9.2,{n:11}).text("TRIM",o,-173.5,{size:1.8}),lo.forEach((l,c)=>{let f=-152+c*29;C(e,o+4,n,f,7.6,13,a?[.2,-.3,.1,s===1?-1.9:.35][c]:0,{ridges:16}),t.scale(o+4,f,9.6,{n:11}).text(l,o+4,f+12.2,{size:1.6})}),et.push({x:o-13.5,z:-109,len:104,w:3.4,ch:s}),t.frame(o-13.5,-109,5.6,108,{radius:.8,color:"rgba(236,230,216,.2)"}),C(e,o,n,-36,9.4,14,a?[.6,-.5,0,.9][s]:0,{mat:"knobRed",ridges:18}),t.scale(o,-36,12.2,{n:13,min:"LPF",max:"HPF"}).text("FILTER",o,-18.5,{size:1.8}),B(e,o,n,-4,5.2,3.2,{ring:s===2?"ledRed":null}),t.text("FX",o,4.6,{size:1.6}),V(e,o,n,18,16,9,4,{mat:"capBone",led:a&&s===1?"ledRed":null}),t.text("CUE",o,18,{size:2.2,color:"rgba(14,13,12,.85)"}),t.text(String(s+1),o,37,{size:6.4,weight:900}),qe(e,o,n,ye.z,ye.len,"z",3);for(let l=0;l<=10;l++){let c=ye.z-ye.len/2+4+l*((ye.len-8)/10);t.line(o-8.5,c,o-(l%5===0?4:5.5),c,{width:l%5===0?.36:.22}),l%5===0&&t.text(String(10-l),o+8.5,c,{size:1.7})}e.add("slot",w(L(12,.6,5),o,n+.3,158)),e.rect(o,n+.6,158,12,5),e.add("alu",w(Q(3.6,4,3.6,.6),o+(s%2?3.6:-3.6),n+2,158)),t.text("A  THRU  B",o,151,{size:1.5})}),t.text("CROSSFADER ASSIGN",-32,167,{size:1.8}).line(-140,164,76,164),qe(e,Z.x,n,Z.z,Z.len,"x",3.2),t.text("A",Z.x-46,Z.z,{size:3}).text("B",Z.x+46,Z.z,{size:3}),t.text("CROSSFADER",Z.x,Z.z+15,{size:2}),t.text("MASTER",110,-224,{size:2.6,weight:800}),C(e,106,n,-205,9.4,14,.5,{ridges:18}),t.scale(106,-205,12,{n:11,min:"\u2212\u221E",max:"+5"}),C(e,106,n,-170,7.4,12,.1,{ridges:16}),t.scale(106,-170,9.5,{n:9}).text("BOOTH",106,-158,{size:1.8}),[0,1].forEach(o=>et.push({x:128+o*7.5,z:-150,len:120,w:3.6,ch:6+o})),t.frame(131.75,-150,13,124,{radius:1,color:"rgba(236,230,216,.2)"}).text("L   R",131.75,-84,{size:1.6}),t.text("ISOLATOR",182,-224,{size:2.6,weight:800}),["HI","MID","LOW"].forEach((o,s)=>{let a=-198+s*42;C(e,182,n,a,12.6,17,s===2?-.35:0,{ridges:22}),t.scale(182,a,16,{n:11,min:"\u2212\u221E",max:"+6"}).text(o,200,a-13,{size:1.9})}),B(e,106,n,-134,5,3.2,{ring:"ledRed"}),t.text("ISO ON",106,-125,{size:1.7}),[[106,-105,"HI"],[106,-80,"LOW"]].forEach(([o,s,a])=>{C(e,o,n,s,5.8,10,.2,{ridges:12}),t.scale(o,s,7.6,{n:7}).text(a,o+10,s,{size:1.6,align:"left"})}),t.text("BOOTH EQ",106,-66,{size:1.7}),e.add("bezel",w(L(74,1,52),165,n+.5,-38)),e.rect(165,n+1,-38,74,52),e.rect(165,n+1.05,-38,66,45),t.text("BEAT FX",140,-71,{size:2.2,weight:800}).text("SETTINGS",190,-71,{size:1.7}),[[128,"\u25C4"],[153,"TAP"],[178,"\u25BA"]].forEach(([o,s])=>{V(e,o,n,2,15,9,4,{mat:o===153?"capRed":"rubber"}),t.text(s==="TAP"?"TAP":s,o,11.5,{size:1.6})}),t.text("BEAT",153,-8,{size:1.8}),[[128,"LOW"],[153,"MID"],[178,"HI"]].forEach(([o,s],a)=>{B(e,o,n,26,5.4,3.3,{mat:"rubber",ring:a===0?"ledRed":"ledRedDim"}),t.text(s,o,35,{size:1.6})}),t.text("FX FREQUENCY",153,42,{size:1.8}),C(e,153,n,64,10.4,14,-1.1,{ridges:20}),["ECHO","DELAY","REVERB","FILTER","ROLL","TRANS","PITCH","CRUSH"].forEach((o,s)=>{let a=-2.2+s*.6285714285714287;t.text(o,153+Math.sin(a)*21,64-Math.cos(a)*17,{size:1.5,color:s===0?Y:void 0})}),[[118,102,"TIME"],[188,102,"DEPTH"]].forEach(([o,s,a],l)=>{C(e,o,n,s,8.2,13,l?.7:-.2,{ridges:16}),t.scale(o,s,10.4,{n:11,min:"MIN",max:"MAX"}).text(a,o,s+14.5,{size:1.8})}),B(e,188,n,146,12.5,6,{mat:"capRed",bezel:"alu",ring:"ledRed"}),t.text("ON / OFF",188,165.5,{size:2}),t.text("HEADPHONES B",118,128,{size:2,weight:800}),[[108,146,"MIX"],[130,146,"LEVEL"]].forEach(([o,s,a],l)=>{C(e,o,n,s,6.6,11,l?.9:0,{ridges:14}),t.scale(o,s,8.6,{n:9}).text(a,o,s+11,{size:1.7})}),B(e,108,n,176,4.6,3.2,{mat:"capBone"}),t.text("CUE B",108,184.5,{size:1.7}),t.text("KEXXY",150,205,{size:6.4,weight:900,track:.18,color:"rgba(236,230,216,.92)"}),t.text("6 CHANNEL CLUB MIXER",150,216,{size:2}),t.text("KX-M6",204,226,{size:3.2,weight:800,align:"right",color:Y}),t.shadows(e.foot),{kit:e,panel:t}}function Fn(i){let e=new j(i),[t,n]=Je(13,9,9);return e.add("capBlack",t),e.add("rubber",n),e.add("mark",L(11.6,.4,1).translate(0,12.25,0)),e.box(0,3,0,13,9,9),e}function Hn(i){let e=new j(i),[t,n]=Je(9,9,17);return e.add("capAlu",t),e.add("rubber",n),e.add("mark",L(1,.4,15).translate(0,12.25,0)),e.box(0,3,0,9,9,17),e}var co=150,wt=60/co,Lt=12,z={W:4*be.W+te.W+4*Lt+80,D:640,T:34,Z:-10},Wn=235,_t=(()=>{let i=[],e=-(4*be.W+te.W+4*Lt)/2;return["deck","deck","mixer","deck","deck"].forEach(t=>{let n=t==="deck"?be.W:te.W,r=t==="deck"?be.D:te.D;i.push({t,x:e+n/2,z:Wn-r/2,w:n,d:r}),e+=n+Lt}),i})(),fo=[{n:1,title:"HARD TECHNO SET",genre:"HARD TECHNO",key:"8A",bpm:"150.0",tempo:"+0.00%",time:"\u221204:12.6",pos:.62,playing:!0,fader:-.08},{n:2,title:"HARDGROOVE SET",genre:"HARDGROOVE",key:"5A",bpm:"148.0",tempo:"\u22121.33%",time:"\u221206:48.0",pos:.08,playing:!1,fader:.18},{n:3,title:"RAW / BOUNCE",genre:"RAW \xB7 BOUNCE",key:"11A",bpm:"152.0",tempo:"+1.33%",time:"\u221202:31.9",pos:.81,playing:!0,fader:-.24},{n:4,title:"INDUSTRIAL TOOL",genre:"INDUSTRIAL",key:"3A",bpm:"150.0",tempo:"+0.00%",time:"\u221207:05.2",pos:.02,playing:!1,fader:0}];function uo(i,e){let t=s=>Ae(new Ze(s)),n=e?s=>{let{clearcoat:a,clearcoatRoughness:l,anisotropy:c,...f}=s;return t(f)}:s=>Ae(new cn(s)),r=s=>Ae(new at({color:new ce(s)})),o={body:n({color:1315862,metalness:.7,roughness:.34,roughnessMap:i.brush,anisotropy:.35,clearcoat:.25,clearcoatRoughness:.35}),cable:n({color:657931,metalness:0,roughness:.42,clearcoat:.3,clearcoatRoughness:.5}),cableRed:n({color:5900050,metalness:0,roughness:.45,clearcoat:.3}),alu:t({color:11120051,metalness:1,roughness:.3}),capAlu:t({color:14211806,metalness:1,roughness:.18}),rubber:t({color:1842207,metalness:0,roughness:.72}),slot:t({color:197379,metalness:0,roughness:.9}),bezel:n({color:460552,metalness:.2,roughness:.25,clearcoat:.8}),knob:n({color:1579035,metalness:.15,roughness:.42,clearcoat:.5,clearcoatRoughness:.3}),knobRed:n({color:1579035,metalness:.15,roughness:.42,clearcoat:.5,clearcoatRoughness:.3,emissive:2753031}),mark:t({color:15525592,roughness:.5,emissive:7038814}),pad:t({color:2763310,roughness:.55,emissive:3802640}),capBone:t({color:14275266,roughness:.45,emissive:2762272}),capBlack:n({color:1118483,metalness:.3,roughness:.3,clearcoat:.6}),capRed:t({color:9045782,roughness:.4,emissive:6160400}),gloss:n({color:394759,metalness:.1,roughness:.12,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:.35}),platter:n({color:16777215,map:i.platter,metalness:.1,roughness:.22,clearcoat:.6,clearcoatRoughness:.12,envMapIntensity:.25}),jogDisp:t({color:0,emissive:16777215,emissiveMap:i.jog,roughness:.1}),ledRed:r("#ff2340"),ledRedDim:r("#4a0610"),ledBone:r("#f4ead2"),playRing:r("#ff2340"),deckPlate:n({color:16777215,map:i.deckPanel,metalness:.62,roughness:.5,roughnessMap:i.brushPanel,anisotropy:.75,emissive:16777215,emissiveMap:i.deckPanel,emissiveIntensity:.11}),mixerPlate:n({color:16777215,map:i.mixerPanel,metalness:.62,roughness:.5,roughnessMap:i.brushPanel,anisotropy:.75,emissive:16777215,emissiveMap:i.mixerPanel,emissiveIntensity:.11}),felt:t({color:16777215,map:i.booth,metalness:0,roughness:.95})};return o.ledRed.userData.base=new ce("#ff2340"),o.playRing.userData.base=new ce("#ff2340"),o}function Ie(i,e,t){let n=new he;for(let{key:r,geo:o}of i.meshes){let s=r==="plate"?e[t]:e[r];if(!s){console.warn("rider3d: falta material",r);continue}n.add(new q(o,s))}return n}function bt(i,e){let t=new oe().setPositions(i),n=new me(t,e);return n.renderOrder=2,n}function po(){return new Ve({uniforms:Object.assign({uLevel:{value:0}},Ee),vertexShader:De.VERT_PARS+`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vKxW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,fragmentShader:De.PARS+`
      uniform float uLevel;
      varying vec2 vUv;
      void main() {
        float N = 15.0;
        float s = floor(vUv.y * N), f = fract(vUv.y * N);
        float on = step(s + 0.5, uLevel * N);
        vec3 lit = s >= 13.0 ? vec3(1.0, 0.09, 0.2) : (s >= 10.0 ? vec3(1.0, 0.5, 0.16) : vec3(0.95, 0.91, 0.84));
        vec3 col = mix(vec3(0.06), lit, on);
        float gap = step(0.2, f) * step(f, 0.84) * step(0.14, vUv.x) * step(vUv.x, 0.86);
        gl_FragColor = vec4(mix(vec3(0.015), col, gap), 1.0);
        ${De.SURFACE.replace(/KX_ALPHA/g,"1.0")}
      }`,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:2})}function ho(){return new Ve({uniforms:Object.assign({uHalf:{value:[z.W/2,z.D/2]},uZ:{value:z.Z}},Ee),transparent:!0,depthWrite:!1,premultipliedAlpha:!0,vertexShader:De.VERT_PARS+`
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vKxW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:De.PARS+`
      uniform vec2 uHalf;
      uniform float uZ;
      void main() {
        vec2 q = abs(vKxW.xz - vec2(0.0, uZ)) - uHalf;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        float a = (1.0 - smoothstep(-30.0, 90.0, d)) * 0.38 * smoothstep(0.55, 1.0, uInk);
        gl_FragColor = vec4(0.0, 0.0, 0.0, a);
      }`})}async function ir(i){let{canvas:e,lowPower:t=!1,sigilUrl:n}=i,r=!!i.revealed,o=t?.5:1,s=new tn({canvas:e,antialias:!0,alpha:!0,premultipliedAlpha:!0,powerPreference:t?"low-power":"high-performance"});s.setPixelRatio(1),s.toneMapping=Kt,s.toneMappingExposure=1.05,s.outputColorSpace=st,s.setClearColor(0,0);let a=new lt;a.environment=pn(s);let l=new Rt(16773860,2.6);l.position.set(-700,1500,950),l.target.position.set(0,0,z.Z),a.add(l,l.target),t||(s.shadowMap.enabled=!0,s.shadowMap.type=jt,l.castShadow=!0,l.shadow.mapSize.set(2048,2048),Object.assign(l.shadow.camera,{left:-1150,right:1150,top:820,bottom:-820,near:400,far:3600}),l.shadow.bias=-4e-4,l.shadow.normalBias=1.2,l.shadow.radius=4),a.add(new fn(14673151,2761760,.55));let c=new Rt(15265535,.8);c.position.set(900,520,-1200),a.add(c),document.fonts&&document.fonts.load&&await Promise.race([Promise.all([document.fonts.load('700 20px "Archivo"'),document.fonts.load('900 20px "Archivo"')]),new Promise(m=>setTimeout(m,1500))]).catch(()=>{});let f=await On(n),d=Rn(f,ge,512),u=Dn(o),h=Gn(o);u.panel.image(d,-6,214,9,{alpha:.9}),h.panel.image(d,120,206,9,{alpha:.9});let g={deckPanel:u.panel.draw(),mixerPanel:h.panel.draw(),platter:Pn(),jog:In(d),booth:Cn(z.W,z.D,_t,z.Z),brush:Ct(3),brushPanel:Ct(8)};g.brush.repeat.set(2,2),g.brushPanel.repeat.set(2.2,3);let v=uo(g,t),I=Pt(new Me({color:de,linewidth:1.5,worldUnits:!1})),P=Pt(new Me({color:de,linewidth:1,worldUnits:!1})),tt=[I,P],W=new he;a.add(W);let le=new q(w(Q(z.W,z.T,z.D,6,2),0,-z.T/2,z.Z),v.felt);W.add(le);let nt=new q(new ne(z.W+240,z.D+240).rotateX(-Math.PI/2),ho());nt.position.set(0,-z.T-.5,z.Z),nt.renderOrder=1,W.add(nt);{let m=new j;m.box(0,-z.T,z.Z,z.W,z.T,z.D),W.add(bt(m.ln,I))}{let m=new j(o),x=z.Z-z.D/2,T=Wn-te.D;_t.forEach((k,N)=>{let M=k.z-k.d/2,R=k.x+(k.t==="deck"?-96:150);if(ht(m,[[R,44,M+2],[R,30,M-10],[R-4,4,M-34],[R-2,4,x+30],[R+6,-12,x-4],[R+8,-220,x-12]],3.6),k.t!=="deck"){[-170,-150].forEach(K=>ht(m,[[K,40,M+2],[K,22,M-14],[K-6,3.2,x+34],[K-4,-14,x-4],[K-2,-220,x-12]],2.8));return}let F=Math.sign(k.x),H=k.x+70,E=F*120,rt=M-26-(Math.abs(N-2)-1)*12;ht(m,[[H,52,M+2],[H,34,M-9],[H+4,3.2,M-22],[(H+E)/2,3.2,rt],[E+F*12,3.2,T-18],[E,22,T-6],[E,44,T+2]],2.6,"cableRed")});let S=m.build();W.add(Ie(S,v)),W.add(bt(S.lines,P))}let Gt=u.kit.build(),Ft=_n(o).build(),Ht=Ln(o).build(),Wt=h.kit.build(),Nt=Fn(o).build(),Xt=Hn(o).build(),Nn=new oe().setPositions(Gt.lines),Xn=new oe().setPositions(Ft.lines),Vn=new oe().setPositions(Ht.lines),jn=new oe().setPositions(Nt.lines),Vt=[],Yn=ue(209,40),Zn=ue(214,128),Kn=0,ot=null;for(let m of _t){let x=new he;if(x.position.set(m.x,0,m.z),W.add(x),m.t==="deck"){let T=fo[Kn++];x.add(Ie(Gt,v,"deckPlate"));let S=new me(Nn,I);S.renderOrder=2,x.add(S);let k=new q(Zn,Ae(new Ze({color:0,emissive:16777215,emissiveMap:Bn(T),roughness:.08,metalness:0,envMapIntensity:.12})));k.applyMatrix4(Qe.podMatrix(Qe.center.x,0,1.3)),x.add(k);let N=Tn(T.n*97);N.repeat.set(.42,1);let M=new q(Yn,Ae(new Ze({color:0,emissive:16777215,emissiveMap:N,roughness:.08,metalness:0,envMapIntensity:.12})));M.applyMatrix4(Qe.podMatrix(Qe.center.x,-10.67,1.36)),x.add(M);let R=new he;R.position.set(O.x,be.PY,O.z),x.add(R),R.add(Ie(Ft,v));let F=new me(Xn,I);F.renderOrder=2,R.add(F),R.rotation.y=T.n*1.7;let H=new he;H.position.set(A.x,be.PY,A.z+T.fader*A.len*.45),x.add(H),H.add(Ie(Ht,v));let E=new me(Vn,P);E.renderOrder=2,H.add(E),Vt.push({info:T,jog:R,wt:N,spin:T.playing?1:0})}else{x.add(Ie(Wt,v,"mixerPlate")),x.add(bt(Wt.lines,I));let T=Dt.map((M,R)=>{let F=new he;F.position.set(M,te.PY,ye.z-ye.len*(R<4?[.36,.3,.36,.12][R]:-.42)),x.add(F),F.add(Ie(Nt,v));let H=new me(jn,P);return H.renderOrder=2,F.add(H),F}),S=new he;S.position.set(Z.x,te.PY,Z.z),x.add(S),S.add(Ie(Xt,v)),S.add(bt(Xt.lines,P));let k=et.map(M=>{let R=new q(ue(M.w,M.len),po());return R.position.set(M.x,te.PY+.25,M.z),x.add(R),{mesh:R,ch:M.ch,lvl:0}}),N=new q(ue(66,45),Ae(new Ze({color:0,emissive:16777215,emissiveMap:kn(),roughness:.08,envMapIntensity:.12})));N.position.set(165,te.PY+1.12,-38),x.add(N),ot={g:x,faders:T,xc:S,meters:k}}}W.traverse(m=>{!m.isMesh||m.isLineSegments2||m===nt||m.material.isShaderMaterial||(m.castShadow=!0,m.receiveShadow=!0)});let pe=new Qt(24,2,10,2e4),Pe=new p,ke={x:0,y:0},Fe={yaw:0,tilt:0},He=2,We=1,St=-1,G={x:0,y:0,w:2,h:1},yt=(m,x,T)=>X.smoothstep(T,m,x);function $n(m){let x=G.w/G.h,T=x<1.5,S=r?1:yt(.08,.5,m),k=r?X.clamp(m,.5,1):m,N=X.degToRad(X.lerp(88.5,34,S)-ke.y*5*S)+Fe.tilt*S,M=X.lerp(0,-.17,S)+(k-.5)*.4*S+ke.x*.14+Fe.yaw*S,R=X.degToRad(pe.fov),F=2*Math.atan(Math.tan(R/2)*x),E=X.lerp(z.W*1.06,T?1300:z.W*.9,S)/2/Math.tan(F/2),rt=z.D*.62/Math.tan(R/2),K=Math.max(E,X.lerp(rt,0,S))*(1+Math.sin(Math.PI*S)*.14)*(1+Math.abs(Fe.yaw)*.42*S),Jn=T?X.lerp(-.26,.26,yt(.3,.92,k))*z.W*S:0;Pe.set(Jn,X.lerp(0,45,S),X.lerp(z.Z,T?20:55,S)),pe.position.set(Pe.x+K*Math.sin(M)*Math.cos(N),Pe.y+K*Math.sin(N),Pe.z+K*Math.cos(M)*Math.cos(N)),pe.lookAt(Pe)}let qn=m=>Math.exp(-((m%wt+wt)%wt/wt)*6);return{setSize(m,x,T=1,S){He=Math.max(2,m),We=Math.max(2,x),s.setSize(He,We,!1),[G.x,G.y,G.w,G.h]=S||[0,0,He,We],G.w=Math.max(2,G.w),G.h=Math.max(2,G.h),pe.aspect=G.w/G.h,pe.setViewOffset(G.w,G.h,-G.x,-G.y,He,We),I.linewidth=1.6*T,P.linewidth=1.05*T,tt.forEach(k=>k.resolution.set(He,We)),Ee.uDot.value=Math.max(3,4.5*T)},render(m,x={}){var R,F,H;let T=X.clamp((R=x.scroll)!=null?R:.6,0,1),S=St<0?0:Math.min(.1,Math.max(0,m-St));St=m;let k=x.pointer||[0,0];x.orbit&&(Fe.yaw=x.orbit[0],Fe.tilt=x.orbit[1]),ke.x+=(k[0]-ke.x)*Math.min(1,S*4||1),ke.y+=(k[1]-ke.y)*Math.min(1,S*4||1);let N=(F=x.ink)!=null?F:r?1:yt(.2,.58,T);Ee.uInk.value=N,!r&&x.ink==null&&N>=.999&&(r=!0,i.onReveal&&i.onReveal());let M=(H=x.kick)!=null?H:qn(m);$n(T),x.cam&&(pe.position.fromArray(x.cam[0]),pe.lookAt(Pe.fromArray(x.cam[1])));for(let E of Vt)E.spin&&(E.jog.rotation.y-=S*2.2),E.spin&&(E.wt.offset.x=(E.wt.offset.x+S*.12)%1);if(v.ledRed.color.copy(v.ledRed.userData.base).multiplyScalar(.55+.45*M),v.playRing.color.copy(v.playRing.userData.base).multiplyScalar(.3+.7*M),ot){for(let E of ot.meters){let K=(E.ch<4?E.ch===1||E.ch===3?.35:1:E.ch>=6?1:0)*(.5+.42*M+.08*Math.sin(m*13+E.ch*2.1));E.lvl=K>E.lvl?K:E.lvl+(K-E.lvl)*Math.min(1,S*7),E.mesh.material.uniforms.uLevel.value=E.lvl}ot.xc.position.x=Z.x+Math.sin(m*.21)*Z.len*.18}return s.render(a,pe),M},dispose(){a.traverse(m=>{m.geometry&&m.geometry.dispose()}),Object.values(v).forEach(m=>m.dispose()),Object.values(g).forEach(m=>m.dispose()),s.dispose()}}}export{co as BPM,ir as mountRider};
