// https://github.com/d3/d3-delaunay v6.0.4 Copyright 2018-2021 Observable, Inc., 2021 Mapbox
!function(t,i){"object"==typeof exports&&"undefined"!=typeof module?i(exports):"function"==typeof define&&define.amd?define(["exports"],i):i((t="undefined"!=typeof globalThis?globalThis:t||self).d3=t.d3||{})}(this,(function(t){"use strict";const i=134217729;function e(t,i,e,n,s){let l,h,r,o,a=i[0],c=n[0],u=0,f=0;c>a==c>-a?(l=a,a=i[++u]):(l=c,c=n[++f]);let _=0;if(u<t&&f<e)for(c>a==c>-a?(h=a+l,r=l-(h-a),a=i[++u]):(h=c+l,r=l-(h-c),c=n[++f]),l=h,0!==r&&(s[_++]=r);u<t&&f<e;)c>a==c>-a?(h=l+a,o=h-l,r=l-(h-o)+(a-o),a=i[++u]):(h=l+c,o=h-l,r=l-(h-o)+(c-o),c=n[++f]),l=h,0!==r&&(s[_++]=r);for(;u<t;)h=l+a,o=h-l,r=l-(h-o)+(a-o),a=i[++u],l=h,0!==r&&(s[_++]=r);for(;f<e;)h=l+c,o=h-l,r=l-(h-o)+(c-o),c=n[++f],l=h,0!==r&&(s[_++]=r);return 0===l&&0!==_||(s[_++]=l),_}function n(t){return new Float64Array(t)}const s=n(4),l=n(8),h=n(12),r=n(16),o=n(4);function a(t,n,a,c,u,f){const _=(n-f)*(a-u),d=(t-u)*(c-f),g=_-d;if(0===_||0===d||_>0!=d>0)return g;const y=Math.abs(_+d);return Math.abs(g)>=33306690738754716e-32*y?g:-function(t,n,a,c,u,f,_){let d,g,y,m,x,p,w,v,b,T,M,A,k,$,P,S,I,z;const F=t-u,U=a-u,K=n-f,L=c-f;$=F*L,p=i*F,w=p-(p-F),v=F-w,p=i*L,b=p-(p-L),T=L-b,P=v*T-($-w*b-v*b-w*T),S=K*U,p=i*K,w=p-(p-K),v=K-w,p=i*U,b=p-(p-U),T=U-b,I=v*T-(S-w*b-v*b-w*T),M=P-I,x=P-M,s[0]=P-(M+x)+(x-I),A=$+M,x=A-$,k=$-(A-x)+(M-x),M=k-S,x=k-M,s[1]=k-(M+x)+(x-S),z=A+M,x=z-A,s[2]=A-(z-x)+(M-x),s[3]=z;let j=function(t,i){let e=i[0];for(let n=1;n<t;n++)e+=i[n];return e}(4,s),H=22204460492503146e-32*_;if(j>=H||-j>=H)return j;if(x=t-F,d=t-(F+x)+(x-u),x=a-U,y=a-(U+x)+(x-u),x=n-K,g=n-(K+x)+(x-f),x=c-L,m=c-(L+x)+(x-f),0===d&&0===g&&0===y&&0===m)return j;if(H=11093356479670487e-47*_+33306690738754706e-32*Math.abs(j),j+=F*m+L*d-(K*y+U*g),j>=H||-j>=H)return j;$=d*L,p=i*d,w=p-(p-d),v=d-w,p=i*L,b=p-(p-L),T=L-b,P=v*T-($-w*b-v*b-w*T),S=g*U,p=i*g,w=p-(p-g),v=g-w,p=i*U,b=p-(p-U),T=U-b,I=v*T-(S-w*b-v*b-w*T),M=P-I,x=P-M,o[0]=P-(M+x)+(x-I),A=$+M,x=A-$,k=$-(A-x)+(M-x),M=k-S,x=k-M,o[1]=k-(M+x)+(x-S),z=A+M,x=z-A,o[2]=A-(z-x)+(M-x),o[3]=z;const E=e(4,s,4,o,l);$=F*m,p=i*F,w=p-(p-F),v=F-w,p=i*m,b=p-(p-m),T=m-b,P=v*T-($-w*b-v*b-w*T),S=K*y,p=i*K,w=p-(p-K),v=K-w,p=i*y,b=p-(p-y),T=y-b,I=v*T-(S-w*b-v*b-w*T),M=P-I,x=P-M,o[0]=P-(M+x)+(x-I),A=$+M,x=A-$,k=$-(A-x)+(M-x),M=k-S,x=k-M,o[1]=k-(M+x)+(x-S),z=A+M,x=z-A,o[2]=A-(z-x)+(M-x),o[3]=z;const C=e(E,l,4,o,h);$=d*m,p=i*d,w=p-(p-d),v=d-w,p=i*m,b=p-(p-m),T=m-b,P=v*T-($-w*b-v*b-w*T),S=g*y,p=i*g,w=p-(p-g),v=g-w,p=i*y,b=p-(p-y),T=y-b,I=v*T-(S-w*b-v*b-w*T),M=P-I,x=P-M,o[0]=P-(M+x)+(x-I),A=$+M,x=A-$,k=$-(A-x)+(M-x),M=k-S,x=k-M,o[1]=k-(M+x)+(x-S),z=A+M,x=z-A,o[2]=A-(z-x)+(M-x),o[3]=z;const N=e(C,h,4,o,r);return r[N-1]}(t,n,a,c,u,f,y)}const c=Math.pow(2,-52),u=new Uint32Array(512);class f{static from(t,i=x,e=p){const n=t.length,s=new Float64Array(2*n);for(let l=0;l<n;l++){const n=t[l];s[2*l]=i(n),s[2*l+1]=e(n)}return new f(s)}constructor(t){const i=t.length>>1;if(i>0&&"number"!=typeof t[0])throw new Error("Expected coords to contain numbers.");this.coords=t;const e=Math.max(2*i-5,0);this._triangles=new Uint32Array(3*e),this._halfedges=new Int32Array(3*e),this._hashSize=Math.ceil(Math.sqrt(i)),this._hullPrev=new Uint32Array(i),this._hullNext=new Uint32Array(i),this._hullTri=new Uint32Array(i),this._hullHash=new Int32Array(this._hashSize).fill(-1),this._ids=new Uint32Array(i),this._dists=new Float64Array(i),this.update()}update(){const{coords:t,_hullPrev:i,_hullNext:e,_hullTri:n,_hullHash:s}=this,l=t.length>>1;let h=1/0,r=1/0,o=-1/0,u=-1/0;for(let i=0;i<l;i++){const e=t[2*i],n=t[2*i+1];e<h&&(h=e),n<r&&(r=n),e>o&&(o=e),n>u&&(u=n),this._ids[i]=i}const f=(h+o)/2,d=(r+u)/2;let m,x,p,w=1/0;for(let i=0;i<l;i++){const e=_(f,d,t[2*i],t[2*i+1]);e<w&&(m=i,w=e)}const v=t[2*m],b=t[2*m+1];w=1/0;for(let i=0;i<l;i++){if(i===m)continue;const e=_(v,b,t[2*i],t[2*i+1]);e<w&&e>0&&(x=i,w=e)}let T=t[2*x],M=t[2*x+1],A=1/0;for(let i=0;i<l;i++){if(i===m||i===x)continue;const e=g(v,b,T,M,t[2*i],t[2*i+1]);e<A&&(p=i,A=e)}let k=t[2*p],$=t[2*p+1];if(A===1/0){for(let i=0;i<l;i++)this._dists[i]=t[2*i]-t[0]||t[2*i+1]-t[1];y(this._ids,this._dists,0,l-1);const i=new Uint32Array(l);let e=0;for(let t=0,n=-1/0;t<l;t++){const s=this._ids[t];this._dists[s]>n&&(i[e++]=s,n=this._dists[s])}return this.hull=i.subarray(0,e),this.triangles=new Uint32Array(0),void(this.halfedges=new Uint32Array(0))}if(a(v,b,T,M,k,$)<0){const t=x,i=T,e=M;x=p,T=k,M=$,p=t,k=i,$=e}const P=function(t,i,e,n,s,l){const h=e-t,r=n-i,o=s-t,a=l-i,c=h*h+r*r,u=o*o+a*a,f=.5/(h*a-r*o);return{x:t+(a*c-r*u)*f,y:i+(h*u-o*c)*f}}(v,b,T,M,k,$);this._cx=P.x,this._cy=P.y;for(let i=0;i<l;i++)this._dists[i]=_(t[2*i],t[2*i+1],P.x,P.y);y(this._ids,this._dists,0,l-1),this._hullStart=m;let S=3;e[m]=i[p]=x,e[x]=i[m]=p,e[p]=i[x]=m,n[m]=0,n[x]=1,n[p]=2,s.fill(-1),s[this._hashKey(v,b)]=m,s[this._hashKey(T,M)]=x,s[this._hashKey(k,$)]=p,this.trianglesLen=0,this._addTriangle(m,x,p,-1,-1,-1);for(let l,h,r=0;r<this._ids.length;r++){const o=this._ids[r],u=t[2*o],f=t[2*o+1];if(r>0&&Math.abs(u-l)<=c&&Math.abs(f-h)<=c)continue;if(l=u,h=f,o===m||o===x||o===p)continue;let _=0;for(let t=0,i=this._hashKey(u,f);t<this._hashSize&&(_=s[(i+t)%this._hashSize],-1===_||_===e[_]);t++);_=i[_];let d,g=_;for(;d=e[g],a(u,f,t[2*g],t[2*g+1],t[2*d],t[2*d+1])>=0;)if(g=d,g===_){g=-1;break}if(-1===g)continue;let y=this._addTriangle(g,o,e[g],-1,-1,n[g]);n[o]=this._legalize(y+2),n[g]=y,S++;let w=e[g];for(;d=e[w],a(u,f,t[2*w],t[2*w+1],t[2*d],t[2*d+1])<0;)y=this._addTriangle(w,o,d,n[o],-1,n[w]),n[o]=this._legalize(y+2),e[w]=w,S--,w=d;if(g===_)for(;d=i[g],a(u,f,t[2*d],t[2*d+1],t[2*g],t[2*g+1])<0;)y=this._addTriangle(d,o,g,-1,n[g],n[d]),this._legalize(y+2),n[d]=y,e[g]=g,S--,g=d;this._hullStart=i[o]=g,e[g]=i[w]=o,e[o]=w,s[this._hashKey(u,f)]=o,s[this._hashKey(t[2*g],t[2*g+1])]=g}this.hull=new Uint32Array(S);for(let t=0,i=this._hullStart;t<S;t++)this.hull[t]=i,i=e[i];this.triangles=this._triangles.subarray(0,this.trianglesLen),this.halfedges=this._halfedges.subarray(0,this.trianglesLen)}_hashKey(t,i){return Math.floor(function(t,i){const e=t/(Math.abs(t)+Math.abs(i));return(i>0?3-e:1+e)/4}(t-this._cx,i-this._cy)*this._hashSize)%this._hashSize}_legalize(t){const{_triangles:i,_halfedges:e,coords:n}=this;let s=0,l=0;for(;;){const h=e[t],r=t-t%3;if(l=r+(t+2)%3,-1===h){if(0===s)break;t=u[--s];continue}const o=h-h%3,a=r+(t+1)%3,c=o+(h+2)%3,f=i[l],_=i[t],g=i[a],y=i[c];if(d(n[2*f],n[2*f+1],n[2*_],n[2*_+1],n[2*g],n[2*g+1],n[2*y],n[2*y+1])){i[t]=y,i[h]=f;const n=e[c];if(-1===n){let i=this._hullStart;do{if(this._hullTri[i]===c){this._hullTri[i]=t;break}i=this._hullPrev[i]}while(i!==this._hullStart)}this._link(t,n),this._link(h,e[l]),this._link(l,c);const r=o+(h+1)%3;s<u.length&&(u[s++]=r)}else{if(0===s)break;t=u[--s]}}return l}_link(t,i){this._halfedges[t]=i,-1!==i&&(this._halfedges[i]=t)}_addTriangle(t,i,e,n,s,l){const h=this.trianglesLen;return this._triangles[h]=t,this._triangles[h+1]=i,this._triangles[h+2]=e,this._link(h,n),this._link(h+1,s),this._link(h+2,l),this.trianglesLen+=3,h}}function _(t,i,e,n){const s=t-e,l=i-n;return s*s+l*l}function d(t,i,e,n,s,l,h,r){const o=t-h,a=i-r,c=e-h,u=n-r,f=s-h,_=l-r,d=c*c+u*u,g=f*f+_*_;return o*(u*g-d*_)-a*(c*g-d*f)+(o*o+a*a)*(c*_-u*f)<0}function g(t,i,e,n,s,l){const h=e-t,r=n-i,o=s-t,a=l-i,c=h*h+r*r,u=o*o+a*a,f=.5/(h*a-r*o),_=(a*c-r*u)*f,d=(h*u-o*c)*f;return _*_+d*d}function y(t,i,e,n){if(n-e<=20)for(let s=e+1;s<=n;s++){const n=t[s],l=i[n];let h=s-1;for(;h>=e&&i[t[h]]>l;)t[h+1]=t[h--];t[h+1]=n}else{let s=e+1,l=n;m(t,e+n>>1,s),i[t[e]]>i[t[n]]&&m(t,e,n),i[t[s]]>i[t[n]]&&m(t,s,n),i[t[e]]>i[t[s]]&&m(t,e,s);const h=t[s],r=i[h];for(;;){do{s++}while(i[t[s]]<r);do{l--}while(i[t[l]]>r);if(l<s)break;m(t,s,l)}t[e+1]=t[l],t[l]=h,n-s+1>=l-e?(y(t,i,s,n),y(t,i,e,l-1)):(y(t,i,e,l-1),y(t,i,s,n))}}function m(t,i,e){const n=t[i];t[i]=t[e],t[e]=n}function x(t){return t[0]}function p(t){return t[1]}const w=1e-6;class v{constructor(){this._x0=this._y0=this._x1=this._y1=null,this._=""}moveTo(t,i){this._+=`M${this._x0=this._x1=+t},${this._y0=this._y1=+i}`}closePath(){null!==this._x1&&(this._x1=this._x0,this._y1=this._y0,this._+="Z")}lineTo(t,i){this._+=`L${this._x1=+t},${this._y1=+i}`}arc(t,i,e){const n=(t=+t)+(e=+e),s=i=+i;if(e<0)throw new Error("negative radius");null===this._x1?this._+=`M${n},${s}`:(Math.abs(this._x1-n)>w||Math.abs(this._y1-s)>w)&&(this._+="L"+n+","+s),e&&(this._+=`A${e},${e},0,1,1,${t-e},${i}A${e},${e},0,1,1,${this._x1=n},${this._y1=s}`)}rect(t,i,e,n){this._+=`M${this._x0=this._x1=+t},${this._y0=this._y1=+i}h${+e}v${+n}h${-e}Z`}value(){return this._||null}}class b{constructor(){this._=[]}moveTo(t,i){this._.push([t,i])}closePath(){this._.push(this._[0].slice())}lineTo(t,i){this._.push([t,i])}value(){return this._.length?this._:null}}class T{constructor(t,[i,e,n,s]=[0,0,960,500]){if(!((n=+n)>=(i=+i)&&(s=+s)>=(e=+e)))throw new Error("invalid bounds");this.delaunay=t,this._circumcenters=new Float64Array(2*t.points.length),this.vectors=new Float64Array(2*t.points.length),this.xmax=n,this.xmin=i,this.ymax=s,this.ymin=e,this._init()}update(){return this.delaunay.update(),this._init(),this}_init(){const{delaunay:{points:t,hull:i,triangles:e},vectors:n}=this;let s,l;const h=this.circumcenters=this._circumcenters.subarray(0,e.length/3*2);for(let n,r,o=0,a=0,c=e.length;o<c;o+=3,a+=2){const c=2*e[o],u=2*e[o+1],f=2*e[o+2],_=t[c],d=t[c+1],g=t[u],y=t[u+1],m=t[f],x=t[f+1],p=g-_,w=y-d,v=m-_,b=x-d,T=2*(p*b-w*v);if(Math.abs(T)<1e-9){if(void 0===s){s=l=0;for(const e of i)s+=t[2*e],l+=t[2*e+1];s/=i.length,l/=i.length}const e=1e9*Math.sign((s-_)*b-(l-d)*v);n=(_+m)/2-e*b,r=(d+x)/2+e*v}else{const t=1/T,i=p*p+w*w,e=v*v+b*b;n=_+(b*i-w*e)*t,r=d+(p*e-v*i)*t}h[a]=n,h[a+1]=r}let r,o,a,c=i[i.length-1],u=4*c,f=t[2*c],_=t[2*c+1];n.fill(0);for(let e=0;e<i.length;++e)c=i[e],r=u,o=f,a=_,u=4*c,f=t[2*c],_=t[2*c+1],n[r+2]=n[u]=a-_,n[r+3]=n[u+1]=f-o}render(t){const i=null==t?t=new v:void 0,{delaunay:{halfedges:e,inedges:n,hull:s},circumcenters:l,vectors:h}=this;if(s.length<=1)return null;for(let i=0,n=e.length;i<n;++i){const n=e[i];if(n<i)continue;const s=2*Math.floor(i/3),h=2*Math.floor(n/3),r=l[s],o=l[s+1],a=l[h],c=l[h+1];this._renderSegment(r,o,a,c,t)}let r,o=s[s.length-1];for(let i=0;i<s.length;++i){r=o,o=s[i];const e=2*Math.floor(n[o]/3),a=l[e],c=l[e+1],u=4*r,f=this._project(a,c,h[u+2],h[u+3]);f&&this._renderSegment(a,c,f[0],f[1],t)}return i&&i.value()}renderBounds(t){const i=null==t?t=new v:void 0;return t.rect(this.xmin,this.ymin,this.xmax-this.xmin,this.ymax-this.ymin),i&&i.value()}renderCell(t,i){const e=null==i?i=new v:void 0,n=this._clip(t);if(null===n||!n.length)return;i.moveTo(n[0],n[1]);let s=n.length;for(;n[0]===n[s-2]&&n[1]===n[s-1]&&s>1;)s-=2;for(let t=2;t<s;t+=2)n[t]===n[t-2]&&n[t+1]===n[t-1]||i.lineTo(n[t],n[t+1]);return i.closePath(),e&&e.value()}*cellPolygons(){const{delaunay:{points:t}}=this;for(let i=0,e=t.length/2;i<e;++i){const t=this.cellPolygon(i);t&&(t.index=i,yield t)}}cellPolygon(t){const i=new b;return this.renderCell(t,i),i.value()}_renderSegment(t,i,e,n,s){let l;const h=this._regioncode(t,i),r=this._regioncode(e,n);0===h&&0===r?(s.moveTo(t,i),s.lineTo(e,n)):(l=this._clipSegment(t,i,e,n,h,r))&&(s.moveTo(l[0],l[1]),s.lineTo(l[2],l[3]))}contains(t,i,e){return(i=+i)==i&&(e=+e)==e&&this.delaunay._step(t,i,e)===t}*neighbors(t){const i=this._clip(t);if(i)for(const e of this.delaunay.neighbors(t)){const t=this._clip(e);if(t)t:for(let n=0,s=i.length;n<s;n+=2)for(let l=0,h=t.length;l<h;l+=2)if(i[n]===t[l]&&i[n+1]===t[l+1]&&i[(n+2)%s]===t[(l+h-2)%h]&&i[(n+3)%s]===t[(l+h-1)%h]){yield e;break t}}}_cell(t){const{circumcenters:i,delaunay:{inedges:e,halfedges:n,triangles:s}}=this,l=e[t];if(-1===l)return null;const h=[];let r=l;do{const e=Math.floor(r/3);if(h.push(i[2*e],i[2*e+1]),r=r%3==2?r-2:r+1,s[r]!==t)break;r=n[r]}while(r!==l&&-1!==r);return h}_clip(t){if(0===t&&1===this.delaunay.hull.length)return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];const i=this._cell(t);if(null===i)return null;const{vectors:e}=this,n=4*t;return this._simplify(e[n]||e[n+1]?this._clipInfinite(t,i,e[n],e[n+1],e[n+2],e[n+3]):this._clipFinite(t,i))}_clipFinite(t,i){const e=i.length;let n,s,l,h,r=null,o=i[e-2],a=i[e-1],c=this._regioncode(o,a),u=0;for(let f=0;f<e;f+=2)if(n=o,s=a,o=i[f],a=i[f+1],l=c,c=this._regioncode(o,a),0===l&&0===c)h=u,u=0,r?r.push(o,a):r=[o,a];else{let i,e,f,_,d;if(0===l){if(null===(i=this._clipSegment(n,s,o,a,l,c)))continue;[e,f,_,d]=i}else{if(null===(i=this._clipSegment(o,a,n,s,c,l)))continue;[_,d,e,f]=i,h=u,u=this._edgecode(e,f),h&&u&&this._edge(t,h,u,r,r.length),r?r.push(e,f):r=[e,f]}h=u,u=this._edgecode(_,d),h&&u&&this._edge(t,h,u,r,r.length),r?r.push(_,d):r=[_,d]}if(r)h=u,u=this._edgecode(r[0],r[1]),h&&u&&this._edge(t,h,u,r,r.length);else if(this.contains(t,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2))return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];return r}_clipSegment(t,i,e,n,s,l){const h=s<l;for(h&&([t,i,e,n,s,l]=[e,n,t,i,l,s]);;){if(0===s&&0===l)return h?[e,n,t,i]:[t,i,e,n];if(s&l)return null;let r,o,a=s||l;8&a?(r=t+(e-t)*(this.ymax-i)/(n-i),o=this.ymax):4&a?(r=t+(e-t)*(this.ymin-i)/(n-i),o=this.ymin):2&a?(o=i+(n-i)*(this.xmax-t)/(e-t),r=this.xmax):(o=i+(n-i)*(this.xmin-t)/(e-t),r=this.xmin),s?(t=r,i=o,s=this._regioncode(t,i)):(e=r,n=o,l=this._regioncode(e,n))}}_clipInfinite(t,i,e,n,s,l){let h,r=Array.from(i);if((h=this._project(r[0],r[1],e,n))&&r.unshift(h[0],h[1]),(h=this._project(r[r.length-2],r[r.length-1],s,l))&&r.push(h[0],h[1]),r=this._clipFinite(t,r))for(let i,e=0,n=r.length,s=this._edgecode(r[n-2],r[n-1]);e<n;e+=2)i=s,s=this._edgecode(r[e],r[e+1]),i&&s&&(e=this._edge(t,i,s,r,e),n=r.length);else this.contains(t,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2)&&(r=[this.xmin,this.ymin,this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax]);return r}_edge(t,i,e,n,s){for(;i!==e;){let e,l;switch(i){case 5:i=4;continue;case 4:i=6,e=this.xmax,l=this.ymin;break;case 6:i=2;continue;case 2:i=10,e=this.xmax,l=this.ymax;break;case 10:i=8;continue;case 8:i=9,e=this.xmin,l=this.ymax;break;case 9:i=1;continue;case 1:i=5,e=this.xmin,l=this.ymin}n[s]===e&&n[s+1]===l||!this.contains(t,e,l)||(n.splice(s,0,e,l),s+=2)}return s}_project(t,i,e,n){let s,l,h,r=1/0;if(n<0){if(i<=this.ymin)return null;(s=(this.ymin-i)/n)<r&&(h=this.ymin,l=t+(r=s)*e)}else if(n>0){if(i>=this.ymax)return null;(s=(this.ymax-i)/n)<r&&(h=this.ymax,l=t+(r=s)*e)}if(e>0){if(t>=this.xmax)return null;(s=(this.xmax-t)/e)<r&&(l=this.xmax,h=i+(r=s)*n)}else if(e<0){if(t<=this.xmin)return null;(s=(this.xmin-t)/e)<r&&(l=this.xmin,h=i+(r=s)*n)}return[l,h]}_edgecode(t,i){return(t===this.xmin?1:t===this.xmax?2:0)|(i===this.ymin?4:i===this.ymax?8:0)}_regioncode(t,i){return(t<this.xmin?1:t>this.xmax?2:0)|(i<this.ymin?4:i>this.ymax?8:0)}_simplify(t){if(t&&t.length>4){for(let i=0;i<t.length;i+=2){const e=(i+2)%t.length,n=(i+4)%t.length;(t[i]===t[e]&&t[e]===t[n]||t[i+1]===t[e+1]&&t[e+1]===t[n+1])&&(t.splice(e,2),i-=2)}t.length||(t=null)}return t}}const M=2*Math.PI,A=Math.pow;function k(t){return t[0]}function $(t){return t[1]}function P(t,i,e){return[t+Math.sin(t+i)*e,i+Math.cos(t-i)*e]}class S{static from(t,i=k,e=$,n){return new S("length"in t?function(t,i,e,n){const s=t.length,l=new Float64Array(2*s);for(let h=0;h<s;++h){const s=t[h];l[2*h]=i.call(n,s,h,t),l[2*h+1]=e.call(n,s,h,t)}return l}(t,i,e,n):Float64Array.from(function*(t,i,e,n){let s=0;for(const l of t)yield i.call(n,l,s,t),yield e.call(n,l,s,t),++s}(t,i,e,n)))}constructor(t){this._delaunator=new f(t),this.inedges=new Int32Array(t.length/2),this._hullIndex=new Int32Array(t.length/2),this.points=this._delaunator.coords,this._init()}update(){return this._delaunator.update(),this._init(),this}_init(){const t=this._delaunator,i=this.points;if(t.hull&&t.hull.length>2&&function(t){const{triangles:i,coords:e}=t;for(let t=0;t<i.length;t+=3){const n=2*i[t],s=2*i[t+1],l=2*i[t+2];if((e[l]-e[n])*(e[s+1]-e[n+1])-(e[s]-e[n])*(e[l+1]-e[n+1])>1e-10)return!1}return!0}(t)){this.collinear=Int32Array.from({length:i.length/2},((t,i)=>i)).sort(((t,e)=>i[2*t]-i[2*e]||i[2*t+1]-i[2*e+1]));const t=this.collinear[0],e=this.collinear[this.collinear.length-1],n=[i[2*t],i[2*t+1],i[2*e],i[2*e+1]],s=1e-8*Math.hypot(n[3]-n[1],n[2]-n[0]);for(let t=0,e=i.length/2;t<e;++t){const e=P(i[2*t],i[2*t+1],s);i[2*t]=e[0],i[2*t+1]=e[1]}this._delaunator=new f(i)}else delete this.collinear;const e=this.halfedges=this._delaunator.halfedges,n=this.hull=this._delaunator.hull,s=this.triangles=this._delaunator.triangles,l=this.inedges.fill(-1),h=this._hullIndex.fill(-1);for(let t=0,i=e.length;t<i;++t){const i=s[t%3==2?t-2:t+1];-1!==e[t]&&-1!==l[i]||(l[i]=t)}for(let t=0,i=n.length;t<i;++t)h[n[t]]=t;n.length<=2&&n.length>0&&(this.triangles=new Int32Array(3).fill(-1),this.halfedges=new Int32Array(3).fill(-1),this.triangles[0]=n[0],l[n[0]]=1,2===n.length&&(l[n[1]]=0,this.triangles[1]=n[1],this.triangles[2]=n[1]))}voronoi(t){return new T(this,t)}*neighbors(t){const{inedges:i,hull:e,_hullIndex:n,halfedges:s,triangles:l,collinear:h}=this;if(h){const i=h.indexOf(t);return i>0&&(yield h[i-1]),void(i<h.length-1&&(yield h[i+1]))}const r=i[t];if(-1===r)return;let o=r,a=-1;do{if(yield a=l[o],o=o%3==2?o-2:o+1,l[o]!==t)return;if(o=s[o],-1===o){const i=e[(n[t]+1)%e.length];return void(i!==a&&(yield i))}}while(o!==r)}find(t,i,e=0){if((t=+t)!=t||(i=+i)!=i)return-1;const n=e;let s;for(;(s=this._step(e,t,i))>=0&&s!==e&&s!==n;)e=s;return s}_step(t,i,e){const{inedges:n,hull:s,_hullIndex:l,halfedges:h,triangles:r,points:o}=this;if(-1===n[t]||!o.length)return(t+1)%(o.length>>1);let a=t,c=A(i-o[2*t],2)+A(e-o[2*t+1],2);const u=n[t];let f=u;do{let n=r[f];const u=A(i-o[2*n],2)+A(e-o[2*n+1],2);if(u<c&&(c=u,a=n),f=f%3==2?f-2:f+1,r[f]!==t)break;if(f=h[f],-1===f){if(f=s[(l[t]+1)%s.length],f!==n&&A(i-o[2*f],2)+A(e-o[2*f+1],2)<c)return f;break}}while(f!==u);return a}render(t){const i=null==t?t=new v:void 0,{points:e,halfedges:n,triangles:s}=this;for(let i=0,l=n.length;i<l;++i){const l=n[i];if(l<i)continue;const h=2*s[i],r=2*s[l];t.moveTo(e[h],e[h+1]),t.lineTo(e[r],e[r+1])}return this.renderHull(t),i&&i.value()}renderPoints(t,i){void 0!==i||t&&"function"==typeof t.moveTo||(i=t,t=null),i=null==i?2:+i;const e=null==t?t=new v:void 0,{points:n}=this;for(let e=0,s=n.length;e<s;e+=2){const s=n[e],l=n[e+1];t.moveTo(s+i,l),t.arc(s,l,i,0,M)}return e&&e.value()}renderHull(t){const i=null==t?t=new v:void 0,{hull:e,points:n}=this,s=2*e[0],l=e.length;t.moveTo(n[s],n[s+1]);for(let i=1;i<l;++i){const s=2*e[i];t.lineTo(n[s],n[s+1])}return t.closePath(),i&&i.value()}hullPolygon(){const t=new b;return this.renderHull(t),t.value()}renderTriangle(t,i){const e=null==i?i=new v:void 0,{points:n,triangles:s}=this,l=2*s[t*=3],h=2*s[t+1],r=2*s[t+2];return i.moveTo(n[l],n[l+1]),i.lineTo(n[h],n[h+1]),i.lineTo(n[r],n[r+1]),i.closePath(),e&&e.value()}*trianglePolygons(){const{triangles:t}=this;for(let i=0,e=t.length/3;i<e;++i)yield this.trianglePolygon(i)}trianglePolygon(t){const i=new b;return this.renderTriangle(t,i),i.value()}}t.Delaunay=S,t.Voronoi=T,Object.defineProperty(t,"__esModule",{value:!0})}));

class AuraFlowApp {
    constructor(windowBody, appData) {
        this.windowBody = windowBody;
        this.appData = appData;

        // Common properties
        this.nodes = []; // For Connected Fibers
        this.particles = []; // For Particle Flow
        this.seedPoints = []; // For Voronoi
        this.voronoiDiagram = null;
        this.mouseX = null;
        this.mouseY = null;
        this.controlPanel = null;
        this.controlPanelHideTimeout = null;
        this.currentPaletteIndex = 0;
        this.palettes = [
            { name: 'Theme Default', colors: ['--highlight-primary', '--highlight-secondary', '--text-color', '#FF6B6B', '#4ECDC4'] },
            { name: 'Forest', colors: ['#2f4f4f', '#556b2f', '#8fbc8f', '#228b22', '#006400'] },
            { name: 'Ocean', colors: ['#0077be', '#00a6d6', '#90d5e5', '#4682b4', '#000080'] },
            { name: 'Sunset', colors: ['#ff4500', '#ff8c00', '#ffd700', '#ff6347', '#dc143c'] },
            { name: 'Monochrome', colors: ['#222222', '#555555', '#888888', '#BBBBBB', '#EEEEEE'] },
        ];
        this.animationFrameId = null;
        this.isVisible = true; // For IntersectionObserver
        this.visibilityObserver = null;
        this.resizeObserver = null; // For canvas resize


        // --- Particle Flow Settings ---
        this.noiseScale = 0.01;
        this.numParticles = 1000; // Max particles cap
        this.initialParticles = 500; // Number of particles to start with
        this.particleSize = 1.5;
        this.particleSpeedMultiplier = 1;
        this.particleMaxAge = 250;
        this.mouseInfluenceRadius = 100;
        this.mouseForceStrength = 0.5; // Repulsion strength
        this.particleBurstAmount = 50;

        // --- Connected Fibers Settings ---
        this.numNodes = 75;
        this.nodeSpeedMultiplier = 1.0;
        this.nodeSize = 2;
        this.nodeColor = 'rgba(200, 200, 255, 0.8)';
        this.connectionDistance = 120;
        this.fiberColor = getComputedStyle(document.documentElement).getPropertyValue('--highlight-primary').trim() || '#8a63d2';
        this.maxFiberThickness = 3.5;

        // --- Voronoi Settings ---
        this.numSeedPoints = 30;
        this.seedSpeedMultiplier = 0.5;
        // this.seedPointColor will be set by palette
        this.voronoiCellBorderColor = getComputedStyle(document.documentElement).getPropertyValue('--subtle-text-color').trim() || '#b0a8d9';
        this.mouseSeedIndex = 0; // The first seed point will follow the mouse if active. Set to -1 if no mouse seed.


        // Set initial mode
        this.currentMode = 'particleFlow';
        // this.currentMode = 'connectedFibers';
        // this.currentMode = 'voronoi';


        console.log("AuraFlowApp instance created");
        this.initUI();

        this._loadAppSettings().then(() => {
            this._initializeCurrentMode(); // This also applies palette
            this.startAnimation();
            this._updateControlPanelValues();
        }).catch(error => {
            console.error("Error loading AuraFlow settings, using defaults:", error);
            this._initializeCurrentMode();
            this.startAnimation();
            this._updateControlPanelValues();
        });

        const windowElement = this.windowBody.closest('.window');
        if (windowElement) {
            this._boundCleanupEventListeners = this._cleanupEventListeners.bind(this);
            windowElement.addEventListener('aura:close', this._boundCleanupEventListeners);
        } else {
            console.warn("AuraFlowApp: Could not find parent .window element to attach close listener.");
        }
    }

    async _saveAppSettings() {
        if (typeof dbManager === 'undefined' || !dbManager) {
            console.warn("dbManager not available, cannot save AuraFlow settings.");
            return;
        }
        let elementCount;
        if (this.currentMode === 'particleFlow') elementCount = this.initialParticles;
        else if (this.currentMode === 'connectedFibers') elementCount = this.numNodes;
        else if (this.currentMode === 'voronoi') elementCount = this.numSeedPoints;

        const settings = {
            currentMode: this.currentMode,
            elementCount: elementCount,
            paletteIndex: this.currentPaletteIndex,
        };
        try {
            await dbManager.saveSetting('auraFlow_settings', settings);
            console.log('AuraFlow settings saved:', settings);
        } catch (error) {
            console.error('Error saving AuraFlow settings:', error);
        }
    }

    async _loadAppSettings() {
        if (typeof dbManager === 'undefined' || !dbManager) {
            console.warn("dbManager not available, cannot load AuraFlow settings.");
            return Promise.resolve();
        }
        try {
            const settings = await dbManager.loadSetting('auraFlow_settings');
            if (settings) {
                console.log('AuraFlow settings loaded:', settings);
                this.currentMode = settings.currentMode || 'particleFlow';
                this.currentPaletteIndex = settings.paletteIndex || 0;

                if (this.currentMode === 'particleFlow') {
                    this.initialParticles = settings.elementCount || 500;
                    this.numParticles = Math.max(this.initialParticles, 1000);
                } else if (this.currentMode === 'connectedFibers') {
                    this.numNodes = settings.elementCount || 75;
                } else if (this.currentMode === 'voronoi') {
                    this.numSeedPoints = settings.elementCount || 30;
                     if (this.numSeedPoints > 0) this.mouseSeedIndex = 0; else this.mouseSeedIndex = -1;
                }
            } else {
                console.log('No AuraFlow settings found, using defaults.');
                 if (this.currentMode === 'voronoi' && this.numSeedPoints > 0) this.mouseSeedIndex = 0; else this.mouseSeedIndex = -1;
            }
        } catch (error) {
            console.error('Error loading AuraFlow settings:', error);
            if (this.currentMode === 'voronoi' && this.numSeedPoints > 0) this.mouseSeedIndex = 0; else this.mouseSeedIndex = -1;
        }
    }

    _handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = event.clientX - rect.left;
        this.mouseY = event.clientY - rect.top;
        // For control panel auto-hide, this event is now on windowBody.
    }

    _handleMouseClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        if (this.currentMode === 'particleFlow') {
            for (let i = 0; i < this.particleBurstAmount; i++) {
                if (this.particles.length < this.numParticles) { // Cap total particles
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 3 + 1; // Random speed for burst
                    const p = new Particle(
                        clickX,
                        clickY,
                        this.particleSize,
                        this._getRandomColorFromCurrentPalette(),
                        this.particleMaxAge,
                        this.canvas
                    );
                    p.vx = Math.cos(angle) * speed;
                    p.vy = Math.sin(angle) * speed;
                    this.particles.push(p);
                }
            }
        } else if (this.currentMode === 'connectedFibers') {
            this.nodes.push(new Node(
                clickX,
                clickY,
                (Math.random() - 0.5) * 2 * this.nodeSpeedMultiplier,
                (Math.random() - 0.5) * 2 * this.nodeSpeedMultiplier,
                this.nodeSize,
                this.nodeColor,
                this.canvas
            ));
             if (this.nodes.length > this.numNodes * 2) { // Example cap for added nodes
                this.nodes.shift(); // Remove the oldest node
            }
        } else if (this.currentMode === 'voronoi') {
            this.seedPoints.push(new SeedPoint(
                clickX,
                clickY,
                (Math.random() - 0.5) * 2 * this.seedSpeedMultiplier,
                (Math.random() - 0.5) * 2 * this.seedSpeedMultiplier,
                this._getRandomColorFromCurrentPalette(), // Use palette color
                this.canvas
            ));
            if (this.seedPoints.length > this.numSeedPoints * 2) {
                 if (this.mouseSeedIndex !== -1 && this.seedPoints.length > 1) {
                    let removed = false;
                    for(let k=0; k < this.seedPoints.length; k++) {
                        if (k !== this.mouseSeedIndex) {
                            this.seedPoints.splice(k,1);
                            if (k < this.mouseSeedIndex) this.mouseSeedIndex--;
                            removed = true;
                            break;
                        }
                    }
                    if(!removed && this.seedPoints.length > 0) {
                        this.seedPoints.shift();
                         if (this.mouseSeedIndex === 0 && this.seedPoints.length > 0) { /* mouseSeedIndex remains 0 */ }
                         else if (this.mouseSeedIndex > 0) { this.mouseSeedIndex--;}
                    }
                 } else if (this.seedPoints.length > 0) {
                    this.seedPoints.shift();
                 }
            }
        }
    }

    _cleanupEventListeners() {
        if (this.canvas) {
            if (this._boundHandleMouseMove) this.canvas.removeEventListener('mousemove', this._boundHandleMouseMove);
            if (this._boundHandleMouseClick) this.canvas.removeEventListener('click', this._boundHandleMouseClick);
        }
        if (this.controlPanel) {
             if (this._boundShowControlPanel) this.controlPanel.removeEventListener('mouseenter', this._boundShowControlPanel);
             if (this._boundHideControlPanelOnLeave) this.controlPanel.removeEventListener('mouseleave', this._boundHideControlPanelOnLeave);
        }
        if (this.windowBody && this._boundMouseMoveWindowBody) {
            this.windowBody.removeEventListener('mousemove', this._boundMouseMoveWindowBody);
        }

        const modeSelect = document.getElementById('auraFlowModeSelect');
        if (modeSelect && this._boundHandleModeChange) modeSelect.removeEventListener('change', this._boundHandleModeChange);

        const countSlider = document.getElementById('auraFlowElementCount');
        if (countSlider && this._boundHandleElementCountChange) countSlider.removeEventListener('input', this._boundHandleElementCountChange);

        const colorBtn = document.getElementById('auraFlowColorPaletteBtn');
        if (colorBtn && this._boundHandleColorPaletteChange) colorBtn.removeEventListener('click', this._boundHandleColorPaletteChange);

        const resetBtn = document.getElementById('auraFlowResetBtn');
        if (resetBtn && this._boundHandleResetSimulation) resetBtn.removeEventListener('click', this._boundHandleResetSimulation);

        const saveBtn = document.getElementById('auraFlowSaveImageBtn');
        if (saveBtn && this._boundHandleSaveImage) saveBtn.removeEventListener('click', this._boundHandleSaveImage);

        if (this.visibilityObserver) this.visibilityObserver.disconnect();
        if (this.resizeObserver) this.resizeObserver.disconnect(); // Disconnect resize observer
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        clearTimeout(this.controlPanelHideTimeout);

        console.log("AuraFlowApp event listeners and observers cleaned up.");
    }

    _showControlPanel() {
        if (!this.controlPanel) return;
        clearTimeout(this.controlPanelHideTimeout);
        this.controlPanel.style.opacity = '1';
        this.controlPanel.style.pointerEvents = 'auto';
    }

    _hideControlPanel() {
        if (!this.controlPanel) return;
        clearTimeout(this.controlPanelHideTimeout);
        this.controlPanelHideTimeout = setTimeout(() => {
            this.controlPanel.style.opacity = '0';
            this.controlPanel.style.pointerEvents = 'none';
        }, 3000); // Hide after 3 seconds
    }

    _initializeCurrentMode() {
        if (this.currentMode === 'particleFlow') {
            this.initializeParticleFlow();
        } else if (this.currentMode === 'connectedFibers') {
            this.initializeConnectedFibers();
        } else if (this.currentMode === 'voronoi') {
            this.initializeVoronoi();
        }
        this._updateControlPanelVisibility();
        this._applyCurrentPaletteToMode();
    }

    _handleModeChange(event) {
        this.currentMode = event.target.value;
        console.log(`Mode changed to: ${this.currentMode}`);
        this._saveAppSettings();
        this._initializeCurrentMode();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.startAnimation();
        this._updateElementCountSlider();
    }

    _updateControlPanelValues() { // New method to set UI from current state
        const modeSelect = document.getElementById('auraFlowModeSelect');
        if (modeSelect) modeSelect.value = this.currentMode;

        this._updateElementCountSlider(); // This sets slider value and span

        const paletteNameSpan = document.getElementById('auraFlowPaletteName');
        if (paletteNameSpan) paletteNameSpan.textContent = this.palettes[this.currentPaletteIndex].name;
    }


    _updateElementCountSlider() {
        const countSlider = document.getElementById('auraFlowElementCount');
        const countValueSpan = document.getElementById('auraFlowElementCountValue');
        if (!countSlider || !countValueSpan) return;

        if (this.currentMode === 'particleFlow') {
            countSlider.min = "100";
            countSlider.max = "3000";
            countSlider.step = "50";
            countSlider.value = this.initialParticles; // Use initialParticles for display
            countValueSpan.textContent = this.initialParticles;
        } else if (this.currentMode === 'connectedFibers') {
            countSlider.min = "10";
            countSlider.max = "200";
            countSlider.step = "5";
            countSlider.value = this.numNodes;
            countValueSpan.textContent = this.numNodes;
        } else if (this.currentMode === 'voronoi') {
             countSlider.min = "5";
            countSlider.max = "100";
            countSlider.step = "1";
            countSlider.value = this.numSeedPoints;
            countValueSpan.textContent = this.numSeedPoints;
        }
    }


    _handleElementCountChange(event) {
        const newValue = parseInt(event.target.value);
        const countValueSpan = document.getElementById('auraFlowElementCountValue');
        if(countValueSpan) countValueSpan.textContent = newValue;

        if (this.currentMode === 'particleFlow') {
            this.initialParticles = newValue;
            this.numParticles = Math.max(newValue, 1000);
            this.initializeParticleFlow();
        } else if (this.currentMode === 'connectedFibers') {
            this.numNodes = newValue;
            this.initializeConnectedFibers();
        } else if (this.currentMode === 'voronoi') {
            this.numSeedPoints = newValue;
            // If reducing points and mouseSeedIndex becomes invalid, adjust it
            if (this.mouseSeedIndex >= newValue && newValue > 0) {
                this.mouseSeedIndex = newValue - 1;
            } else if (newValue === 0) {
                this.mouseSeedIndex = -1;
            }
            this.initializeVoronoi();
        }
        this._saveAppSettings();
    }

    _getThemeColor(varName) {
        // Helper to get actual color from CSS var, with fallback
        if (varName.startsWith('--')) {
            return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#FFFFFF'; // Default to white if var not found
        }
        return varName; // Assume it's already a color string
    }

    _getRandomColorFromCurrentPalette() {
        const palette = this.palettes[this.currentPaletteIndex];
        const colorName = palette.colors[Math.floor(Math.random() * palette.colors.length)];
        return this._getThemeColor(colorName);
    }

    _applyCurrentPaletteToMode() {
        const palette = this.palettes[this.currentPaletteIndex];
        const newMainColor = this._getThemeColor(palette.colors[0]); // Use first color as main for some elements

        if (this.currentMode === 'particleFlow') {
            // Particles get random colors from the palette on reset/creation
            this.particles.forEach(p => p.color = this._getRandomColorFromCurrentPalette());
        } else if (this.currentMode === 'connectedFibers') {
            this.fiberColor = newMainColor;
            // Node color could also be from palette if desired
            // this.nodeColor = this._getThemeColor(palette.colors[1 % palette.colors.length]);
        } else if (this.currentMode === 'voronoi') {
            this.seedPoints.forEach((sp, index) => {
                sp.baseColor = this._getThemeColor(palette.colors[index % palette.colors.length]);
                // Re-trigger HSL calculation in SeedPoint if baseColor changes structure
                sp.updateBaseHSL();
            });
        }
    }


    _handleColorPaletteChange() {
        this.currentPaletteIndex = (this.currentPaletteIndex + 1) % this.palettes.length;
        const paletteNameSpan = document.getElementById('auraFlowPaletteName');
        if(paletteNameSpan) paletteNameSpan.textContent = this.palettes[this.currentPaletteIndex].name;

        this._applyCurrentPaletteToMode();
        this._saveAppSettings();
        console.log(`Palette changed to: ${this.palettes[this.currentPaletteIndex].name}`);
    }

    _handleResetSimulation() {
        this._initializeCurrentMode();
        this._saveAppSettings(); // Save settings after reset (to reset counts etc.)
    }

    async _handleSaveImage() { // Made async
        if (typeof createItem !== 'function' || typeof getFileSystemNode !== 'function' || typeof AuraOS === 'undefined' || typeof AuraOS.showNotification !== 'function') {
            console.error("Required File System API or Notification API not available for saving image.");
            alert("Error: File system API not available. Cannot save image."); // Fallback alert
            return;
        }
        const dataURL = this.canvas.toDataURL('image/png');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `AuraFlow-${this.currentMode}-${timestamp}.png`;
        const picturesPath = '/Pictures/';

        try {
            let picturesNode = getFileSystemNode(picturesPath);
            if (!picturesNode) {
                console.log(`Attempting to create directory: ${picturesPath}`);
                const created = await createItem(picturesPath, 'folder');
                if (created) {
                    picturesNode = getFileSystemNode(picturesPath);
                    console.log(`${picturesPath} directory created.`);
                } else {
                    AuraOS.showNotification({ title: 'Error Saving Image', message: `Failed to create ${picturesPath} directory.`, type: 'error' });
                    return;
                }
            }

            if (picturesNode && picturesNode.type === 'folder') {
                const fullFilePath = picturesPath + filename;
                const saveSuccess = await createItem(fullFilePath, 'file', dataURL);
                if (saveSuccess) {
                    AuraOS.showNotification({ title: 'Snapshot Saved', message: `Image saved as ${fullFilePath}`, type: 'success' });
                    if (typeof updateDesktopAndFileExplorer === "function") updateDesktopAndFileExplorer(picturesPath);
                } else {
                    AuraOS.showNotification({ title: 'Error Saving Image', message: `Failed to save image to ${fullFilePath}.`, type: 'error' });
                }
            } else {
                AuraOS.showNotification({ title: 'Error Saving Image', message: `${picturesPath} is not a valid directory.`, type: 'error' });
            }
        } catch (error) {
            console.error("Error saving image:", error);
            AuraOS.showNotification({ title: 'Error Saving Image', message: `An unexpected error occurred: ${error.message}`, type: 'error' });
        }
    }

    _updateControlPanelVisibility() {
        const countSliderRow = document.getElementById('auraFlowElementCountRow');
        if (!countSliderRow) return;

        if (this.currentMode === 'particleFlow' || this.currentMode === 'connectedFibers' || this.currentMode === 'voronoi') {
            countSliderRow.style.display = 'flex';
        } else {
            countSliderRow.style.display = 'none';
        }
        this._updateElementCountSlider(); // Update slider ranges and current value
    }


    initUI() {
        // Clear the windowBody
        this.windowBody.innerHTML = '';

        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.windowBody.offsetWidth;
        this.canvas.height = this.windowBody.offsetHeight * 0.8;
        this.windowBody.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.mouseX = this.canvas.width / 2;
        this.mouseY = this.canvas.height / 2;

        this._boundHandleMouseMove = this._handleMouseMove.bind(this);
        this._boundHandleMouseClick = this._handleMouseClick.bind(this);
        this.canvas.addEventListener('mousemove', this._boundHandleMouseMove);
        this.canvas.addEventListener('click', this._boundHandleMouseClick);

        // --- Control Panel ---
        this.controlPanel = document.createElement('div');
        this.controlPanel.id = 'auraFlowControlPanel';
        Object.assign(this.controlPanel.style, {
            position: 'absolute', top: '10px', left: '10px',
            background: 'var(--glass-background)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(10px) saturate(1.5)',
            padding: '15px', borderRadius: 'var(--ui-corner-radius-small)',
            zIndex: '10', color: 'var(--text-color)',
            opacity: '0', pointerEvents: 'none', transition: 'opacity 0.3s ease-in-out'
        });

        // Auto-hide listeners for panel
        this._boundShowControlPanel = this._showControlPanel.bind(this); // Used for panel's own hover
        this._boundHideControlPanelOnLeave = this._hideControlPanel.bind(this); // Used for panel's own mouseleave
        this.controlPanel.addEventListener('mouseenter', this._boundShowControlPanel);
        this.controlPanel.addEventListener('mouseleave', this._boundHideControlPanelOnLeave);

        // Global mouse move to show panel (on windowBody, not just canvas)
        this._boundMouseMoveWindowBody = () => {
            this._showControlPanel();
            this._hideControlPanel(); // Restart hide timer
        };
        this.windowBody.addEventListener('mousemove', this._boundMouseMoveWindowBody);

        // Intersection Observer for performance
        if (typeof IntersectionObserver === 'function') {
            this.visibilityObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    this.isVisible = entry.isIntersecting;
                    if (this.isVisible && !this.animationFrameId) {
                        console.log("AuraFlow: Canvas became visible, restarting animation.");
                        this.startAnimation();
                    } else if (!this.isVisible && this.animationFrameId) {
                        console.log("AuraFlow: Canvas hidden, pausing animation.");
                        cancelAnimationFrame(this.animationFrameId);
                        this.animationFrameId = null;
                    }
                });
            }, { threshold: 0.1 }); // Trigger if 10% is visible

            const windowEl = this.windowBody.closest('.window');
            if (windowEl) {
                this.visibilityObserver.observe(windowEl);
            } else {
                 this.visibilityObserver.observe(this.canvas); // Fallback to canvas if window not found
            }
        } else {
            this.isVisible = true; // Assume visible if IntersectionObserver is not supported
        }

        // Resize Observer for canvas
        if (typeof ResizeObserver === 'function') {
            this.resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    // Debounce or throttle resize handling if it becomes performance intensive
                    const { width, height } = entry.contentRect;
                    this.canvas.width = width;
                    this.canvas.height = height;
                    console.log(`Canvas resized to: ${width}x${height}. Re-initializing current mode.`);
                    this._initializeCurrentMode(); // Re-initialize art for new dimensions
                }
            });
            this.resizeObserver.observe(this.canvas);
        }


        // Helper to create a control row
        const createControlRow = (labelText, controlElement) => {
            const row = document.createElement('div');
            row.className = 'control-row';
            Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' });

            const label = document.createElement('label');
            label.textContent = labelText;
            label.style.fontSize = '0.9rem';
            label.style.marginRight = '10px';
            if (controlElement.id) label.htmlFor = controlElement.id;

            row.appendChild(label);
            row.appendChild(controlElement);
            return row;
        };

        // Mode Selector
        const modeSelect = document.createElement('select');
        modeSelect.id = 'auraFlowModeSelect';
        ['particleFlow', 'connectedFibers', 'voronoi'].forEach(mode => {
            const option = document.createElement('option');
            option.value = mode;
            option.textContent = mode.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // Format name
            if (mode === this.currentMode) option.selected = true;
            modeSelect.appendChild(option);
        });
        this._boundHandleModeChange = this._handleModeChange.bind(this);
        modeSelect.addEventListener('change', this._boundHandleModeChange);
        this.controlPanel.appendChild(createControlRow('Mode:', modeSelect));

        // Element Count Slider
        const countSliderRow = document.createElement('div'); // Container for this row
        countSliderRow.id = 'auraFlowElementCountRow'; // To show/hide the whole row
        Object.assign(countSliderRow.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' });

        const countLabel = document.createElement('label');
        countLabel.textContent = 'Density:';
        countLabel.htmlFor = 'auraFlowElementCount';
        countLabel.style.fontSize = '0.9rem';
        countLabel.style.marginRight = '10px';
        countSliderRow.appendChild(countLabel);

        const countSliderContainer = document.createElement('div'); // To hold slider and value
        Object.assign(countSliderContainer.style, { display: 'flex', alignItems: 'center' });

        const countSlider = document.createElement('input');
        countSlider.type = 'range';
        countSlider.id = 'auraFlowElementCount';
        // Min/max/step will be set by _updateControlPanelVisibility
        this._boundHandleElementCountChange = this._handleElementCountChange.bind(this);
        countSlider.addEventListener('input', this._boundHandleElementCountChange);
        countSliderContainer.appendChild(countSlider);

        const countValueSpan = document.createElement('span');
        countValueSpan.id = 'auraFlowElementCountValue';
        countValueSpan.style.marginLeft = '10px';
        countValueSpan.style.minWidth = '30px'; // Ensure space for value
        countSliderContainer.appendChild(countValueSpan);

        countSliderRow.appendChild(countSliderContainer);
        this.controlPanel.appendChild(countSliderRow);


        // Color Palette Button
        const paletteButtonContainer = document.createElement('div');
        Object.assign(paletteButtonContainer.style, { display: 'flex', alignItems: 'center' });
        const colorPaletteBtn = document.createElement('button');
        colorPaletteBtn.id = 'auraFlowColorPaletteBtn';
        colorPaletteBtn.textContent = 'Cycle Palette';
        this._boundHandleColorPaletteChange = this._handleColorPaletteChange.bind(this);
        colorPaletteBtn.addEventListener('click', this._boundHandleColorPaletteChange);
        paletteButtonContainer.appendChild(colorPaletteBtn);

        const paletteNameSpan = document.createElement('span');
        paletteNameSpan.id = 'auraFlowPaletteName';
        paletteNameSpan.textContent = this.palettes[this.currentPaletteIndex].name;
        paletteNameSpan.style.marginLeft = '10px';
        paletteButtonContainer.appendChild(paletteNameSpan);
        this.controlPanel.appendChild(createControlRow('Palette:', paletteButtonContainer));


        // Reset Button
        const resetBtn = document.createElement('button');
        resetBtn.id = 'auraFlowResetBtn';
        resetBtn.textContent = 'Reset Simulation';
        this._boundHandleResetSimulation = this._handleResetSimulation.bind(this);
        resetBtn.addEventListener('click', this._boundHandleResetSimulation);
        this.controlPanel.appendChild(createControlRow('Actions:', resetBtn));

        // Save Image Button
        const saveImageBtn = document.createElement('button');
        saveImageBtn.id = 'auraFlowSaveImageBtn';
        saveImageBtn.textContent = 'Save Image';
        this._boundHandleSaveImage = this._handleSaveImage.bind(this); // Define this method
        saveImageBtn.addEventListener('click', this._boundHandleSaveImage);
        // To put it on the same row as Reset, we'd need a more complex row structure.
        // For now, adding as a new row, or find the "Actions:" row and append.
        const actionsRow = resetBtn.parentElement; // Assuming resetBtn is already in a row
        actionsRow.appendChild(saveImageBtn); // Add to the same row as Reset
        saveImageBtn.style.marginLeft = "10px";


        this.windowBody.appendChild(this.controlPanel);
        this._updateControlPanelVisibility(); // Initial setup of slider visibility and ranges
        this._showControlPanel(); // Show initially
        this._hideControlPanel(); // Then start timer to hide

        console.log("UI initialized with control panel. Event listeners added.");
    }

    initializeParticleFlow() {
        this.particles = [];
        for (let i = 0; i < this.initialParticles; i++) { // Use initialParticles
            this.particles.push(new Particle(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                this.particleSize,
                this._getRandomColorFromCurrentPalette(),
                this.particleMaxAge,
                this.canvas
            ));
        }
        console.log(`${this.initialParticles} particles initialized for particle flow.`);
    }

    animateParticleFlow() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            let baseAngle = Math.random() * Math.PI * 2; // Default random movement

            // Mouse interaction
            if (this.mouseX !== null && this.mouseY !== null) {
                const dxMouse = particle.x - this.mouseX;
                const dyMouse = particle.y - this.mouseY;
                const distMouseSq = dxMouse * dxMouse + dyMouse * dyMouse; // Use squared distance

                if (distMouseSq < this.mouseInfluenceRadius * this.mouseInfluenceRadius && distMouseSq > 0) {
                    const distMouse = Math.sqrt(distMouseSq);
                    const forceDirectionX = dxMouse / distMouse;
                    const forceDirectionY = dyMouse / distMouse;
                    // Repulsion force that weakens with distance
                    const force = (this.mouseInfluenceRadius - distMouse) / this.mouseInfluenceRadius * this.mouseForceStrength;
                    particle.vx += forceDirectionX * force;
                    particle.vy += forceDirectionY * force;
                }
            }

            // Apply base random movement (reduced if mouse is interacting or make it additive)
            particle.vx += Math.cos(baseAngle) * this.particleSpeedMultiplier * 0.2; // Smaller continuous random push
            particle.vy += Math.sin(baseAngle) * this.particleSpeedMultiplier * 0.2;

            // Limit overall speed
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            const maxSpeed = this.particleSpeedMultiplier * 2.5;
            if (speed > maxSpeed) {
                particle.vx = (particle.vx / speed) * maxSpeed;
                particle.vy = (particle.vy / speed) * maxSpeed;
            }
            // Add some friction/damping
            particle.vx *= 0.98;
            particle.vy *= 0.98;

            particle.update();
            particle.draw(this.ctx);
            if (particle.age > particle.maxAge) {
                // More robustly handle particle removal/resetting if list gets too short
                if (this.particles.length > this.initialParticles * 0.5 || this.particles.length > this.particleBurstAmount) { // Ensure we don't deplete too much
                   this.particles.splice(i, 1); // Remove the particle
                } else {
                    // Reset if list is short
                    particle.reset(
                        Math.random() * this.canvas.width,
                        Math.random() * this.canvas.height,
                        this._getRandomColorFromCurrentPalette()
                    );
                }
            }
        }
        if (this.isVisible) this.animationFrameId = requestAnimationFrame(this.animateParticleFlow.bind(this));
    }

    startAnimation() {
        if (!this.isVisible) {
            console.log("AuraFlow: Attempted to start animation while not visible. Aborting.");
            return;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        if (this.currentMode === 'particleFlow') {
            this.animateParticleFlow();
        } else if (this.currentMode === 'connectedFibers') {
            this.animateConnectedFibers();
        } else if (this.currentMode === 'voronoi') {
            if (typeof d3 !== 'undefined' && d3.Delaunay) {
                this.animateVoronoi();
            } else {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("Voronoi library (d3-delaunay) not loaded.", this.canvas.width / 2, this.canvas.height / 2);
                console.error("d3-delaunay library not found. Voronoi mode cannot start.");
            }
        } else {
            console.warn(`Animation mode "${this.currentMode}" not recognized.`);
        }
    }

    // --- Connected Fibers Mode Methods ---
    initializeConnectedFibers() {
        this.nodes = [];
        for (let i = 0; i < this.numNodes; i++) {
            this.nodes.push(new Node(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                (Math.random() - 0.5) * 2 * this.nodeSpeedMultiplier,
                (Math.random() - 0.5) * 2 * this.nodeSpeedMultiplier,
                this.nodeSize,
                this.nodeColor,
                this.canvas
            ));
        }
        console.log(`${this.numNodes} nodes initialized for connected fibers.`);
    }

    animateConnectedFibers() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const node of this.nodes) {
            node.update();
            node.draw(this.ctx);
        }

        // Draw fibers between nodes and from nodes to mouse
        for (let i = 0; i < this.nodes.length; i++) {
            const nodeA = this.nodes[i];
            // Connections to other nodes
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeB = this.nodes[j];
                const dx = nodeA.x - nodeB.x;
                const dy = nodeA.y - nodeB.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.connectionDistance) {
                    const opacity = 1 - (distance / this.connectionDistance);
                    const thickness = Math.max(0.5, (1 - (distance / this.connectionDistance)) * this.maxFiberThickness);
                    this.ctx.beginPath();
                    this.ctx.moveTo(nodeA.x, nodeA.y);
                    this.ctx.lineTo(nodeB.x, nodeB.y);
                    this.ctx.strokeStyle = this.fiberColor;
                    this.ctx.lineWidth = thickness;
                    this.ctx.save();
                    this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity * 0.8));
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }

            // Connections to mouse
            if (this.mouseX !== null && this.mouseY !== null) {
                const dxMouse = nodeA.x - this.mouseX;
                const dyMouse = nodeA.y - this.mouseY;
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

                if (distMouse < this.connectionDistance) {
                    const opacity = 1 - (distMouse / this.connectionDistance);
                    const thickness = Math.max(0.5, (1 - (distMouse / this.connectionDistance)) * this.maxFiberThickness);
                    this.ctx.beginPath();
                    this.ctx.moveTo(nodeA.x, nodeA.y);
                    this.ctx.lineTo(this.mouseX, this.mouseY);
                    this.ctx.strokeStyle = this.fiberColor; // Could use a different color for mouse connections
                    this.ctx.lineWidth = thickness;
                    this.ctx.save();
                    this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity * 0.5)); // Make mouse lines a bit more subtle
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }
        }
        if (this.isVisible) {
            this.animationFrameId = requestAnimationFrame(this.animateConnectedFibers.bind(this));
        }
    }

    // --- Voronoi Tessellation Mode Methods ---
    initializeVoronoi() {
        this.seedPoints = [];
        const palette = this.palettes[this.currentPaletteIndex];

        for (let i = 0; i < this.numSeedPoints; i++) {
            const baseColor = this._getThemeColor(palette.colors[i % palette.colors.length]);
            this.seedPoints.push(new SeedPoint(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                (Math.random() - 0.5) * 2 * this.seedSpeedMultiplier, // vx
                (Math.random() - 0.5) * 2 * this.seedSpeedMultiplier, // vy
                baseColor,
                this.canvas
            ));
        }
        // Delaunay and Voronoi diagram will be initialized/updated in the animation loop
        // because points move.
        if (this.seedPoints.length > 0 && this.mouseSeedIndex >= this.seedPoints.length) {
            this.mouseSeedIndex = this.seedPoints.length -1; // Ensure mouseSeedIndex is valid
        } else if (this.seedPoints.length === 0) {
            this.mouseSeedIndex = -1;
        }

        console.log(`${this.numSeedPoints} seed points initialized for Voronoi. Mouse seed index: ${this.mouseSeedIndex}`);
    }

    animateVoronoi() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update mouse-controlled seed point
        if (this.mouseSeedIndex !== -1 && this.mouseSeedIndex < this.seedPoints.length && this.seedPoints[this.mouseSeedIndex] && this.mouseX !== null && this.mouseY !== null) {
            const mouseSeed = this.seedPoints[this.mouseSeedIndex];
            if (this.mouseX >= 0 && this.mouseX <= this.canvas.width && this.mouseY >= 0 && this.mouseY <= this.canvas.height) {
                mouseSeed.x = this.mouseX;
                mouseSeed.y = this.mouseY;
                mouseSeed.vx = 0;
                mouseSeed.vy = 0;
            } else {
                 mouseSeed.update();
            }
        }

        const pointsForDelaunay = this.seedPoints.map(p => [p.x, p.y]);

        const uniquePoints = Array.from(new Set(pointsForDelaunay.map(p => `${p[0]},${p[1]}`))).map(s => s.split(',').map(Number));
        if (uniquePoints.length < 3) {
            for (let i = 0; i < this.seedPoints.length; i++) {
                const p = this.seedPoints[i];
                if (i !== this.mouseSeedIndex || !(this.mouseX >= 0 && this.mouseX <= this.canvas.width && this.mouseY >= 0 && this.mouseY <= this.canvas.height)) {
                   p.update();
                } else {
                   p.pulsePhase += 0.02;
                }
                p.draw(this.ctx);
            }
            this.animationFrameId = requestAnimationFrame(this.animateVoronoi.bind(this));
            return;
        }

        const delaunay = d3.Delaunay.from(pointsForDelaunay);
        this.voronoiDiagram = delaunay.voronoi([0, 0, this.canvas.width, this.canvas.height]);

        for (let i = 0; i < this.seedPoints.length; i++) {
            const point = this.seedPoints[i];
            if (i !== this.mouseSeedIndex ||
                !(this.mouseX >= 0 && this.mouseX <= this.canvas.width && this.mouseY >= 0 && this.mouseY <= this.canvas.height)) {
                point.update();
            } else {
                 point.pulsePhase += 0.02;
            }


            const cell = this.voronoiDiagram.cellPolygon(i);
            if (cell) {
                this.ctx.beginPath();
                this.ctx.moveTo(cell[0][0], cell[0][1]);
                for (let k = 1; k < cell.length; k++) {
                    this.ctx.lineTo(cell[k][0], cell[k][1]);
                }
                this.ctx.closePath();

                this.ctx.fillStyle = point.getPulsingColor();
                this.ctx.fill();

                this.ctx.strokeStyle = this.voronoiCellBorderColor;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            // Optionally draw the seed points themselves
            // point.draw(this.ctx);
        }
        if (this.isVisible) this.animationFrameId = requestAnimationFrame(this.animateVoronoi.bind(this));
    }
}

class SeedPoint {
    constructor(x, y, vx, vy, baseColor, canvas) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.baseColor = baseColor; // e.g., HSL or hex string
        this.color = baseColor;
        this.pulsePhase = Math.random() * Math.PI * 2; // Random start for pulsing
        this.canvas = canvas;
        this.size = 3; // Size for drawing the seed point itself (optional)

         // Convert baseColor to HSL if it's not already (simplification: assuming hex/rgb for now)
        let r = 0, g = 0, b = 0;
        if (baseColor.startsWith('#')) {
            const hex = baseColor.slice(1);
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);
        } else if (baseColor.startsWith('rgb')) {
            const parts = baseColor.match(/[\d.]+/g);
            if (parts && parts.length >= 3) {
                r = parseInt(parts[0]);
                g = parseInt(parts[1]);
                b = parseInt(parts[2]);
            }
        }
        // Basic RGB to HSL conversion (simplified)
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2 / 255;
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 * 255 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        this.baseH = h * 360;
        this.baseS = s * 100;
        this.baseL = l * 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Screen wrapping
        if (this.x > this.canvas.width + this.size) this.x = -this.size;
        else if (this.x < -this.size) this.x = this.canvas.width + this.size;
        if (this.y > this.canvas.height + this.size) this.y = -this.size;
        else if (this.y < -this.size) this.y = this.canvas.height + this.size;

        this.pulsePhase += 0.02; // Speed of pulsing
    }

    getPulsingColor() {
        // Pulse lightness: L varies between baseL*0.7 and baseL*1.0 (or baseL and baseL*0.7 if baseL is high)
        const lightnessVariation = Math.sin(this.pulsePhase) * 15; // Pulse by +/- 15% lightness
        let currentL = this.baseL + lightnessVariation;
        currentL = Math.max(10, Math.min(90, currentL)); // Clamp lightness
        return `hsl(${this.baseH}, ${this.baseS}%, ${currentL}%)`;
    }

    updateBaseHSL() {
        // Re-convert baseColor to HSL if the color has changed
        let r = 0, g = 0, b = 0;
        if (this.baseColor.startsWith('#')) {
            const hex = this.baseColor.slice(1);
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);
        } else if (this.baseColor.startsWith('rgb')) {
            const parts = this.baseColor.match(/[\d.]+/g);
            if (parts && parts.length >= 3) {
                r = parseInt(parts[0]);
                g = parseInt(parts[1]);
                b = parseInt(parts[2]);
            }
        }
        // Basic RGB to HSL conversion (simplified)
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2 / 255;
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 * 255 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        this.baseH = h * 360;
        this.baseS = s * 100;
        this.baseL = l * 100;
    }

    draw(ctx) { // Optional: for drawing the seed points themselves
        ctx.fillStyle = this.getPulsingColor();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}


class Node {
    constructor(x, y, vx, vy, size, color, canvas) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.canvas = canvas;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Screen wrapping
        if (this.x > this.canvas.width + this.size) this.x = -this.size;
        else if (this.x < -this.size) this.x = this.canvas.width + this.size;
        if (this.y > this.canvas.height + this.size) this.y = -this.size;
        else if (this.y < -this.size) this.y = this.canvas.height + this.size;
    }

    draw(ctx) {
        if (!this.size || !this.color) return; // Don't draw if no size/color
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Particle {
    constructor(x, y, size, color, maxAge, canvas) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.initialColor = color; // Store initial color
        this.color = color;
        this.maxAge = maxAge;
        this.age = 0;
        this.vx = 0;
        this.vy = 0;
        this.canvas = canvas; // Store canvas reference
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.age++;

        // Boundary conditions: wrap around screen
        if (this.x > this.canvas.width + this.size) this.x = -this.size;
        else if (this.x < -this.size) this.x = this.canvas.width + this.size;
        if (this.y > this.canvas.height + this.size) this.y = -this.size;
        else if (this.y < -this.size) this.y = this.canvas.height + this.size;
    }

    draw(ctx) {
        const opacity = 1 - (this.age / this.maxAge);
        ctx.save();
        ctx.globalAlpha = Math.max(0, opacity);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    reset(x, y, color) {
        this.x = x;
        this.y = y;
        this.age = 0;
        this.color = color || this.initialColor;
        this.vx = 0;
        this.vy = 0;
    }
}
