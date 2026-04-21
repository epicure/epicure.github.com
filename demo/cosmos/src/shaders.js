const SHADER_FILES = {
  common: 'shaders/common.glsl',
  'planet-vs': 'shaders/planet.vert',
  'planet-fs': 'shaders/planet.frag',
  'atmo-vs': 'shaders/atmo.vert',
  'atmo-fs': 'shaders/atmo.frag',
  'cloud-vs': 'shaders/cloud.vert',
  'cloud-fs': 'shaders/cloud.frag',
  'ring-vs': 'shaders/ring.vert',
  'ring-fs': 'shaders/ring.frag',
  'bake-vs': 'shaders/bake.vert',
  'bake-elev-fs': 'shaders/bake-elevation.frag',
  'bake-normal-fs': 'shaders/bake-normal.frag',
  'bake-albedo-fs': 'shaders/bake-albedo.frag',
  'bake-emissive-fs': 'shaders/bake-emissive.frag',
  'nebula-vs': 'shaders/nebula.vert',
  'nebula-fs': 'shaders/nebula.frag',
  'stars-vs': 'shaders/stars.vert',
  'stars-fs': 'shaders/stars.frag',
  'rays-vs':  'shaders/rays.vert',
  'rays-fs':  'shaders/rays.frag',
};

const cache = {};
let commonSrc = '';

export async function loadShaders(){
  const entries = await Promise.all(
    Object.entries(SHADER_FILES).map(async ([key, path]) => {
      const res = await fetch(path);
      if(!res.ok) throw new Error(`Shader load failed: ${path} (${res.status})`);
      return [key, await res.text()];
    })
  );
  for(const [k, v] of entries) cache[k] = v;
  commonSrc = cache.common;
}

export const injectCommon = (src) => src.replace('#include_common', commonSrc);
export const getShader = (id) => {
  if(!(id in cache)) throw new Error(`Shader not loaded: ${id}`);
  return cache[id];
};
