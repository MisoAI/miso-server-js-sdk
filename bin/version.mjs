import { fileURLToPath } from 'url';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VERSION_REGEXP = /^\d+\.\d+\.\d+(?:-beta\.\d+)?$/;
const version = process.argv[2];

if (!version) {
  console.log(`Usage: npm run version [version]`);
  process.exit();
}
if (!VERSION_REGEXP.test(version)) {
  console.error(`Illegal version: ${version}`);
  process.exit(1);
}

const rootDir = join(__dirname, '..');
const VERSION_FILE_NAME = 'src/version.js';
const PACKAGE_FILE_NAME = 'package.json';

function writeVersionFile(path, version) {
  const filePath = join(rootDir, path, VERSION_FILE_NAME);
  if (existsSync(filePath)) {
    writeFileSync(filePath, `export default '${version}';`);
  }
}

function readPackageFileSync(path) {
  const file = join(path, PACKAGE_FILE_NAME);
  return existsSync(file) ? JSON.parse(readFileSync(file)) : undefined;
}

function writePackageFileSync(path, data) {
  const file = join(path, PACKAGE_FILE_NAME);
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
  }
  writeFileSync(join(path, PACKAGE_FILE_NAME), JSON.stringify(data, null, 2));
}

// read root package.json
const root = readPackageFileSync(rootDir);

// find workspaces
// TODO: support wildcard
const projectPaths = root.workspaces;
const projects = [];
const projectPathToModuleName = {};

// first pass: collect some info
for (const projectPath of projectPaths) {
  const project = readPackageFileSync(join(rootDir, projectPath));
  !project.private && projects.push({ projectPath, project });
  projectPathToModuleName[projectPath] = project.name;
}

function overwriteDependencyVersions(dependencies, version) {
  if (!dependencies) {
    return;
  }
  for (const moduleName in dependencies) {
    const oldVersion = dependencies[moduleName];
    if (oldVersion === '*' || (oldVersion.startsWith('file:') && projectPathToModuleName[oldVersion.substring(5)] === moduleName)) {
      dependencies[moduleName] = version;
    }
  }
}

// second pass: overwrite versions
for (const { projectPath, project } of projects) {
  overwriteDependencyVersions(project.dependencies, version);
  overwriteDependencyVersions(project.devDependencies, version);
  overwriteDependencyVersions(project.peerDependencies, version);
  project.version = version;
  writePackageFileSync(join(rootDir, projectPath), project);
  writeVersionFile(projectPath, version);
}
