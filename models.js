/* three.js 程序化建模：奶龙(软胶质感·按照片) + 大众化热梗障碍 + 地铁跑酷场景 */
const Models = (() => {
  const truckGeometry = Object.freeze({
    shortHalf: 2.3, longHalf: 6, roofHeight: 2.3, roofWidth: 1.95,
    cabLength: 1.4, cabOverhang: 0.2, rampLength: 3, rampWidth: 1.7,
  });
  let gradientMap = null;
  function toonGrad() {
    if (gradientMap) return gradientMap;
    // three.js r128 MeshToonMaterial 采样 gradientMap.rgb，需用 RGBA 灰度贴图避免 WebGL2 下 RedFormat 偏红
    const stops = [115, 175, 225, 255];
    const data = new Uint8Array(stops.length * 4);
    stops.forEach((v, i) => {
      const o = i * 4;
      data[o] = v; data[o + 1] = v; data[o + 2] = v; data[o + 3] = 255;
    });
    gradientMap = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;
    return gradientMap;
  }
  const worldBendUniform = { value: new THREE.Vector2(0, 0) };
  const bendViewMatUniform = { value: new THREE.Matrix4() };
  const windTimeUniform = { value: 0 };
  const groundScrollUniform = { value: 0 };
  function setWorldBend(x, y, cam = null) {
    worldBendUniform.value.set(x, y);
    if (cam) {
      cam.updateMatrixWorld();
      bendViewMatUniform.value.copy(cam.matrixWorld).invert();
    }
  }
  function setWorldTime(t, distance = 0) {
    windTimeUniform.value = t;
    groundScrollUniform.value = distance;
  }
  function applyWorldBend(material, opts = null) {
    const wind = Boolean(opts?.wind);
    const windAmp = opts?.windAmp ?? 1.0;
    const antiTileGrass = Boolean(opts?.antiTileGrass);
    if (!material || material.isShaderMaterial || material.userData?.worldBent) return material;
    material.userData = { ...(material.userData || {}), worldBent: true };
    if (material.isSpriteMaterial) {
      material.onBeforeCompile = shader => {
        shader.uniforms.uWorldBend = worldBendUniform;
        shader.uniforms.uBendViewMat = bendViewMatUniform;
        shader.vertexShader = shader.vertexShader
          .replace('void main() {', 'uniform vec2 uWorldBend;\nuniform mat4 uBendViewMat;\nvoid main() {')
          .replace(
            'vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );',
            `vec4 bendWorldPos = modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            float bendDist = max( 0.0, -bendWorldPos.z );
            float bendDist2 = bendDist * bendDist;
            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            mvPosition.xyz += ( uBendViewMat * vec4( uWorldBend.x * bendDist2, uWorldBend.y * bendDist2, 0.0, 0.0 ) ).xyz;`
          );
      };
      material.customProgramCacheKey = () => 'sprite-world-bend';
    } else {
      const cacheKey = antiTileGrass ? 'mesh-world-bend-grass'
        : wind ? 'mesh-world-bend-wind' : 'mesh-world-bend';
      material.onBeforeCompile = shader => {
        shader.uniforms.uWorldBend = worldBendUniform;
        shader.uniforms.uBendViewMat = bendViewMatUniform;
        let vHead = 'uniform vec2 uWorldBend;\nuniform mat4 uBendViewMat;\n';
        if (wind) {
          shader.uniforms.uWindTime = windTimeUniform;
          shader.uniforms.uWindAmp = { value: windAmp };
          shader.uniforms.uGroundScroll = groundScrollUniform;
          vHead += 'uniform float uWindTime;\nuniform float uWindAmp;\n';
          if (!antiTileGrass) vHead += 'uniform float uGroundScroll;\n';
        }
        if (antiTileGrass) {
          shader.uniforms.uGroundScroll = groundScrollUniform;
          vHead += 'uniform float uGroundScroll;\nvarying vec2 vGrassWorld;\n';
        }
        shader.vertexShader = shader.vertexShader.replace('void main() {', vHead + 'void main() {');
        if (wind) {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vec3 windAnchor = modelMatrix[3].xyz;
            #ifdef USE_INSTANCING
              windAnchor += instanceMatrix[3].xyz;
            #endif
            float windWeight = smoothstep( 0.75, 3.6, transformed.y );
            float windPhase = uWindTime * 2.15 + windAnchor.x * 0.41 + ( windAnchor.z - uGroundScroll ) * 0.23 + transformed.x * 0.65;
            transformed.x += sin( windPhase ) * 0.095 * uWindAmp * windWeight;
            transformed.z += cos( windPhase * 0.83 + 0.7 ) * 0.06 * uWindAmp * windWeight;`
          );
        }
        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          `vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          vec4 bendWorldPos = modelMatrix * mvPosition;
          ${antiTileGrass ? 'vGrassWorld = vec2( bendWorldPos.x, bendWorldPos.z - uGroundScroll );' : ''}
          float bendDist = max( 0.0, -bendWorldPos.z );
          float bendDist2 = bendDist * bendDist;
          mvPosition = modelViewMatrix * mvPosition;
          mvPosition.xyz += ( uBendViewMat * vec4( uWorldBend.x * bendDist2, uWorldBend.y * bendDist2, 0.0, 0.0 ) ).xyz;
          gl_Position = projectionMatrix * mvPosition;`
        );
        if (antiTileGrass) {
          shader.fragmentShader = shader.fragmentShader
            .replace('void main() {', 'varying vec2 vGrassWorld;\nvoid main() {')
            .replace(
              'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
              `float gPatch1 = sin( vGrassWorld.x * 0.095 + vGrassWorld.y * 0.062 ) * cos( vGrassWorld.y * 0.088 - vGrassWorld.x * 0.041 );
              float gPatch2 = sin( vGrassWorld.x * 0.23 - vGrassWorld.y * 0.19 ) * 0.5;
              outgoingLight *= ( 1.0 + gPatch1 * 0.11 + gPatch2 * 0.055 );
              gl_FragColor = vec4( outgoingLight, diffuseColor.a );`
            );
        }
      };
      material.customProgramCacheKey = () => cacheKey;
    }
    return material;
  }
  function applyCharacterShader(material, rimUniforms) {
    if (!material) return material;
    material.userData = { ...(material.userData || {}), worldBent: true, hasRim: true };
    material.onBeforeCompile = shader => {
      shader.uniforms.uWorldBend = worldBendUniform;
      shader.uniforms.uBendViewMat = bendViewMatUniform;
      shader.uniforms.uRimColor = rimUniforms.color;
      shader.uniforms.uRimStrength = rimUniforms.strength;
      shader.uniforms.uRimPower = rimUniforms.power;
      shader.vertexShader = shader.vertexShader
        .replace(
          'void main() {',
          'uniform vec2 uWorldBend;\nuniform mat4 uBendViewMat;\nvarying vec3 vRimNormal;\nvarying vec3 vRimViewDir;\nvoid main() {'
        )
        .replace(
          '#include <project_vertex>',
          `vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          vec4 bendWorldPos = modelMatrix * mvPosition;
          float bendDist = max( 0.0, -bendWorldPos.z );
          float bendDist2 = bendDist * bendDist;
          mvPosition = modelViewMatrix * mvPosition;
          mvPosition.xyz += ( uBendViewMat * vec4( uWorldBend.x * bendDist2, uWorldBend.y * bendDist2, 0.0, 0.0 ) ).xyz;
          vRimNormal = normalize( transformedNormal );
          vRimViewDir = normalize( -mvPosition.xyz );
          gl_Position = projectionMatrix * mvPosition;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'void main() {',
          'uniform vec3 uRimColor;\nuniform float uRimStrength;\nuniform float uRimPower;\nvarying vec3 vRimNormal;\nvarying vec3 vRimViewDir;\nvoid main() {'
        )
        .replace(
          'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
          `vec3 rimN = normalize( vRimNormal );
          #ifdef DOUBLE_SIDED
            rimN = rimN * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
          #endif
          float rimNdotV = clamp( dot( rimN, normalize( vRimViewDir ) ), 0.0, 1.0 );
          float rimFresnel = pow( 1.0 - rimNdotV, uRimPower );
          float rimTopBias = smoothstep( -0.35, 0.55, rimN.y ) * 0.45 + 0.55;
          outgoingLight += uRimColor * ( rimFresnel * rimTopBias * uRimStrength );
          gl_FragColor = vec4( outgoingLight, diffuseColor.a );`
        );
    };
    material.customProgramCacheKey = () => 'char-bend-rim';
    return material;
  }

  const T = (color) => applyWorldBend(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad() }));
  const L = (color) => applyWorldBend(new THREE.MeshLambertMaterial({ color }));
  const P = (color, shininess = 30, emissive = 0x000000) => applyWorldBend(new THREE.MeshPhongMaterial({ color, shininess, specular: 0x3a3a3a, emissive }));
  const Basic = (color) => applyWorldBend(new THREE.MeshBasicMaterial({ color }));

  function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = false;
    return m;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const sph = (r, ws = 18, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
  const cyl = (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s);

  const streetKit = new Map();
  const obstacleKit = new Map();
  let thanosAsset = null;
  function preparePaintedAsset(source) {
    const material = applyWorldBend(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const paint = new THREE.Color();
    source.traverse(node => {
      if (!node.isMesh) return;
      const attribute = node.geometry.getAttribute('color');
      // Match the current renderer's color encoding while keeping standard linear colors in the GLB.
      const scale = attribute.normalized ? (attribute.array instanceof Uint16Array ? 65535 : 255) : 1;
      for (let i = 0; i < attribute.count; i++) {
        paint.setRGB(attribute.getX(i) / scale, attribute.getY(i) / scale, attribute.getZ(i) / scale);
        paint.convertLinearToSRGB();
        attribute.setXYZ(i, paint.r * scale, paint.g * scale, paint.b * scale);
      }
      node.material.dispose();
      node.material = material;
      node.userData.sharedAsset = true;
    });
  }
  const WIND_STREET_PARTS = new Set([
    'PlaneTree', 'PlaneTreeFar', 'BlossomTree', 'BlossomTreeFar',
    'ParkPoplar', 'ParkPoplarFar', 'MarketBunting',
  ]);
  function installStreetKit(source) {
    preparePaintedAsset(source);
    const windMat = applyWorldBend(new THREE.MeshLambertMaterial({ vertexColors: true }), { wind: true, windAmp: 1.0 });
    source.traverse(node => {
      if (!node.isMesh) return;
      if (WIND_STREET_PARTS.has(node.name)) node.material = windMat;
      streetKit.set(node.name, node);
    });
  }
  function recolorTruckYellow(node, isLong) {
    const attr = node.geometry.getAttribute('color');
    const pos = node.geometry.getAttribute('position');
    if (!attr || !pos) return;
    const scale = attr.normalized ? (attr.array instanceof Uint16Array ? 65535 : 255) : 1;
    const c = new THREE.Color();
    // 源颜色（已转成 sRGB）：长车车身 TEAL(#397c77)、短车车身砖红(#b86149)、车顶(#52646a)、车头(#374d52)、车尾门框(#8aa29e)
    const bodySrc = new THREE.Color(isLong ? 0x397c77 : 0xb86149);
    const roofSrc = new THREE.Color(0x52646a);
    const cabSrc = new THREE.Color(0x374d52);
    const trimSrc = new THREE.Color(0x8aa29e);
    const bodyDst = new THREE.Color(0xf6c536); // 明亮明黄车厢
    const roofDst = new THREE.Color(0xe3b12c); // 略深金黄车顶（保留层次与对比）
    const cabDst = new THREE.Color(0xe0a122);  // 暖琥珀黄车头
    const trimDst = new THREE.Color(0xf9e395); // 浅奶黄门框
    const dist = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
    const applyWithShade = (dst, src) => {
      const lumSrc = Math.max(0.05, src.r * 0.299 + src.g * 0.587 + src.b * 0.114);
      const lumCur = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
      const shade = THREE.MathUtils.clamp(lumCur / lumSrc, 0.78, 1.06);
      c.copy(dst).multiplyScalar(shade);
    };
    for (let i = 0; i < attr.count; i++) {
      c.setRGB(attr.getX(i) / scale, attr.getY(i) / scale, attr.getZ(i) / scale);
      const y = pos.getY(i);
      if (dist(c, bodySrc) < 0.09) applyWithShade(bodyDst, bodySrc);
      else if (dist(c, trimSrc) < 0.08) applyWithShade(trimDst, trimSrc);
      else if (y > 2.15 && dist(c, roofSrc) < 0.08) applyWithShade(roofDst, roofSrc);
      else if (y > 0.45 && dist(c, cabSrc) < 0.07) applyWithShade(cabDst, cabSrc);
      else continue;
      attr.setXYZ(i, Math.min(1, c.r) * scale, Math.min(1, c.g) * scale, Math.min(1, c.b) * scale);
    }
    attr.needsUpdate = true;
  }
  function installObstacleKit(source) {
    preparePaintedAsset(source);
    source.traverse(node => {
      if (!node.isMesh) return;
      if (node.name === 'TruckLong') recolorTruckYellow(node, true);
      else if (node.name === 'TruckShort') recolorTruckYellow(node, false);
      obstacleKit.set(node.name, node);
    });
  }
  function installThanos(source) {
    preparePaintedAsset(source);
    thanosAsset = source.getObjectByName('Thanos');
  }
  function assetInstance(source, castShadow = false) {
    const instance = source.clone(false);
    instance.castShadow = castShadow;
    return instance;
  }
  function obstaclePart(name) {
    const source = obstacleKit.get(name);
    return source ? assetInstance(source, true) : null;
  }
  function streetPart(name) {
    const source = streetKit.get(name);
    if (!source) return null;
    const instance = assetInstance(source);
    if (streetKit.has(name + 'Far')) instance.userData.streetModel = name;
    return instance;
  }
  function setStreetDetail(root, far) {
    const body = root.isMesh ? root : root.children[0];
    const name = body?.userData.streetModel;
    if (name) body.geometry = streetKit.get(far ? name + 'Far' : name).geometry;
    const hide = root.userData.farHide;
    if (hide) for (const node of hide) node.visible = !far;
  }
  function mergeStatic(parts, material, { vertexColors = false, withUV = false } = {}) {
    const vertexCount = parts.reduce((sum, m) => sum + m.geometry.attributes.position.count, 0);
    const indexCount = parts.reduce((sum, m) => sum + (m.geometry.index?.count ?? m.geometry.attributes.position.count), 0);
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const colors = vertexColors ? new Float32Array(vertexCount * 3) : null;
    const uvs = withUV ? new Float32Array(vertexCount * 2) : null;
    const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
    const normal = new THREE.Matrix3(), temp = new THREE.Vector3();
    let vertex = 0, index = 0;
    for (const part of parts) {
      part.updateMatrix();
      const { position, normal: direction, uv } = part.geometry.attributes;
      normal.getNormalMatrix(part.matrix);
      for (let i = 0; i < position.count; i++) {
        const o3 = (vertex + i) * 3;
        temp.fromBufferAttribute(position, i).applyMatrix4(part.matrix).toArray(positions, o3);
        temp.fromBufferAttribute(direction, i).applyNormalMatrix(normal).normalize().toArray(normals, o3);
        if (colors) part.material.color.toArray(colors, o3);
        if (uvs && uv) {
          const o2 = (vertex + i) * 2;
          uvs[o2] = uv.getX(i);
          uvs[o2 + 1] = uv.getY(i);
        }
      }
      const sourceIndices = part.geometry.index?.array;
      if (sourceIndices) {
        for (const source of sourceIndices) indices[index++] = vertex + source;
      } else {
        for (let i = 0; i < position.count; i++) indices[index++] = vertex + i;
      }
      vertex += position.count;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    if (colors) geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (uvs) geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    return new THREE.Mesh(geometry, material);
  }
  // Bake each stationary prop's solid pieces into one draw per lighting mode.
  // Textures, translucent glass and text sprites keep their individual materials.
  function batchScenery(root) {
    root.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert();
    for (const Material of [THREE.MeshLambertMaterial, THREE.MeshBasicMaterial]) {
      const parts = [];
      root.traverse(m => {
        if (m !== root && m.isMesh && !m.userData.sharedAsset && m.material instanceof Material &&
            !m.material.map && !m.material.transparent && !m.castShadow && !m.receiveShadow) parts.push(m);
      });
      if (parts.length < 2) continue;

      const vertexCount = parts.reduce((sum, m) => sum + m.geometry.attributes.position.count, 0);
      const indexCount = parts.reduce((sum, m) => sum + (m.geometry.index?.count ?? m.geometry.attributes.position.count), 0);
      const positions = new Float32Array(vertexCount * 3);
      const normals = new Float32Array(vertexCount * 3);
      const colors = new Float32Array(vertexCount * 3);
      const indices = new Uint16Array(indexCount);
      const local = new THREE.Matrix4(), normal = new THREE.Matrix3(), temp = new THREE.Vector3();
      const materials = new Set();
      let vertex = 0, index = 0;
      for (const part of parts) {
        const { position, normal: direction } = part.geometry.attributes;
        local.multiplyMatrices(inverse, part.matrixWorld);
        normal.getNormalMatrix(local);
        for (let i = 0; i < position.count; i++) {
          const offset = (vertex + i) * 3;
          temp.fromBufferAttribute(position, i).applyMatrix4(local).toArray(positions, offset);
          temp.fromBufferAttribute(direction, i).applyNormalMatrix(normal).toArray(normals, offset);
          part.material.color.toArray(colors, offset);
        }
        const sourceIndices = part.geometry.index?.array;
        if (sourceIndices) {
          for (const source of sourceIndices) indices[index++] = vertex + source;
        } else {
          for (let i = 0; i < position.count; i++) indices[index++] = vertex + i;
        }
        vertex += position.count;
        part.parent.remove(part);
        part.geometry.dispose();
        materials.add(part.material);
      }
      for (const material of materials) material.dispose();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      root.add(new THREE.Mesh(geometry, applyWorldBend(new Material({ vertexColors: true }))));
    }
    return root;
  }

  let shadowTextures = null;
  const unitShadowGeo = new THREE.PlaneGeometry(1, 1);
  function getShadowTextures() {
    if (shadowTextures) return shadowTextures;
    // 软边圆角矩形接触阴影（货车与条状障碍）
    const rc = document.createElement('canvas');
    rc.width = rc.height = 64;
    const rctx = rc.getContext('2d');
    const rg = rctx.createRadialGradient(32, 32, 8, 32, 32, 31);
    rg.addColorStop(0, 'rgba(18,26,36,0.68)');
    rg.addColorStop(0.55, 'rgba(18,26,36,0.52)');
    rg.addColorStop(0.84, 'rgba(18,26,36,0.18)');
    rg.addColorStop(1, 'rgba(18,26,36,0)');
    rctx.fillStyle = rg;
    rctx.fillRect(0, 0, 64, 64);
    // 额外加一层柔和矩形核，让长货车底盘四周阴影更规整贴合
    rctx.fillStyle = 'rgba(16,24,34,0.34)';
    rctx.beginPath();
    const pad = 11, rad = 10;
    rctx.moveTo(pad + rad, pad);
    rctx.arcTo(64 - pad, pad, 64 - pad, 64 - pad, rad);
    rctx.arcTo(64 - pad, 64 - pad, pad, 64 - pad, rad);
    rctx.arcTo(pad, 64 - pad, pad, pad, rad);
    rctx.arcTo(pad, pad, 64 - pad, pad, rad);
    rctx.closePath();
    rctx.fill();
    const rectMap = new THREE.CanvasTexture(rc);

    // 柔和圆形接触阴影（灭霸、行道树等）
    const cc = document.createElement('canvas');
    cc.width = cc.height = 64;
    const cctx = cc.getContext('2d');
    const cg = cctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    for (const [stop, alpha] of [[0, 0.56], [0.38, 0.42], [0.72, 0.16], [1, 0]]) {
      cg.addColorStop(stop, `rgba(22,32,42,${alpha})`);
    }
    cctx.fillStyle = cg;
    cctx.fillRect(0, 0, 64, 64);
    const roundMap = new THREE.CanvasTexture(cc);

    shadowTextures = { rectMap, roundMap, mats: new Map() };
    return shadowTextures;
  }
  function makeContactShadow(kind, w, d, z = 0, opacity = 0.72, y = 0.034, x = 0) {
    const st = getShadowTextures();
    const key = `${kind}|${opacity.toFixed(2)}`;
    let mat = st.mats.get(key);
    if (!mat) {
      mat = applyWorldBend(new THREE.MeshBasicMaterial({
        map: kind === 'rect' ? st.rectMap : st.roundMap,
        transparent: true,
        opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }));
      st.mats.set(key, mat);
    }
    const m = new THREE.Mesh(unitShadowGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.scale.set(w, d, 1);
    m.userData.sharedAsset = true;
    m.userData.contactShadow = true;
    return m;
  }

  function characterShadows() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const fade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [stop, alpha] of [[0, 0.68], [0.26, 0.55], [0.60, 0.24], [1, 0]]) {
      fade.addColorStop(stop, `rgba(30,39,49,${alpha})`);
    }
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 64, 64);
    const map = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(1, 1);
    return [0, 1].map(() => new THREE.Mesh(geometry, applyWorldBend(new THREE.MeshBasicMaterial({
      map, transparent: true, depthWrite: false,
    }))));
  }

  // 同一段文字只画一次画布，Sprite 之间共享贴图，减少跑图时的 canvas 绘制和显存上涨。
  const labelTextures = new Map();
  function labelTexture(text, bg, fg) {
    const key = `${text}|${bg}|${fg}`;
    let tex = labelTextures.get(key);
    if (tex) return tex;
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    const c = cv.getContext('2d');
    c.fillStyle = bg;
    const r = 22;
    c.beginPath();
    c.moveTo(r, 4); c.arcTo(252, 4, 252, 92, r); c.arcTo(252, 92, 4, 92, r);
    c.arcTo(4, 92, 4, 4, r); c.arcTo(4, 4, 252, 4, r); c.closePath(); c.fill();
    c.lineWidth = 6; c.strokeStyle = '#3a2b20'; c.stroke();
    c.font = 'bold 44px "ZCOOL KuaiLe","Microsoft YaHei",sans-serif';
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, 128, 50);
    tex = new THREE.CanvasTexture(cv);
    labelTextures.set(key, tex);
    return tex;
  }
  function label(text, bg = '#fff6e3', fg = '#3a2b20', w = 2.0) {
    const sp = new THREE.Sprite(applyWorldBend(new THREE.SpriteMaterial({ map: labelTexture(text, bg, fg), transparent: true, depthTest: true })));
    sp.scale.set(w, w * 96 / 256, 1);
    sp.userData.sharedAsset = true; // 贴图是共享缓存，回收时不要 dispose
    return sp;
  }

  /* ---------- 奶龙：圆顶头+正面绿眼大黑瞳+奶白大肚皮+炭灰手贴肚侧+锥形长腿（软胶） ---------- */
  function naiwa() {
    const g = new THREE.Group();
    const YEL = 0xffd93f, CREAM = 0xfff2d6, GREEN = 0x63a44a, DARK = 0x4f4f4f, INKC = 0x5a4a28, BLACK = 0x141414;
    // 奶娃黄：与门架牌子完全同色 #ffd93f，用烘焙渐变贴图，不再被草地/天空的绿色环境光染色
    const yelCv = document.createElement('canvas');
    yelCv.width = 8; yelCv.height = 256;
    const yelCtx = yelCv.getContext('2d');
    const yelGrad = yelCtx.createLinearGradient(0, 0, 0, 256);
    yelGrad.addColorStop(0, '#fff3a0');
    yelGrad.addColorStop(0.35, '#ffe45c');
    yelGrad.addColorStop(0.72, '#ffd93f');
    yelGrad.addColorStop(1, '#f5c81f');
    yelCtx.fillStyle = yelGrad; yelCtx.fillRect(0, 0, 8, 256);
    const YELMAT = applyWorldBend(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(yelCv) }));

    const torso = new THREE.Group();
    torso.position.y = 0.55;
    g.add(torso);

    // 圆顶头 + 梨形鼓肚 连续轮廓
    const pts = [
      [0.0, 0.0], [0.28, 0.02], [0.42, 0.10], [0.52, 0.30], [0.56, 0.55],
      [0.52, 0.80], [0.44, 1.00], [0.36, 1.08], [0.34, 1.16], [0.33, 1.30],
      [0.28, 1.42], [0.18, 1.50], [0.06, 1.54], [0.0, 1.55],
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const body = mesh(new THREE.LatheGeometry(pts, 48), YELMAT);
    torso.add(body);

    // 奶白大肚皮（正面大椭圆）
    const belly = mesh(sph(0.5, 28, 22), P(CREAM, 18), 0, 0.55, -0.40);
    belly.scale.set(0.9, 1.05, 0.42);
    torso.add(belly);

    // 绿眼大黑瞳（头部正面，两眼较近）
    for (const s of [-1, 1]) {
      torso.add(mesh(sph(0.12, 20, 16), P(GREEN, 50), s * 0.13, 1.30, -0.28));
      const pup = mesh(sph(0.085, 16, 12), applyWorldBend(new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 90, specular: 0x999999 })), s * 0.13, 1.30, -0.375, false);
      torso.add(pup);
    }
    // 细微笑嘴
    const smile = mesh(new THREE.TorusGeometry(0.08, 0.016, 8, 24, Math.PI * 0.8), P(INKC, 10), 0, 1.18, -0.42, false);
    smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.8) / 2;
    torso.add(smile);

    // 短臂 + 炭灰手贴在肚侧（肩部枢轴）
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.48, 0.95, 0);
      arm.add(mesh(cyl(0.07, 0.08, 0.32, 10), YELMAT, 0, -0.15, -0.03));
      arm.add(mesh(sph(0.13, 14, 12), P(BLACK, 30), 0, -0.34, -0.14));
      arm.rotation.z = s * 0.1;
      torso.add(arm); arms.push(arm);
    }

    // 锥形长腿 + 圆脚（髋部枢轴）
    const legs = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(s * 0.20, 0.55, 0);
      leg.add(mesh(cyl(0.12, 0.16, 0.45, 12), YELMAT, 0, -0.22, 0));
      const foot = mesh(sph(0.155, 14, 12), P(BLACK, 30), 0, -0.50, -0.05);
      foot.scale.set(1, 0.5, 1.4);
      leg.add(foot);
      g.add(leg); legs.push(leg);
    }

    // 奶蛋（滑铲时蜷缩成蛋向前翻滚）
    const eggG = new THREE.Group();
    eggG.position.y = 0.55;
    const shell = sph(0.55, 32, 24);
    const points = shell.attributes.position;
    const colors = new Float32Array(points.count * 3);
    const honey = new THREE.Color(0xf1ad42), yellow = new THREE.Color(0xffdb69);
    const cream = new THREE.Color(0xffebc1), color = new THREE.Color();
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
      const belly = (x / 0.37) ** 2 + ((y + 0.07) / 0.39) ** 2;
      const patch = z < 0 ? 1 - THREE.MathUtils.smoothstep(belly, 0.78, 1.04) : 0;
      color.copy(honey).lerp(yellow, (y + 0.55) / 1.1).lerp(cream, patch);
      color.toArray(colors, i * 3);
    }
    shell.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    eggG.add(mesh(shell, applyWorldBend(new THREE.MeshBasicMaterial({ vertexColors: true })), 0, 0, 0));
    eggG.visible = false;
    g.add(eggG);

    // 屁股/背部卡通火箭推进器 + 动态尾焰（拾取火箭道具后显示，贴合 GLB 背部轮廓 z≈+0.64）
    const aura = new THREE.Group();
    aura.position.set(0, 0.78, 0.66);
    const rocketPivot = new THREE.Group();
    rocketPivot.rotation.x = -0.32; // 略微朝后下方倾斜喷射
    const rCol = hex => ({ color: new THREE.Color(hex) });
    const rocketParts = [
      mesh(cyl(0.15, 0.18, 0.56, 12), rCol(0xff523b), 0, 0, 0, false),          // 红箭身
      mesh(cyl(0.01, 0.15, 0.24, 12), rCol(0xffd447), 0, 0.40, 0, false),       // 金尖头
      mesh(cyl(0.165, 0.175, 0.09, 12), rCol(0xfff4d6), 0, 0.14, 0, false),     // 奶油环带
      mesh(cyl(0.11, 0.16, 0.14, 12), rCol(0x3a4652), 0, -0.34, 0, false),      // 金属喷口
      mesh(box(0.05, 0.26, 0.18), rCol(0xffcf3f), 0.18, -0.18, 0, false),       // 右尾翼
      mesh(box(0.05, 0.26, 0.18), rCol(0xffcf3f), -0.18, -0.18, 0, false),      // 左尾翼
      mesh(box(0.18, 0.26, 0.05), rCol(0xffcf3f), 0, -0.18, 0.18, false),       // 后尾翼
    ];
    const rocketBody = mergeStatic(rocketParts, applyWorldBend(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGrad() })), { vertexColors: true });
    for (const p of rocketParts) p.geometry.dispose();
    rocketPivot.add(rocketBody);
    const auraFlames = [];
    for (let i = 0; i < 3; i++) {
      const flame = mesh(cyl(0.015, 0.18 - i * 0.04, 0.48 + i * 0.14, 10),
        Basic([0xff5c3f, 0xffb03f, 0xfff066][i]), 0, -(0.62 + i * 0.22), 0, false);
      flame.rotation.x = Math.PI;
      rocketPivot.add(flame);
      auraFlames.push(flame);
    }
    aura.add(rocketPivot);
    aura.visible = false;
    g.add(aura);
    // 空中翻转枢轴：绕身体中心旋转，避免绕脚底翻转时穿进地面
    const spin = new THREE.Group();
    spin.position.y = 1.0;
    for (const ch of [...g.children]) { ch.position.y -= 1.0; spin.add(ch); }
    g.add(spin);

    const fallbackCosmetics = naiwaCosmetics(false);
    torso.add(fallbackCosmetics.headMount, fallbackCosmetics.chestMount);

    g.userData = { body, belly, arms, legs, torso, egg: eggG, aura, auraFlames, spin, fallbackCosmetics };
    return g;
  }

  let passBadgeTex = null;
  function getPassBadgeTexture() {
    if (passBadgeTex) return passBadgeTex;
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d');
    const bg = c.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, '#ffe885');
    bg.addColorStop(0.5, '#f5b82e');
    bg.addColorStop(1, '#c97f12');
    c.fillStyle = bg;
    c.fillRect(0, 0, 256, 256);

    c.lineWidth = 14;
    c.strokeStyle = '#5c2d0c';
    c.strokeRect(14, 14, 228, 228);

    c.fillStyle = '#9e2323';
    c.fillRect(28, 28, 200, 200);

    c.lineWidth = 6;
    c.strokeStyle = '#ffd95e';
    c.strokeRect(38, 38, 180, 180);

    c.fillStyle = '#ffe999';
    c.font = 'bold 42px "ZCOOL KuaiLe","Microsoft YaHei",sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('免交', 128, 96);
    c.fillText('作业', 128, 148);

    c.fillStyle = '#ffd447';
    c.font = 'bold 22px "Microsoft YaHei",sans-serif';
    c.fillText('★ 特权金牌 ★', 128, 198);

    passBadgeTex = new THREE.CanvasTexture(cv);
    passBadgeTex.anisotropy = 4;
    return passBadgeTex;
  }

  /* ---------- 商店 3D 潮酷装扮模型（街溜子墨镜 / 遥遥领先小皇冠 / 免交作业金牌） ---------- */
  function naiwaCosmetics(forRig = true) {
    const grad = toonGrad();
    const goldMat = applyWorldBend(new THREE.MeshToonMaterial({ color: 0xffcf38, emissive: 0x332100, gradientMap: grad }));
    const brightGoldMat = applyWorldBend(new THREE.MeshToonMaterial({ color: 0xffe878, emissive: 0x3a2800, gradientMap: grad }));
    const darkFrameMat = applyWorldBend(new THREE.MeshToonMaterial({ color: 0x1a1e24, emissive: 0x080a0d, gradientMap: grad }));
    const lensMat = applyWorldBend(new THREE.MeshPhongMaterial({ color: 0x0d121a, shininess: 120, specular: 0xffffff }));
    const glintMat = Basic(0xa8f0ff);
    const rubyMat = applyWorldBend(new THREE.MeshPhongMaterial({ color: 0xff2e55, emissive: 0x380612, shininess: 100, specular: 0xffffff }));
    const emeraldMat = applyWorldBend(new THREE.MeshPhongMaterial({ color: 0x2ee89c, emissive: 0x053320, shininess: 100, specular: 0xffffff }));
    const sapphireMat = applyWorldBend(new THREE.MeshPhongMaterial({ color: 0x38b6ff, emissive: 0x062338, shininess: 100, specular: 0xffffff }));
    const velvetMat = applyWorldBend(new THREE.MeshToonMaterial({ color: 0xc92a3d, emissive: 0x26050a, gradientMap: grad }));

    const headMount = new THREE.Group();
    const chestMount = new THREE.Group();

    if (forRig) {
      // Head / Chest 骨骼在 Pelvis (-90° X) 下，绕 X 转 +90° 后恢复标准 (+X右, +Y上, +Z面朝前)
      headMount.rotation.x = Math.PI / 2;
      chestMount.rotation.x = Math.PI / 2;
    } else {
      // 备用程序化模型朝向 -Z，缩放约 0.64
      headMount.position.set(0, 0.98, 0);
      headMount.rotation.y = Math.PI;
      headMount.scale.setScalar(0.64);
      chestMount.position.set(0, 0.56, 0);
      chestMount.rotation.y = Math.PI;
      chestMount.scale.setScalar(0.64);
    }

    // 1. 🕶️ 街溜子墨镜
    const glasses = new THREE.Group();
    glasses.position.set(0, 0.485, 0.555);
    // 金色顶梁与鼻托横梁
    glasses.add(mesh(box(0.76, 0.042, 0.045), goldMat, 0, 0.095, 0.02, false));
    glasses.add(mesh(box(0.14, 0.036, 0.042), goldMat, 0, 0.02, 0.025, false));
    for (const s of [-1, 1]) {
      const lx = s * 0.21;
      // 粗黑镜框 + 金色边角铆钉
      glasses.add(mesh(box(0.28, 0.19, 0.042), darkFrameMat, lx, 0, 0, false));
      glasses.add(mesh(box(0.235, 0.145, 0.048), lensMat, lx, 0, 0.006, false));
      glasses.add(mesh(box(0.045, 0.022, 0.05), goldMat, lx + s * 0.115, 0.062, 0.008, false));
      // 镜片斜向高光条
      const glint = mesh(box(0.035, 0.12, 0.052), glintMat, lx - s * 0.045, 0.005, 0.01, false);
      glint.rotation.z = -0.38;
      glasses.add(glint);
      // 两侧镜腿向耳后延伸
      const temple = mesh(box(0.034, 0.038, 0.38), darkFrameMat, s * 0.355, 0.035, -0.17, false);
      glasses.add(temple);
      glasses.add(mesh(box(0.038, 0.042, 0.12), goldMat, s * 0.355, 0.035, -0.02, false));
    }
    glasses.visible = false;
    headMount.add(glasses);

    // 2. 👑 遥遥领先小皇冠
    const crown = new THREE.Group();
    crown.position.set(0, 0.705, 0.195);
    crown.rotation.x = 0.08; // 微向前倾，正面和背面视角都饱满立体
    // 内衬红丝绒顶与纯金底座环
    const dome = mesh(sph(0.215, 16, 12), velvetMat, 0, 0.08, 0, false);
    dome.scale.set(1, 0.78, 1);
    crown.add(dome);
    crown.add(mesh(cyl(0.255, 0.225, 0.14, 16), goldMat, 0, 0.07, 0, false));
    const lowerRim = mesh(new THREE.TorusGeometry(0.23, 0.024, 8, 20), brightGoldMat, 0, 0.005, 0, false);
    lowerRim.rotation.x = Math.PI / 2;
    crown.add(lowerRim);
    const upperRim = mesh(new THREE.TorusGeometry(0.252, 0.02, 8, 20), brightGoldMat, 0, 0.135, 0, false);
    upperRim.rotation.x = Math.PI / 2;
    crown.add(upperRim);
    // 6 根皇冠金尖刺 + 顶珠 + 环绕宝石
    const spikes = 6;
    const gemMats = [rubyMat, emeraldMat, sapphireMat, rubyMat, emeraldMat, sapphireMat];
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      const sx = Math.sin(a), sz = Math.cos(a);
      const spike = mesh(cyl(0.008, 0.068, 0.17, 8), goldMat, sx * 0.24, 0.21, sz * 0.24, false);
      spike.rotation.x = sz * 0.14;
      spike.rotation.z = -sx * 0.14;
      crown.add(spike);
      crown.add(mesh(sph(0.036, 10, 8), brightGoldMat, sx * 0.258, 0.30, sz * 0.258, false));
      const gem = mesh(sph(0.036, 10, 8), gemMats[i], sx * 0.248, 0.072, sz * 0.248, false);
      gem.scale.set(1.1, 1.25, 0.65);
      crown.add(gem);
    }
    crown.visible = false;
    headMount.add(crown);

    // 3. 📘 免交作业金牌（背部大金牌 + 胸前金绶带徽章，首页正面与跑酷背面皆清晰可见）
    const pass = new THREE.Group();
    const badgeFaceMat = applyWorldBend(new THREE.MeshBasicMaterial({ map: getPassBadgeTexture() }));
    // 背部主金牌（跑酷时正对镜头）
    const backPlaque = new THREE.Group();
    backPlaque.position.set(0, 0.14, -0.69);
    backPlaque.add(mesh(box(0.56, 0.64, 0.06), goldMat, 0, 0, 0, false));
    backPlaque.add(mesh(box(0.62, 0.07, 0.08), brightGoldMat, 0, 0.31, 0, false));
    backPlaque.add(mesh(box(0.62, 0.07, 0.08), brightGoldMat, 0, -0.31, 0, false));
    const backFace = mesh(new THREE.PlaneGeometry(0.48, 0.54), badgeFaceMat, 0, 0, -0.034, false);
    backFace.rotation.y = Math.PI;
    backPlaque.add(backFace);
    // 顶部红金挂环与两侧飘带流苏
    const topRing = mesh(new THREE.TorusGeometry(0.075, 0.02, 8, 16), brightGoldMat, 0, 0.38, 0, false);
    backPlaque.add(topRing);
    for (const s of [-1, 1]) {
      const tassel = mesh(box(0.07, 0.26, 0.03), velvetMat, s * 0.24, -0.42, 0, false);
      tassel.rotation.z = s * 0.12;
      backPlaque.add(tassel);
      backPlaque.add(mesh(box(0.08, 0.05, 0.036), brightGoldMat, s * 0.255, -0.54, 0, false));
    }
    pass.add(backPlaque);

    // 胸前斜挎金红礼仪绶带 + 胸前特权小金牌（首页待机正面直视可见）
    const frontMedal = new THREE.Group();
    frontMedal.position.set(0, 0.26, 0.545);
    frontMedal.add(mesh(box(0.28, 0.32, 0.045), goldMat, 0, 0, 0, false));
    const frontFace = mesh(new THREE.PlaneGeometry(0.23, 0.26), badgeFaceMat, 0, 0, 0.025, false);
    frontMedal.add(frontFace);
    frontMedal.add(mesh(sph(0.032, 10, 8), rubyMat, 0, 0.16, 0.02, false));
    pass.add(frontMedal);

    pass.visible = false;
    chestMount.add(pass);

    return {
      headMount,
      chestMount,
      setSkins({ glasses: gOn = false, crown: cOn = false, pass: pOn = false } = {}) {
        glasses.visible = !!gOn;
        crown.visible = !!cOn;
        pass.visible = !!pOn;
      },
    };
  }

  /* ---------- 大众化热梗障碍 ---------- */
  const obstacleLooks = {
    alarm: ['Alarm', '跳过闹钟', '#8f352d', '#fff2d3', 1.84, 1.48],
    gang: ['Barrier', '跨过去', '#914c37', '#fff0cd', 1.41, 1.22],
    bing: ['OilGate', '滑过油饼', '#295c58', '#fff1ca', 1.75, 2.66],
    emo: ['EmoBoard', 'EMO', '#59456f', '#f8e4f3', 1.27, 2.55],
    phone: ['Phone', '低头族', '#294d59', '#e4f5ea', 1.48, 2.61],
  };

  function doubaoFallback() {
    const g = new THREE.Group();
    const skin = L(0xeab29b), coat = L(0x32404a), hair = L(0x4e3028);
    g.add(mesh(cyl(0.23, 0.36, 0.82, 12), coat, 0, 0.94, 0));
    g.add(mesh(sph(0.36, 16, 12), hair, 0, 1.76, -0.025));
    g.add(mesh(sph(0.30, 16, 12), skin, 0, 1.69, 0.10));
    g.add(mesh(cyl(0.239, 0.24, 0.11, 12), L(0xb4483b), 0, 1.34, 0.02));
    const arms = [];
    for (const side of [-1, 1]) {
      g.add(mesh(sph(0.042, 10, 8), Basic(0x30251f), side * 0.104, 1.718, 0.373, false));
      g.add(mesh(box(0.19, 0.61, 0.21), coat, side * 0.15, 0.405, -0.005));
      g.add(mesh(box(0.21, 0.139, 0.31), L(0xe2ddca), side * 0.15, 0.075, 0.054));
      const arm = new THREE.Group();
      arm.position.set(side * 0.26, 1.23, 0.01);
      arm.add(mesh(cyl(0.088, 0.076, 0.43, 10), coat, 0, -0.195, 0));
      arm.add(mesh(sph(0.076, 10, 8), skin, 0, -0.43, 0.019));
      arms.push(arm);
      g.add(arm);
    }
    g.userData.arms = arms;
    return g;
  }

  let alarmFaceMaterial, alarmStripeMaterial;
  function alarmObstacle() {
    if (!alarmFaceMaterial) {
      const dial = document.createElement('canvas');
      dial.width = dial.height = 192;
      const d = dial.getContext('2d');
      d.fillStyle = '#fff2d8';
      d.fillRect(0, 0, 192, 192);
      d.strokeStyle = '#462820';
      d.lineCap = 'round';
      for (let hour = 0; hour < 12; hour++) {
        const angle = hour * Math.PI / 6;
        const x = Math.sin(angle), y = -Math.cos(angle);
        const inner = hour % 3 === 0 ? 64 : 72;
        d.lineWidth = hour % 3 === 0 ? 6 : 3;
        d.beginPath();
        d.moveTo(96 + x * inner, 96 + y * inner);
        d.lineTo(96 + x * 82, 96 + y * 82);
        d.stroke();
      }
      d.lineWidth = 10;
      d.beginPath();
      d.moveTo(61, 116); d.lineTo(96, 96); d.lineTo(96, 46);
      d.stroke();
      d.fillStyle = '#d04838';
      d.beginPath();
      d.arc(96, 96, 8, 0, Math.PI * 2);
      d.fill();
      alarmFaceMaterial = applyWorldBend(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(dial) }));

      const stripes = document.createElement('canvas');
      stripes.width = 256; stripes.height = 64;
      const s = stripes.getContext('2d');
      s.fillStyle = '#ffcb51'; s.fillRect(0, 0, 256, 64);
      s.fillStyle = '#3c302a';
      for (let x = -36; x < 256; x += 52) {
        s.beginPath();
        s.moveTo(x, 64); s.lineTo(x + 31, 64);
        s.lineTo(x + 70, 0); s.lineTo(x + 39, 0);
        s.fill();
      }
      alarmStripeMaterial = applyWorldBend(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(stripes) }));
    }

    const g = new THREE.Group();
    const red = T(0xd74631), dark = T(0x493132), orange = T(0xf47746);
    g.add(mesh(box(1.72, 0.28, 0.52), red, 0, 0.245, 0));
    g.add(mesh(new THREE.PlaneGeometry(1.61, 0.206), alarmStripeMaterial, 0, 0.245, 0.262, false));
    for (const side of [-1, 1]) {
      g.add(mesh(box(0.29, 0.12, 0.68), dark, side * 0.65, 0.06, 0));
      const bell = mesh(sph(0.154, 14, 10), orange, side * 0.35, 0.985, 0);
      bell.scale.set(1.05, 0.67, 1.08); g.add(bell);
    }
    const body = mesh(cyl(0.431, 0.431, 0.31, 28), red, 0, 0.57, 0);
    body.rotation.x = Math.PI / 2; g.add(body);
    const rim = mesh(cyl(0.376, 0.376, 0.034, 28), dark, 0, 0.57, 0.158);
    rim.rotation.x = Math.PI / 2; g.add(rim);
    g.add(mesh(new THREE.CircleGeometry(0.342, 28), alarmFaceMaterial, 0, 0.57, 0.177, false));
    const warning = label('跳过闹钟', '#982d27', '#fff3d9', 1.89);
    warning.position.set(0, 1.42, 0.17);
    g.add(warning, makeContactShadow('rect', 2.25, 1.35, 0, 0.68));
    return g;
  }

  const obstacleShadowSpec = {
    alarm: ['rect', 2.25, 1.35, 0, 0.68],
    gang: ['rect', 1.95, 1.05, 0, 0.62],
    bing: ['rect', 2.55, 1.05, 0, 0.56],
    emo: ['rect', 1.85, 1.15, 0, 0.66],
    phone: ['rect', 1.95, 1.15, 0, 0.66],
    thanos: ['round', 1.95, 1.75, 0.05, 0.68],
  };

  let gauntletGlowTex = null, phoneHeartTex = null;
  function getGauntletGlowTexture() {
    if (gauntletGlowTex) return gauntletGlowTex;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,252,215,1)');
    g.addColorStop(0.28, 'rgba(255,204,78,0.85)');
    g.addColorStop(0.62, 'rgba(186,105,255,0.38)');
    g.addColorStop(1, 'rgba(186,105,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = 'rgba(255,248,210,0.9)';
    c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(32, 6); c.lineTo(32, 58); c.moveTo(6, 32); c.lineTo(58, 32); c.stroke();
    gauntletGlowTex = new THREE.CanvasTexture(cv);
    return gauntletGlowTex;
  }
  function getPhoneHeartTexture() {
    if (phoneHeartTex) return phoneHeartTex;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = '#ff5e96';
    c.beginPath();
    c.moveTo(32, 52);
    c.bezierCurveTo(10, 38, 8, 18, 22, 14);
    c.bezierCurveTo(28, 12, 32, 18, 32, 21);
    c.bezierCurveTo(32, 18, 36, 12, 42, 14);
    c.bezierCurveTo(56, 18, 54, 38, 32, 52);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.arc(23, 24, 4, 0, Math.PI * 2); c.fill();
    phoneHeartTex = new THREE.CanvasTexture(cv);
    return phoneHeartTex;
  }

  function obstacle(type) {
    const shSpec = obstacleShadowSpec[type] || obstacleShadowSpec.phone;
    const look = obstacleLooks[type];
    const painted = look && obstaclePart(look[0]);
    if (painted) {
      const g = new THREE.Group();
      const [, caption, bg, fg, width, y] = look;
      const sign = label(caption, bg, fg, width);
      sign.position.set(0, y, 0.22);
      g.add(painted, sign, makeContactShadow(...shSpec));
      if (type === 'phone') {
        const heart = new THREE.Sprite(applyWorldBend(new THREE.SpriteMaterial({
          map: getPhoneHeartTexture(), transparent: true, opacity: 0.9, depthWrite: false,
        })));
        heart.position.set(0.38, 1.55, 0.28);
        heart.scale.set(0.36, 0.36, 1);
        heart.userData.sharedAsset = true;
        g.add(heart);
        g.userData.phoneHeart = heart;
      }
      return g;
    }
    if (type === 'alarm') return alarmObstacle();
    const g = new THREE.Group();
    g.add(makeContactShadow(...shSpec));
    if (type === 'gang') {
      for (const s of [-1, 1]) g.add(mesh(box(0.1, 0.85, 0.1), T(0xc9c2d8), s * 0.5, 0.42, 0));
      for (let i = 0; i < 5; i++)
        g.add(mesh(box(0.22, 0.3, 0.12), T(i % 2 ? 0xfff6e3 : 0xffb03f), -0.44 + i * 0.22, 0.72, 0));
      const lb = label('杠精', '#fff0d9', '#a86a1f', 1.2); lb.position.set(0, 1.25, 0); g.add(lb);
    } else if (type === 'bing') {
      for (const s of [-1, 1]) g.add(mesh(box(0.12, 2.3, 0.12), T(0xc9a06a), s * 1.05, 1.15, 0));
      g.add(mesh(box(2.3, 0.14, 0.2), T(0xc9a06a), 0, 2.3, 0));
      g.add(mesh(cyl(0.02, 0.02, 0.5, 6), T(0x3a2b20), 0, 2.0, 0));
      const cake = mesh(cyl(0.55, 0.55, 0.18, 24), T(0xf2c14e), 0, 1.5, 0);
      cake.rotation.x = Math.PI / 2; g.add(cake);
      const lb = label('食不食油饼', '#f7e6c4', '#8a5a1a', 1.7); lb.position.set(0, 2.75, 0); g.add(lb);
    } else if (type === 'thanos') {
      if (thanosAsset) g.add(assetInstance(thanosAsset, true));
      else {
        const fallback = new THREE.Group();
        fallback.add(mesh(box(0.94, 0.98, 0.45), T(0x3b4067), 0, 0.89, 0));
        fallback.add(mesh(box(0.82, 0.21, 0.46), T(0xb88748), 0, 1.38, 0.02));
        fallback.add(mesh(sph(0.42, 16, 12), T(0xa06eb9), 0, 1.81, 0));
        fallback.add(mesh(sph(0.26, 14, 10), T(0xd8a657), 0.63, 1.28, 0.21));
        g.add(fallback);
      }
      const lb = label('灭霸', '#eadcfa', '#462f68', 1.23);
      lb.position.set(0, 2.48, 0.12);
      const glow = new THREE.Sprite(applyWorldBend(new THREE.SpriteMaterial({
        map: getGauntletGlowTexture(), transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })));
      glow.position.set(0.65, 1.36, 0.54);
      glow.scale.set(0.75, 0.75, 1);
      glow.userData.sharedAsset = true;
      g.add(lb, glow);
      g.userData.gauntletGlow = glow;
    } else if (type === 'emo') {
      g.add(mesh(box(1.2, 2.2, 0.3), T(0x4a3b6b), 0, 1.1, 0));
      g.add(mesh(box(1.28, 2.28, 0.06), T(0x6b5a94), 0, 1.1, 0.13, false));
      for (const s of [-1, 1]) g.add(mesh(sph(0.07, 10, 8), Basic(0xb8a8e0), s * 0.25, 1.5, 0.19, false));
      for (const s of [-1, 1]) g.add(mesh(box(0.06, 0.26, 0.04), Basic(0x8fc7ff), s * 0.25, 1.24, 0.19, false)); // 眼泪
      const frown = mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 16, Math.PI * 0.7), Basic(0xb8a8e0), 0, 1.05, 0.19, false);
      frown.rotation.z = Math.PI * 0.15; g.add(frown);
      const lb = label('EMO', '#e6e0f2', '#4a3b6b', 1.3); lb.position.set(0, 2.6, 0); g.add(lb);
    } else {
      // 低头族手机墙（正面对着玩家：机身+刘海+短视频界面+弹幕+飘心，稍微歪一点像正被人刷）
      g.add(mesh(box(1.5, 2.3, 0.22), T(0x2b3038), 0, 1.15, 0));
      g.add(mesh(box(1.54, 0.1, 0.24), T(0x161a20), 0, 2.3, 0, false));
      g.add(mesh(box(1.34, 2.1, 0.06), Basic(0x14233c), 0, 1.18, 0.13));
      g.add(mesh(box(1.24, 1.96, 0.04), Basic(0x3b6fb0), 0, 1.2, 0.15));
      // 刘海 + 前置摄像头
      g.add(mesh(box(0.42, 0.08, 0.06), T(0x14181f), 0, 2.26, 0.15, false));
      g.add(mesh(sph(0.035, 8, 6), Basic(0x35506e), 0.22, 2.26, 0.15, false));
      // 播放键（深色圆底 + 大三角）
      const playBg = mesh(cyl(0.34, 0.34, 0.03, 22), Basic(0x0c1626), 0, 1.6, 0.17, false);
      playBg.rotation.x = Math.PI / 2; g.add(playBg);
      const tri = mesh(cyl(0.0, 0.26, 0.05, 3), Basic(0xffffff), 0, 1.6, 0.2, false);
      tri.rotation.z = -Math.PI / 2; tri.rotation.y = Math.PI / 2; g.add(tri);
      // 右侧点赞/评论图标
      for (const [yy, cc] of [[1.6, 0xff6b9d], [1.15, 0xffd93f], [0.75, 0x7ed957]]) {
        g.add(mesh(box(0.16, 0.16, 0.04), Basic(cc), 0.5, yy, 0.18, false));
      }
      // 弹幕条
      g.add(mesh(box(0.62, 0.1, 0.04), Basic(0xffffff), -0.2, 1.05, 0.18, false));
      g.add(mesh(box(0.5, 0.1, 0.04), Basic(0x7ed957), 0.08, 0.86, 0.18, false));
      // 底部进度条
      g.add(mesh(box(1.18, 0.04, 0.03), Basic(0x3a3f48), 0, 0.36, 0.17, false));
      g.add(mesh(box(0.6, 0.04, 0.04), Basic(0xff5c5c), -0.29, 0.36, 0.18, false));
      // 飘心
      g.add(mesh(sph(0.1, 10, 8), Basic(0xff6b9d), -0.45, 1.95, 0.18, false));
      g.add(mesh(sph(0.08, 10, 8), Basic(0xff9fcf), 0.42, 2.05, 0.18, false));
      const lb = label('低头族', '#e6f4ea', '#2e7d5b', 1.5); lb.position.set(0, 2.7, 0); g.add(lb);
      g.rotation.y = 0.08; g.rotation.x = -0.03;
    }
    return g;
  }

  /* ---------- 奶币 / 道具 ---------- */
  let coinProto = null;
  function milkBottleTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d');
    // 上半瓶肩淡蓝透明感 + 下半饱满奶白液面，拉高层次与辨识度
    const glass = c.createLinearGradient(0, 0, 0, 68);
    glass.addColorStop(0, '#cdeaff');
    glass.addColorStop(1, '#eaf7ff');
    c.fillStyle = glass;
    c.fillRect(0, 0, 256, 68);

    const milk = c.createLinearGradient(0, 68, 0, 256);
    milk.addColorStop(0, '#ffffff');
    milk.addColorStop(0.78, '#fffaf0');
    milk.addColorStop(1, '#ede3d1');
    c.fillStyle = milk;
    c.fillRect(0, 68, 256, 188);

    // 清晰液面分界线
    c.fillStyle = '#7ec8f2';
    c.fillRect(0, 65, 256, 5);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(0, 70, 256, 4);

    // 底部柔和底边线
    c.fillStyle = '#d6c8b2';
    c.fillRect(0, 238, 256, 18);

    // 两组对称刻度线（瓶身旋转任意角度都清晰可见）
    for (const sx of [26, 154]) {
      c.fillStyle = '#244b73';
      c.fillRect(sx, 88, 3, 128);
      for (let i = 0; i <= 6; i++) {
        const y = 90 + i * 20;
        const long = i % 2 === 0;
        c.fillRect(sx + 3, y, long ? 18 : 10, long ? 4 : 3);
      }
      // 刻度旁的小亮蓝强调块
      c.fillStyle = '#ff5a96';
      c.fillRect(sx + 24, 129, 8, 6);
      c.fillRect(sx + 24, 169, 8, 6);
    }

    // 两组对称奶滴徽标（暖金+天蓝高对比）
    for (const cx of [96, 224]) {
      c.beginPath();
      c.arc(cx, 152, 24, 0, Math.PI * 2);
      c.fillStyle = '#48b8f0';
      c.fill();
      c.lineWidth = 4;
      c.strokeStyle = '#244b73';
      c.stroke();

      // 徽标内白奶滴
      c.beginPath();
      c.moveTo(cx, 136);
      c.bezierCurveTo(cx + 12, 150, cx + 11, 164, cx, 165);
      c.bezierCurveTo(cx - 11, 164, cx - 12, 150, cx, 136);
      c.fillStyle = '#fffef9';
      c.fill();

      // 顶部小金星点缀
      c.beginPath();
      c.arc(cx + 14, 136, 4.5, 0, Math.PI * 2);
      c.fillStyle = '#ffd447';
      c.fill();
    }

    // 玻璃竖向高光条
    for (const hx of [62, 190]) {
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.fillRect(hx, 18, 9, 212);
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  function coin() {
    // 精细高对比度小奶瓶：收腰瓶身 + 液位与刻度贴图 + 草莓粉螺旋盖 + 暖金奶嘴 + 卡通描边轮廓
    // 共享同一份几何/材质，跑图时只复制节点，避免每个奶币都新建材质触发着色器重编。
    if (!coinProto) {
      coinProto = new THREE.Group();
      const grad = toonGrad();

      // 1. 圆润收腰瓶身
      const bodyPts = [
        [0.001, -0.32], [0.16, -0.32], [0.225, -0.27], [0.245, -0.15],
        [0.215, 0.01], [0.23, 0.14], [0.195, 0.21], [0.145, 0.26], [0.001, 0.26],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const bodyMat = applyWorldBend(new THREE.MeshToonMaterial({
        map: milkBottleTexture(), color: 0xffffff, emissive: 0x24221e, gradientMap: grad,
      }));
      coinProto.add(mesh(new THREE.LatheGeometry(bodyPts, 12), bodyMat, 0, 0, 0, false));

      // 2 & 3. 草莓粉螺旋瓶盖 + 白色锁边环 + 暖金硅胶奶嘴头，合并为 1 个顶点色网格降低 draw call
      const collarMat = { color: new THREE.Color(0xff4b8b) };
      const rimMat = { color: new THREE.Color(0xfff8ea) };
      const nippleMat = { color: new THREE.Color(0xffcf56) };
      const torusPart = mesh(new THREE.TorusGeometry(0.166, 0.018, 6, 12), collarMat, 0, 0.348, 0, false);
      torusPart.rotation.x = Math.PI / 2;
      const nipplePts = [
        [0.112, 0.352], [0.102, 0.382], [0.052, 0.422], [0.048, 0.448],
        [0.068, 0.476], [0.056, 0.502], [0.001, 0.514],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const topParts = [
        mesh(cyl(0.168, 0.168, 0.032, 12), rimMat, 0, 0.258, 0, false),
        mesh(cyl(0.162, 0.172, 0.092, 12), collarMat, 0, 0.312, 0, false),
        torusPart,
        mesh(new THREE.LatheGeometry(nipplePts, 10), nippleMat, 0, 0, 0, false),
      ];
      const topMat = applyWorldBend(new THREE.MeshToonMaterial({ vertexColors: true, emissive: 0x221210, gradientMap: grad }));
      coinProto.add(mergeStatic(topParts, topMat, { vertexColors: true }));
      for (const p of topParts) p.geometry.dispose();

      // 4. 整瓶深棕卡通描边壳（BackSide），确保在沥青路面、黄色斜坡和远雾中对比度清晰
      const outlinePts = [
        [0.001, -0.348], [0.178, -0.346], [0.252, -0.285], [0.273, -0.15],
        [0.243, 0.01], [0.258, 0.145], [0.222, 0.22], [0.196, 0.26],
        [0.198, 0.358], [0.140, 0.384], [0.088, 0.44], [0.095, 0.486],
        [0.068, 0.528], [0.001, 0.542],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const outlineMat = applyWorldBend(new THREE.MeshBasicMaterial({ color: 0x33241a, side: THREE.BackSide }));
      coinProto.add(mesh(new THREE.LatheGeometry(outlinePts, 12), outlineMat, 0, 0, 0, false));

      coinProto.rotation.z = -0.32;
      coinProto.traverse(n => { n.userData.sharedAsset = true; }); // 共享几何/材质，回收时不 dispose
    }
    return coinProto.clone(true);
  }

  // 空中高价值收集物：金装婴儿奶粉罐（仅 2 次 draw call：贴图罐体 + 深色描边）
  let powderProto = null;
  function milkPowderTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d');
    // 顶部亮蓝塑料盖（v 接近 1 -> canvas y 靠上）
    const lid = c.createLinearGradient(0, 0, 0, 52);
    lid.addColorStop(0, '#4ec4ff');
    lid.addColorStop(0.55, '#1d8ee0');
    lid.addColorStop(1, '#176fb5');
    c.fillStyle = lid;
    c.fillRect(0, 0, 256, 52);
    // 上下银白金属卷边
    c.fillStyle = '#edf4f8'; c.fillRect(0, 52, 256, 14);
    c.fillStyle = '#334d63'; c.fillRect(0, 64, 256, 4);
    // 暖金罐身标签（在蓝天白云背景下对比度极强）
    const gold = c.createLinearGradient(0, 68, 0, 224);
    gold.addColorStop(0, '#ffe169');
    gold.addColorStop(0.5, '#ffbe33');
    gold.addColorStop(1, '#f0932b');
    c.fillStyle = gold;
    c.fillRect(0, 68, 256, 156);
    // 顶部/底部海军蓝+暖红装饰腰带
    c.fillStyle = '#1f4e7a'; c.fillRect(0, 68, 256, 12);
    c.fillStyle = '#e84a5f'; c.fillRect(0, 80, 256, 6);
    c.fillStyle = '#1f4e7a'; c.fillRect(0, 210, 256, 14);
    c.fillStyle = '#fff7e0'; c.fillRect(0, 102, 256, 90);
    // 底部金属边
    c.fillStyle = '#334d63'; c.fillRect(0, 224, 256, 4);
    c.fillStyle = '#dfe9ef'; c.fillRect(0, 228, 256, 28);

    // 双面对称深蓝圆徽标 + 醒目「奶粉」与「+5」
    for (const cx of [64, 192]) {
      c.beginPath();
      c.arc(cx, 147, 41, 0, Math.PI * 2);
      c.fillStyle = '#1d4f7c';
      c.fill();
      c.lineWidth = 5;
      c.strokeStyle = '#ffbe33';
      c.stroke();

      c.font = 'bold 34px "Microsoft YaHei","PingFang SC",sans-serif';
      c.fillStyle = '#fff9e6';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('奶粉', cx, 138, 72);

      c.font = 'bold 20px "Microsoft YaHei",sans-serif';
      c.fillStyle = '#ffd94a';
      c.fillText('+5', cx, 169);
    }
    // 两侧亮色金属高光条
    for (const hx of [120, 248]) {
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fillRect(hx, 68, 8, 156);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  function milkPowder() {
    if (!powderProto) {
      powderProto = new THREE.Group();
      const grad = toonGrad();
      // 经典圆铁罐轮廓（带底座卷边 + 罐身 + 上沿卡扣 + 凸起塑料盖）
      const canPts = [
        [0.001, -0.32], [0.30, -0.32], [0.35, -0.29], [0.335, -0.24],
        [0.335, 0.20], [0.36, 0.23], [0.365, 0.30], [0.34, 0.33], [0.001, 0.33],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const canMat = applyWorldBend(new THREE.MeshToonMaterial({
        map: milkPowderTexture(), color: 0xffffff, emissive: 0x262014, gradientMap: grad,
      }));
      powderProto.add(mesh(new THREE.LatheGeometry(canPts, 14), canMat, 0, 0, 0, false));

      // 深棕卡通描边，确保在蓝天白云中轮廓鲜明
      const outPts = [
        [0.001, -0.352], [0.325, -0.350], [0.382, -0.305], [0.368, -0.24],
        [0.368, 0.20], [0.392, 0.23], [0.396, 0.315], [0.362, 0.362], [0.001, 0.366],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const outMat = applyWorldBend(new THREE.MeshBasicMaterial({ color: 0x33241a, side: THREE.BackSide }));
      powderProto.add(mesh(new THREE.LatheGeometry(outPts, 14), outMat, 0, 0, 0, false));

      powderProto.rotation.z = -0.18;
      powderProto.traverse(n => { n.userData.sharedAsset = true; });
    }
    return powderProto.clone(true);
  }

  const beaconTextures = {};
  const beaconFloor = new THREE.PlaneGeometry(1.5, 1.5);
  function pickupBeacon(color) {
    if (!beaconTextures.beam) {
      const beamCanvas = document.createElement('canvas');
      beamCanvas.width = 64; beamCanvas.height = 256;
      const beamCtx = beamCanvas.getContext('2d');
      const width = beamCtx.createLinearGradient(0, 0, 64, 0);
      for (const [stop, opacity] of [[0, 0], [0.17, 0.19], [0.31, 0.44], [0.44, 0.63], [0.50, 0.89],
        [0.56, 0.63], [0.69, 0.44], [0.83, 0.19], [1, 0]]) {
        width.addColorStop(stop, `rgba(255,255,255,${opacity})`);
      }
      beamCtx.fillStyle = width;
      beamCtx.fillRect(0, 0, 64, 256);
      const height = beamCtx.createLinearGradient(0, 0, 0, 256);
      height.addColorStop(0, 'transparent');
      height.addColorStop(0.17, 'rgba(255,255,255,0.55)');
      height.addColorStop(0.47, 'white');
      height.addColorStop(1, 'white');
      beamCtx.globalCompositeOperation = 'destination-in';
      beamCtx.fillStyle = height;
      beamCtx.fillRect(0, 0, 64, 256);
      beaconTextures.beam = new THREE.CanvasTexture(beamCanvas);

      const floorCanvas = document.createElement('canvas');
      floorCanvas.width = floorCanvas.height = 128;
      const ctx = floorCanvas.getContext('2d');
      const ring = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      for (const [stop, opacity] of [[0, 0.46], [0.36, 0.22], [0.62, 0.1], [0.72, 0.64], [0.8, 0.84], [0.91, 0.15], [1, 0]]) {
        ring.addColorStop(stop, `rgba(255,255,255,${opacity})`);
      }
      ctx.fillStyle = ring;
      ctx.fillRect(0, 0, 128, 128);
      beaconTextures.floor = new THREE.CanvasTexture(floorCanvas);
    }
    const marker = new THREE.Group();
    const beam = new THREE.Sprite(applyWorldBend(new THREE.SpriteMaterial({
      map: beaconTextures.beam, color, transparent: true, depthWrite: false, opacity: 0.88,
    })));
    beam.scale.set(0.96, 3.72, 1);
    beam.position.y = beam.scale.y / 2;
    const floor = new THREE.Mesh(beaconFloor, applyWorldBend(new THREE.MeshBasicMaterial({
      map: beaconTextures.floor, color, transparent: true, depthWrite: false,
    })));
    floor.rotation.x = -Math.PI / 2;
    marker.add(floor, beam);
    return marker;
  }

  function markPickup(group, color) {
    group.userData.beacon = pickupBeacon(color);
    group.add(group.userData.beacon);
  }

  let sheepProto = null;
  function yellowSheep() {
    if (!sheepProto) {
      const col = hex => ({ color: new THREE.Color(hex) });
      const woolA = col(0xffdc4d), woolB = col(0xffcd2e), woolC = col(0xffe97d);
      const faceCol = col(0xfff1c9), hornCol = col(0xd9922b), hoofCol = col(0x3a2b20);
      const eyeCol = col(0x231914), shineCol = col(0xffffff), noseCol = col(0xff8fab);
      const parts = [];
      // 蓬松黄色羊毛身体（多团圆润云朵）
      const puffs = [
        [0, 0.04, 0, 0.34, woolA],
        [-0.18, 0.08, -0.05, 0.24, woolB],
        [0.18, 0.08, -0.05, 0.24, woolB],
        [0, 0.16, -0.14, 0.25, woolC],
        [0, 0.10, 0.16, 0.24, woolC],
        [-0.14, -0.03, 0.10, 0.21, woolA],
        [0.14, -0.03, 0.10, 0.21, woolA],
        [0, 0.06, -0.34, 0.14, woolC], // 蓬松小尾巴
      ];
      for (const [x, y, z, r, m] of puffs) {
        parts.push(mesh(new THREE.IcosahedronGeometry(r, 1), m, x, y, z, false));
      }
      // 可爱圆脸 + 头顶黄色卷毛刘海
      const head = mesh(sph(0.21, 12, 10), faceCol, 0, 0.20, 0.34, false);
      head.scale.set(0.95, 0.92, 1.08);
      parts.push(head);
      parts.push(mesh(new THREE.IcosahedronGeometry(0.16, 1), woolC, 0, 0.35, 0.30, false));
      parts.push(mesh(new THREE.IcosahedronGeometry(0.11, 1), woolA, -0.10, 0.32, 0.34, false));
      parts.push(mesh(new THREE.IcosahedronGeometry(0.11, 1), woolA, 0.10, 0.32, 0.34, false));
      // 垂耳 + 小卷角 + 亮晶晶大眼 + 粉鼻头
      for (const s of [-1, 1]) {
        const ear = mesh(sph(0.095, 8, 6), woolB, s * 0.21, 0.21, 0.30, false);
        ear.scale.set(1.35, 0.55, 0.72);
        ear.rotation.z = -s * 0.45;
        parts.push(ear);
        const horn = mesh(new THREE.TorusGeometry(0.075, 0.028, 6, 10, Math.PI * 1.25), hornCol, s * 0.15, 0.34, 0.27, false);
        horn.rotation.set(0.25, s * 0.65, s * 0.35);
        parts.push(horn);
        parts.push(mesh(sph(0.038, 8, 6), eyeCol, s * 0.085, 0.22, 0.525, false));
        parts.push(mesh(sph(0.015, 6, 5), shineCol, s * 0.076, 0.234, 0.556, false));
      }
      parts.push(mesh(sph(0.032, 8, 6), noseCol, 0, 0.155, 0.555, false));
      // 四条短腿与深棕小羊蹄
      for (const lx of [-0.15, 0.15]) {
        for (const lz of [-0.15, 0.15]) {
          parts.push(mesh(cyl(0.055, 0.05, 0.22, 8), faceCol, lx, -0.24, lz, false));
          parts.push(mesh(cyl(0.054, 0.06, 0.08, 8), hoofCol, lx, -0.37, lz, false));
        }
      }
      const sheepMat = applyWorldBend(new THREE.MeshToonMaterial({ vertexColors: true, emissive: 0x261f08, gradientMap: toonGrad() }));
      sheepProto = mergeStatic(parts, sheepMat, { vertexColors: true });
      for (const p of parts) p.geometry.dispose();
      sheepProto.userData.sharedAsset = true;
    }
    return sheepProto.clone(false);
  }

  function power(kind) {
    const g = new THREE.Group();
    const conf = {
      shield: { color: 0xffe066, name: '相信光' },
      sprint: { color: 0xff7a3c, name: '奥利给' },
      magnet: { color: 0x5ec8f2, name: '磁吸小羊' },
    }[kind];

    if (kind === 'shield') {
      // 奶嘴护盾：金环 + 奶白底盘 + 粉色奶嘴头
      g.add(mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 24), T(0xffd93f), 0, 0, 0));
      g.add(mesh(cyl(0.26, 0.26, 0.08, 20), T(0xfff6e3), 0, 0, 0));
      g.add(mesh(sph(0.14, 14, 12), T(0xff7bac), 0, 0.22, 0));
    } else if (kind === 'sprint') {
      // 奥利给火箭：红箭身 + 黄尖头 + 尾翼 + 尾焰
      const r = new THREE.Group();
      r.add(mesh(cyl(0.16, 0.2, 0.6, 14), T(0xff5c3f), 0, 0, 0));
      r.add(mesh(cyl(0.0, 0.16, 0.3, 14), T(0xffd93f), 0, 0.45, 0));
      for (const s of [-1, 1]) r.add(mesh(box(0.06, 0.3, 0.22), T(0xffd93f), s * 0.2, -0.25, 0));
      r.add(mesh(cyl(0.12, 0.02, 0.3, 10), Basic(0xffb03f), 0, -0.45, 0));
      r.rotation.x = 0.5;
      g.add(r);
    } else {
      // 磁吸功能道具：可爱黄色小羊（合并为 1 个顶点色网格）
      const sheep = yellowSheep();
      sheep.position.y = 0.12;
      g.add(sheep);
    }

    markPickup(g, conf.color);
    const lb = label(conf.name, '#fff6e3', '#3a2b20', 1.1); lb.position.set(0, 0.95, 0); g.add(lb);
    return g;
  }

  /* ---------- 路面纹理（#2C3E50 柏油路） ---------- */
  function trackTexture() {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const c = cv.getContext('2d');
    const base = c.createLinearGradient(0, 0, 512, 0);
    for (const [stop, color] of [[0, '#233242'], [0.07, '#2c3e50'], [0.24, '#293a4b'],
      [0.5, '#2f4255'], [0.76, '#293a4b'], [0.93, '#2c3e50'], [1, '#233242']]) base.addColorStop(stop, color);
    c.fillStyle = base; c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8000; i++) {
      c.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(12,20,28,0.18)';
      c.fillRect(Math.random() * 512, Math.random() * 512, 1 + i % 2, 1);
    }
    // 三车道中间两条分割线：纯白虚线（1 贴图周期 = 10 米，每 5 米一段 2.65m 实线 + 2.35m 间隔）
    for (const lx of [-1.2, 1.2]) {
      const u = (lx + 3.8) / 7.6 * 512;
      c.fillStyle = 'rgba(248,246,240,0.88)';
      for (const y of [32, 288]) {
        c.fillRect(u - 3.5, y, 7, 136);
      }
    }
    for (const lx of [-3.55, 3.55]) {
      const u = (lx + 3.8) / 7.6 * 512;
      c.fillStyle = '#ebcb5c'; c.fillRect(u - 2.8, 0, 5.6, 512);
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(u + Math.sign(lx) * 11, 0, 2, 512);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  /* ---------- 货车（部分带斜坡，可跑上车顶；long = 加长版，车顶能跑更久） ---------- */
  function truck(withRamp, color = 0xf6c536, long = false) {
    const g = new THREE.Group();
    const { longHalf, shortHalf, roofHeight, roofWidth, cabLength, rampLength, rampWidth } = truckGeometry;
    const half = long ? longHalf : shortHalf, len = half * 2;
    const body = obstaclePart(long ? 'TruckLong' : 'TruckShort');
    if (body) {
      g.add(body);
    } else {
      // 底盘
      g.add(mesh(box(1.7, 0.35, len - 0.2), T(0x2a2f38), 0, 0.72, 0));
      // 货柜
      g.add(mesh(box(1.9, 1.6, len), T(color), 0, 1.4, 0));
      g.add(mesh(box(roofWidth, 0.12, len + 0.1), L(0xe3b12c), 0, roofHeight - 0.06, 0));
      // 车侧白色反光条
      for (const s of [-1, 1]) g.add(mesh(box(0.02, 0.22, len - 0.5), T(0xfff6e3), s * 0.96, 1.0, 0, false));
      // 车头（远端）
      g.add(mesh(box(1.9, 1.8, cabLength), T(0xe0a122), 0, roofHeight - 0.9, -(half + cabLength / 2)));
      g.add(mesh(box(1.7, 0.7, 0.1), Basic(0xbfe6ff), 0, 1.9, -(half + cabLength + 0.02)));
      for (const s of [-1, 1]) g.add(mesh(sph(0.14, 10, 8), Basic(0xfff2b0), s * 0.7, 0.72, -(half + cabLength + 0.06), false));
      // 车轮
      const wheelZs = long ? [-half + 0.8, -half / 3, half / 3, half - 0.8] : [-2.6, -1.2, 1.6];
      for (const zx of wheelZs) for (const s of [-1, 1]) {
        const w = mesh(cyl(0.42, 0.42, 0.3, 14), T(0x22262e), s * 1.0, 0.42, zx);
        w.rotation.z = Math.PI / 2; g.add(w);
    }
    // 车尾（+z 近端）：双开门 + 把手 + 尾灯 + 保险杠
    g.add(mesh(box(1.78, 1.42, 0.06), T(0xe9e4da), 0, 1.38, half + 0.01, false));
    g.add(mesh(box(0.05, 1.42, 0.03), T(0x9a958c), 0, 1.38, half + 0.05, false));
    for (const s of [-1, 1]) {
      g.add(mesh(box(0.18, 0.12, 0.03), T(0x8a3a3a), s * 0.6, 0.78, half + 0.05, false));
      g.add(mesh(box(0.06, 0.24, 0.05), T(0x6a6a72), s * 0.12, 1.3, half + 0.05, false));
    }
    g.add(mesh(box(1.82, 0.16, 0.12), T(0x2a2f38), 0, 0.5, half + 0.06, false));
    }
    // 车顶标语（靠车头一侧，跑车顶时不挡视线）
    const lb = label(long ? '奶娃物流 · 加长' : '奶娃物流', '#fff6e3', '#3a2b20', 1.9);
    lb.position.set(0, 2.95, -(half - 0.8)); g.add(lb);
    g.userData.sign = lb;
    // 车底接触阴影（低成本增强货车在沥青路面上的重量感）
    g.add(makeContactShadow('rect', 2.68, len + cabLength + 0.65, -cabLength * 0.5, 0.78));
    if (withRamp) {
      const paintedRamp = obstaclePart('TruckRamp');
      if (paintedRamp) {
        paintedRamp.position.z = half;
        g.add(paintedRamp);
      } else {
        // 斜坡：近端（+z，玩家先碰到）地面 -> 车顶近缘
        const angle = Math.atan2(roofHeight, rampLength);
        const rampLen = Math.hypot(rampLength, roofHeight);
        const ramp = mesh(box(rampWidth, 0.12, rampLen), T(0xffd93f), 0,
          roofHeight / 2 - 0.06 * Math.cos(angle), half + rampLength / 2 - 0.06 * Math.sin(angle));
        ramp.rotation.x = angle;
        for (const t of [-1.2, 0, 1.2]) ramp.add(mesh(box(rampWidth, 0.02, 0.3), T(0x2a2f38), 0, 0.07, t, false));
        g.add(ramp);
      }
      g.add(makeContactShadow('rect', rampWidth + 0.55, rampLength + 0.5, half + rampLength * 0.5, 0.52));
      const tip = label('斜坡↑', '#fff6d9', '#a8861f', 1.2); tip.position.set(0, 1.0, half + 2.8); g.add(tip);
      g.userData.rampSign = tip;
    }
    return g;
  }

  /* ---------- 5000米狂暴模式专属：迎面驶来的动态货车（车头朝向玩家 + 大灯光锥预警） ---------- */
  const beamGeo = new THREE.ConeGeometry(0.68, 4.6, 12, 1, true);
  function oncomingTruck(color = 0xf6c536) {
    const g = new THREE.Group();
    const { shortHalf, roofHeight, cabLength } = truckGeometry;
    const inner = new THREE.Group();
    inner.rotation.y = Math.PI; // 车头转向 +Z（迎面冲向玩家）
    const body = obstaclePart('TruckShort');
    if (body) {
      inner.add(body);
    } else {
      const len = shortHalf * 2;
      inner.add(mesh(box(1.7, 0.35, len - 0.2), T(0x2a2f38), 0, 0.72, 0));
      inner.add(mesh(box(1.9, 1.6, len), T(color), 0, 1.4, 0));
      inner.add(mesh(box(2.0, 0.12, len + 0.1), L(0xe3b12c), 0, roofHeight - 0.06, 0));
      inner.add(mesh(box(1.9, 1.8, cabLength), T(0xe0a122), 0, roofHeight - 0.9, -(shortHalf + cabLength / 2)));
      inner.add(mesh(box(1.7, 0.7, 0.1), Basic(0xbfe6ff), 0, 1.9, -(shortHalf + cabLength + 0.02)));
    }
    g.add(inner);

    // 迎面大灯高亮灯珠 + 向前扫射的暖黄光锥（位于世界 +Z 车头前方）
    const frontZ = shortHalf + cabLength + 0.05;
    const beamMat = applyWorldBend(new THREE.MeshBasicMaterial({
      color: 0xffe88a, transparent: true, opacity: 0.28,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    const orbs = [];
    for (const s of [-1, 1]) {
      const orb = mesh(sph(0.20, 10, 8), Basic(0xfff8c4), s * 0.68, 0.84, frontZ, false);
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(s * 0.68, 0.68, frontZ + 2.35);
      beam.rotation.x = -Math.PI / 2 + 0.08;
      beam.userData.sharedAsset = true;
      g.add(orb, beam);
      orbs.push(orb);
    }
    // 车顶红橙预警爆闪灯条
    const strobeMat = applyWorldBend(new THREE.MeshBasicMaterial({ color: 0xff4c3b }));
    const strobe = mesh(box(0.85, 0.18, 0.24), strobeMat, 0, roofHeight + 0.12, shortHalf + 0.55, false);
    g.add(strobe, makeContactShadow('rect', 2.68, shortHalf * 2 + cabLength + 0.65, cabLength * 0.5, 0.8));

    const lb = label('⚠️ 来车!', '#e83f35', '#fff8d6', 2.0);
    lb.position.set(0, 3.12, shortHalf + 0.55);
    g.add(lb);
    g.userData.sign = lb;
    g.userData.headlightMat = beamMat;
    g.userData.strobeMat = strobeMat;
    g.userData.headlightOrbs = orbs;
    return g;
  }

  function markTruckJump(truck, z, angle) {
    let marker = truck.userData.jumpMarker;
    if (!marker) {
      marker = new THREE.Group();
      const arrow = new THREE.Shape();
      arrow.moveTo(-0.16, -0.55); arrow.lineTo(0.16, -0.55);
      arrow.lineTo(0.16, 0.03); arrow.lineTo(0.40, 0.03);
      arrow.lineTo(0, 0.52); arrow.lineTo(-0.40, 0.03);
      arrow.lineTo(-0.16, 0.03); arrow.closePath();
      const shape = new THREE.ShapeGeometry(arrow);
      const outline = mesh(shape, Basic(0x2b1e16), 0, 0, 0, false);
      outline.scale.set(1.18, 1.16, 1);
      outline.rotation.x = -Math.PI / 2;
      const fill = mesh(shape, Basic(0xfffdf2), 0, 0.006, 0, false);
      fill.rotation.x = -Math.PI / 2;
      marker.add(outline, fill);
      truck.add(marker);
      truck.userData.jumpMarker = marker;
    }
    marker.position.set(0, truckGeometry.roofHeight + 0.018, z);
    marker.rotation.y = angle;
    marker.visible = true;
    truck.userData.sign.visible = false;
  }

  /* ---------- 场景组件 ---------- */
  const signGeometry = new THREE.PlaneGeometry(1, 1);
  const signMaterials = new Map();
  function streetSign(text, width, height, x, y, z) {
    if (!signMaterials.has(text)) {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 50px "Microsoft YaHei","PingFang SC",sans-serif';
      ctx.fillStyle = '#fff0d0';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#354a4f'; ctx.shadowBlur = 4;
      ctx.fillText(text, 128, 34, 232);
      const map = new THREE.CanvasTexture(canvas);
      map.anisotropy = 4;
      signMaterials.set(text, applyWorldBend(new THREE.MeshBasicMaterial({ map, alphaTest: 0.22 })));
    }
    const sign = mesh(signGeometry, signMaterials.get(text), x, y, z, false);
    sign.scale.set(width, height, 1);
    sign.userData.sharedAsset = true;
    return sign;
  }

  const facadeSigns = {
    CampusLibrary: [1.68, 0.33, 2.94, 2.631],
    AcademicHall: [1.48, 0.30, 1.89, 2.52],
    Dormitory: [1.51, 0.28, 2.01, 2.43],
    TeaCorner: [2.72, 0.44, 2.42, 2.282],
    MilkMarket: [2.84, 0.44, 2.42, 2.384],
    ParkPavilion: [2.35, 0.26, 2.81, 2.003],
  };
  // 建筑正面朝向马路（±90°）后，挂载于靠街立面的双面垂直悬挑招牌与庭院石砖裙边参数
  const bladeMounts = {
    CampusLibrary: { x: 1.38, y: 3.35, z: 2.56, theme: 'campus', apronW: 7.4, apronZ: 0.72, apronD: 5.9 },
    AcademicHall:  { x: 2.88, y: 3.22, z: 2.55, theme: 'campus', apronW: 7.0, apronZ: 0.72, apronD: 5.9 },
    Dormitory:     { x: 1.02, y: 3.36, z: 2.06, theme: 'campus', apronW: 6.7, apronZ: 0.60, apronD: 5.5 },
    TeaCorner:     { x: 2.55, y: 2.90, z: 2.18, theme: 'market', apronW: 6.6, apronZ: 0.68, apronD: 5.8 },
    MilkMarket:    { x: 2.88, y: 3.16, z: 2.28, theme: 'market', apronW: 7.2, apronZ: 0.70, apronD: 5.9 },
  };
  const bladeMaterials = new Map();
  const bladeFrameGeos = {};
  let bladeFacesGeo = null;
  const bladeFrameMat = applyWorldBend(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const apronMats = { campus: L(0xb8ad98), market: L(0xc3b49b) };
  const apronGeos = new Map();

  function bladeSign(text, x, y, z, theme) {
    const key = `${text}|${theme}`;
    if (!bladeMaterials.has(key)) {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 112;
      const ctx = cv.getContext('2d');
      const market = theme === 'market';
      ctx.fillStyle = market ? '#be5446' : '#254a4f';
      ctx.fillRect(0, 0, 256, 112);
      ctx.strokeStyle = market ? '#ffe29c' : '#efd49a';
      ctx.lineWidth = 7;
      ctx.strokeRect(7, 7, 242, 98);
      ctx.font = 'bold 46px "Microsoft YaHei","PingFang SC",sans-serif';
      ctx.fillStyle = '#fff7e0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(20, 32, 34, 0.55)';
      ctx.shadowBlur = 4;
      ctx.fillText(text, 128, 58, 214);
      const map = new THREE.CanvasTexture(cv);
      map.anisotropy = 4;
      bladeMaterials.set(key, applyWorldBend(new THREE.MeshBasicMaterial({ map })));
    }
    if (!bladeFrameGeos[theme]) {
      const ironCol = { color: new THREE.Color(0x2d434a) };
      const frameCol = { color: new THREE.Color(theme === 'market' ? 0x7c3d35 : 0x284349) };
      const parts = [
        mesh(box(0.045, 0.045, 0.16), ironCol, 0, 0.15, 0.04, false),
        mesh(box(0.045, 0.045, 0.16), ironCol, 0, -0.15, 0.04, false),
        mesh(box(0.08, 0.48, 1.00), frameCol, 0, 0, 0.54, false),
      ];
      bladeFrameGeos[theme] = mergeStatic(parts, bladeFrameMat, { vertexColors: true }).geometry;
      for (const p of parts) p.geometry.dispose();
    }
    if (!bladeFacesGeo) {
      const faceGeo = new THREE.PlaneGeometry(0.92, 0.40);
      const rightFace = mesh(faceGeo, null, 0.044, 0, 0.54, false);
      rightFace.rotation.y = Math.PI / 2;
      const leftFace = mesh(faceGeo, null, -0.044, 0, 0.54, false);
      leftFace.rotation.y = -Math.PI / 2;
      bladeFacesGeo = mergeStatic([rightFace, leftFace], null, { withUV: true }).geometry;
      faceGeo.dispose();
    }
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(
      mesh(bladeFrameGeos[theme], bladeFrameMat, 0, 0, 0, false),
      mesh(bladeFacesGeo, bladeMaterials.get(key), 0, 0, 0, false)
    );
    g.traverse(n => { n.userData.sharedAsset = true; });
    return g;
  }

  function forecourtApron(w, d, z, theme) {
    const key = `${w}|${d}`;
    if (!apronGeos.has(key)) apronGeos.set(key, box(w, 0.055, d));
    const slab = mesh(apronGeos.get(key), apronMats[theme] || apronMats.campus, 0, 0.028, z, false);
    slab.userData.sharedAsset = true;
    return slab;
  }

  function building(name, sign, color, w, h) {
    const asset = streetPart(name);
    if (asset) {
      const [width, height, y, z] = facadeSigns[name];
      const group = new THREE.Group();
      const frontSign = streetSign(sign, width, height, 0, y, z);
      // 保持 asset 位于 children[0]，确保 setStreetDetail 远近 LOD 正常切换；远景自动隐藏小招牌减负
      group.add(asset, frontSign);
      const farHide = [frontSign];
      const mount = bladeMounts[name];
      if (mount) {
        const blade = bladeSign(sign, mount.x, mount.y, mount.z, mount.theme);
        farHide.push(blade);
        group.add(blade, forecourtApron(mount.apronW, mount.apronD, mount.apronZ, mount.theme));
      }
      group.userData.farHide = farHide;
      return group;
    }
    const g = new THREE.Group();
    // 一张立面贴图代替几十扇独立窗户，细节更多但 draw call 更少
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 256;
    const c = cv.getContext('2d');
    c.scale(0.5, 0.5);
    c.fillStyle = '#' + color.toString(16).padStart(6, '0'); c.fillRect(0, 0, 256, 512);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 0, 18, 512);
    const rows = Math.max(3, Math.floor(h / 1.5));
    for (let r = 0; r < rows; r++) {
      const y = 20 + r * (400 / rows);
      c.fillStyle = 'rgba(70,55,80,.13)'; c.fillRect(0, y + 34, 256, 4);
      for (let col = 0; col < 4; col++) {
        const x = 25 + col * 57;
        c.fillStyle = 'rgba(255,246,227,.7)'; c.fillRect(x - 3, y - 3, 39, 40);
        c.fillStyle = Math.random() < 0.2 ? '#ffe6a3' : (Math.random() < 0.5 ? '#52647e' : '#39445e');
        c.fillRect(x, y, 33, 32);
        c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 4, y + 3, 4, 25);
      }
    }
    c.fillStyle = 'rgba(58,43,32,.12)'; c.fillRect(0, 430, 256, 82);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    g.add(mesh(box(w, h, w), applyWorldBend(new THREE.MeshLambertMaterial({ map: tex })), 0, h / 2, 0, false));
    // 屋檐、屋顶设备与水箱，打破所有楼都只有方盒子的轮廓
    g.add(mesh(box(w * 1.1, 0.28, w * 1.1), L(0x625570), 0, h + 0.14, 0, false));
    g.add(mesh(box(w * 0.42, 0.65, w * 0.38), L(0xe7e1d8), -w * 0.2, h + 0.58, 0, false));
    if (h > 10) {
      g.add(mesh(cyl(0.5, 0.5, 0.8, 12), L(0x7cb7c9), w * 0.22, h + 0.65, 0, false));
      g.add(mesh(cyl(0.025, 0.025, 1.8, 6), L(0x4a4a55), -w * 0.25, h + 1.45, 0, false));
    }
    // 底层商铺：玻璃门、双色雨棚和招牌
    const front = w / 2;
    g.add(mesh(box(w * 0.88, 1.7, 0.12), L(0x40506a), 0, 0.9, front + 0.05, false));
    for (const sx of [-0.23, 0.23]) {
      g.add(mesh(box(w * 0.36, 1.35, 0.04), P(0x9ed9df, 45), sx * w, 0.92, front + 0.13, false));
      g.add(mesh(box(0.05, 1.35, 0.05), L(0xfff6e3), sx * w, 0.92, front + 0.17, false));
    }
    const awning = new THREE.Group();
    for (let i = 0; i < 7; i++)
      awning.add(mesh(box(w * 0.14, 0.16, 0.75), L(i % 2 ? 0xfff6e3 : color), -w * 0.42 + i * w * 0.14, 0, 0, false));
    awning.position.set(0, 2.05, front + 0.36); awning.rotation.x = -0.12; g.add(awning);
    const lb = label(sign, '#fff6e3', '#3a2b20', Math.min(3.2, w * 0.95));
    lb.position.set(0, 2.75, front + 0.2); g.add(lb);
    return g;
  }

  let clockDialProto = null;
  function clockSideDials() {
    if (!clockDialProto) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#e5d4ac';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#615c4a';
      ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(64 + Math.sin(a) * 44, 64 - Math.cos(a) * 44);
        ctx.lineTo(64 + Math.sin(a) * 55, 64 - Math.cos(a) * 55);
        ctx.stroke();
      }
      ctx.strokeStyle = '#314951';
      ctx.lineCap = 'round';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(42, 74); ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(94, 42); ctx.stroke();
      ctx.fillStyle = '#c4a370';
      ctx.beginPath(); ctx.arc(64, 64, 6, 0, Math.PI * 2); ctx.fill();
      const map = new THREE.CanvasTexture(cv);
      map.anisotropy = 4;

      clockDialProto = new THREE.Group();
      const bronze = { color: new THREE.Color(0x866547) }, gold = { color: new THREE.Color(0xc4a370) };
      const faceMat = applyWorldBend(new THREE.MeshBasicMaterial({ map }));
      const outerGeo = cyl(0.84, 0.84, 0.12, 20);
      const bezelGeo = cyl(0.75, 0.75, 0.15, 20);
      const faceGeo = new THREE.CircleGeometry(0.67, 20);
      const ringParts = [], faceParts = [];
      for (const s of [-1, 1]) {
        const outer = mesh(outerGeo, bronze, s * 1.39, 6.63, 0, false);
        outer.rotation.z = Math.PI / 2;
        const bezel = mesh(bezelGeo, gold, s * 1.41, 6.63, 0, false);
        bezel.rotation.z = Math.PI / 2;
        const dial = mesh(faceGeo, faceMat, s * 1.495, 6.63, 0, false);
        dial.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
        ringParts.push(outer, bezel);
        faceParts.push(dial);
      }
      clockDialProto.add(
        mergeStatic(ringParts, applyWorldBend(new THREE.MeshLambertMaterial({ vertexColors: true })), { vertexColors: true }),
        mergeStatic(faceParts, faceMat, { withUV: true })
      );
      outerGeo.dispose(); bezelGeo.dispose(); faceGeo.dispose();
      clockDialProto.traverse(n => { n.userData.sharedAsset = true; });
    }
    return clockDialProto.clone(true);
  }

  let pondShimmerGeo = null, pondShimmerMat = null;
  function getPondShimmer() {
    if (!pondShimmerGeo) {
      pondShimmerGeo = new THREE.PlaneGeometry(8.5, 12.8, 6, 8);
      pondShimmerGeo.rotateX(-Math.PI / 2);
      pondShimmerMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: windTimeUniform,
          uWorldBend: worldBendUniform,
          uBendViewMat: bendViewMatUniform,
        },
        vertexShader: `
          uniform vec2 uWorldBend;
          uniform mat4 uBendViewMat;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 bendWorldPos = modelMatrix * vec4( position, 1.0 );
            float bendDist = max( 0.0, -bendWorldPos.z );
            float bendDist2 = bendDist * bendDist;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            mvPosition.xyz += ( uBendViewMat * vec4( uWorldBend.x * bendDist2, uWorldBend.y * bendDist2, 0.0, 0.0 ) ).xyz;
            gl_Position = projectionMatrix * mvPosition;
          }`,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float r = length( p );
            float mask = smoothstep( 0.96, 0.56, r );
            if ( mask <= 0.004 ) discard;
            float w1 = sin( p.x * 13.0 + uTime * 2.1 + sin( p.y * 9.0 - uTime * 1.4 ) );
            float w2 = cos( p.y * 16.0 - uTime * 2.5 + cos( p.x * 11.0 + uTime * 1.3 ) );
            float caustic = smoothstep( 0.42, 0.95, 0.5 + 0.5 * w1 * w2 );
            float glint = pow( max( 0.0, w1 * w2 ), 5.0 );
            vec3 col = mix( vec3( 0.68, 0.92, 0.88 ), vec3( 1.0, 0.98, 0.86 ), glint );
            float alpha = ( caustic * 0.24 + glint * 0.42 ) * mask;
            gl_FragColor = vec4( col, alpha );
          }`,
      });
    }
    const m = new THREE.Mesh(pondShimmerGeo, pondShimmerMat);
    m.position.y = 0.159;
    m.userData.sharedAsset = true;
    return m;
  }

  function landmark(name, text) {
    const group = new THREE.Group();
    const asset = streetPart(name);
    if (!asset) return group;
    group.add(asset);
    if (name === 'CampusClock') {
      group.add(
        streetSign(text, 2.24, 0.36, 0, 2.43, 1.78),
        clockSideDials(),
        forecourtApron(6.5, 1.4, 2.55, 'campus')
      );
    }
    if (name === 'MilkCourt') {
      group.add(
        streetSign(text, 3.0, 0.39, 0, 2.56, 1.78),
        forecourtApron(6.3, 1.4, 2.45, 'market')
      );
    }
    if (name === 'ParkPond') {
      group.add(getPondShimmer());
    }
    if (name === 'ParkPond' || name === 'ParkWalk') group.userData.sceneryTail = 8;
    return group;
  }

  const alleyProtos = {};
  function alleyFiller(zone = 0) {
    if (!alleyProtos[zone]) {
      const market = zone === 1;
      const parts = [];
      const col = hex => ({ color: new THREE.Color(hex) });
      const baseMat = col(market ? 0xc3b49b : 0xb8ad98);
      const wallMat = col(market ? 0xc89a82 : 0xc4b59c);
      const capMat = col(0xe3d5bc);
      parts.push(
        mesh(box(2.4, 0.055, 3.4), baseMat, 0, 0.028, 0.1, false),
        mesh(box(2.25, 1.15, 0.28), wallMat, 0, 0.60, -0.35, false),
        mesh(box(2.35, 0.12, 0.38), capMat, 0, 1.22, -0.35, false)
      );
      for (const sx of [-0.95, 0.95]) {
        parts.push(
          mesh(box(0.26, 1.38, 0.34), wallMat, sx, 0.70, -0.35, false),
          mesh(box(0.34, 0.10, 0.42), capMat, sx, 1.42, -0.35, false)
        );
      }
      const bushColors = [0x5e885d, 0x739967, 0x88a972];
      const lobes = [[-0.58, 0.48, 0.16, 0.44], [0, 0.56, 0.20, 0.52], [0.58, 0.46, 0.15, 0.42]];
      lobes.forEach(([x, y, z, r], i) => {
        const b = mesh(new THREE.IcosahedronGeometry(r, 1), col(bushColors[i]), x, y, z, false);
        b.scale.set(1.1, 0.78, 0.85);
        parts.push(b);
      });
      if (market) {
        const flowerMat = col(0xf2b59b);
        for (const [x, y, z] of [[-0.42, 0.76, 0.28], [0.12, 0.86, 0.36], [0.55, 0.74, 0.26]]) {
          parts.push(mesh(sph(0.09, 6, 4), flowerMat, x, y, z, false));
        }
      }
      // 合并为 1 个顶点色网格，每条窄巷仅占 1 次 draw call
      const merged = mergeStatic(parts, applyWorldBend(new THREE.MeshLambertMaterial({ vertexColors: true })), { vertexColors: true });
      for (const p of parts) p.geometry.dispose();
      merged.userData.sharedAsset = true;
      alleyProtos[zone] = merged;
    }
    return alleyProtos[zone].clone(false);
  }

  function backdropBuilding(name, color = 0xc9b8a0) {
    const farSource = streetKit.get(name + 'Far') || streetKit.get(name);
    if (farSource) return assetInstance(farSource, false);
    const g = new THREE.Group();
    g.add(mesh(box(6.2, 7.2, 4.2), L(color), 0, 3.6, 0, false));
    g.add(mesh(box(6.5, 0.3, 4.5), L(0x7c7478), 0, 7.35, 0, false));
    return g;
  }
  function tree(blossom = false) {
    const asset = streetPart(blossom ? 'BlossomTree' : 'PlaneTree');
    if (asset) {
      const group = new THREE.Group();
      const shadow = makeContactShadow('round', 3.7, 3.3, 0.2, 0.48, -0.015, 0.25);
      // 保持 asset 位于 children[0]，确保 setStreetDetail 远近 LOD 正常切换
      group.add(asset, shadow);
      group.userData.farHide = [shadow];
      group.userData.streetShadow = true;
      return group;
    }
    const g = new THREE.Group();
    g.add(mesh(cyl(0.12, 0.19, 1.7, 8), L(0x8a6248), 0, 0.85, 0, false));
    const colors = blossom ? [0xffb7d2, 0xffd1e2, 0xf49abc] : [0x54ad63, 0x72c768, 0x3e9657];
    const crowns = [[0, 2.15, 0, 0.9], [-0.48, 1.9, 0.08, 0.62], [0.5, 1.95, -0.08, 0.68]];
    crowns.forEach((p, i) => {
      const crown = mesh(new THREE.IcosahedronGeometry(p[3], 1), L(colors[i]), p[0], p[1], p[2], false);
      crown.rotation.set(i * 0.3, i * 0.7, 0); g.add(crown);
    });
    g.add(mesh(cyl(0.65, 0.72, 0.16, 12), L(0xd7c3a4), 0, 0.08, 0, false));
    g.add(makeContactShadow('round', 3.4, 3.0, 0.18, 0.44, -0.015, 0.2));
    return g;
  }
  function parkTree() {
    const asset = streetPart('ParkPoplar');
    if (!asset) return tree(false);
    const group = new THREE.Group();
    const shadow = makeContactShadow('round', 4.0, 3.6, 0.22, 0.44, 0.018, 0.28);
    group.add(asset, shadow);
    group.userData.farHide = [shadow];
    group.userData.streetShadow = true;
    return group;
  }
  function flowerBed() {
    const asset = streetPart('FlowerPlanter');
    if (asset) return asset;
    const g = new THREE.Group();
    g.add(mesh(box(1.8, 0.35, 0.85), L(0xe6c7a5), 0, 0.18, 0, false));
    g.add(mesh(box(1.62, 0.12, 0.68), L(0x59884c), 0, 0.39, 0, false));
    const colors = [0xff7bac, 0xffd93f, 0xffffff, 0xb793e8];
    for (let i = 0; i < 7; i++) {
      const x = -0.66 + i * 0.22, z = i % 2 ? 0.18 : -0.16;
      g.add(mesh(cyl(0.018, 0.018, 0.28, 5), L(0x3e8550), x, 0.54, z, false));
      g.add(mesh(new THREE.IcosahedronGeometry(0.11, 0), L(colors[i % colors.length]), x, 0.7, z, false));
    }
    return g;
  }
  function bench() {
    const asset = streetPart('CedarBench');
    if (asset) return asset;
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      g.add(mesh(box(0.1, 0.65, 0.55), L(0x465364), s * 0.72, 0.33, 0, false));
      g.add(mesh(box(0.1, 0.8, 0.1), L(0x465364), s * 0.72, 0.85, 0.24, false));
    }
    for (let i = 0; i < 3; i++) g.add(mesh(box(1.8, 0.1, 0.16), L(0xd99b62), 0, 0.63, -0.2 + i * 0.2, false));
    for (let i = 0; i < 3; i++) g.add(mesh(box(1.8, 0.16, 0.08), L(0xd99b62), 0, 0.9 + i * 0.2, 0.26, false));
    return g;
  }
  function busStop() {
    const asset = streetPart('BusShelter');
    if (asset) {
      const group = new THREE.Group();
      group.add(asset, streetSign('奶娃站', 1.23, 0.30, -0.88, 2.73, 0.516));
      return group;
    }
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(mesh(box(0.1, 2.5, 0.1), L(0x40506a), s * 1.55, 1.25, 0, false));
    g.add(mesh(box(3.5, 0.18, 1.55), L(0x5ec8f2), 0, 2.5, 0, false));
    const glass = applyWorldBend(new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.35, shininess: 80 }));
    g.add(mesh(box(3.1, 2.1, 0.05), glass, 0, 1.25, -0.58, false));
    const b = bench(); b.scale.setScalar(0.85); b.position.set(0, 0, -0.3); g.add(b);
    const lb = label('奶娃站', '#ffd93f', '#3a2b20', 1.45); lb.position.set(-0.85, 2.95, 0); g.add(lb);
    const route = label('早八路 · 666路', '#fff6e3', '#3a2b20', 1.35); route.position.set(0.75, 1.6, -0.48); g.add(route);
    return g;
  }
  function stall() {
    const asset = streetPart('MilkStall');
    if (asset) {
      const group = new THREE.Group();
      group.add(asset, streetSign('奶昔补给站', 1.64, 0.28, 0, 2.41, 0.909));
      return group;
    }
    const g = new THREE.Group();
    g.add(mesh(box(2.4, 1.65, 1.55), L(0xffe0a3), 0, 0.83, 0, false));
    g.add(mesh(box(2.0, 0.8, 0.06), P(0x9ed9df, 40), 0, 1.05, 0.8, false));
    for (let i = 0; i < 6; i++) g.add(mesh(box(0.42, 0.18, 1.85), L(i % 2 ? 0xfff6e3 : 0xff7bac), -1.05 + i * 0.42, 2.05, 0, false));
    const lb = label('奶昔补给站', '#fff6e3', '#3a2b20', 1.9); lb.position.set(0, 2.55, 0); g.add(lb);
    for (let i = 0; i < 3; i++) {
      g.add(mesh(cyl(0.11, 0.09, 0.3, 10), T([0xffb3c9, 0xb3e0ff, 0xffd93f][i]), -0.5 + i * 0.5, 1.72, 0.55, false));
    }
    return g;
  }
  let crosswalkProto = null;
  function crosswalk() {
    if (!crosswalkProto) {
      const paint = { color: new THREE.Color(0xefede4) };
      const stripeGeo = box(0.46, 0.014, 2.75);
      const stopGeo = box(6.8, 0.014, 0.20);
      const parts = [];
      for (let i = 0; i < 9; i++) {
        parts.push(mesh(stripeGeo, paint, -3.04 + i * 0.76, 0, 0, false));
      }
      // 斑马线前后配两条标准停车线，合并为 1 个几何体
      for (const sz of [-1.95, 1.95]) {
        parts.push(mesh(stopGeo, paint, 0, 0, sz, false));
      }
      crosswalkProto = mergeStatic(parts, applyWorldBend(new THREE.MeshBasicMaterial({ vertexColors: true })), { vertexColors: true });
      stripeGeo.dispose(); stopGeo.dispose();
      crosswalkProto.userData.sharedAsset = true;
    }
    return crosswalkProto.clone(false);
  }
  function lamp() {
    const asset = streetPart('StreetLamp');
    if (asset) return asset;
    const g = new THREE.Group();
    g.add(mesh(cyl(0.06, 0.09, 4, 8), L(0x4a4a55), 0, 2, 0, false));
    g.add(mesh(box(0.8, 0.08, 0.08), L(0x4a4a55), 0.35, 4, 0, false));
    g.add(mesh(sph(0.2, 12, 10), Basic(0xfff2b0), 0.7, 3.9, 0, false));
    return g;
  }
  let overpassProto = null;
  function buildOverpassProto() {
    const g = new THREE.Group();
    const concrete = L(0xe6dcc9);
    const concreteDark = L(0xc7bca8);
    const steel = L(0x314d55);
    const steelLight = L(0x466872);
    const gold = L(0xd6ae62);
    const glassRoofMat = applyWorldBend(new THREE.MeshLambertMaterial({
      color: 0xbce5ef, transparent: true, opacity: 0.44, side: THREE.DoubleSide, depthWrite: false,
    }));
    const glassRailMat = applyWorldBend(new THREE.MeshLambertMaterial({
      color: 0x99cedb, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false,
    }));

    // 1. 主桥墩（立于左右人行道内侧 x = ±4.65，避开三车道与路桩）
    const baseGeo = box(0.86, 0.38, 1.85);
    const pierGeo = cyl(0.22, 0.26, 5.75, 12);
    const capGeo = box(0.80, 0.36, 2.35);
    for (const s of [-1, 1]) {
      const px = s * 4.65;
      g.add(mesh(baseGeo, concreteDark, px, 0.19, 0, false));
      for (const pz of [-0.55, 0.55]) g.add(mesh(pierGeo, concrete, px, 3.05, pz, false));
      g.add(mesh(capGeo, steel, px, 5.82, 0, false));
    }

    // 2. 中间廊桥主箱梁（桥底净空 y=5.98m，高于货车车顶视角与跳跃最高点）
    g.add(mesh(box(12.5, 0.42, 2.50), concrete, 0, 6.19, 0, false));
    g.add(mesh(box(12.6, 0.14, 2.58), steel, 0, 5.96, 0, false));
    for (const fz of [-1.27, 1.27]) {
      g.add(mesh(box(12.6, 0.46, 0.12), concrete, 0, 6.26, fz, false));
      g.add(mesh(box(12.6, 0.08, 0.15), gold, 0, 6.49, fz, false));
    }

    // 3. 廊桥正面横幅牌框（文字按街区动态挂在 z = +1.47）
    g.add(mesh(box(4.76, 0.90, 0.12), gold, 0, 6.32, 1.37, false));
    g.add(mesh(box(4.60, 0.76, 0.14), steel, 0, 6.32, 1.39, false));

    // 4. 廊桥前后透明玻璃护栏 + 扶手 + 网红天桥挂壁花箱
    const railBarGeo = box(12.2, 0.06, 0.06);
    const railGlassGeo = new THREE.PlaneGeometry(12.0, 0.86);
    const postGeo = box(0.06, 1.0, 0.06);
    for (const rz of [-1.20, 1.20]) {
      g.add(mesh(railBarGeo, steel, 0, 7.42, rz, false));
      g.add(mesh(railBarGeo, steelLight, 0, 6.96, rz, false));
      g.add(mesh(railGlassGeo, glassRailMat, 0, 6.96, rz, false));
      for (let i = -5; i <= 5; i++) {
        g.add(mesh(postGeo, steel, i * 1.15, 6.94, rz, false));
      }
    }
    const planterGeo = box(0.95, 0.24, 0.26);
    const planterMat = L(0xc7896d);
    const bushGeo = new THREE.IcosahedronGeometry(0.18, 1);
    const bushMats = [L(0x638f60), L(0x7ca26d)];
    const bloomGeo = sph(0.075, 6, 5);
    const bloomMats = [L(0xf5a8b8), L(0xffd466)];
    for (const fx of [-4.05, -2.95, 2.95, 4.05]) {
      g.add(mesh(planterGeo, planterMat, fx, 6.66, 1.38, false));
      for (let j = -1; j <= 1; j++) {
        const bx = fx + j * 0.28;
        g.add(mesh(bushGeo, bushMats[(j + 2) % 2], bx, 6.84, 1.40, false));
        g.add(mesh(bloomGeo, bloomMats[(j + 3) % 2], bx, 6.97, 1.45, false));
      }
    }

    // 5. 现代校园弧形半透明玻璃雨棚 + 7 道钢拱肋
    const R = 2.0, halfAng = 0.78, archCenterY = 6.95;
    const canopyGeo = new THREE.CylinderGeometry(R, R, 12.2, 14, 1, true, Math.PI / 2 - halfAng, halfAng * 2);
    const canopy = mesh(canopyGeo, glassRoofMat, 0, archCenterY, 0, false);
    canopy.rotation.z = Math.PI / 2;
    g.add(canopy);
    // 顶部脊梁与两侧雨檐边梁
    g.add(mesh(box(12.25, 0.08, 0.12), steel, 0, archCenterY + R, 0, false));
    for (const ez of [-R * Math.sin(halfAng), R * Math.sin(halfAng)]) {
      g.add(mesh(box(12.25, 0.10, 0.12), steel, 0, archCenterY + R * Math.cos(halfAng), ez, false));
    }
    const ribPts = [];
    for (let i = 0; i <= 8; i++) {
      const a = -halfAng + halfAng * 2 * (i / 8);
      ribPts.push(new THREE.Vector3(0, archCenterY + R * Math.cos(a), R * Math.sin(a)));
    }
    const ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts), 10, 0.055, 6, false);
    const canopyPostGeo = box(0.11, 2.05, 0.11);
    for (const rx of [-5.55, -3.7, -1.85, 0, 1.85, 3.7, 5.55]) {
      g.add(mesh(ribGeo, steel, rx, 0, 0, false));
      for (const pz of [-1.20, 1.20]) {
        g.add(mesh(canopyPostGeo, steel, rx, 7.42, pz, false));
      }
    }

    // 6. 左右两侧现实感上下楼梯（沿两侧人行道 x = ±5.52 落地，分两段共 16 级台阶 + 中间休息平台 + 护栏扶手）
    const flightDz = 3.60, flightDy = 3.00;
    const flightLen = Math.hypot(flightDz, flightDy);
    const flightSlope = Math.atan2(flightDy, flightDz);
    const stringerGeo = box(0.12, 0.28, flightLen);
    const handrailGeo = box(0.06, 0.06, flightLen + 0.1);
    const stepGeo = box(1.36, 0.14, 0.48);
    const nosingGeo = box(1.36, 0.03, 0.08);
    const landGeo = box(1.56, 0.26, 1.44);
    const midPierGeo = cyl(0.16, 0.19, 3.04, 10);
    const midBaseGeo = box(0.54, 0.24, 0.54);
    const stairPostGeo = box(0.05, 0.96, 0.05);
    const landRailGeo = box(0.06, 0.06, 1.44);
    const newelGeo = cyl(0.055, 0.06, 1.05, 8);
    const newelCapGeo = sph(0.075, 8, 6);

    for (const s of [-1, 1]) {
      const sx = s * 5.52;
      // 桥端左右端头护栏（封闭外侧端头，仅留向楼梯开口）
      g.add(mesh(box(0.07, 1.02, 2.45), steel, s * 6.24, 6.94, 0, false));
      g.add(mesh(box(1.52, 0.06, 0.06), steel, sx, 7.42, -1.20, false));

      // 两段楼梯：上段 (z: 1.25→4.85, y: 6.20→3.20)，下段 (z: 6.25→9.85, y: 3.12→0.12)
      const flights = [
        { z0: 1.25, y0: 6.20, z1: 4.85, y1: 3.20 },
        { z0: 6.25, y0: 3.12, z1: 9.85, y1: 0.12 },
      ];
      for (const fl of flights) {
        const mz = (fl.z0 + fl.z1) / 2, my = (fl.y0 + fl.y1) / 2;
        for (const sideOff of [-0.71, 0.71]) {
          const str = mesh(stringerGeo, steel, sx + sideOff, my - 0.12, mz, false);
          str.rotation.x = flightSlope;
          g.add(str);
          const rail = mesh(handrailGeo, steelLight, sx + sideOff, my + 0.92, mz, false);
          rail.rotation.x = flightSlope;
          g.add(rail);
          const midRail = mesh(handrailGeo, gold, sx + sideOff, my + 0.52, mz, false);
          midRail.rotation.x = flightSlope;
          g.add(midRail);
          for (let p = 0; p <= 3; p++) {
            const t = p / 3;
            g.add(mesh(stairPostGeo, steel, sx + sideOff,
              fl.y0 + (fl.y1 - fl.y0) * t + 0.44, fl.z0 + (fl.z1 - fl.z0) * t, false));
          }
        }
        // 逐级混凝土踏步 + 深色防滑前沿
        const steps = 8;
        for (let k = 0; k < steps; k++) {
          const t = (k + 0.5) / steps;
          const sy = fl.y0 + (fl.y1 - fl.y0) * t;
          const sz = fl.z0 + (fl.z1 - fl.z0) * t;
          g.add(mesh(stepGeo, concrete, sx, sy - 0.06, sz, false));
          g.add(mesh(nosingGeo, steel, sx, sy + 0.015, sz + 0.20, false));
        }
      }

      // 中间休息平台 + 支撑柱 + 平台护栏
      g.add(mesh(landGeo, concrete, sx, 3.06, 5.55, false));
      g.add(mesh(midPierGeo, concreteDark, sx, 1.52, 5.55, false));
      g.add(mesh(midBaseGeo, steel, sx, 0.12, 5.55, false));
      for (const sideOff of [-0.71, 0.71]) {
        g.add(mesh(landRailGeo, steelLight, sx + sideOff, 4.04, 5.55, false));
        g.add(mesh(landRailGeo, gold, sx + sideOff, 3.64, 5.55, false));
      }

      // 底层入口踏板 + 金顶立柱
      g.add(mesh(box(1.58, 0.14, 0.65), concreteDark, sx, 0.07, 10.05, false));
      for (const sideOff of [-0.71, 0.71]) {
        g.add(mesh(newelGeo, steel, sx + sideOff, 0.60, 9.95, false));
        g.add(mesh(newelCapGeo, gold, sx + sideOff, 1.15, 9.95, false));
      }
    }

    // 把 240+ 个不透明实色部件与 2 块玻璃护栏分别烘焙合并，每座天桥仅需 3 次 draw call（实色 + 玻璃护栏 + 玻璃雨棚）
    const solidParts = [], glassRailParts = [];
    for (const child of [...g.children]) {
      if (child.material === glassRoofMat) continue;
      if (child.material === glassRailMat) glassRailParts.push(child);
      else solidParts.push(child);
      g.remove(child);
    }
    const solidMesh = mergeStatic(solidParts, applyWorldBend(new THREE.MeshLambertMaterial({ vertexColors: true })), { vertexColors: true });
    const railGlassMesh = mergeStatic(glassRailParts, glassRailMat);
    const tempGeos = new Set([...solidParts, ...glassRailParts].map(p => p.geometry));
    for (const geo of tempGeos) geo.dispose();
    const tempMats = new Set(solidParts.map(p => p.material));
    for (const mat of tempMats) mat.dispose();
    g.add(solidMesh, railGlassMesh);

    g.traverse(n => { n.userData.sharedAsset = true; });
    return g;
  }

  function gantry(text, festive = false) {
    if (!overpassProto) overpassProto = buildOverpassProto();
    const g = overpassProto.clone(true);
    g.add(streetSign(text, 4.10, 0.58, 0, 6.32, 1.48));
    if (festive) {
      const bunting = streetPart('MarketBunting');
      if (bunting) {
        bunting.position.y = -0.88;
        g.add(bunting);
      }
    }
    g.userData.sceneryTail = 4;
    return g;
  }
  let fountainFxProto = null;
  function getFountainWaterFx() {
    if (!fountainFxProto) {
      fountainFxProto = new THREE.Group();
      // 水池同心扩散涟漪
      const rippleGeo = new THREE.CircleGeometry(1.12, 24);
      rippleGeo.rotateX(-Math.PI / 2);
      const rippleMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: windTimeUniform,
          uWorldBend: worldBendUniform,
          uBendViewMat: bendViewMatUniform,
        },
        vertexShader: `
          uniform vec2 uWorldBend;
          uniform mat4 uBendViewMat;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 bendWorldPos = modelMatrix * vec4( position, 1.0 );
            float bendDist = max( 0.0, -bendWorldPos.z );
            float bendDist2 = bendDist * bendDist;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            mvPosition.xyz += ( uBendViewMat * vec4( uWorldBend.x * bendDist2, uWorldBend.y * bendDist2, 0.0, 0.0 ) ).xyz;
            gl_Position = projectionMatrix * mvPosition;
          }`,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float r = length( vUv * 2.0 - 1.0 );
            if ( r > 1.0 || r < 0.22 ) discard;
            float ring1 = smoothstep( 0.09, 0.0, abs( fract( r * 2.6 - uTime * 0.72 ) - 0.5 ) );
            float splashRing = smoothstep( 0.12, 0.0, abs( r - 0.69 ) ) * ( 0.6 + 0.4 * sin( uTime * 6.0 + vUv.x * 18.0 ) );
            float fade = smoothstep( 1.0, 0.78, r ) * smoothstep( 0.22, 0.34, r );
            float alpha = ( ring1 * 0.36 + splashRing * 0.48 ) * fade;
            if ( alpha <= 0.005 ) discard;
            gl_FragColor = vec4( vec3( 0.90, 0.98, 1.0 ), alpha );
          }`,
      });
      const ripple = new THREE.Mesh(rippleGeo, rippleMat);
      ripple.position.y = 0.342;
      fountainFxProto.add(ripple);

      // 喷泉顶部十字交叉水花薄雾
      const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.74), null);
      const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.74), null);
      p2.rotation.y = Math.PI / 2;
      const plumeGeo = mergeStatic([p1, p2], null, { withUV: true }).geometry;
      p1.geometry.dispose(); p2.geometry.dispose();
      const plumeMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: windTimeUniform,
          uWorldBend: worldBendUniform,
          uBendViewMat: bendViewMatUniform,
        },
        vertexShader: `
          uniform vec2 uWorldBend;
          uniform mat4 uBendViewMat;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 bendWorldPos = modelMatrix * vec4( position, 1.0 );
            float bendDist = max( 0.0, -bendWorldPos.z );
            float bendDist2 = bendDist * bendDist;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            mvPosition.xyz += ( uBendViewMat * vec4( uWorldBend.x * bendDist2, uWorldBend.y * bendDist2, 0.0, 0.0 ) ).xyz;
            gl_Position = projectionMatrix * mvPosition;
          }`,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float dx = abs( vUv.x - 0.5 ) * 2.0;
            float y = vUv.y;
            float arch = smoothstep( 0.0, 0.45, y ) * smoothstep( 1.0, 0.52, y );
            float spread = mix( 0.25, 0.95, y );
            float core = smoothstep( spread, 0.0, dx );
            float drops = 0.55 + 0.45 * sin( y * 24.0 - uTime * 11.0 + dx * 8.0 );
            float alpha = core * arch * drops * 0.62;
            if ( alpha <= 0.01 ) discard;
            gl_FragColor = vec4( vec3( 0.88, 0.98, 1.0 ), alpha );
          }`,
      });
      const plume = new THREE.Mesh(plumeGeo, plumeMat);
      plume.position.y = 1.44;
      fountainFxProto.add(plume);
      fountainFxProto.traverse(n => { n.userData.sharedAsset = true; });
    }
    return fountainFxProto.clone(true);
  }
  function fountain() {
    const asset = streetPart('ParkFountain');
    if (asset) {
      const group = new THREE.Group();
      const fx = getFountainWaterFx();
      group.add(asset, fx);
      group.userData.farHide = [fx];
      return group;
    }
    return mesh(cyl(1.24, 1.3, 0.28, 18).translate(0, 0.14, 0), L(0xb3b4a1), 0, 0, 0, false);
  }
  function garden() { return streetPart('ParkGarden') || flowerBed(); }
  function hedge() { return mesh(box(0.5, 0.6, 8), L(0x5aa84f), 0, 0.3, 0, false); }
  function post() { return streetPart('StreetBollard') || mesh(box(0.12, 0.65, 0.12).translate(0, 0.325, 0), L(0x526465), 0, 0, 0, false); }
  let cloudMap;
  function cloud() {
    if (!cloudMap) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 128;
      const c = canvas.getContext('2d');
      const light = c.createLinearGradient(0, 16, 0, 112);
      light.addColorStop(0, '#fff4d8');
      light.addColorStop(.54, '#ffedcf');
      light.addColorStop(1, '#d8d7cb');
      c.fillStyle = light;
      c.beginPath();
      c.moveTo(17, 103);
      c.bezierCurveTo(9, 91, 35, 84, 66, 82);
      c.bezierCurveTo(95, 77, 101, 61, 128, 62);
      c.bezierCurveTo(145, 61, 164, 52, 181, 41);
      c.bezierCurveTo(198, 27, 225, 21, 243, 34);
      c.bezierCurveTo(267, 1, 311, 7, 328, 38);
      c.bezierCurveTo(361, 29, 386, 45, 394, 63);
      c.bezierCurveTo(419, 56, 447, 69, 450, 85);
      c.bezierCurveTo(483, 83, 502, 96, 493, 105);
      c.bezierCurveTo(411, 113, 76, 119, 17, 103);
      c.fill();
      c.fillStyle = '#fff1d986';
      c.beginPath();
      c.moveTo(75, 90);
      c.bezierCurveTo(158, 88, 177, 72, 229, 69);
      c.bezierCurveTo(265, 45, 289, 62, 311, 64);
      c.bezierCurveTo(355, 46, 376, 68, 416, 78);
      c.bezierCurveTo(336, 82, 195, 99, 75, 90);
      c.fill();
      cloudMap = new THREE.CanvasTexture(canvas);
    }
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudMap, depthWrite: false, fog: false }));
  }

  /* ---------- 火箭高空飞行专用：左右建筑上方 3D 蓬松云团 + 无死角云海柔雾层 ---------- */
  function skyCloudCorridor() {
    const root = new THREE.Group();
    root.visible = false;

    // 1. 左右无死角云海柔雾底毯（内侧在建筑屋顶 x=±7.2~11.2m 处柔和羽化，外侧 100% 遮住绿色大空地）
    const blanketCv = document.createElement('canvas');
    blanketCv.width = 256;
    blanketCv.height = 256;
    const bc = blanketCv.getContext('2d');
    for (let x = 0; x < 256; x++) {
      // u: 0 为贴近街道屋顶内缘，1 为远方外侧天际
      const u = x / 255;
      const baseAlpha = THREE.MathUtils.smoothstep(u, 0.0, 0.11);
      for (let y = 0; y < 256; y++) {
        const v = y / 256;
        const wave = 0.5 + 0.3 * Math.sin(v * Math.PI * 6 + u * 8) + 0.2 * Math.cos(v * Math.PI * 10 - u * 5);
        const edgeFeather = THREE.MathUtils.smoothstep(u + (wave - 0.5) * 0.035, 0.01, 0.11);
        const a = Math.min(1, Math.max(baseAlpha, edgeFeather));
        const shade = 0.92 + 0.08 * wave;
        const r = Math.round(255 * shade);
        const g = Math.round(245 * shade);
        const b = Math.round(225 * shade);
        bc.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
        bc.fillRect(x, y, 1, 1);
      }
    }
    const blanketTex = new THREE.CanvasTexture(blanketCv);
    blanketTex.wrapS = THREE.ClampToEdgeWrapping;
    blanketTex.wrapT = THREE.RepeatWrapping;
    blanketTex.repeat.set(1, 6);

    const blanketMat = applyWorldBend(new THREE.MeshBasicMaterial({
      map: blanketTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));

    const innerX = 7.0;
    const outerX = 280;
    const widthX = outerX - innerX;
    for (const side of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(widthX, 280, 4, 48);
      // 让 u=0 始终朝向街道中心 (|x| = innerX)，u=1 朝向外侧远方 (|x| = outerX)
      if (side < 0) {
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
          uv.setX(i, 1 - uv.getX(i));
        }
      }
      const plane = new THREE.Mesh(geo, blanketMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(side * (innerX + widthX / 2), 6.15, -75);
      plane.renderOrder = 1;
      root.add(plane);
    }

    // 2. 3D 蓬松立体卡通云朵群（烘焙顶点明暗色，合并为单网格循环滚动）
    const LOOP_LEN = 120;
    const puffParts = [];
    const puffGeo = new THREE.SphereGeometry(1, 12, 9);
    const topCol = new THREE.Color(0xfffaf0);
    const midCol = new THREE.Color(0xf7ebd6);
    const botCol = new THREE.Color(0xdfd3be);
    const tmpCol = new THREE.Color();

    function makePuff(x, y, z, rx, ry, rz, tint = 1) {
      const g = puffGeo.clone();
      const pos = g.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const py = pos.getY(i);
        // 底部略微压平，顶部饱满圆润
        if (py < 0) pos.setY(i, py * 0.58);
        const h = THREE.MathUtils.clamp((py + 0.6) / 1.6, 0, 1);
        if (h > 0.45) tmpCol.copy(midCol).lerp(topCol, (h - 0.45) / 0.55);
        else tmpCol.copy(botCol).lerp(midCol, h / 0.45);
        tmpCol.multiplyScalar(tint);
        tmpCol.toArray(colors, i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      g.scale(rx, ry, rz);
      g.translate(x, y, z);
      const m = new THREE.Mesh(g, Basic(0xffffff));
      puffParts.push(m);
    }

    // 固定随机种子生成对称又自然的云团簇，首尾在 LOOP_LEN 处无缝衔接
    const steps = 15;
    const stepZ = LOOP_LEN / steps;
    for (const side of [-1, 1]) {
      for (let i = 0; i < steps; i++) {
        const z0 = -i * stepZ;
        const phase = i * 1.7 + (side > 0 ? 0.9 : 2.3);
        const s1 = Math.sin(phase), c1 = Math.cos(phase * 1.3);

        // 内排：紧贴左右建筑屋顶上方 (|x| ≈ 9.2 ~ 15.5m, y ≈ 6.3 ~ 9.2m)
        const ix = side * (10.2 + (s1 * 0.5 + 0.5) * 2.2);
        const iy = 6.55 + (c1 * 0.5 + 0.5) * 0.75;
        makePuff(ix, iy, z0, 3.4, 1.85, 3.6, 1.0);
        makePuff(ix + side * 2.1, iy + 0.55, z0 - 1.4, 2.8, 2.1, 2.9, 1.02);
        makePuff(ix - side * 1.3, iy - 0.15, z0 + 1.5, 2.3, 1.45, 2.5, 0.98);

        // 中排：层叠饱满大云朵 (|x| ≈ 16 ~ 27m, y ≈ 7.2 ~ 11.2m)
        const mx = side * (18.5 + (c1 * 0.5 + 0.5) * 4.5);
        const my = 7.4 + (s1 * 0.5 + 0.5) * 1.1;
        makePuff(mx, my, z0 - 2.0, 5.2, 2.6, 4.8, 1.01);
        makePuff(mx + side * 3.2, my + 0.8, z0 + 0.6, 4.4, 2.9, 4.2, 1.03);

        // 外排：远方高耸云岭 (|x| ≈ 30 ~ 52m, y ≈ 8.0 ~ 13.0m)，彻底封死侧向远景地面视线
        const ox = side * (33.5 + ((i % 3) * 5.2));
        const oy = 8.2 + ((i % 2) * 1.1);
        makePuff(ox, oy, z0 - 1.0, 8.5, 3.6, 6.8, 1.0);
      }
    }

    const puffMat = applyWorldBend(new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
    }));
    const beltMeshA = mergeStatic(puffParts, puffMat, { vertexColors: true });
    for (const p of puffParts) p.geometry.dispose();
    puffGeo.dispose();
    const beltMeshB = beltMeshA.clone();
    beltMeshA.renderOrder = 2;
    beltMeshB.renderOrder = 2;
    root.add(beltMeshA, beltMeshB);

    root.traverse(n => { n.userData.sharedAsset = true; });

    return {
      root,
      update(blend, distance) {
        const b = THREE.MathUtils.clamp(blend, 0, 1);
        if (b <= 0.004) {
          root.visible = false;
          return;
        }
        root.visible = true;
        blanketMat.opacity = b;
        puffMat.opacity = b;
        // 升空时云海从上方轻盈托起，沉浸感更强
        root.position.y = (1 - b) * 1.6;
        // 云团以柔和视差随飞行距离向后掠过，两段 120m 云带无缝循环覆盖 z ∈ [-175, +65]
        const scroll = (distance * 0.65) % LOOP_LEN;
        beltMeshA.position.z = scroll;
        beltMeshB.position.z = scroll - LOOP_LEN;
        blanketTex.offset.y = (distance * 0.65) / 140;
      },
    };
  }
  function sidewalkTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = '#8e8371'; c.fillRect(0, 0, 256, 256);
    const stones = ['#b8a891', '#ad9e88', '#b3a38f', '#c2b098'];
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 4; col++) {
        const x = col * 64 + (row % 2 ? 32 : 0);
        const y = row * 32;
        c.fillStyle = stones[(row + ((col + 4) % 4) * 5) % stones.length];
        c.fillRect(x + 1, y + 1, 62, 30);
        c.fillStyle = '#cdbba0';
        c.fillRect(x + 1, y + 1, 62, 2);
      }
    }
    for (let i = 0; i < 1800; i++) {
      c.fillStyle = i % 2 ? 'rgba(255,252,226,0.22)' : 'rgba(105,95,74,0.14)';
      c.fillRect(Math.random() * 256, Math.random() * 256, 1 + i % 2, 1);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }
  function lawnTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d');
    c.fillStyle = '#667751'; c.fillRect(0, 0, 256, 256);
    for (const [x, y, radius, tint] of [[24, 58, 37, '#829461'], [124, 115, 39, '#5b754f'],
      [200, 55, 43, '#778b55'], [174, 210, 42, '#829462'], [42, 186, 36, '#576e4e']]) {
      const patch = c.createRadialGradient(x, y, 2, x, y, radius);
      patch.addColorStop(0, tint); patch.addColorStop(1, tint + '00');
      c.fillStyle = patch;
      c.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
    }
    for (let i = 0; i < 2300; i++) {
      c.fillStyle = i % 2 ? '#adc18d38' : '#344d3640';
      c.fillRect(Math.random() * 256, Math.random() * 256, 1 + i % 3, 1 + i % 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  function skyDome() {
    const material = new THREE.ShaderMaterial({
      uniforms: { topColor: { value: new THREE.Color() }, horizonColor: { value: new THREE.Color() } },
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying vec3 vDirection;
        void main() {
          vec3 ray = normalize(vDirection);
          float height = smoothstep(-0.055, 0.43, ray.y);
          vec3 base = mix(horizonColor, topColor, height);
          float towardSun = max(0.0, dot(ray, normalize(vec3(-0.36, 0.23, -1.0))));
          float halo = pow(towardSun, 42.0) * 0.40;
          float disk = smoothstep(0.99954, 0.99967, towardSun);
          vec3 lit = mix(base, vec3(1.0, 0.90, 0.73), halo);
          gl_FragColor = vec4(mix(lit, vec3(1.0, 0.96, 0.84), disk), 1.0);
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 30, 20), material);
    sky.renderOrder = -10;
    return sky;
  }

  function hills(radius, height, phase, hazeColor) {
    const steps = 160;
    const points = [], indices = [];
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * Math.PI * 2;
      const x = Math.sin(a) * radius, z = -Math.cos(a) * radius;
      const valley = 0.42 + 0.58 * Math.abs(Math.sin(a * 1.5));
      const ridge = 0.58 + 0.22 * Math.sin(a * 7 + phase) + 0.14 * Math.sin(a * 13 + 1.2 + phase);
      points.push(x, -50, z, x, 4 + height * ridge * valley, z);
      if (i < steps) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setIndex(indices);
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { ridgeColor: { value: new THREE.Color() }, hazeColor: { value: hazeColor },
        hazeHeight: { value: height * 0.39 } },
      vertexShader: `
        varying float vHeight;
        void main() {
          vHeight = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 ridgeColor;
        uniform vec3 hazeColor;
        uniform float hazeHeight;
        varying float vHeight;
        void main() {
          gl_FragColor = vec4(mix(hazeColor, ridgeColor, smoothstep(0.0, hazeHeight, vHeight)), 1.0);
        }`,
    });
    return mesh(geometry, material, 0, 0, 0, false);
  }

  /* 梗道具：篮球（鸡你太美） */
  function memeBall() {
    const g = new THREE.Group();
    g.add(mesh(sph(0.38, 20, 16), P(0xff8a1f, 40), 0, 0, 0));
    const ringGeo = new THREE.TorusGeometry(0.38, 0.018, 6, 28);
    const ringMat = Basic(0x2a2a2a);
    const a = new THREE.Mesh(ringGeo, ringMat); a.rotation.x = Math.PI / 2; g.add(a);
    const b = new THREE.Mesh(ringGeo, ringMat); b.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.add(b);
    const c = new THREE.Mesh(ringGeo, ringMat); c.rotation.set(0, 0, Math.PI / 2); g.add(c);
    markPickup(g, 0xffad42);
    const lb = label('只因', '#ffe9b8', '#8a4b00', 0.9); lb.position.set(0, 0.8, 0); g.add(lb);
    return g;
  }

  /* ---------- 菲涅尔六边形能量光盾（相信光盾） ---------- */
  function shieldDome() {
    const root = new THREE.Group();
    root.position.y = 1.02;
    const domeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      uniforms: {
        uTime: { value: 0 },
        uImpact: { value: 0 },
        uStacks: { value: 1 },
        uCoreColor: { value: new THREE.Color(0xfff0a3) },
        uEdgeColor: { value: new THREE.Color(0x69f0ff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = position;
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          vNormal = normalize( normalMatrix * normal );
          vViewDir = normalize( -mvPosition.xyz );
          gl_Position = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform float uImpact;
        uniform float uStacks;
        uniform vec3 uCoreColor;
        uniform vec3 uEdgeColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;

        float hexDist( vec2 p ) {
          p = abs( p );
          return max( dot( p, normalize( vec2( 1.0, 1.7320508 ) ) ), p.x );
        }

        float hexEdge( vec2 uv ) {
          vec2 r = vec2( 1.0, 1.7320508 );
          vec2 h = r * 0.5;
          vec2 a = mod( uv, r ) - h;
          vec2 b = mod( uv - h, r ) - h;
          vec2 gv = dot( a, a ) < dot( b, b ) ? a : b;
          float d = 0.5 - hexDist( gv );
          return smoothstep( 0.085, 0.015, d );
        }

        void main() {
          vec3 N = normalize( vNormal );
          vec3 V = normalize( vViewDir );
          float ndotv = clamp( dot( N, V ), 0.0, 1.0 );
          float fresnel = pow( 1.0 - ndotv, 2.15 );

          vec3 dir = normalize( vLocalPos );
          float lon = atan( dir.x, dir.z );
          vec2 hexUv = vec2( lon * 2.55, dir.y * 4.4 - uTime * 0.35 );
          float hex = hexEdge( hexUv );

          float scan = pow( 0.5 + 0.5 * sin( dir.y * 6.5 - uTime * 4.2 ), 6.0 );
          float pulse = 0.86 + 0.14 * sin( uTime * 3.2 );
          float stackBoost = min( 1.0, max( 0.0, uStacks - 1.0 ) * 0.5 );

          vec3 col = mix( uCoreColor, uEdgeColor, clamp( fresnel * 0.82 + scan * 0.35 + stackBoost * 0.28, 0.0, 1.0 ) );
          col += vec3( 1.0, 0.98, 0.88 ) * ( hex * ( 0.24 + scan * 0.45 + fresnel * 0.44 ) + uImpact * 0.95 );

          float alpha = fresnel * 0.72 * pulse
            + hex * ( 0.06 + fresnel * 0.34 + scan * 0.22 )
            + scan * 0.10
            + uImpact * ( 0.34 + hex * 0.36 );
          gl_FragColor = vec4( col, clamp( alpha, 0.0, 0.92 ) );
        }`,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.38, 28, 20), domeMat);
    dome.renderOrder = 12;
    root.add(dome);

    const ringGeo = new THREE.TorusGeometry(1.44, 0.026, 8, 48);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xffe97a, transparent: true, opacity: 0.62, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat1);
    ring1.rotation.set(Math.PI / 2 + 0.38, 0, 0.24);
    ring1.renderOrder = 13;
    root.add(ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x73f0ff, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const ring2 = new THREE.Mesh(ringGeo, ringMat2);
    ring2.scale.setScalar(1.04);
    ring2.rotation.set(Math.PI / 2 - 0.46, 0.25, -0.32);
    ring2.visible = false;
    ring2.renderOrder = 13;
    root.add(ring2);

    return {
      root,
      update(t, stacks = 1, impact = 0) {
        domeMat.uniforms.uTime.value = t;
        domeMat.uniforms.uStacks.value = stacks;
        domeMat.uniforms.uImpact.value = impact;
        const sc = 1 + Math.sin(t * 3.6) * 0.018 + impact * 0.14;
        dome.scale.setScalar(sc);
        ring1.rotation.z = t * 1.45;
        ringMat1.opacity = (stacks >= 2 ? 0.78 : 0.52) + impact * 0.35;
        ring2.visible = stacks >= 2;
        if (ring2.visible) {
          ring2.rotation.z = -t * 1.9;
          ringMat2.opacity = (stacks >= 3 ? 0.88 : 0.68) + impact * 0.25;
        }
      },
    };
  }

  /* ---------- 3D 空间速度线通道（挂于相机本地坐标，1 次 Draw Call） ---------- */
  function speedLines() {
    const geo = new THREE.CylinderGeometry(5.2, 0.88, 10.5, 48, 1, true);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uColor: { value: new THREE.Color(0xfff4d4) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec2 vUv;

        float hash11( float p ) {
          return fract( sin( p * 127.1 + 311.7 ) * 43758.5453123 );
        }

        void main() {
          if ( uIntensity <= 0.005 ) discard;
          float lanes = 46.0;
          float id = floor( vUv.x * lanes );
          float cellX = fract( vUv.x * lanes ) - 0.5;

          float rnd = hash11( id );
          float rnd2 = hash11( id + 19.3 );
          float speed = 2.6 + rnd * 2.8;
          float width = 0.055 + rnd2 * 0.065;
          float lineX = smoothstep( width, 0.0, abs( cellX ) );

          float streak = fract( vUv.y * ( 1.45 + rnd * 1.1 ) + uTime * speed + rnd2 * 10.0 );
          float tail = smoothstep( 0.0, 0.14, streak ) * smoothstep( 0.72, 0.14, streak );

          // 随速度强度动态点亮更多线条，低速稀疏、高速密集
          float gate = step( 1.0 - clamp( uIntensity * 1.15, 0.15, 0.95 ), rnd );
          float depthFade = smoothstep( 0.04, 0.24, vUv.y ) * smoothstep( 0.98, 0.42, vUv.y );

          float alpha = lineX * tail * gate * depthFade * uIntensity * 0.56;
          if ( alpha <= 0.004 ) discard;
          gl_FragColor = vec4( uColor, alpha );
        }`,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0, -5.6);
    m.frustumCulled = false;
    m.renderOrder = 999;
    m.visible = false;
    return {
      mesh: m,
      update(t, intensity, colorHex, aspect = 1.5) {
        const clamped = THREE.MathUtils.clamp(intensity, 0, 1);
        m.visible = clamped > 0.01;
        if (!m.visible) return;
        mat.uniforms.uTime.value = t;
        mat.uniforms.uIntensity.value = clamped;
        mat.uniforms.uColor.value.setHex(colorHex);
        // 适配宽屏与竖屏手机，保持画面中心跑道视野始终清爽无遮挡
        m.scale.set(THREE.MathUtils.clamp(aspect * 0.72, 0.62, 1.38), 1, 1);
      },
    };
  }

  /* ---------- GPU 多形态粒子系统（1 次 Draw Call，支持曲面世界 + 4 种程序化形态） ---------- */
  function particleSystem(maxCount = 200) {
    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    const sizes = new Float32Array(maxCount);
    const alphas = new Float32Array(maxCount);
    const shapes = new Float32Array(maxCount);

    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const colAttr = new THREE.BufferAttribute(colors, 3);
    const sizeAttr = new THREE.BufferAttribute(sizes, 1);
    const alphaAttr = new THREE.BufferAttribute(alphas, 1);
    const shapeAttr = new THREE.BufferAttribute(shapes, 1);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    alphaAttr.setUsage(THREE.DynamicDrawUsage);
    shapeAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aColor', colAttr);
    geo.setAttribute('aSize', sizeAttr);
    geo.setAttribute('aAlpha', alphaAttr);
    geo.setAttribute('aShape', shapeAttr);
    geo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uScale: { value: 400 },
        uWorldBend: worldBendUniform,
        uBendViewMat: bendViewMatUniform,
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        attribute float aShape;
        uniform float uScale;
        uniform vec2 uWorldBend;
        uniform mat4 uBendViewMat;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vShape;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vShape = aShape;
          vec4 bendWorldPos = modelMatrix * vec4( position, 1.0 );
          float bendDist = max( 0.0, -bendWorldPos.z );
          float bendDist2 = bendDist * bendDist;
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          mvPosition.xyz += ( uBendViewMat * vec4( uWorldBend.x * bendDist2, uWorldBend.y * bendDist2, 0.0, 0.0 ) ).xyz;
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = clamp( aSize * uScale / max( 1.2, -mvPosition.z ), 1.5, 92.0 );
        }`,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vShape;
        void main() {
          if ( vAlpha <= 0.005 ) discard;
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float r = length( p );
          if ( r > 1.0 ) discard;
          vec3 col = vColor;
          float a = 0.0;
          if ( vShape < 0.5 ) {
            // 0: 蓬松烟尘 / 云团
            float puff = smoothstep( 1.0, 0.12, r );
            float hi = smoothstep( 0.72, 0.0, length( p + vec2( 0.25, 0.25 ) ) ) * 0.18;
            col = min( vec3( 1.0 ), col + vec3( hi ) );
            a = puff * puff * 0.85;
          } else if ( vShape < 1.5 ) {
            // 1: 卡通四角星芒（奶瓶/奶粉/金牌收集）
            float crossStar = exp( -abs( p.x ) * 6.2 ) * exp( -abs( p.y ) * 1.65 )
                            + exp( -abs( p.y ) * 6.2 ) * exp( -abs( p.x ) * 1.65 );
            float core = smoothstep( 0.55, 0.0, r );
            col = mix( col, vec3( 1.0, 0.99, 0.92 ), clamp( core * 0.75 + crossStar * 0.35, 0.0, 1.0 ) );
            a = clamp( crossStar * 0.95 + core * 0.65, 0.0, 1.0 ) * smoothstep( 1.0, 0.72, r );
          } else if ( vShape < 2.5 ) {
            // 2: 脆亮水滴 / 撞击光珠
            float orb = smoothstep( 0.98, 0.62, r );
            float spec = smoothstep( 0.34, 0.05, length( p + vec2( 0.28, 0.28 ) ) );
            col = mix( col, vec3( 1.0 ), spec * 0.7 );
            a = orb;
          } else {
            // 3: 炽热火星 / 尾焰余烬
            float glow = smoothstep( 1.0, 0.0, r );
            float hot = smoothstep( 0.52, 0.0, r );
            col = mix( col, vec3( 1.0, 0.97, 0.82 ), hot * 0.85 );
            a = pow( glow, 1.35 );
          }
          float finalA = a * vAlpha;
          if ( finalA <= 0.008 ) discard;
          gl_FragColor = vec4( col, finalA );
        }`,
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 18;

    const list = [];
    const tmpCol = new THREE.Color();
    let hadLive = false;

    function emit(x, y, z, vx, vy, vz, colorHex, size = 0.24, life = 0.55, shape = 2, gravity = 18, drag = 0, grow = 0, roadScroll = 0) {
      tmpCol.set(colorHex);
      const item = {
        x, y, z, vx, vy, vz,
        r: tmpCol.r, g: tmpCol.g, b: tmpCol.b,
        size, life, max: Math.max(0.05, life),
        shape, gravity, drag, grow, roadScroll,
      };
      if (list.length < maxCount) list.push(item);
      else list[Math.floor(Math.random() * maxCount)] = item;
    }

    function burst(x, y, z, colorHex, n = 10, spd = 8, shape = 2, size = 0.24, lifeMax = 0.65, gravity = 18, roadScroll = 0) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const hSpd = spd * (0.3 + Math.random() * 0.7);
        const vy = 1.6 + Math.random() * Math.max(2.2, spd * 0.85);
        const life = lifeMax * (0.48 + Math.random() * 0.52);
        emit(
          x, y, z,
          Math.cos(a) * hSpd, vy, Math.sin(a) * hSpd,
          colorHex, size * (0.78 + Math.random() * 0.45),
          life, shape, gravity, shape === 0 ? 1.8 : 0.4,
          shape === 0 ? 0.55 : -0.35, roadScroll
        );
      }
    }

    function update(dt, viewportHeight = 720, scrollDz = 0) {
      mat.uniforms.uScale.value = Math.max(280, viewportHeight * 0.56);
      let live = 0;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        p.life -= dt;
        if (p.life <= 0) continue;
        if (p.drag > 0) {
          const damp = Math.exp(-p.drag * dt);
          p.vx *= damp; p.vy *= damp; p.vz *= damp;
        }
        p.vy -= p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt + scrollDz * p.roadScroll;
        const u = 1 - p.life / p.max;
        const curSize = Math.max(0.03, p.size * (1 + p.grow * u));
        const alpha = u < 0.12 ? (u / 0.12) : Math.pow(Math.max(0, 1 - u), p.shape < 0.5 ? 1.25 : 0.9);
        const o3 = live * 3;
        positions[o3] = p.x;
        positions[o3 + 1] = p.y;
        positions[o3 + 2] = p.z;
        colors[o3] = p.r;
        colors[o3 + 1] = p.g;
        colors[o3 + 2] = p.b;
        sizes[live] = curSize;
        alphas[live] = alpha;
        shapes[live] = p.shape;
        list[live] = p;
        live++;
      }
      list.length = live;
      geo.setDrawRange(0, live);
      if (live > 0 || hadLive) {
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;
        alphaAttr.needsUpdate = true;
        shapeAttr.needsUpdate = true;
      }
      hadLive = live > 0;
    }

    function clear() {
      list.length = 0;
      geo.setDrawRange(0, 0);
      hadLive = false;
    }

    return { points, emit, burst, update, clear };
  }

  /* ---------- 落地 / 肘飞 冲击波圆环池（复用几何，贴合路面与车顶） ---------- */
  function landingRings(count = 6) {
    const root = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.42, 0.72, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const slots = [];
    for (let i = 0; i < count; i++) {
      const mat = applyWorldBend(new THREE.MeshBasicMaterial({
        color: 0xfff4d6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }));
      const m = new THREE.Mesh(ringGeo, mat);
      m.visible = false;
      m.renderOrder = 15;
      root.add(m);
      slots.push({ mesh: m, mat, age: 0, dur: 0.34, maxScale: 1.8, active: false });
    }
    let cursor = 0;
    function spawn(x, y, z = 0, colorHex = 0xfff3d4, maxScale = 1.85, duration = 0.34) {
      const s = slots[cursor];
      cursor = (cursor + 1) % slots.length;
      s.active = true;
      s.age = 0;
      s.dur = duration;
      s.maxScale = maxScale;
      s.mat.color.setHex(colorHex);
      s.mat.opacity = 0.78;
      s.mesh.position.set(x, y + 0.045, z);
      s.mesh.scale.setScalar(0.35);
      s.mesh.visible = true;
    }
    function update(dt, scrollDz = 0) {
      for (const s of slots) {
        if (!s.active) continue;
        s.age += dt;
        if (s.age >= s.dur) {
          s.active = false;
          s.mesh.visible = false;
          continue;
        }
        const u = s.age / s.dur;
        const ease = 1 - (1 - u) * (1 - u) * (1 - u);
        s.mesh.position.z += scrollDz;
        s.mesh.scale.setScalar(0.35 + (s.maxScale - 0.35) * ease);
        s.mat.opacity = (1 - u) * (1 - u) * 0.75;
      }
    }
    function clear() {
      for (const s of slots) { s.active = false; s.mesh.visible = false; }
    }
    return { root, spawn, update, clear };
  }

  /* ---------- 3D 动态丝带拖尾（闪身步 / 奶蛋翻滚 / 火箭高飞，1 次 Draw Call） ---------- */
  function ribbonTrail(segments = 14) {
    const verts = (segments + 1) * 2;
    const positions = new Float32Array(verts * 3);
    const uvs = new Float32Array(verts * 2);
    const alphas = new Float32Array(verts);
    const indices = [];
    for (let i = 0; i <= segments; i++) {
      const v = i / segments;
      uvs[i * 4] = 0; uvs[i * 4 + 1] = v;
      uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = v;
      if (i < segments) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const alphaAttr = new THREE.BufferAttribute(alphas, 1);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    alphaAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aAlpha', alphaAttr);
    geo.setIndex(indices);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0x82ebff) },
        uWorldBend: worldBendUniform,
        uBendViewMat: bendViewMatUniform,
      },
      vertexShader: `
        attribute float aAlpha;
        uniform vec2 uWorldBend;
        uniform mat4 uBendViewMat;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vUv = uv;
          vAlpha = aAlpha;
          vec4 bendWorldPos = modelMatrix * vec4( position, 1.0 );
          float bendDist = max( 0.0, -bendWorldPos.z );
          float bendDist2 = bendDist * bendDist;
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          mvPosition.xyz += ( uBendViewMat * vec4( uWorldBend.x * bendDist2, uWorldBend.y * bendDist2, 0.0, 0.0 ) ).xyz;
          gl_Position = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          float edge = 1.0 - abs( vUv.x * 2.0 - 1.0 );
          float soft = pow( max( 0.0, edge ), 1.4 );
          float core = smoothstep( 0.52, 1.0, edge );
          float fadeEnds = smoothstep( 0.0, 0.14, vUv.y ) * smoothstep( 1.0, 0.15, vUv.y );
          vec3 col = mix( uColor, vec3( 1.0, 0.99, 0.94 ), core * 0.65 );
          float a = soft * fadeEnds * vAlpha * 0.72;
          if ( a <= 0.005 ) discard;
          gl_FragColor = vec4( col, a );
        }`,
    });

    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = 11;
    m.visible = false;

    const samples = Array.from({ length: segments + 1 }, () => ({ x: 0, y: 0.9, z: 0, w: 0.28, a: 0 }));
    const targetCol = new THREE.Color(0x82ebff);
    let sampleAccum = 0;

    function update(dt, scrollDz, active, x, y, z, halfWidth, colorHex, strength = 1) {
      targetCol.setHex(colorHex);
      mat.uniforms.uColor.value.lerp(targetCol, 1 - Math.exp(-10 * dt));

      for (let i = 1; i <= segments; i++) {
        samples[i].z += scrollDz;
        samples[i].a = Math.max(0, samples[i].a - dt * (active ? 2.4 : 4.2));
      }
      sampleAccum += dt;
      while (sampleAccum >= 0.018) {
        sampleAccum -= 0.018;
        for (let i = segments; i >= 1; i--) {
          const prev = samples[i - 1], cur = samples[i];
          cur.x = prev.x; cur.y = prev.y; cur.z = prev.z; cur.w = prev.w; cur.a = prev.a;
        }
      }
      const head = samples[0];
      head.x = x; head.y = y; head.z = z; head.w = halfWidth;
      head.a = active ? strength : Math.max(0, head.a - dt * 5.0);

      let maxA = 0;
      for (let i = 0; i <= segments; i++) {
        const s = samples[i];
        const taper = 1 - (i / segments) * 0.82;
        const hw = s.w * taper;
        const o = i * 6;
        positions[o] = s.x - hw;
        positions[o + 1] = s.y;
        positions[o + 2] = s.z;
        positions[o + 3] = s.x + hw;
        positions[o + 4] = s.y;
        positions[o + 5] = s.z;
        alphas[i * 2] = s.a;
        alphas[i * 2 + 1] = s.a;
        if (s.a > maxA) maxA = s.a;
      }
      m.visible = maxA > 0.012;
      if (m.visible) {
        posAttr.needsUpdate = true;
        alphaAttr.needsUpdate = true;
      }
    }

    function clear() {
      for (const s of samples) { s.x = 0; s.y = 0.9; s.z = 0; s.a = 0; }
      sampleAccum = 0;
      m.visible = false;
    }

    return { mesh: m, update, clear };
  }

  /* ---------- 街区专属飘落环境粒子（大学城樱花瓣 / 商业街彩屑 / 公园嫩叶 / 狂暴火星，1 次 Draw Call） ---------- */
  function ambientWeather(handheld = false) {
    const count = handheld ? 48 : 84;
    // 微拱菱形花瓣/叶片几何（4 三角形，正反面双面可见）
    const petalGeo = new THREE.BufferGeometry();
    const pv = new Float32Array([
      0, 0.015, 0.12,
      -0.075, -0.012, 0,
      0.075, -0.012, 0,
      0, 0.015, -0.12,
      0, 0.025, 0,
    ]);
    petalGeo.setAttribute('position', new THREE.BufferAttribute(pv, 3));
    petalGeo.setIndex([0, 1, 4, 0, 4, 2, 1, 3, 4, 4, 3, 2]);
    petalGeo.computeVertexNormals();

    const mat = applyWorldBend(new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.90,
      depthWrite: false,
    }));
    const inst = new THREE.InstancedMesh(petalGeo, mat, count);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    inst.frustumCulled = false;
    inst.renderOrder = 14;

    const PALETTES = [
      [0xffb8d4, 0xffd6e8, 0xfff0f6, 0xf79ec2], // 0: 大学城 · 樱花瓣
      [0xffe58a, 0xffa6c9, 0x9ce8ff, 0xfff7dc], // 1: 商业街 · 阳光光尘 & 节日彩屑
      [0x9bd484, 0xc3e696, 0xfff9df, 0x7dc274], // 2: 躺平公园 · 绿叶 & 蒲公英
      [0xff6b3b, 0xffb347, 0xffe478, 0xff4636], // 3: 5000m 狂暴 · 炽热火星
    ];

    const items = [];
    const dummy = new THREE.Object3D();
    const curCol = new THREE.Color();
    const dstCol = new THREE.Color();
    const colors = [];

    for (let i = 0; i < count; i++) {
      const pi = i % 4;
      const c = new THREE.Color(PALETTES[0][pi]);
      colors.push(c);
      inst.setColorAt(i, c);
      items.push({
        x: (Math.random() - 0.5) * 26,
        y: 0.6 + Math.random() * 8.6,
        z: -54 + Math.random() * 58,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        vrx: (Math.random() - 0.5) * 3.6,
        vry: (Math.random() - 0.5) * 3.2,
        driftX: (Math.random() - 0.5) * 1.4,
        fallY: 0.55 + Math.random() * 0.95,
        phase: Math.random() * Math.PI * 2,
        scale: 0.72 + Math.random() * 0.78,
        pi,
      });
    }
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;

    let colorMode = 0;
    let colorLerpLeft = 0;

    function update(dt, scrollDz, mode, t, baseY = 0) {
      if (mode !== colorMode) {
        colorMode = mode;
        colorLerpLeft = 1.6;
      }
      const pal = PALETTES[mode] || PALETTES[0];
      const ember = mode === 3;
      const colorChanged = colorLerpLeft > 0;
      if (colorChanged) {
        colorLerpLeft = Math.max(0, colorLerpLeft - dt);
        const ck = 1 - Math.exp(-3.2 * dt);
        for (let i = 0; i < count; i++) {
          dstCol.setHex(pal[items[i].pi]);
          colors[i].lerp(dstCol, ck);
          inst.setColorAt(i, colors[i]);
        }
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      }

      const minY = baseY + 0.35;
      const maxY = baseY + 9.4;
      for (let i = 0; i < count; i++) {
        const p = items[i];
        if (ember) {
          p.x += (p.driftX * 1.4 + Math.sin(t * 3.8 + p.phase) * 0.9) * dt;
          p.y += (0.55 + p.fallY * 0.65) * dt;
          p.z += scrollDz * 1.25 + 6.5 * dt;
        } else {
          p.x += (p.driftX + Math.sin(t * 1.6 + p.phase) * 0.85) * dt;
          p.y -= p.fallY * dt;
          p.z += scrollDz * 0.88 + 0.8 * dt;
        }
        p.rx += p.vrx * dt;
        p.ry += p.vry * dt;

        if (p.z > 5.5 || p.y < minY || p.y > maxY + 1.5 || Math.abs(p.x) > 15.5) {
          p.x = (Math.random() - 0.5) * 26;
          p.y = ember ? (minY + Math.random() * 4.5) : (minY + 1.8 + Math.random() * 7.4);
          p.z = -52 - Math.random() * 8;
        }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rx, p.ry, p.rz);
        if (ember) dummy.scale.set(p.scale * 0.55, p.scale * 0.55, p.scale * 2.1);
        else dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    }

    return { mesh: inst, update };
  }

  /* ---------- 建筑外侧 InstancedMesh 远景树林与丘陵灌木（2 次 Draw Call 填满两侧空地 + 微风摆动） ---------- */
  function outskirtForest(handheld = false) {
    const LOOP_LEN = 148;
    const Z_MAX = 14;
    const treeCount = handheld ? 74 : 124;
    const bushCount = handheld ? 58 : 96;

    // 确定性伪随机，保证每局远景构图层次丰富且不重叠
    let seed = 20261129;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const col = hex => ({ color: new THREE.Color(hex) });

    // 1. 远景树原型：树干 + 三团多层柔和树冠（烘焙顶点色，受微风着色器驱动）
    const treeParts = [];
    treeParts.push(mesh(cyl(0.16, 0.28, 2.35, 6), col(0x7c634f), 0, 1.15, 0, false));
    const treeCrowns = [
      [0, 3.15, 0, 1.42, 0x7ba469],
      [-0.78, 2.65, 0.35, 0.98, 0x678f5c],
      [0.82, 2.75, -0.32, 1.04, 0x8cb375],
      [0.05, 4.05, 0.08, 0.92, 0x9bc081],
    ];
    for (const [x, y, z, r, hex] of treeCrowns) {
      const puff = mesh(new THREE.IcosahedronGeometry(r, 1), col(hex), x, y, z, false);
      puff.scale.set(1.08, 0.92, 1.04);
      treeParts.push(puff);
    }
    const treeMat = applyWorldBend(
      new THREE.MeshLambertMaterial({ vertexColors: true }),
      { wind: true, windAmp: 1.18 }
    );
    const treeGeo = mergeStatic(treeParts, treeMat, { vertexColors: true }).geometry;
    for (const p of treeParts) p.geometry.dispose();

    const trees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    trees.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    trees.frustumCulled = false;

    // 2. 远景丘陵灌木丛原型：贴地柔和三团绿丛
    const bushParts = [];
    for (const [x, y, z, r, hex] of [
      [0, 0.72, 0, 1.15, 0x769f65],
      [-0.86, 0.54, 0.24, 0.85, 0x628a57],
      [0.88, 0.56, -0.18, 0.88, 0x88ae71],
    ]) {
      const b = mesh(new THREE.IcosahedronGeometry(r, 1), col(hex), x, y, z, false);
      b.scale.set(1.22, 0.68, 1.12);
      bushParts.push(b);
    }
    const bushMat = applyWorldBend(
      new THREE.MeshLambertMaterial({ vertexColors: true }),
      { wind: true, windAmp: 0.45 }
    );
    const bushGeo = mergeStatic(bushParts, bushMat, { vertexColors: true }).geometry;
    for (const p of bushParts) p.geometry.dispose();

    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
    bushes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bushes.frustumCulled = false;

    const treeTints = [0xf4faec, 0xe2f0cc, 0xd1e5be, 0xf6f0d6, 0xffe4ec];
    const bushTints = [0xf0f7e6, 0xdeecc6, 0xcce0b9, 0xedf0d4];
    const tmpCol = new THREE.Color();

    const treeData = [];
    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const band = rnd();
      // 避开主街建筑（|x|≈10）与二排背景楼（|x|≈19-24），在 |x|∈[25.5, 68] 形成纵深林带
      const distX = 25.5 + band * band * 42.5;
      const baseZ = (i / treeCount) * LOOP_LEN + (rnd() - 0.5) * 3.5;
      const sc = (1.05 + band * 0.95) * (0.85 + rnd() * 0.35);
      const sy = sc * (0.88 + rnd() * 0.36);
      treeData.push({ x: side * distX, baseZ, rotY: rnd() * Math.PI * 2, sx: sc, sy, sz: sc });
      const tintHex = rnd() < 0.13 ? treeTints[4] : treeTints[Math.floor(rnd() * 4)];
      trees.setColorAt(i, tmpCol.setHex(tintHex));
    }
    if (trees.instanceColor) trees.instanceColor.needsUpdate = true;

    const bushData = [];
    for (let i = 0; i < bushCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const band = rnd();
      const distX = 24.5 + band * 39.5;
      const baseZ = (i / bushCount) * LOOP_LEN + (rnd() - 0.5) * 4.5;
      const sc = 1.15 + rnd() * 1.45;
      bushData.push({ x: side * distX, baseZ, rotY: rnd() * Math.PI * 2, sx: sc, sy: sc * (0.8 + rnd() * 0.4), sz: sc });
      bushes.setColorAt(i, tmpCol.setHex(bushTints[Math.floor(rnd() * bushTints.length)]));
    }
    if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;

    const root = new THREE.Group();
    root.add(trees, bushes);

    const dummy = new THREE.Object3D();
    let lastDist = NaN;
    function update(distance) {
      if (Math.abs(distance - lastDist) < 0.02) return;
      lastDist = distance;
      for (let i = 0; i < treeCount; i++) {
        const d = treeData[i];
        const z = Z_MAX - ((d.baseZ - distance) % LOOP_LEN + LOOP_LEN) % LOOP_LEN;
        dummy.position.set(d.x, -0.06, z);
        dummy.rotation.set(0, d.rotY, 0);
        dummy.scale.set(d.sx, d.sy, d.sz);
        dummy.updateMatrix();
        trees.setMatrixAt(i, dummy.matrix);
      }
      trees.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < bushCount; i++) {
        const d = bushData[i];
        const z = Z_MAX - ((d.baseZ - distance) % LOOP_LEN + LOOP_LEN) % LOOP_LEN;
        dummy.position.set(d.x, -0.08, z);
        dummy.rotation.set(0, d.rotY, 0);
        dummy.scale.set(d.sx, d.sy, d.sz);
        dummy.updateMatrix();
        bushes.setMatrixAt(i, dummy.matrix);
      }
      bushes.instanceMatrix.needsUpdate = true;
    }
    update(0);

    return { root, update };
  }

  return { naiwa, naiwaCosmetics, doubaoFallback, obstacle, truck, oncomingTruck, truckGeometry, markTruckJump, memeBall, coin, milkPowder, power, building, tree,
    flowerBed, bench, busStop, stall, crosswalk, lamp, gantry, fountain, garden, hedge, post, trackTexture, lawnTexture,
    sidewalkTexture, cloud, skyCloudCorridor, skyDome, hills, landmark, alleyFiller, backdropBuilding, parkTree, label, batchScenery,
    characterShadows, installStreetKit, installObstacleKit, setStreetDetail, installThanos,
    applyWorldBend, setWorldBend, setWorldTime, applyCharacterShader, shieldDome, speedLines,
    particleSystem, landingRings, ribbonTrail, ambientWeather, outskirtForest,
    T, L, P, Basic };
})();
