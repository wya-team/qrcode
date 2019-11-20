<p align="center"><image src="https://avatars1.githubusercontent.com/u/34465004?s=400&u=25c4b1279b2f092b368102edac8b7b54dc708d00&v=4" width="128"></p>

# @wya/qrcode
[![npm][npm-image]][npm-url] [![changelog][changelog-image]][changelog-url]

<!--  以下内容无视  -->
[changelog-image]: https://img.shields.io/badge/changelog-md-blue.svg
[changelog-url]: CHANGELOG.md

[npm-image]: https://img.shields.io/npm/v/@wya/qrcode.svg
[npm-url]: https://www.npmjs.com/package/@wya/qrcode

**@wya/qrcode** 生成二维码工具

---

## 安装
``` shell
$ npm install @wya/qrcode --save
```

---

## 示例

```javascript
import qrcode, { createQRCode } from 'wya-qrcode';

createQRCode("github.com");
```

---

## 设置开发环境
克隆仓库之后，运行：

```shell
$ yarn install # 是的，推荐使用 yarn。 :)
```

```shell
# 监听并自动重新构建
$ npm run dev

# 单元测试
$ npm run test

# 构建所有发布文件
$ npm run pub
```

---

## 项目结构
+ **`assets`**: logo 文件。
+ **`config`**: 包含所有和构建过程相关的配置文件。
+ **`docs`**: 项目主页及文档。
+ **`lib`**: 包含用来发布的文件，执行 `npm run lib` 脚本后，这个目录不会被上传。
+ **`tests`**: 包含所有的测试，单元测试使用
+ **`src`**: 源代码目录。
+ **`demo`**: 在线运行的例子。
+ **`examples`**: 在线运行的源代码。

---

## API

### `createQRCode` 

- `createQRCode(url: String, options: Object)`

生成二维码

+ **url**: 目标对象。
+ **options**: 可配置选项

*rule:* 规则:
+ **cellSize**: *Number* 默认：6, 网格的大小
+ **margin**: *Number*  默认：0, 四周的边距
+ **typeNumber**: *Number* 默认：5, 取值范围`[1,40]`, 二维码数据最小值（字符串过多时，动态递增, 避免生成失败）
+ **mime**: *String* 文件类型 

**示例**

```javascript
createQRCode("github.com");
```
---

## 开源许可类型
MIT

## FAQ
Q: ？  
A: 。


