# PopMap API 技术文档

## 项目概述
PopMap 是一个基于 Cesium.js 的 3D 地球旅行灵感探索和行程规划工具，采用手绘风格设计，面向 Z 世代用户。项目使用纯前端 HTML 实现，集成了 Cesium.js、高德 API 和天地图数据。

## 外部依赖说明

### 核心库
- **Cesium.js v1.111**: 3D 地球可视化引擎
- **高德地图 API v3**: 用于路线规划、地点搜索和 POI 推荐
- **天地图行政区划数据**: 来自阿里云 DataV 的行政区划边界数据

### 样式资源
- Cesium Widgets CSS
- 自定义手绘风格 CSS

## 数据模型

### 1. 城市数据库 (cityDB)
```javascript
const cityDB = [
    { name: '浙江', lng: 120.15, lat: 29.28, level: 'province' },
    { name: '北京', lng: 116.4, lat: 39.9 },
    // ... 其他城市
];
```
**字段说明**:
- `name`: 城市/省份名称
- `lng`: 经度
- `lat`: 纬度  
- `level`: 可选，标识为省份

### 2. POI 数据 (originalPOIs)
```javascript
const originalPOIs = {
    '宁波': [
        { 
            name: '天一阁', 
            type: '景点', 
            rating: 4.5, 
            lng: 121.54, 
            lat: 29.87, 
            intro: '简介内容...',
            hours: '8:30-17:00', 
            ticket: '￥30' 
        },
        // ... 其他 POI
    ],
    // ... 其他城市
};
```
**字段说明**:
- `name`: POI 名称
- `type`: 类型（景点/美食/住宿）
- `rating`: 评分（1-5）
- `lng/lat`: 坐标
- `intro`: 详细介绍
- `hours`: 开放时间
- `ticket`: 门票价格

### 3. 行政区划映射
```javascript
const PROVINCE_MAP = { '浙江省': '330000', '浙江': '330000', ... };
const CITY_TO_PROVINCE = { '宁波': '浙江省', '杭州': '浙江省', ... };
```
**用途**: 省份名称到行政区划代码的映射，以及城市到所属省份的映射。

### 4. 图标映射 (iconMap)
```javascript
const iconMap = {
    '天一阁': './images/tianyi-pavilion.png',
    '老外滩': './images/old-bund.png',
    // ... 其他图标
};
```
**用途**: POI 名称到图标文件的映射。

## 全局状态变量

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `viewer` | Cesium.Viewer | Cesium 3D 视图实例 |
| `currentBoundaryDS` | Cesium.DataSource | 当前显示的行政区划数据源 |
| `currentLabelEntities` | Array | 当前显示的标签实体数组 |
| `currentCity` | Object | 当前选中的城市对象 |
| `currentPOIs` | Array | 当前城市的 POI 数组 |
| `tripList` | Array | 用户行程列表 |
| `currentRouteEntities` | Array | 当前路线实体数组 |
| `currentProvinceEntities` | Array | 当前省份预览实体数组 |
| `currentProvincePois` | Object | 当前省份的 POI 数据 |
| `searchHistory` | Array | 搜索历史记录 |

## DOM 元素引用

| 元素 ID | 类型 | 用途 |
|---------|------|------|
| `location-label` | div | 当前位置显示标签 |
| `search-input` | input | 搜索输入框 |
| `suggestions` | div | 搜索建议下拉框 |
| `right-panel` | div | 右侧面板容器 |
| `poi-section` | div | POI 列表区域 |
| `trip-list` | div | 行程列表区域 |
| `btn-route` | button | 规划路线按钮 |
| `btn-clear-trip` | button | 清空行程按钮 |
| `route-bottom-panel` | div | 底部路线面板 |
| `poi-float-card` | div | POI 浮动卡片 |

## 核心函数列表

### 行政区划相关函数

#### `getProvinceAdcode(cityName)`
**参数**: `cityName` (string) - 城市名称
**返回值**: 省份行政区划代码 (string) 或 null
**功能**: 根据城市名称获取对应的省份行政区划代码
**调用关系**: 被 `flyToLocation` 调用

#### `loadBoundary(adcode)`
**参数**: `adcode` (string) - 行政区划代码
**返回值**: Promise
**功能**: 加载指定行政区划的边界数据并在地图上显示
**调用关系**: 被 `flyToLocation`、`loadChinaBoundary` 调用

#### `loadChinaBoundary()`
**参数**: 无
**返回值**: Promise
**功能**: 加载中国全图边界
**调用关系**: 页面初始化时调用

### 地图导航函数

#### `flyToLocation(locationName)`
**参数**: `locationName` (string) - 地点名称（城市或省份）
**返回值**: Promise
**功能**: 飞行到指定城市或省份，加载对应边界和 POI
**调用关系**: 被搜索框事件、历史记录点击调用
**内部调用**: `loadBoundary`, `renderCityPOIs`, `addHistory`

#### `flyToMultiCities(cityNames)`
**参数**: `cityNames` (Array) - 城市名称数组
**返回值**: Promise
**功能**: 同时显示多个城市，计算中心点并飞行
**调用关系**: 被搜索框多城市搜索调用
**内部调用**: `renderMultiCityPreview`, `addHistory`

### POI 显示函数

#### `renderCityPOIs(pois)`
**参数**: `pois` (Array) - POI 对象数组
**返回值**: 无
**功能**: 在城市周围环形排列显示所有 POI，并设置点击事件
**调用关系**: 被 `flyToLocation` 调用

#### `renderProvincePreview(provinceName)`
**参数**: `provinceName` (string) - 省份名称
**返回值**: 无
**功能**: 渲染省份预览，显示该省份下所有城市的 POI
**调用关系**: 被 `flyToLocation` 调用
**内部调用**: `refreshRightPanel`

#### `renderMultiCityPreview(cityNames)`
**参数**: `cityNames` (Array) - 城市名称数组
**返回值**: 无
**功能**: 渲染多个城市的预览
**调用关系**: 被 `flyToMultiCities` 调用
**内部调用**: `refreshRightPanel`

### 行程管理函数

#### `addToTrip(poi, cityName)`
**参数**: 
- `poi` (Object) - POI 对象
- `cityName` (string) - 城市名称
**返回值**: 无
**功能**: 将 POI 添加到行程列表，有去重和数量限制检查
**调用关系**: 被 POI 添加按钮、浮动卡片添加按钮调用
**内部调用**: `updateTripDisplay`

#### `updateTripDisplay()`
**参数**: 无
**返回值**: 无
**功能**: 更新行程列表的显示，包括优化排序和分日显示
**调用关系**: 被 `addToTrip`、行程删除事件调用
**内部调用**: `optimizeTripOrder`

#### `optimizeTripOrder(list)`
**参数**: `list` (Array) - 行程列表
**返回值**: 优化后的行程列表 (Array)
**功能**: 根据距离阈值对行程进行分组和优化排序
**调用关系**: 被 `updateTripDisplay` 调用

### 路线规划函数

#### `getRoutePath(origin, destination)`
**参数**: 
- `origin` (Object) - 起点坐标 {lng, lat}
- `destination` (Object) - 终点坐标 {lng, lat}
**返回值**: Promise，解析为路线坐标数组或 null
**功能**: 调用高德 API 获取驾驶路线
**调用关系**: 被 `renderRoute` 调用

#### `renderRoute()`
**参数**: 无
**返回值**: Promise
**功能**: 渲染行程中所有点之间的路线，计算总距离和时间，获取沿途推荐
**调用关系**: 被规划路线按钮点击调用
**内部调用**: `getRoutePath`, `calculateDistance`

#### `clearRoute()`
**参数**: 无
**返回值**: 无
**功能**: 清除地图上所有路线实体
**调用关系**: 被 `renderRoute`、清空行程调用

#### `calculateDistance(lat1, lng1, lat2, lng2)`
**参数**: 四个坐标值 (number)
**返回值**: 距离 (string)，单位 km，保留一位小数
**功能**: 计算两个坐标点之间的球面距离
**调用关系**: 被 `renderRoute`、`flyToMultiCities` 调用

### UI 交互函数

#### `showDetail(poi)`
**参数**: `poi` (Object) - POI 对象
**返回值**: 无
**功能**: 在右侧面板显示 POI 详细信息
**调用关系**: 被 POI 详情按钮点击调用

#### `backToList()`
**参数**: 无
**返回值**: 无
**功能**: 从详情页返回 POI 列表页
**调用关系**: 被返回按钮点击调用

#### `showFloatCard(poi, event)`
**参数**: 
- `poi` (Object) - POI 对象
- `event` (Object) - 鼠标事件对象
**返回值**: 无
**功能**: 显示浮动卡片，包含 POI 信息和添加按钮
**调用关系**: 被 POI 名称点击、地图点击调用

#### `refreshRightPanel()`
**参数**: 无
**返回值**: 无
**功能**: 刷新右侧面板的 POI 列表显示
**调用关系**: 被 `renderProvincePreview`、`renderMultiCityPreview` 调用

### 工具函数

#### `addHistory(name)`
**参数**: `name` (string) - 搜索名称
**返回值**: 无
**功能**: 添加搜索历史到 localStorage，最多保存 5 条
**调用关系**: 被 `flyToLocation`、`flyToMultiCities` 调用

## 事件处理说明

### 1. 搜索框事件
- **input 事件**: 实时搜索建议
- **keydown 事件** (Enter): 执行搜索
- **focus 事件**: 显示搜索历史

### 2. 地图点击事件
- **省份预览模式**: 点击省份实体显示右侧面板
- **城市 POI 模式**: 点击 POI 实体显示浮动卡片

### 3. 按钮事件
- **规划路线按钮**: 调用 `renderRoute()`
- **清空行程按钮**: 清空 `tripList` 和路线
- **面板关闭按钮**: 隐藏右侧面板
- **返回按钮**: 从详情页返回列表页
- **添加行程按钮**: 调用 `addToTrip()`
- **详情按钮**: 调用 `showDetail()`
- **删除行程项**: 从 `tripList` 中移除对应项

### 4. 浮动卡片事件
- **关闭按钮**: 隐藏卡片
- **添加按钮**: 调用 `addToTrip()`
- **外部点击**: 自动隐藏卡片

## 初始化流程

1. 创建 Cesium Viewer 实例
2. 配置相机控制器参数
3. 加载中国边界数据
4. 绑定所有事件监听器
5. 显示右侧面板拉出箭头

## 数据存储

### localStorage
- **键名**: `popmap_history`
- **格式**: JSON 数组
- **内容**: 搜索历史记录，最多 5 条
- **操作**: 通过 `addHistory()` 函数管理

## 样式设计特点

1. **手绘风格**: 使用暖色调 (#f8f5e6, #c4813a, #3a2a1a)
2. **圆角设计**: 所有面板和按钮使用圆角
3. **半透明效果**: 面板使用 rgba 背景实现半透明
4. **阴影效果**: 使用 box-shadow 增强层次感
5. **响应式布局**: 使用 flex 布局适应不同屏幕

## 注意事项

1. **API 密钥**: 高德 API 密钥硬编码在代码中，生产环境应考虑安全存储
2. **图标资源**: 部分 POI 有自定义图标，需要确保图片文件存在
3. **性能优化**: 大量实体显示时需注意性能
4. **错误处理**: 网络请求失败时有基本错误处理
5. **浏览器兼容**: 依赖现代浏览器特性