import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import minimatch from "minimatch";
import consola from "consola";
import color from "picocolors";
import glob from "fast-glob";
import { zip } from "compressing";
import { Spinner, createSpinner } from "nanospinner";
import { ensureDir, remove, copy } from "fs-extra";
import { IMG_PATTERN, TINYPNG_DOMAIN } from "../config/constant";
import { filterSize, getRandomIp, toPercent } from "../utils";

let isZip: boolean = false;
let tempDir: string = "";
let count: number = 0;
let images: string[] = [];
let source: string = ""; // 入口文件

export async function init(
  imgs: string[],
  options: { recursive: boolean; zip: boolean }
) {
  const target = imgs[0];
  source = target;
  const { zip, recursive } = options;
  isZip = zip;
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      const files = glob.sync(
        `${target}${recursive ? "/**" : ""}/${IMG_PATTERN}`
      );
      if (files.length) {
        images.push(...files);
      } else {
        consola.info(color.yellow(`没有找到任何图片文件`));
      }
    } else if (minimatch(target, IMG_PATTERN, { matchBase: true })) {
      images.push(target);
    } else if (target.endsWith(".zip")) {
      try {
        const files = (await uncompressZip(target)) as string[];
        if (files.length) {
          images = images.concat(files);
        }
      } catch (error) {
        consola.error(color.red(`解压zip文件失败，请检查zip文件是否正确`));
      }
    }
    if (images.length) {
      images.forEach((img: string) => {
        fileUpload(img);
      });
    } else {
      consola.error(
        color.red(`[${target}]名字已更改，暂不支持改名后的zip解压`)
      );
    }
  } else {
    consola.error(color.red(`${target} 不存在`));
  }
}

function uncompressZip(target: string) {
  return new Promise((resolve, reject) => {
    new zip.UncompressStream({ source: target })
      .on("entry", async (header, stream, next) => {
        stream.on("end", next);
        if (header.type === "file") {
          const { dir } = path.parse(header.name);
          if (!tempDir && dir) {
            tempDir = dir;
          }
          if (!fs.existsSync(dir)) {
            await ensureDir(dir);
          }
          stream.pipe(fs.createWriteStream(header.name));
        } else {
          ensureDir(header.name, (err) => {
            if (err) {
              return;
            }
            stream.resume();
          });
        }
      })
      .on("error", reject)
      .on("finish", () => {
        const arr: string[] = [];
        const files = glob.sync(`${tempDir}/**/${IMG_PATTERN}`);
        files.forEach((file: string) => {
          arr.push(file);
        });
        resolve(arr);
      });
  });
}
async function compressZip() {
  if (source.endsWith(".zip")) {
    const dir = path.basename(source, path.extname(source));
    const flag = !tempDir.startsWith(dir);
    if (flag) {
      await copy(tempDir, dir);
    }
    remove(source, () => {
      zip
        .compressDir(tempDir, source)
        .then(() => {
          if (flag) {
            remove(tempDir);
          }
          consola.success(color.bgMagenta(`[${source}]压缩成功！`));
        })
        .catch((err: any) => {
          consola.error("压缩失败", err);
        });
    });
  } else if (fs.lstatSync(source).isDirectory()) {
    zip
      .compressDir(source, source + ".zip")
      .then(() => {
        consola.success(color.bgMagenta(`[${source}]zip压缩成功！`));
      })
      .catch(() => {
        consola.error("压缩失败");
      });
  } else {
    const { dir, name } = path.parse(source);
    const url = path.join(dir, name);
    zip
      .compressFile(source, `${url}.zip`)
      .then(() => {
        consola.success(color.bgMagenta(`[${source}]zip压缩成功！`));
      })
      .catch(() => {
        consola.error("压缩失败");
      });
  }
}

function fileUpload(target: string) {
  const spinner = createSpinner(`[图片 - ${target}]: 开始上传...`).start();
  const index = Math.round(Math.random());
  const options = {
    method: "POST",
    hostname: TINYPNG_DOMAIN[index],
    path: "/backend/opt/shrink",
    headers: {
      "Postman-Token": Date.now(),
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
      "X-Forwarded-For": getRandomIp(),
    },
    rejectUnauthorized: false,
  };
  const req = https.request(options, (res) => {
    res.on("data", (buffer) => {
      const data = JSON.parse(buffer.toString());
      if (data.error) {
        spinner.error({
          text: `[图片-${target}]: 上传失败！报错：${data.message}`,
        });
      } else {
        fileUpdate(target, data, spinner);
      }
    });
  });
  req.write(fs.readFileSync(target), "binary");
  req.on("error", (e) => {
    spinner.error({ text: `[图片-${target}]: 上传失败！报错：${e.message}` });
  });
  req.end();
}

function fileUpdate(target: string, data: any, spinner: Spinner) {
  const url = new URL(data.output.url);
  const req = https.request(url, (res) => {
    let body = "";
    res.setEncoding("binary");
    res.on("data", (chunk) => {
      body += chunk;
    });
    res.on("end", () => {
      fs.writeFile(target, body, "binary", async (err) => {
        count++;
        if (err) {
          spinner.error({
            text: `[${target}]: 下载失败！报错：${err.message}`,
          });
          return;
        }
        const info = `${color.cyan(
          `[图片 - ${target}]: `
        )} \n 压缩成功，原始大小: ${color.yellow(
          filterSize(data.input.size)
        )}，压缩大小: ${color.blue(
          filterSize(data.output.size)
        )}，优化比例: ${color.red(toPercent(1 - data.output.ratio))}\n `;
        spinner.success({
          text: info,
        });
        if (count === images.length) {
          consola.success(color.bgMagenta("全部图片压缩完成！"));
          if (isZip) {
            compressZip();
          }
        }
      });
    });
  });
  req.on("error", (e) => {
    spinner.error({ text: `[${target}]: 下载失败！报错：${e.message}` });
  });
  req.end();
}
