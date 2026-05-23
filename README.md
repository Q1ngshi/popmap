# 🌍 PopMap · 3D 地球旅行规划工具

> 手绘风格 3D 地球旅行灵感探索与跨城行程规划 — 为 Z 世代打造的零框架纯前端应用

[![在线演示](https://img.shields.io/badge/在线演示-点击体验-3a2a1a?style=for-the-badge&logo=cesium)](http://localhost:8080)  
[![技术栈](https://img.shields.io/badge/技术栈-Cesium.js%20%2B%20高德API%20%2B%20天地图-c4813a?style=for-the-badge)](https://cesium.com)  
[![项目状态](https://img.shields.io/badge/项目状态-生产可用-6a8a5a?style=for-the-badge)](https://github.com/yourusername/popmap)  
[![许可证](https://img.shields.io/badge/许可证-仅供学习使用-8a7a6a?style=for-the-badge)](LICENSE)

**PopMap** 是一款零构建、零依赖的纯前端 3D 旅行探索应用，将地球作为画布，以"冰箱贴"式的直觉交互探索中国各地的旅行灵感。在地球上旋转、缩放，点击城市，发现景点，规划跨城行程。

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| **3D 地球可视化** | 基于 Cesium.js 的高精度地球渲染，支持旋转、缩放、倾斜 |
| **省份边界 + 城市标识** | 加载天地图行政区划边界，核心城市以标签形式悬浮于地球表面 |
| **城市星爆布局** | 选中城市后，POI 以环形排列散开，如星爆般环绕城市中心 |
| **跨城市行程管理** | 支持从多个城市挑选景点加入行程，统一规划路线 |
| **POI 详情弹窗** | 点击景点弹出详细信息卡片：评分、开放时间、门票、介绍 |
| **智能搜索多城市解析** | 搜索框支持 `宁波 杭州` 多城语法，一键同时预览多个城市 |
| **路线规划** | 调用高德 API 计算驾车路线，自动估算距离与耗时 |
| **手绘风格 UI** | 暖色调配色、圆角卡片、毛笔字气质，致敬旅行手账美学 |

---

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 3D 引擎 | **Cesium.js v1.111** | 地球渲染、相机控制、实体管理 |
| 地图数据 | **天地图 / 阿里 DataV** | 行政区划 GeoJSON 边界数据 |
| 路线/搜索 | **高德地图 API v3** | 驾车路线规划、POI 搜索 |
| 前端 | **原生 HTML / CSS / JavaScript** | 零框架、零构建，开箱即用 |

## 🚀 快速开始

### 前置条件

1. **Cesium Ion Access Token**  
   前往 [Cesium Ion](https://ion.cesium.com/signup) 注册并获取 Token，替换 `js/app.js` 中的 `Cesium.Ion.defaultAccessToken`。

2. **高德地图 API Key**  
   前往 [高德开放平台](https://lbs.amap.com/) 注册并获取 Web 端 Key，替换 `js/app.js` 中的 `AMAP_KEY`。

### 启动方式

项目为零构建纯前端实现，使用任意静态服务器即可运行：

```bash
# Python（推荐）
cd C:\Users\32268\Desktop\popmap
python -m http.server 8080
```

```bash
# 或使用 npx
npx serve .
```

然后浏览器打开 `http://localhost:8080` 即可体验。

> **注意**：由于 Cesium.js 通过 CDN 加载，首次访问可能需要较长时间，建议在网络良好的环境下运行。

## 📁 项目结构

```
popmap/
├── index.html              # 主入口页面
├── Popmap.html             # 备用入口
├── API.md                  # 函数级 API 技术文档
├── README.md               # 本文件
├── css/
│   └── style.css           # 手绘风格全局样式
├── js/
│   └── app.js              # 核心逻辑（357 行）
└── images/
    ├── west-lake.png       # 西湖
    ├── leifeng-pagoda.png  # 雷峰塔
    ├── lingyin-temple.png  # 灵隐寺
    ├── tianyi-pavilion.png # 天一阁
    ├── old-bund.png        # 老外滩
    ├── ningbo-museum.png   # 宁波博物馆
    └── dongqian-lake.png   # 东钱湖
```

---

## 🎮 使用指南

### 搜索城市

在顶部搜索框输入城市或省份名称（如 `浙江`、`宁波`、`杭州`），按回车后地球自动飞向目标区域并加载行政区划边界。

支持多城市语法，用空格分隔：输入 `宁波 杭州` 可同时预览两座城市。

### 查看景点

选中城市后，景点以环形排列在 3D 地球上。点击景点名称弹出浮动卡片，点击卡片上的 **详情** 可查看完整信息（评分、开放时间、门票、简介）。

顶部筛选栏支持按 **景点 / 美食 / 住宿** 切换类型。

### 规划路线

1. 在浮动卡片或右侧面板中点击 **+ 添加** 将景点加入行程
2. 行程支持跨城市组合（如宁波天一阁 + 杭州雷峰塔）
3. 点击 **规划路线** 按钮，系统自动计算最优驾车路线
4. 底部面板展示路线距离、耗时及沿途推荐

### 其他操作

- **拖拽旋转**：鼠标左键拖拽旋转地球
- **滚轮缩放**：拉近/拉远视角
- **右侧面板**：点击地球右侧箭头拉出完整 POI 列表和行程面板
- **搜索历史**：点击搜索框可查看最近 5 条搜索记录

---

## 📸 界面截图

| 功能模块 | 截图 | 说明 |
|----------|------|------|
| **地球主视图** | `screenshots/earth-view.png` | 3D 地球 + 省份边界 + 城市标签悬浮 |
| **城市星爆布局** | `screenshots/city-poi.png` | 宁波城市 POI 环形散开，如星爆环绕 |
| **POI 详情弹窗** | `screenshots/detail-card.png` | 手绘风格卡片，展示评分/开放时间/门票 |
| **跨城路线规划** | `screenshots/route-panel.png` | 多城市行程组合，自动计算驾车路线 |

## 🛠️ 开发与贡献

### 本地开发
1. 克隆仓库：`git clone https://github.com/yourusername/popmap.git`
2. 安装依赖：无需安装（零依赖项目）
3. 启动服务：`python -m http.server 8080`
4. 打开浏览器访问 `http://localhost:8080`

### 代码规范
- 使用 ES6+ 语法，避免全局变量污染
- CSS 采用 BEM 命名规范
- 关键函数添加 JSDoc 注释

### 待实现功能
- [ ] 行程分享链接生成
- [ ] Cesium.js 本地化部署
- [ ] 移动端手势优化
- [ ] 性能监控埋点

## 📄 许可证

仅供学习与个人使用，未经许可不得用于商业用途。

## 👥 贡献者

- **Marvis** — AI 电脑助手联合构建
- **DeepSeek** — 架构与优化建议
- **你** — 欢迎提交 Pull Request！