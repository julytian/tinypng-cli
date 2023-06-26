import cac from "cac";
import { getVersion } from "./utils/index"

const cli = cac("tinypng");
cli
  .command("[...imgs]", "需要压缩的图片文件或目录")
  .option("-r, --recursive", "递归查找图片文件")
  .option("-z, --zip", "压缩图片文件或目录为zip文件")
  .example("tinypng xxx.png")
  .example("tinypng xxx.png -z")
  .example("tinypng xxx目录 -r")
  .example("tinypng xxx目录 -z")
  .action(async (imgs, options) => {
    const { init } = await import("./commands/init");
    return init(imgs, options);
  });
cli.version(getVersion());
cli.help();
cli.parse();
