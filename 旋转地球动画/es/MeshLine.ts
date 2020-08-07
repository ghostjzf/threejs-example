// @ts-nocheck
import * as THREE from 'three';

export class MeshLine {
    positions: any[] = [];
    previous: any[] = [];
    next: any[] = [];
    side: any[] = [];
    width: any[] = [];
    indices_array: any[] = [];
    uvs: any[] = [];
    counters: any[] = [];
    geometry = new THREE.BufferGeometry();
    widthCallback: any = null;
    matrixWorld: any = new THREE.Matrix4();
    attributes: any = null;

    setMatrixWorld(matrixWorld) {
        this.matrixWorld = matrixWorld;
    }

    setGeometry(g, c) {
        this.widthCallback = c;

        this.positions = [];
        this.counters = [];
        // g.computeBoundingBox();
        // g.computeBoundingSphere();

        // set the normals
        // g.computeVertexNormals();

        if (g instanceof THREE.Geometry) {
            for (var j = 0; j < g.vertices.length; j++) {
                const v2 = g.vertices[j];
                const c2 = j / g.vertices.length;

                this.positions.push(v2.x, v2.y, v2.z);
                this.positions.push(v2.x, v2.y, v2.z);
                this.counters.push(c2);
                this.counters.push(c2);
            }
        }

        if (g instanceof THREE.BufferGeometry) {
            // read attribute positions ?
        }

        if (g instanceof Float32Array || g instanceof Array) {
            for (var z = 0; z < g.length; z += 3) {
                const c: any = j / g.length;

                this.positions.push(g[z], g[z + 1], g[z + 2]);
                this.positions.push(g[z], g[z + 1], g[z + 2]);
                this.counters.push(c);
                this.counters.push(c);
            }
        }

        this.process();
    }

    compareV3(a, b) {
        var aa = a * 6;
        var ab = b * 6;

        return (
            this.positions[aa] === this.positions[ab] &&
            this.positions[aa + 1] === this.positions[ab + 1] &&
            this.positions[aa + 2] === this.positions[ab + 2]
        );
    }

    copyV3 = a => {
        var aa = a * 6;

        return [this.positions[aa], this.positions[aa + 1], this.positions[aa + 2]];
    };

    process() {
        var l = this.positions.length / 6;

        this.previous = [];
        this.next = [];
        this.side = [];
        this.width = [];
        this.indices_array = [];
        this.uvs = [];

        for (var j = 0; j < l; j++) {
            this.side.push(1);
            this.side.push(-1);
        }

        var w;

        for (var z = 0; z < l; z++) {
            if (this.widthCallback) {
                w = this.widthCallback(z / (l - 1));
            } else {
                w = 1;
            }

            this.width.push(w);
            this.width.push(w);
        }

        for (var k = 0; k < l; k++) {
            this.uvs.push(k / (l - 1), 0);
            this.uvs.push(k / (l - 1), 1);
        }

        var v;

        if (this.compareV3(0, l - 1)) {
            v = this.copyV3(l - 2);
        } else {
            v = this.copyV3(0);
        }

        this.previous.push(v[0], v[1], v[2]);
        this.previous.push(v[0], v[1], v[2]);

        for (var m = 0; m < l - 1; m++) {
            v = this.copyV3(m);
            this.previous.push(v[0], v[1], v[2]);
            this.previous.push(v[0], v[1], v[2]);
        }

        for (var n = 1; n < l; n++) {
            v = this.copyV3(n);
            this.next.push(v[0], v[1], v[2]);
            this.next.push(v[0], v[1], v[2]);
        }

        if (this.compareV3(l - 1, 0)) {
            v = this.copyV3(1);
        } else {
            v = this.copyV3(l - 1);
        }

        this.next.push(v[0], v[1], v[2]);
        this.next.push(v[0], v[1], v[2]);

        for (var r = 0; r < l - 1; r++) {
            const n = r * 2;

            this.indices_array.push(n, n + 1, n + 2);
            this.indices_array.push(n + 2, n + 1, n + 3);
        }

        if (!this.attributes) {
            this.attributes = {
                position: new THREE.BufferAttribute(new Float32Array(this.positions), 3),
                previous: new THREE.BufferAttribute(new Float32Array(this.previous), 3),
                next: new THREE.BufferAttribute(new Float32Array(this.next), 3),
                side: new THREE.BufferAttribute(new Float32Array(this.side), 1),
                width: new THREE.BufferAttribute(new Float32Array(this.width), 1),
                uv: new THREE.BufferAttribute(new Float32Array(this.uvs), 2),
                index: new THREE.BufferAttribute(new Uint16Array(this.indices_array), 1),
                counters: new THREE.BufferAttribute(new Float32Array(this.counters), 1)
            };
        } else {
            this.attributes.position.copyArray(new Float32Array(this.positions));
            this.attributes.position.needsUpdate = true;
            this.attributes.previous.copyArray(new Float32Array(this.previous));
            this.attributes.previous.needsUpdate = true;
            this.attributes.next.copyArray(new Float32Array(this.next));
            this.attributes.next.needsUpdate = true;
            this.attributes.side.copyArray(new Float32Array(this.side));
            this.attributes.side.needsUpdate = true;
            this.attributes.width.copyArray(new Float32Array(this.width));
            this.attributes.width.needsUpdate = true;
            this.attributes.uv.copyArray(new Float32Array(this.uvs));
            this.attributes.uv.needsUpdate = true;
            this.attributes.index.copyArray(new Uint16Array(this.indices_array));
            this.attributes.index.needsUpdate = true;
        }

        this.geometry.setAttribute('position', this.attributes.position);
        this.geometry.setAttribute('previous', this.attributes.previous);
        this.geometry.setAttribute('next', this.attributes.next);
        this.geometry.setAttribute('side', this.attributes.side);
        this.geometry.setAttribute('width', this.attributes.width);
        this.geometry.setAttribute('uv', this.attributes.uv);
        this.geometry.setAttribute('counters', this.attributes.counters);

        this.geometry.setIndex(this.attributes.index);
    }

    advance(position) {
        var positions = this.attributes.position.array;
        var previous = this.attributes.previous.array;
        var next = this.attributes.next.array;
        var l = positions.length;

        // PREVIOUS
        memcpy(positions, 0, previous, 0, l);

        // POSITIONS
        memcpy(positions, 6, positions, 0, l - 6);

        positions[l - 6] = position.x;
        positions[l - 5] = position.y;
        positions[l - 4] = position.z;
        positions[l - 3] = position.x;
        positions[l - 2] = position.y;
        positions[l - 1] = position.z;

        // NEXT
        memcpy(positions, 6, next, 0, l - 6);

        next[l - 6] = position.x;
        next[l - 5] = position.y;
        next[l - 4] = position.z;
        next[l - 3] = position.x;
        next[l - 2] = position.y;
        next[l - 1] = position.z;

        this.attributes.position.needsUpdate = true;
        this.attributes.previous.needsUpdate = true;
        this.attributes.next.needsUpdate = true;
    }
}

function memcpy(src, srcOffset, dst, dstOffset, length) {
    var i;

    src = src.subarray || src.slice ? src : src.buffer;
    dst = dst.subarray || dst.slice ? dst : dst.buffer;

    src = srcOffset
        ? src.subarray
            ? src.subarray(srcOffset, length && srcOffset + length)
            : src.slice(srcOffset, length && srcOffset + length)
        : src;

    if (dst.set) {
        dst.set(src, dstOffset);
    } else {
        for (i = 0; i < src.length; i++) {
            dst[i + dstOffset] = src[i];
        }
    }

    return dst;
}

THREE.ShaderChunk.meshline_vert = [
    '',
    THREE.ShaderChunk.logdepthbuf_pars_vertex,
    THREE.ShaderChunk.fog_pars_vertex,
    '',
    'attribute vec3 previous;',
    'attribute vec3 next;',
    'attribute float side;',
    'attribute float width;',
    'attribute float counters;',
    '',
    'uniform vec2 resolution;',
    'uniform float lineWidth;',
    'uniform vec3 color;',
    'uniform float opacity;',
    'uniform float near;',
    'uniform float far;',
    'uniform float sizeAttenuation;',
    '',
    'varying vec2 vUV;',
    'varying vec4 vColor;',
    'varying float vCounters;',
    '',
    'vec2 fix( vec4 i, float aspect ) {',
    '',
    '    vec2 res = i.xy / i.w;',
    '    res.x *= aspect;',
    '	 vCounters = counters;',
    '    return res;',
    '',
    '}',
    '',
    'void main() {',
    '',
    '    float aspect = resolution.x / resolution.y;',
    '    float pixelWidthRatio = 1. / (resolution.x * projectionMatrix[0][0]);',
    '',
    '    vColor = vec4( color, opacity );',
    '    vUV = uv;',
    '',
    '    mat4 m = projectionMatrix * modelViewMatrix;',
    '    vec4 finalPosition = m * vec4( position, 1.0 );',
    '    vec4 prevPos = m * vec4( previous, 1.0 );',
    '    vec4 nextPos = m * vec4( next, 1.0 );',
    '',
    '    vec2 currentP = fix( finalPosition, aspect );',
    '    vec2 prevP = fix( prevPos, aspect );',
    '    vec2 nextP = fix( nextPos, aspect );',
    '',
    '    float pixelWidth = finalPosition.w * pixelWidthRatio;',
    '    float w = 1.8 * pixelWidth * lineWidth * width;',
    '',
    '    if( sizeAttenuation == 1. ) {',
    '        w = 1.8 * lineWidth * width;',
    '    }',
    '',
    '    vec2 dir;',
    '    if( nextP == currentP ) dir = normalize( currentP - prevP );',
    '    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
    '    else {',
    '        vec2 dir1 = normalize( currentP - prevP );',
    '        vec2 dir2 = normalize( nextP - currentP );',
    '        dir = normalize( dir1 + dir2 );',
    '',
    '        vec2 perp = vec2( -dir1.y, dir1.x );',
    '        vec2 miter = vec2( -dir.y, dir.x );',
    '        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
    '',
    '    }',
    '',
    '    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
    '    vec2 normal = vec2( -dir.y, dir.x );',
    '    normal.x /= aspect;',
    '    normal *= .5 * w;',
    '',
    '    vec4 offset = vec4( normal * side, 0.0, 1.0 );',
    '    finalPosition.xy += offset.xy;',
    '',
    '    gl_Position = finalPosition;',
    '',
    THREE.ShaderChunk.logdepthbuf_vertex,
    THREE.ShaderChunk.fog_vertex && '    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
    THREE.ShaderChunk.fog_vertex,
    '}'
].join('\r\n');

THREE.ShaderChunk.meshline_frag = [
    '',
    THREE.ShaderChunk.fog_pars_fragment,
    THREE.ShaderChunk.logdepthbuf_pars_fragment,
    '',
    'uniform sampler2D map;',
    'uniform sampler2D alphaMap;',
    'uniform float useMap;',
    'uniform float useAlphaMap;',
    'uniform float useDash;',
    'uniform float dashArray;',
    'uniform float dashOffset;',
    'uniform float dashRatio;',
    'uniform float visibility;',
    'uniform float alphaTest;',
    'uniform vec2 repeat;',
    '',
    'varying vec2 vUV;',
    'varying vec4 vColor;',
    'varying float vCounters;',
    '',
    'void main() {',
    '',
    THREE.ShaderChunk.logdepthbuf_fragment,
    '',
    '    vec4 c = vColor;',
    '    if( useMap == 1. ) c *= texture2D( map, vUV * repeat );',
    '    if( useAlphaMap == 1. ) c.a *= texture2D( alphaMap, vUV * repeat ).a;',
    '    if( c.a < alphaTest ) discard;',
    '    if( useDash == 1. ){',
    '        c.a *= ceil(mod(vCounters + dashOffset, dashArray) - (dashArray * dashRatio));',
    '    }',
    '    gl_FragColor = c;',
    '    gl_FragColor.a *= step(vCounters, visibility);',
    '',
    THREE.ShaderChunk.fog_fragment,
    '}'
].join('\r\n');

export function MeshLineMaterial(parameters) {
    THREE.ShaderMaterial.call(this, {
        uniforms: Object.assign({}, THREE.UniformsLib.fog, {
            lineWidth: { value: 1 },
            map: { value: null },
            useMap: { value: 0 },
            alphaMap: { value: null },
            useAlphaMap: { value: 0 },
            color: { value: new THREE.Color(0xffffff) },
            opacity: { value: 1 },
            resolution: { value: new THREE.Vector2(1, 1) },
            sizeAttenuation: { value: 1 },
            near: { value: 1 },
            far: { value: 1 },
            dashArray: { value: 0 },
            dashOffset: { value: 0 },
            dashRatio: { value: 0.5 },
            useDash: { value: 0 },
            visibility: { value: 1 },
            alphaTest: { value: 0 },
            repeat: { value: new THREE.Vector2(1, 1) }
        }),

        vertexShader: THREE.ShaderChunk.meshline_vert,

        fragmentShader: THREE.ShaderChunk.meshline_frag
    });

    this.type = 'MeshLineMaterial';

    Object.defineProperties(this, {
        lineWidth: {
            enumerable: true,
            get: () => {
                return this.uniforms.lineWidth.value;
            },
            set: value => {
                this.uniforms.lineWidth.value = value;
            }
        },
        map: {
            enumerable: true,
            get: () => {
                return this.uniforms.map.value;
            },
            set: value => {
                this.uniforms.map.value = value;
            }
        },
        useMap: {
            enumerable: true,
            get: () => {
                return this.uniforms.useMap.value;
            },
            set: value => {
                this.uniforms.useMap.value = value;
            }
        },
        alphaMap: {
            enumerable: true,
            get: () => {
                return this.uniforms.alphaMap.value;
            },
            set: value => {
                this.uniforms.alphaMap.value = value;
            }
        },
        useAlphaMap: {
            enumerable: true,
            get: () => {
                return this.uniforms.useAlphaMap.value;
            },
            set: value => {
                this.uniforms.useAlphaMap.value = value;
            }
        },
        color: {
            enumerable: true,
            get: () => {
                return this.uniforms.color.value;
            },
            set: value => {
                this.uniforms.color.value = value;
            }
        },
        opacity: {
            enumerable: true,
            get: () => {
                return this.uniforms.opacity.value;
            },
            set: value => {
                this.uniforms.opacity.value = value;
            }
        },
        resolution: {
            enumerable: true,
            get: () => {
                return this.uniforms.resolution.value;
            },
            set: value => {
                this.uniforms.resolution.value.copy(value);
            }
        },
        sizeAttenuation: {
            enumerable: true,
            get: () => {
                return this.uniforms.sizeAttenuation.value;
            },
            set: value => {
                this.uniforms.sizeAttenuation.value = value;
            }
        },
        near: {
            enumerable: true,
            get: () => {
                return this.uniforms.near.value;
            },
            set: value => {
                this.uniforms.near.value = value;
            }
        },
        far: {
            enumerable: true,
            get: () => {
                return this.uniforms.far.value;
            },
            set: value => {
                this.uniforms.far.value = value;
            }
        },
        dashArray: {
            enumerable: true,
            get: () => {
                return this.uniforms.dashArray.value;
            },
            set: value => {
                this.uniforms.dashArray.value = value;
                this.useDash = value !== 0 ? 1 : 0;
            }
        },
        dashOffset: {
            enumerable: true,
            get: () => {
                return this.uniforms.dashOffset.value;
            },
            set: value => {
                this.uniforms.dashOffset.value = value;
            }
        },
        dashRatio: {
            enumerable: true,
            get: () => {
                return this.uniforms.dashRatio.value;
            },
            set: value => {
                this.uniforms.dashRatio.value = value;
            }
        },
        useDash: {
            enumerable: true,
            get: () => {
                return this.uniforms.useDash.value;
            },
            set: value => {
                this.uniforms.useDash.value = value;
            }
        },
        visibility: {
            enumerable: true,
            get: () => {
                return this.uniforms.visibility.value;
            },
            set: value => {
                this.uniforms.visibility.value = value;
            }
        },
        alphaTest: {
            enumerable: true,
            get: () => {
                return this.uniforms.alphaTest.value;
            },
            set: value => {
                this.uniforms.alphaTest.value = value;
            }
        },
        repeat: {
            enumerable: true,
            get: () => {
                return this.uniforms.repeat.value;
            },
            set: value => {
                this.uniforms.repeat.value.copy(value);
            }
        }
    });

    this.setValues(parameters);
}

MeshLineMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
MeshLineMaterial.prototype.constructor = MeshLineMaterial;
MeshLineMaterial.prototype.isMeshLineMaterial = true;

// eslint-disable-next-line
MeshLineMaterial.prototype.copy = function (source) {
    THREE.ShaderMaterial.prototype.copy.call(this, source);

    this.lineWidth = source.lineWidth;
    this.map = source.map;
    this.useMap = source.useMap;
    this.alphaMap = source.alphaMap;
    this.useAlphaMap = source.useAlphaMap;
    this.color.copy(source.color);
    this.opacity = source.opacity;
    this.resolution.copy(source.resolution);
    this.sizeAttenuation = source.sizeAttenuation;
    this.near = source.near;
    this.far = source.far;
    this.dashArray.copy(source.dashArray);
    this.dashOffset.copy(source.dashOffset);
    this.dashRatio.copy(source.dashRatio);
    this.useDash = source.useDash;
    this.visibility = source.visibility;
    this.alphaTest = source.alphaTest;
    this.repeat.copy(source.repeat);

    return this;
};

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = {
            MeshLine: MeshLine,
            MeshLineMaterial: MeshLineMaterial
        };
    }

    exports.MeshLine = MeshLine;
    exports.MeshLineMaterial = MeshLineMaterial;
} else {
    (window as any).MeshLine = MeshLine;
    (window as any).MeshLineMaterial = MeshLineMaterial;
}
