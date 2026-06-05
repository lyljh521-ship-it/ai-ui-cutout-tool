---
name: ui-dual-bg-cutout
description: Process game UI/icon screenshots for the local UI cutout website by generating a single side-by-side dual-background image, splitting it into green and magenta inputs, and using the dual-background cutout workflow. Use when the user provides UI art/icon resources and wants transparent PNG UI elements while preserving semi-transparent glow, shadow, and original color.
---

# UI 双底色拆图流程

当用户提供游戏 UI、图标、招募图、技能图、按钮、边框、卡牌等资源，并希望拆成透明 PNG 图素时，使用这套流程。

## 核心流程

1. 用图像生成/编辑能力生成 **一张左右并排图**。
2. 左半边是同一个图标，背景换成纯绿色 `#00FF00`。
3. 右半边是同一个图标，背景换成纯洋红色 `#FF00FF`。
4. 两半边必须尽量保持前景一致：内容、文字、样式、大小、位置、裁切、光效、阴影、装饰都要一致。
5. 不要分别生成两张图；优先在同一次生成里做左右双版本。
6. 将生成图裁成左右两半。
7. 上传网站前必须检查并修正对齐：两张图尺寸一致、画布一致、图标位置一致、图标大小一致、主要文字/装饰/光效位置一致。
8. 必要时裁切、补边、平移其中一张，让两张图符合双底色精算输入标准。
9. 左半边作为网站第 1 张图，右半边作为网站第 2 张图。
10. 用本地网站的双底色精算模式拆分透明 PNG。

## 推荐提示词

```text
Edit the provided game UI icon image into one side-by-side comparison image. On a single canvas, place two equal-size copies of the same icon: left copy has only the background/backplate changed to solid chroma green #00FF00, right copy has only the background/backplate changed to solid chroma magenta #FF00FF. The foreground UI icon must be matched as closely as possible between the two copies: same text, same ornaments, same glow, same shadows, same highlights, exact same scale, exact same position within each half, same crop and same aspect ratio. Do not add labels, borders, checkerboard, transparency, or extra decorations. The only intended difference between left and right should be background color.
```

根据资源内容替换 foreground 描述，例如卷轴、招募牌、按钮、头像框、技能图标、奖励图标等。

## 注意事项

- 不要用两次独立生成来得到绿底和洋红底，容易出现位置、大小、样式不一致。
- 这个方法不是数学上的像素级保证，但在实际拆图流程里比两张独立生成更稳定。
- 如果左右两半差异仍然明显，应重新生成一张左右并排图，而不是单独修其中一张。
- 生成结果只是双底色输入，不是最终透明资源。
- 上传网站之前必须做对齐检查。绿底图和洋红图需要同宽高、同画布、同坐标；前景若有位移、缩放或裁切差异，会导致双底色精算出现错误透明度和色差。

## 对齐标准

上传网站前，两张图必须满足：

- 图片宽高完全一致。
- 图标主体外接范围一致。
- 文字、装饰、光效、阴影位置尽量一致。
- 不能一张图多裁或少裁边。
- 不能有明显缩放差异。
- 如果无法修正到足够一致，应重新生成左右并排图。

## 本地网站

网站路径：

```text
C:\Users\liuyunlong\Documents\自动抠图\index.html
```

导入方式：

1. 打开网站。
2. 先确认绿底左半图和洋红右半图已经对齐。
3. 上传绿底左半图作为第 1 张图。
4. 上传洋红右半图作为第 2 张图。
5. 确认状态显示双图精算启用。
6. 拆分并下载透明 PNG。

## 对用户的简短说明

可以这样解释：

“这套流程是先让模型在同一张图里生成绿底和洋红底两个版本，这样比两次单独生成更容易保持位置和样式一致。裁成两张图后，先检查并修正同尺寸、同位置、同大小，再分别导入网站，利用双底色精算恢复透明度和原色。”
