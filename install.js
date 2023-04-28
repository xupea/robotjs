const { promises: fs } = require('fs');
const path = require('path');
const util = require('util');
const ora = require('ora');
const download = require('download');
const rimraf = require('rimraf');
const throttle = require('lodash.throttle');
const si = require('systeminformation');

const CWD = process.cwd();
const BUILD_FOLDER = path.join(CWD, 'build');
const RELEASE_FOLDER = path.join(CWD, 'build/Release');

const DIST_URL = 'https://www.xupea.com/robotjs';
// const SUPPORTED_PLATFORM = ['darwin', 'win32', 'ubuntu', 'kylin', 'uos'];
// const SUPPORTED_ARCH = ['x64', 'x86', 'arm64', 'mips64el'];

async function getRobotjsPath() {
  if (process.env.npm_config_custom) {
    return process.env.npm_config_custom;
  }

  const cpu = await si.cpu();
  const osInfo = await si.osInfo();

  if (osInfo.platform === 'linux') {
    const arch = cpu.arch || osInfo.arch || process.arch;
    if (arch === 'x64' && cpu.vendor === 'Hygon') {
      return `${osInfo.distro}-${arch}-Hygon`;
    } else if (arch === 'mips64el') {
      return `${osInfo.distro}-${arch}-Loongson`;
    } else if (arch === 'arm64') {
      return `${osInfo.distro}-${arch}`;
    } else if (arch === 'loong64') {
      return `${osInfo.distro}-${arch}-Loongson`;
    }
  }

  const segments = [process.platform, process.arch];

  return segments.join('-');
}

function getAssetUrl(path) {
  return `${DIST_URL}/${path}/robotjs.node`;
}

async function downloadArtifact(source, dest) {
  const spinner = ora(`Downloading ${source}`).start();
  // https://github.com/kevva/decompress-unzip/issues/12
  await download(source, dest, {
    extract: true,
    map: (file) => {
      if (file.type === 'file' && file.path.endsWith('/')) {
        file.type = 'directory';
      }
      return file;
    },
  }).on(
    'downloadProgress',
    throttle(({ percent, transferred, total }) => {
      spinner.info(
        `Downloading progress ${(percent * 100).toFixed(
          2
        )}% ${transferred}/${total}kb ${source} `
      );
    }, 500)
  );
  spinner.succeed(`Downloaded ${source}`);
}

async function install() {
  //   if (!SUPPORTED_PLATFORM.includes(os.platform())) {
  //     throw Error(`Platform: ${os.platform()} is not supported!`);
  //   }
  //   if (!RTM_ARTIFACTS[`${os.platform()}-${arch}`]) {
  //     throw Error(`Arch: ${arch} is not supported!`);
  //   }
  await util.promisify(rimraf)(BUILD_FOLDER);
  await fs.mkdir(BUILD_FOLDER);
  await fs.mkdir(RELEASE_FOLDER);

  const robotjsAssetUrl = getAssetUrl(await getRobotjsPath());
  await downloadArtifact(robotjsAssetUrl, RELEASE_FOLDER);
}

install().catch((error) => {
  console.error(error);
  process.exit(-1);
});
