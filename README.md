# 工具箱 (Toolbox)

一个基于 **Vue 3 + TypeScript + Vite** 的纯前端工具箱。首页列出已注册的工具，点击工具入口进入对应首页，目前包含图片转换工具。

可以将图片 / GIF 转换为 **Base64、SVG、HTML、CSS** 等代码，并支持**分辨率调整**（等比放大 / 缩小，非裁剪）。所有处理均在浏览器本地完成，图片不会上传到服务器。

## 开发

使用 Node.js `^20.19.0 || >=22.12.0`，运行 `npm ci` 安装依赖、`npm run dev` 启动开发服务、`npm run build` 进行类型检查和生产构建。

## 工程结构

```text
src/
	App.vue                     # 应用外壳、路由缓存、全局提示
	layouts/AppHeader.vue       # 公共导航
	pages/ToolboxHome.vue        # 工具箱首页
	router/index.ts             # Hash 路由
	shared/
		components/               # 工具入口、全局提示组件
		composables/              # 共享提示状态
	styles/                     # 公共主题与工具箱布局
	tools/
		registry.ts               # 工具元数据及懒加载入口
		image-converter/
			ImageConverterPage.vue  # 图片工具首页与流程
			image-converter.css     # 图片页 scoped 样式
			components/             # 上传、预览、设置、输出
			utils/                  # 图片处理、编码与下载
			types.ts                # 图片工具领域类型
	types/                      # 第三方模块类型声明
```

## 新增工具

1. 在 `src/tools/<tool-id>/` 下创建工具页面，专属组件、逻辑、类型与样式放在该目录内。
2. 在 `src/tools/registry.ts` 的 `tools` 数组中添加唯一的 `id`、`path`、`name`、`category`、图标及页面懒加载函数。
3. 首页入口与工具路由会自动生成，无需修改应用外壳；通用能力放入 `src/shared/`。

首页地址为 `#/`，图片工具为 `#/tools/image-converter`。Hash 路由支持 GitHub Pages 子目录部署和直接刷新。工具页通过 `KeepAlive` 保留当前会话状态，返回首页再进入不会清空已选择的图片；刷新浏览器后状态重置。

## 🎬 演示效果

![图片转换工具箱演示](src/assets/ImageConversion演示.gif)

## � 在线dome

https://qbbhgn.github.io/ImageConversion/

#

## �📄 开源协议

本项目采用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans)（知识共享-署名-非商业性使用 4.0 国际）协议。

> 您可以自由使用、修改、分享本项目，但**不得用于商业目的**，且需保留原作者署名。

## 👤 作者

**添碗**
