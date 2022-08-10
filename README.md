# tinypng-cli

An command line tool for tinypng.com

## Usage

```sh
$ tinypng <command> [<args>]
# 帮忙信息
$ tinypng --help
# 压缩单个图片
$ tinypng xxx.png
# 压缩单个图片并生成zip包
$ tinypng xxx.png -z
# 压缩整个目录下的图片
$ tinypng xxx目录
# 压缩整个目录下的图片并生成zip包
$ tinypng xxx目录 -z
# 压缩整个目录下的所有图片，递归遍历子目录
$ tinypng xxx目录 -r
# 解压zip包并压缩里面的图片,并重新生成zip包
$ tinypng xxx.zip
```
