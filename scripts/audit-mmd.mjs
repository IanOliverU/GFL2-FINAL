import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MMDLoader } from 'three-stdlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'assets-source/Character MMD');
const selectedRelativePath =
  process.env.MMD_MODEL ?? 'Tololo (Default)/GirlsFrontline TololoDefault.pmx';
const selectedPath = resolve(sourceRoot, selectedRelativePath);
const parser = new MMDLoader()._getParser();

async function findPmxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await findPmxFiles(path)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pmx')) files.push(path);
  }
  return files.sort();
}

async function parsePmx(path) {
  const bytes = await readFile(path);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const model = parser.parsePmx(buffer, true);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const vertex of model.vertices) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], vertex.position[axis]);
      max[axis] = Math.max(max[axis], vertex.position[axis]);
    }
  }
  return {
    bytes,
    model,
    bounds: { min, max, size: max.map((value, axis) => value - min[axis]) },
  };
}

const files = await findPmxFiles(sourceRoot);
const inventory = [];
for (const path of files) {
  const { bytes, model, bounds } = await parsePmx(path);
  inventory.push({
    path: relative(root, path).replaceAll('\\', '/'),
    modelName: model.metadata.modelName,
    englishModelName: model.metadata.englishModelName,
    format: `${model.metadata.format} ${model.metadata.version}`,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bounds,
    counts: {
      vertices: model.vertices.length,
      faces: model.faces.length,
      materials: model.materials.length,
      textures: model.textures.length,
      bones: model.bones.length,
      morphs: model.morphs.length,
      rigidBodies: model.rigidBodies.length,
      constraints: model.constraints.length,
    },
  });
}

if (!existsSync(selectedPath)) throw new Error(`Selected PMX not found: ${selectedPath}`);
const { model: selected, bounds } = await parsePmx(selectedPath);
const bonePattern =
  /全て|センター|グルーブ|腰|下半身|上半身|首|頭|目|肩|腕|ひじ|手首|足|ひざ|つま先|親指|人指|中指|薬指|小指|weapon|gun|rifle|muzzle|root|center|pelvis|spine|chest|neck|head|eye|shoulder|arm|elbow|wrist|leg|knee|ankle|toe/i;
const selectedDirectory = dirname(selectedPath);
const selectedDetails = {
  path: relative(root, selectedPath).replaceAll('\\', '/'),
  bounds,
  textures: selected.textures.map((reference) => {
    const resolved = resolve(selectedDirectory, reference.replaceAll('\\', '/'));
    return {
      reference,
      resolved: relative(root, resolved).replaceAll('\\', '/'),
      exists: existsSync(resolved),
    };
  }),
  materials: selected.materials.map((material, index) => ({
    index,
    name: material.name,
    englishName: material.englishName,
    alpha: material.diffuse[3],
    doubleSided: (material.flag & 1) !== 0,
    edgeEnabled: (material.flag & 16) !== 0,
    textureIndex: material.textureIndex,
    environmentTextureIndex: material.envTextureIndex,
    environmentMode: material.envFlag,
    toonMode: material.toonFlag,
    toonIndex: material.toonIndex,
  })),
  relevantBones: selected.bones
    .map((bone, index) => ({
      index,
      name: bone.name,
      englishName: bone.englishName,
      parentIndex: bone.parentIndex,
      position: bone.position,
    }))
    .filter((bone) => bonePattern.test(`${bone.name} ${bone.englishName}`)),
  morphs: selected.morphs.map((morph, index) => ({
    index,
    name: morph.name,
    englishName: morph.englishName,
    type: morph.type,
    elementCount: morph.elements.length,
  })),
};

console.log(JSON.stringify({ sourceRoot, inventory, selected: selectedDetails }, null, 2));
