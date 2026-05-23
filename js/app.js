// ===== 配置从 config.js 加载 =====
window.CESIUM_BASE_URL = window.POPMAP_CONFIG?.cesiumBaseUrl || 'https://cesium.com/downloads/cesiumjs/releases/1.111/Build/Cesium/';
Cesium.Ion.defaultAccessToken = window.POPMAP_CONFIG?.cesiumToken || '';
const AMAP_KEY = window.POPMAP_CONFIG?.amapKey || '';

// ===== 全局工具函数 =====
function showLoading(show) {
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.classList.toggle('show', show);
}
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.remove('show');
        void toast.offsetWidth; // 触发重排
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }
}
function hideFirstGuide() {
    const guide = document.getElementById('first-guide');
    if (guide) guide.style.display = 'none';
    localStorage.setItem('popmap_first_visit', 'true');
}
// 立即绑定引导按钮事件（不等 DOMContentLoaded，否则 Cesium 加载期间按钮无响应）
(function() {
    const btn = document.querySelector('.guide-close');
    if (btn) btn.addEventListener('click', hideFirstGuide);
})();

// ===== 性能监控与埋点系统 =====
const Perf = {
    _marks: {},
    _metrics: {
        pageLoad: 0,
        searchCount: 0,
        poiClicks: 0,
        routePlans: 0,
        errors: 0,
        fps: 0,
        memory: 0
    },
    start(label) {
        this._marks[label] = performance.now();
    },
    end(label) {
        if (!this._marks[label]) return -1;
        const duration = (performance.now() - this._marks[label]).toFixed(0);
        console.log(`⏱ [Perf] ${label}: ${duration}ms`);
        delete this._marks[label];
        return parseInt(duration);
    },
    report() {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
            this._metrics.pageLoad = nav.domContentLoadedEventEnd.toFixed(0);
            console.log(`📊 [Perf] 页面加载: ${this._metrics.pageLoad}ms`);
        }
        const paint = performance.getEntriesByType('paint');
        paint.forEach(p => console.log(`📊 [Perf] ${p.name}: ${p.startTime.toFixed(0)}ms`));
    },
    increment(metric) {
        if (this._metrics[metric] !== undefined) {
            this._metrics[metric]++;
            this._saveToStorage();
        }
    },
    set(metric, value) {
        if (this._metrics[metric] !== undefined) {
            this._metrics[metric] = value;
            this._saveToStorage();
        }
    },
    _saveToStorage() {
        try {
            localStorage.setItem('popmap_perf_metrics', JSON.stringify(this._metrics));
        } catch (e) {}
    },
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('popmap_perf_metrics');
            if (saved) {
                this._metrics = { ...this._metrics, ...JSON.parse(saved) };
            }
        } catch (e) {}
    },
    getReport() {
        return {
            ...this._metrics,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            platform: navigator.platform,
            language: navigator.language
        };
    },
    showDebugPanel() {
        const report = this.getReport();
        const panel = document.createElement('div');
        panel.id = 'perf-debug-panel';
        panel.style.cssText = `
            position: fixed; top: 20px; left: 20px; z-index: 9999;
            background: rgba(0,0,0,0.85); color: #fff; padding: 16px;
            border-radius: 8px; font-family: monospace; font-size: 12px;
            max-width: 400px; max-height: 80vh; overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                <strong>🎯 PopMap 性能监控</strong>
                <button style="background:none;border:none;color:#fff;cursor:pointer;" onclick="document.getElementById('perf-debug-panel').remove()">×</button>
            </div>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td>页面加载</td><td>${report.pageLoad}ms</td></tr>
                <tr><td>搜索次数</td><td>${report.searchCount}</td></tr>
                <tr><td>POI点击</td><td>${report.poiClicks}</td></tr>
                <tr><td>路线规划</td><td>${report.routePlans}</td></tr>
                <tr><td>错误次数</td><td>${report.errors}</td></tr>
                <tr><td>屏幕尺寸</td><td>${report.screen}</td></tr>
                <tr><td>平台</td><td>${report.platform}</td></tr>
                <tr><td>语言</td><td>${report.language}</td></tr>
                <tr><td>时间</td><td>${new Date(report.timestamp).toLocaleString()}</td></tr>
            </table>
            <div style="margin-top:10px;font-size:10px;color:#aaa;">
                访问 popmap.html?debug 显示此面板
            </div>
        `;
        document.body.appendChild(panel);
    }
};
window.Perf = Perf;

// 初始化埋点
Perf.loadFromStorage();

// 页面关闭时保存埋点数据
window.addEventListener('beforeunload', () => {
    Perf._saveToStorage();
});

// 检查是否显示 debug 面板
if (new URLSearchParams(window.location.search).has('debug')) {
    setTimeout(() => Perf.showDebugPanel(), 1000);
}

// FPS 监控
let frameCount = 0;
let lastTime = performance.now();
function updateFPS() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
        Perf.set('fps', frameCount);
        frameCount = 0;
        lastTime = now;
    }
    requestAnimationFrame(updateFPS);
}
updateFPS();

// ===== 初始化 =====
const viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayerPicker: false, geocoder: false, homeButton: false,
    sceneModePicker: false, navigationHelpButton: false, animation: false,
    timeline: false, fullscreenButton: false, scene3DOnly: true,
    imageryProvider: false
});
viewer.cesiumWidget.creditContainer.style.display = 'none';
viewer.scene.fxaa = false;
viewer.imageryLayers.removeAll();
viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#f8f5e6');
// 地形：优先真实地形，降级为椭球体
let useRealTerrain = false;
try {
    if (typeof Cesium.createWorldTerrain === 'function') {
        viewer.terrainProvider = Cesium.createWorldTerrain({
            requestWaterMask: true,
            requestVertexNormals: true
        });
        useRealTerrain = true;
    }
} catch (e) {
    console.warn('真实地形不可用，使用默认椭球体地形');
    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
}
viewer.scene.globe.depthTestAgainstTerrain = useRealTerrain;

// 地形高度着色器（低地绿 → 高原棕 → 雪山白）
function createTerrainShader() {
    return new Cesium.Material({
        fabric: {
            type: 'TerrainElevation',
            uniforms: {
                lowColor: Cesium.Color.fromCssColorString('#3a7a3a'),
                midColor: Cesium.Color.fromCssColorString('#a67c52'),
                highColor: Cesium.Color.fromCssColorString('#f5f5f5'),
                lowHeight: 0,
                midHeight: 2000,
                highHeight: 5000
            },
            source: `
                czm_material czm_getMaterial(czm_materialInput materialInput) {
                    czm_material m = czm_getDefaultMaterial(materialInput);
                    float height = czm_height;
                    vec3 color;
                    if (height < lowHeight) {
                        color = lowColor.rgb;
                    } else if (height < midHeight) {
                        float t = (height - lowHeight) / (midHeight - lowHeight);
                        color = mix(lowColor.rgb, midColor.rgb, t);
                    } else if (height < highHeight) {
                        float t = (height - midHeight) / (highHeight - midHeight);
                        color = mix(midColor.rgb, highColor.rgb, t);
                    } else {
                        color = highColor.rgb;
                    }
                    // 手绘颗粒感叠加
                    float n = fract(sin(dot(materialInput.st, vec2(12.9898, 78.233))) * 43758.5453);
                    color = mix(color, color * 0.85, n * 0.08);
                    m.diffuse = color;
                    m.alpha = 0.93;
                    return m;
                }
            `
        }
    });
}

// 手绘颗粒感 Shader（无真实地形时使用）
function createHandDrawnShader() {
    return new Cesium.Material({
        fabric: {
            type: 'PopMapHandDrawn',
            uniforms: {
                lightColor: Cesium.Color.fromCssColorString('#f8f5e6'),
                darkColor: Cesium.Color.fromCssColorString('#e8dfc8'),
                grainIntensity: 0.08
            },
            source: `
                czm_material czm_getMaterial(czm_materialInput materialInput) {
                    czm_material m = czm_getDefaultMaterial(materialInput);
                    float n = fract(sin(dot(materialInput.st, vec2(12.9898, 78.233))) * 43758.5453);
                    float grain = n * grainIntensity;
                    m.diffuse = mix(lightColor.rgb, darkColor.rgb, grain);
                    m.alpha = 0.92;
                    return m;
                }
            `
        }
    });
}

// 根据地形类型选用 Shader
if (useRealTerrain) {
    viewer.scene.globe.material = createTerrainShader();
} else {
    viewer.scene.globe.material = createHandDrawnShader();
}

// 天气云层粒子系统
function createCloudLayer() {
    const cloudParticles = viewer.scene.primitives.add(new Cesium.ParticleSystem({
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYlWNg+M9w0YCBgYGBkZGREQgAARQBBZFqdbQAAAAASUVORK5CYII=',
        startColor: Cesium.Color.WHITE.withAlpha(0.15),
        endColor: Cesium.Color.WHITE.withAlpha(0.0),
        startScale: 80.0,
        endScale: 120.0,
        minimumParticleLife: 8.0,
        maximumParticleLife: 15.0,
        minimumSpeed: 3.0,
        maximumSpeed: 8.0,
        emissionRate: 3.0,
        lifetime: 30.0,
        emitter: new Cesium.SphereEmitter(6500000),
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
            Cesium.Cartesian3.fromDegrees(0, 0, 0)
        ),
        sizeInMeters: true
    }));
    return cloudParticles;
}

let cloudLayer = null;
cloudLayer = createCloudLayer();

// 切换回平滑地形（用于性能对比）
window.enableSmoothTerrain = function() {
    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    viewer.scene.globe.material = new Cesium.Material({
        fabric: {
            type: 'PopMapHandDrawn',
            uniforms: {
                lightColor: Cesium.Color.fromCssColorString('#f8f5e6'),
                darkColor: Cesium.Color.fromCssColorString('#e8dfc8'),
                grainIntensity: 0.08
            },
            source: `
                czm_material czm_getMaterial(czm_materialInput materialInput) {
                    czm_material m = czm_getDefaultMaterial(materialInput);
                    float n = fract(sin(dot(materialInput.st, vec2(12.9898, 78.233))) * 43758.5453);
                    float grain = n * grainIntensity;
                    m.diffuse = mix(lightColor.rgb, darkColor.rgb, grain);
                    m.alpha = 0.92;
                    return m;
                }
            `
        }
    });
    console.log('🌐 平滑地形已启用');
};

const controller = viewer.scene.screenSpaceCameraController;
controller.enableRotate = true; controller.enableTranslate = false;
controller.enableTilt = true; controller.enableLook = false;
controller.enableZoom = true;
controller.minimumZoomDistance = 5000; controller.maximumZoomDistance = 20000000;

// 移动端手势优化
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
    controller.enableTilt = false;  // 移动端禁用倾斜
    controller.enableZoom = true;
    controller.enableRotate = true;
    
    // 调整触摸灵敏度
    controller.zoomEventTypes = [Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH];
    controller.rotateEventTypes = [Cesium.CameraEventType.LEFT_DRAG, Cesium.CameraEventType.TWO_FINGER_DRAG];
    controller.tiltEventTypes = [Cesium.CameraEventType.RIGHT_DRAG, Cesium.CameraEventType.TWO_FINGER_DRAG];
    
    // 调整移动端缩放范围
    controller.minimumZoomDistance = 10000;
    controller.maximumZoomDistance = 10000000;
    
    // 双指双击回到全国视角
    let lastPinchTime = 0;
    const pinchHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    pinchHandler.setInputAction(() => {
        const now = Date.now();
        if (now - lastPinchTime < 300) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 8000000),
                orientation: { heading: 0.0, pitch: Cesium.Math.toRadians(-90), roll: 0.0 },
                duration: 1.2
            });
        }
        lastPinchTime = now;
    }, Cesium.ScreenSpaceEventType.PINCH_START);
    
    console.log('📱 移动端手势已启用（含双指双击回全国）');
}
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 8000000),
    orientation: { heading: 0.0, pitch: Cesium.Math.toRadians(-90), roll: 0.0 }
});

// ==================== 行政区划 ====================
const DATA_BASE = 'https://geo.datav.aliyun.com/areas_v3/bound';
let currentBoundaryDS = null;
let currentLabelEntities = [];
const PROVINCE_MAP = { '浙江省': '330000', '浙江': '330000', '北京市': '110000', '北京': '110000', '天津市': '120000', '天津': '120000', '河北省': '130000', '河北': '130000', '山西省': '140000', '山西': '140000', '辽宁省': '210000', '辽宁': '210000', '吉林省': '220000', '吉林': '220000', '黑龙江省': '230000', '黑龙江': '230000', '上海市': '310000', '上海': '310000', '江苏省': '320000', '江苏': '320000', '安徽省': '340000', '安徽': '340000', '福建省': '350000', '福建': '350000', '江西省': '360000', '江西': '360000', '山东省': '370000', '山东': '370000', '河南省': '410000', '河南': '410000', '湖北省': '420000', '湖北': '420000', '湖南省': '430000', '湖南': '430000', '广东省': '440000', '广东': '440000', '海南省': '460000', '海南': '460000', '重庆市': '500000', '重庆': '500000', '四川省': '510000', '四川': '510000', '贵州省': '520000', '贵州': '520000', '云南省': '530000', '云南': '530000', '陕西省': '610000', '陕西': '610000', '甘肃省': '620000', '甘肃': '620000', '台湾省': '710000', '台湾': '710000' };
const CITY_TO_PROVINCE = { '宁波': '浙江省', '杭州': '浙江省', '温州': '浙江省', '嘉兴': '浙江省', '湖州': '浙江省', '绍兴': '浙江省', '金华': '浙江省', '衢州': '浙江省', '舟山': '浙江省', '台州': '浙江省', '丽水': '浙江省', '南京': '江苏省', '苏州': '江苏省', '无锡': '江苏省', '广州': '广东省', '深圳': '广东省', '成都': '四川省' };

function getProvinceAdcode(cityName) { const province = CITY_TO_PROVINCE[cityName] || cityName; return PROVINCE_MAP[province] || null; }

async function loadBoundary(adcode) {
    if (currentBoundaryDS) { viewer.dataSources.remove(currentBoundaryDS); currentBoundaryDS = null; }
    currentLabelEntities.forEach(e => viewer.entities.remove(e)); currentLabelEntities = [];
    if (!adcode) return;
    const url = `${DATA_BASE}/${adcode}_full.json`;
    Perf.start('loadBoundary');
    try {
        const response = await fetch(url); const geoJson = await response.json();
        const ds = await Cesium.GeoJsonDataSource.load(geoJson, { stroke: Cesium.Color.WHITE.withAlpha(0.9), strokeWidth: 2, fill: Cesium.Color.TRANSPARENT });
        currentBoundaryDS = ds; viewer.dataSources.add(ds);
        geoJson.features.forEach(feature => {
            const name = feature.properties.name; const center = feature.properties.center;
            if (name && center) { const entity = viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(center[0], center[1]), label: { text: name, font: 'bold 12px sans-serif', fillColor: Cesium.Color.fromCssColorString('#8a7a6a'), outlineColor: Cesium.Color.fromCssColorString('#f8f5e6'), outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, scale: 0.8, horizontalOrigin: Cesium.HorizontalOrigin.CENTER, verticalOrigin: Cesium.VerticalOrigin.CENTER, disableDepthTestDistance: Number.POSITIVE_INFINITY } }); currentLabelEntities.push(entity); }
        });
        Perf.end('loadBoundary');
    } catch (err) { console.error('边界加载失败'); }
}
async function loadChinaBoundary() { await loadBoundary('100000'); }

// ==================== 城市与 POI 数据 ====================
const cityDB = [
    { name: '浙江', lng: 120.15, lat: 29.28, level: 'province' },
    { name: '北京', lng: 116.4, lat: 39.9 }, { name: '上海', lng: 121.47, lat: 31.23 },
    { name: '杭州', lng: 120.15, lat: 30.28 }, { name: '宁波', lng: 121.55, lat: 29.87 },
    { name: '温州', lng: 120.70, lat: 28.00 }, { name: '嘉兴', lng: 120.75, lat: 30.77 },
    { name: '湖州', lng: 120.08, lat: 30.90 }, { name: '绍兴', lng: 120.58, lat: 30.03 },
    { name: '金华', lng: 119.65, lat: 29.08 }, { name: '衢州', lng: 118.87, lat: 28.93 },
    { name: '舟山', lng: 122.20, lat: 30.00 }, { name: '台州', lng: 121.43, lat: 28.68 },
    { name: '丽水', lng: 119.92, lat: 28.45 },
    { name: '成都', lng: 104.07, lat: 30.57 }, { name: '广州', lng: 113.28, lat: 23.13 },
    { name: '深圳', lng: 114.07, lat: 22.55 }, { name: '南京', lng: 118.78, lat: 32.07 },
];
const originalPOIs = {
    '宁波': [ { name: '天一阁', type: '景点', rating: 4.5, lng: 121.54, lat: 29.87, intro: '中国现存最早的私家藏书楼，建于明朝嘉靖年间，是亚洲最古老的图书馆之一。', hours: '8:30-17:00', ticket: '￥30' }, { name: '老外滩', type: '景点', rating: 4.6, lng: 121.56, lat: 29.88, intro: '宁波最古老的港口区，保留了大量欧式建筑，夜晚酒吧林立。', hours: '全天开放', ticket: '免费' }, { name: '宁波博物馆', type: '景点', rating: 4.4, lng: 121.57, lat: 29.82, intro: '由普利兹克奖得主王澍设计，用旧砖瓦建造的现代建筑。', hours: '9:00-17:00（周一闭馆）', ticket: '免费' }, { name: '东钱湖', type: '景点', rating: 4.7, lng: 121.63, lat: 29.80, intro: '浙江最大的天然淡水湖，适合骑行和露营。', hours: '全天开放', ticket: '免费' }, { name: '缸鸭狗', type: '美食', rating: 4.3, lng: 121.56, lat: 29.86, intro: '宁波百年老字号，以猪油汤圆闻名。', hours: '6:30-21:00', ticket: '人均￥30' } ],
    '杭州': [ { name: '西湖', type: '景点', rating: 4.8, lng: 120.15, lat: 30.25, intro: '中国最著名的湖泊景观之一，断桥残雪、苏堤春晓等十景闻名天下。', hours: '全天开放', ticket: '免费' }, { name: '灵隐寺', type: '景点', rating: 4.7, lng: 120.10, lat: 30.24, intro: '中国佛教禅宗十大古刹之一，始建于东晋。', hours: '7:00-18:00', ticket: '￥75' }, { name: '雷峰塔', type: '景点', rating: 4.6, lng: 120.16, lat: 30.23, intro: '因白娘子传说闻名，登塔可俯瞰西湖全景。', hours: '8:00-20:00', ticket: '￥40' } ],
    '温州': [ { name: '雁荡山', type: '景点', rating: 4.6, lng: 121.08, lat: 28.37, intro: '世界地质公园，以流纹岩地貌和灵峰夜景著称。', hours: '6:30-17:00', ticket: '￥160' }, { name: '江心屿', type: '景点', rating: 4.3, lng: 120.65, lat: 28.03, intro: '瓯江中的孤岛，有千年古塔和寺庙。', hours: '8:00-17:00', ticket: '￥30' } ],
    '嘉兴': [ { name: '南湖', type: '景点', rating: 4.4, lng: 120.77, lat: 30.76, intro: '中共诞生地，湖心岛上有烟雨楼。', hours: '8:00-17:00', ticket: '￥60' }, { name: '乌镇', type: '景点', rating: 4.7, lng: 120.49, lat: 30.75, intro: '江南水乡古镇，西栅夜景极美。', hours: '9:00-22:00', ticket: '￥150' } ],
    '湖州': [ { name: '莫干山', type: '景点', rating: 4.6, lng: 119.88, lat: 30.64, intro: '避暑胜地，民国老别墅群，竹林深处的静谧。', hours: '全天开放', ticket: '￥80' }, { name: '南浔古镇', type: '景点', rating: 4.4, lng: 120.43, lat: 30.88, intro: '中西合璧的江南古镇，小莲庄为必游之地。', hours: '8:00-17:00', ticket: '￥100' } ],
    '绍兴': [ { name: '鲁迅故里', type: '景点', rating: 4.7, lng: 120.58, lat: 30.00, intro: '鲁迅故居、百草园、三味书屋，感受文学巨匠的童年。', hours: '8:30-17:00', ticket: '免费' }, { name: '沈园', type: '景点', rating: 4.5, lng: 120.59, lat: 29.99, intro: '陆游与唐婉的爱情故事发生地，宋代园林。', hours: '8:00-17:00', ticket: '￥40' } ],
    '金华': [ { name: '双龙洞', type: '景点', rating: 4.3, lng: 119.65, lat: 29.20, intro: '需卧船进入的溶洞，内有钟乳石奇观。', hours: '8:00-16:30', ticket: '￥90' }, { name: '横店影视城', type: '景点', rating: 4.5, lng: 120.32, lat: 29.18, intro: '中国好莱坞，多个影视拍摄区可参观。', hours: '8:00-17:00', ticket: '￥280' } ],
    '舟山': [ { name: '普陀山', type: '景点', rating: 4.8, lng: 122.38, lat: 30.00, intro: '佛教四大名山之一，观音道场，海天佛国。', hours: '全天开放', ticket: '￥160' } ],
};
const iconMap = {
    '天一阁': './images/tianyi-pavilion.png', '老外滩': './images/old-bund.png', '宁波博物馆': './images/ningbo-museum.png', '东钱湖': './images/dongqian-lake.png',
    '西湖': './images/west-lake.png', '灵隐寺': './images/lingyin-temple.png', '雷峰塔': './images/leifeng-pagoda.png',
};

// ===== 高德 API POI 动态搜索 =====
const AMAP_POI_TYPES = { '景点': '110000|140000', '美食': '050000', '住宿': '100000' };
const cityCoordCache = {};
const dynamicPOICache = {};

async function geocodeCity(cityName) {
    if (cityCoordCache[cityName]) return cityCoordCache[cityName];
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(cityName)}&key=${AMAP_KEY}`;
    Perf.start('geocodeCity');
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.status === '1' && data.geocodes?.length > 0) {
            const loc = data.geocodes[0].location.split(',');
            const result = { lng: parseFloat(loc[0]), lat: parseFloat(loc[1]), adcode: data.geocodes[0].adcode };
            cityCoordCache[cityName] = result;
            Perf.end('geocodeCity');
            return result;
        }
    } catch (e) {}
    Perf.end('geocodeCity');
    return null;
}

async function searchAmapPOIs(cityName, type = '景点') {
    const cacheKey = `${cityName}_${type}`;
    if (dynamicPOICache[cacheKey]) return dynamicPOICache[cacheKey];
    const typeCode = AMAP_POI_TYPES[type] || '110000';
    const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(type)}&city=${encodeURIComponent(cityName)}&key=${AMAP_KEY}&offset=8&extensions=all`;
    Perf.start('searchAmapPOIs');
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.status === '1' && data.pois?.length > 0) {
            const pois = data.pois.map(p => ({
                name: p.name,
                type: type,
                rating: parseFloat(p.biz_ext?.rating || (4.0 + Math.random() * 0.8).toFixed(1)),
                lng: parseFloat(p.location.split(',')[0]),
                lat: parseFloat(p.location.split(',')[1]),
                intro: p.address || '暂无简介',
                hours: p.biz_ext?.opentime || '暂无',
                ticket: p.biz_ext?.cost || '暂无',
                dynamic: true
            }));
            dynamicPOICache[cacheKey] = pois;
            Perf.end('searchAmapPOIs');
            return pois;
        }
    } catch (e) {}
    Perf.end('searchAmapPOIs');
    return [];
}

async function fetchDynamicPOIs(cityName) {
    const cacheKey = `fetch_${cityName}`;
    if (dynamicPOICache[cacheKey]) return dynamicPOICache[cacheKey];
    const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(cityName)}&city=${encodeURIComponent(cityName)}&key=${AMAP_KEY}&offset=10`;
    const typeMap = { '风景名胜': '景点', '餐饮': '美食', '住宿': '住宿' };
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.status === '1' && data.pois?.length > 0) {
            const pois = data.pois.map(p => {
                const rawType = p.type ? p.type.split('|')[0].split(';')[0] : '';
                let mappedType = '其他';
                for (const [key, val] of Object.entries(typeMap)) {
                    if (rawType.includes(key)) { mappedType = val; break; }
                }
                return {
                    name: p.name,
                    type: mappedType,
                    rating: parseFloat((p.biz_ext?.rating || '4.0')),
                    lng: parseFloat(p.location.split(',')[0]),
                    lat: parseFloat(p.location.split(',')[1]),
                    intro: p.address || '',
                    hours: '暂无',
                    ticket: '暂无',
                    dynamic: true
                };
            });
            dynamicPOICache[cacheKey] = pois;
            return pois;
        }
    } catch (e) { console.error('fetchDynamicPOIs error:', e); }
    return [];
}

async function refreshDynamicCityPOIs(type) {
    if (!currentCity || !currentCity.isDynamic) return;
    showLoading(true);
    try {
        currentPOIs = await searchAmapPOIs(currentCity.name, type);
        viewer.entities.removeAll();
        renderCityPOIs(currentPOIs);
        if (rightPanel.classList.contains('show')) refreshRightPanel();
    } catch (e) {
        showToast('搜索失败，请重试');
    } finally {
        showLoading(false);
    }
}

let currentCity = null; let currentPOIs = [];
let tripList = JSON.parse(localStorage.getItem('popmap_trip') || '[]');
let currentRouteEntities = []; let currentProvinceEntities = [];
let currentProvincePois = {};

const labelEl = document.getElementById('location-label');
const searchInput = document.getElementById('search-input');
const suggestionsDiv = document.getElementById('suggestions');
const searchHistory = JSON.parse(localStorage.getItem('popmap_history') || '[]');

const rightPanel = document.getElementById('right-panel');
const panelTitle = document.getElementById('panel-title');
const poiSection = document.getElementById('poi-section');
const tripListDiv = document.getElementById('trip-list');
const btnShare = document.getElementById('btn-share');
const btnExport = document.getElementById('btn-export');
const btnRoute = document.getElementById('btn-route');
const btnClearTrip = document.getElementById('btn-clear-trip');
const routeBottomPanel = document.getElementById('route-bottom-panel');
const routeLeftContent = document.getElementById('route-left-content');
const routeRightContent = document.getElementById('route-right-content');
const routeCloseBtn = document.getElementById('route-close-btn');
const poiFloatCard = document.getElementById('poi-float-card');
const panelTab = document.getElementById('panel-tab');

function addHistory(name) { if (!searchHistory.includes(name)) { searchHistory.unshift(name); if (searchHistory.length > 5) searchHistory.pop(); localStorage.setItem('popmap_history', JSON.stringify(searchHistory)); } }

function showDetail(poi) {
    document.getElementById('panel-main').style.display = 'none';
    document.getElementById('panel-detail').style.display = 'flex';
    document.getElementById('detail-name').textContent = poi.name;
    document.getElementById('detail-rating').textContent = poi.rating || '暂无';
    document.getElementById('detail-hours').textContent = poi.hours || '暂无';
    document.getElementById('detail-ticket').textContent = poi.ticket || '暂无';
    document.getElementById('detail-intro').textContent = poi.intro || '暂无简介';
}

function backToList() {
    document.getElementById('panel-detail').style.display = 'none';
    document.getElementById('panel-main').style.display = 'flex';
    const poiSec = document.getElementById('poi-section');
    if (poiSec) {
        poiSec.style.display = 'none';
        poiSec.offsetHeight;
        poiSec.style.display = '';
    }
}

function showFloatCard(poi, event) {
    Perf.increment('poiClicks');
    const floatName = document.createElement('div'); floatName.className = 'float-name'; floatName.textContent = poi.name;
    const floatMeta = document.createElement('div'); floatMeta.className = 'float-meta'; floatMeta.innerHTML = `⭐${poi.rating || '暂无'} ｜ 🕐${poi.hours || '暂无'} ｜ 🎫${poi.ticket || '暂无'}`;
    const floatIntro = document.createElement('div'); floatIntro.className = 'float-intro'; floatIntro.textContent = poi.intro || '暂无简介';
    const closeBtn = document.createElement('button'); closeBtn.className = 'float-close'; closeBtn.textContent = '×';
    const addBtn = document.createElement('button');
    addBtn.style.cssText = 'margin-top:8px;background:#c4813a;color:#fff;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;';
    addBtn.textContent = '+ 加入行程';

    poiFloatCard.innerHTML = '';
    poiFloatCard.appendChild(closeBtn);
    poiFloatCard.appendChild(floatName);
    poiFloatCard.appendChild(floatMeta);
    poiFloatCard.appendChild(floatIntro);
    if (!tripList.find(t => t.name === poi.name)) poiFloatCard.appendChild(addBtn);

    poiFloatCard.style.display = 'block';
    poiFloatCard.style.left = Math.min(event.clientX + 15, window.innerWidth - 240) + 'px';
    poiFloatCard.style.top = Math.min(event.clientY - 20, window.innerHeight - 200) + 'px';

    closeBtn.addEventListener('click', () => { poiFloatCard.style.display = 'none'; });
    addBtn.addEventListener('click', () => {
        addToTrip(poi, poi.city || currentCity?.name || '');
        poiFloatCard.style.display = 'none';
    });
}

document.addEventListener('click', (e) => {
    if (!poiFloatCard.contains(e.target) && poiFloatCard.style.display === 'block') {
        poiFloatCard.style.display = 'none';
    }
});

async function getRoutePath(origin, destination) {
    const url = `https://restapi.amap.com/v3/direction/driving?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&key=${AMAP_KEY}`;
    Perf.start('getRoutePath');
    try { const resp = await fetch(url); const data = await resp.json(); if (data.status === '1' && data.route?.paths?.[0]) { const steps = data.route.paths[0].steps; const polyline = []; steps.forEach(step => { const points = step.polyline.split(';'); points.forEach(p => { const [lng, lat] = p.split(','); polyline.push(parseFloat(lng), parseFloat(lat)); }); }); Perf.end('getRoutePath'); return polyline; } } catch (e) {}
    Perf.end('getRoutePath');
    return null;
}

function clearRoute() { currentRouteEntities.forEach(e => viewer.entities.remove(e)); currentRouteEntities = []; }

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

async function renderRoute() {
    clearRoute(); if (tripList.length < 2) return;
    Perf.increment('routePlans');
    showLoading(true);
    routeLeftContent.innerHTML = ''; routeRightContent.innerHTML = '';
    let routeSuccess = false;
    try {
        for (let i = 0; i < tripList.length - 1; i++) {
            const segment = await getRoutePath(tripList[i], tripList[i + 1]);
            if (segment && segment.length > 0) {
                const polyline = viewer.entities.add({ polyline: { positions: Cesium.Cartesian3.fromDegreesArray(segment), width: 3, material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.3, color: Cesium.Color.fromCssColorString('#c4813a') }) } });
                currentRouteEntities.push(polyline);
                const dist = calculateDistance(tripList[i].lat, tripList[i].lng, tripList[i+1].lat, tripList[i+1].lng);
                routeLeftContent.innerHTML += `<div class="route-segment">🚗 ${tripList[i].name} → ${tripList[i+1].name}：约 ${dist} km</div>`;
            }
        }
        let totalDist = 0; for (let i = 0; i < tripList.length - 1; i++) { totalDist += parseFloat(calculateDistance(tripList[i].lat, tripList[i].lng, tripList[i+1].lat, tripList[i+1].lng)); }
        const totalTime = (totalDist / 60).toFixed(1);
        const optimized = calculateTotalDistance(tripList);
        const savings = totalDist > 0 ? ((totalDist - optimized) / totalDist * 100).toFixed(1) : 0;
        routeLeftContent.innerHTML += `<div class="route-summary">📏 总距离：约 ${totalDist.toFixed(1)} km ｜ ⏱ 预估时间：约 ${totalTime} 小时</div>`;
        if (savings > 0) {
            routeLeftContent.innerHTML += `<div class="route-optimized">🚀 TSP 优化节省：${savings}% 路程</div>`;
        }

        const midTripIndex = Math.floor(tripList.length / 2); const midPoint = tripList[midTripIndex];
        const foodUrl = `https://restapi.amap.com/v3/place/around?location=${midPoint.lng},${midPoint.lat}&radius=5000&types=050000&key=${AMAP_KEY}&offset=3`;
        const hotelUrl = `https://restapi.amap.com/v3/place/around?location=${midPoint.lng},${midPoint.lat}&radius=5000&types=100000&key=${AMAP_KEY}&offset=3`;
        try {
            const [foodResp, hotelResp] = await Promise.all([fetch(foodUrl), fetch(hotelUrl)]);
            const foodData = await foodResp.json(); const hotelData = await hotelResp.json();
            if (foodData.status === '1' && foodData.pois?.length > 0) {
                let foodHtml = `<div class="rec-title">🍜 沿途美食推荐：</div>`;
                foodData.pois.slice(0, 3).forEach(p => { foodHtml += `<div class="rec-item">• ${p.name} ⭐${p.biz_ext?.rating || '4.0'}</div>`; });
                routeRightContent.innerHTML += foodHtml;
            }
            if (hotelData.status === '1' && hotelData.pois?.length > 0) {
                let hotelHtml = `<div class="rec-title" style="margin-top:6px;">🏨 沿途住宿推荐：</div>`;
                hotelData.pois.slice(0, 3).forEach(p => { hotelHtml += `<div class="rec-item">• ${p.name} ⭐${p.biz_ext?.rating || '4.0'}</div>`; });
                routeRightContent.innerHTML += hotelHtml;
            }
        } catch (e) {}

        routeSuccess = true;
        routeBottomPanel.classList.add('show');
        const midIndex = Math.floor(tripList.length / 2); const mp = tripList[midIndex];
        viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(mp.lng, mp.lat, 60000), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }, duration: 1.5 });
    } catch (err) {
        console.error(err);
    } finally {
        showLoading(false);
        if (!routeSuccess) {
            showToast('路线规划失败，请检查网络或稍后重试');
        }
    }
}

routeCloseBtn.addEventListener('click', () => { routeBottomPanel.classList.remove('show'); });

// TSP 优化行程（旅行商问题 - 最近邻 + 2-opt 优化）
function optimizeTripOrder(list) {
    if (list.length <= 2) return list;
    
    // 最近邻算法（贪心）
    const unvisited = [...list];
    const start = unvisited.shift();
    const route = [start];
    
    while (unvisited.length > 0) {
        const last = route[route.length - 1];
        let nearestIdx = 0;
        let nearestDist = Infinity;
        
        for (let i = 0; i < unvisited.length; i++) {
            const dist = parseFloat(calculateDistance(
                last.lat, last.lng, 
                unvisited[i].lat, unvisited[i].lng
            ));
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }
        
        route.push(unvisited[nearestIdx]);
        unvisited.splice(nearestIdx, 1);
    }
    
    // 2-opt 局部优化（消除路线交叉）
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < route.length - 2; i++) {
            for (let j = i + 2; j < route.length - 1; j++) {
                const distBefore = 
                    parseFloat(calculateDistance(route[i].lat, route[i].lng, route[i+1].lat, route[i+1].lng)) +
                    parseFloat(calculateDistance(route[j].lat, route[j].lng, route[j+1].lat, route[j+1].lng));
                const distAfter = 
                    parseFloat(calculateDistance(route[i].lat, route[i].lng, route[j].lat, route[j].lng)) +
                    parseFloat(calculateDistance(route[i+1].lat, route[i+1].lng, route[j+1].lat, route[j+1].lng));
                
                if (distAfter < distBefore) {
                    // 反转 i+1..j 段
                    const reversed = route.slice(i+1, j+1).reverse();
                    route.splice(i+1, j-i, ...reversed);
                    improved = true;
                }
            }
        }
    }
    
    return route;
}

// Web Worker 后台优化（避免阻塞 UI）
let tspWorker = null;
if (window.Worker) {
    tspWorker = new Worker('js/tsp-worker.js');
    tspWorker.onmessage = function(e) {
        const { optimizedRoute, originalDistance, optimizedDistance, timeMs } = e.data;
        if (optimizedRoute) {
            tripList = optimizedRoute;
            updateTripDisplayUI();
            
            // 显示优化结果
            const savings = ((originalDistance - optimizedDistance) / originalDistance * 100).toFixed(1);
            showToast(`🚀 行程已优化：节省 ${savings}% 路程（${timeMs}ms）`);
        }
    };
}

function updateTripDisplay() {
    if (tripList.length === 0) { 
        tripListDiv.innerHTML = '尚未添加地点'; 
    } else if (tripList.length >= 3 && tspWorker) {
        // 使用 Web Worker 异步优化
        tspWorker.postMessage({ 
            points: tripList.map(p => ({ lat: p.lat, lng: p.lng, name: p.name, city: p.city })),
            calculateDistance: calculateDistance.toString()
        });
        // 临时显示原始顺序
        updateTripDisplayUI();
    } else {
        // 小规模直接优化
        tripList = optimizeTripOrder(tripList);
        updateTripDisplayUI();
    }
    btnShare.disabled = tripList.length === 0;
    btnExport.disabled = tripList.length === 0;
    btnRoute.disabled = tripList.length < 2;
}

function updateTripDisplayUI() {
    if (tripList.length === 0) {
        tripListDiv.innerHTML = '尚未添加地点';
        return;
    }
    
    const perDay = 3;
    const totalDistance = calculateTotalDistance(tripList);
    const header = `<div class="trip-header">📏 总行程：${totalDistance.toFixed(1)} km</div>`;
    
    tripListDiv.innerHTML = header + tripList.map((t, i) => { 
        const dn = Math.floor(i / perDay) + 1; 
        const isFirst = i % perDay === 0; 
        const dl = isFirst ? `<span class="trip-day">Day ${dn}</span>` : ''; 
        return `<div class="trip-line">${dl}<span class="trip-name">${i+1}. ${t.name}</span><span class="trip-city">${t.city}</span><span class="remove-btn" data-index="${i}">×</span></div>`; 
    }).join('');
    
    document.querySelectorAll('.remove-btn').forEach(b => { 
        b.addEventListener('click', (e) => { 
            const idx = parseInt(e.target.dataset.index); 
            tripList.splice(idx, 1); 
            updateTripDisplay(); 
            if (tripList.length < 2) { 
                clearRoute(); 
                routeBottomPanel.classList.remove('show'); 
            } 
        }); 
    });
}

function calculateTotalDistance(points) {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        total += parseFloat(calculateDistance(
            points[i].lat, points[i].lng,
            points[i+1].lat, points[i+1].lng
        ));
    }
    return total;
}

function addToTrip(poi, cityName) { if (tripList.find(t => t.name === poi.name && t.city === cityName)) { showToast('该地点已在行程中'); return; } if (tripList.length >= 10) { showToast('行程最多 10 个地点'); return; } tripList.push({ ...poi, city: cityName }); updateTripDisplay(); }

function refreshRightPanel() {
    panelTitle.textContent = '📍 选择景点';
    const cityColors = { '宁波': '#c4813a', '杭州': '#6a8a5a', '温州': '#5a7a8a', '嘉兴': '#8a6a5a', '湖州': '#6a5a8a', '绍兴': '#5a6a8a', '金华': '#7a5a6a', '舟山': '#4a6a8a' };
    let html = '';
    for (const [cn, pois] of Object.entries(currentProvincePois)) {
        html += `<div class="city-title" style="color:${cityColors[cn] || '#3a2a1a'}">${cn}</div>`;
        pois.forEach(p => { html += `<div class="poi-item"><span class="poi-name" data-name="${p.name}" data-city="${cn}">${p.name}</span><span class="poi-rating">⭐${p.rating}</span><button class="detail-btn" data-name="${p.name}" data-city="${cn}">?</button><button class="add-btn" data-name="${p.name}" data-city="${cn}">+</button></div>`; });
    }
    poiSection.innerHTML = html;
    document.querySelectorAll('#poi-section .add-btn').forEach(b => { b.addEventListener('click', (e) => { const n = e.target.dataset.name, c = e.target.dataset.city; const p = currentProvincePois[c]?.find(x => x.name === n); if (p) addToTrip(p, c); }); });
    document.querySelectorAll('#poi-section .detail-btn').forEach(b => { b.addEventListener('click', (e) => { const n = e.target.dataset.name, c = e.target.dataset.city; const p = currentProvincePois[c]?.find(x => x.name === n); if (p) showDetail(p); }); });
    document.querySelectorAll('#poi-section .poi-name').forEach(span => { span.addEventListener('click', (e) => { const n = e.target.dataset.name, c = e.target.dataset.city; const p = currentProvincePois[c]?.find(x => x.name === n); if (p) showFloatCard(p, e); }); });
}

function renderProvincePreview(provinceName) {
    currentProvinceEntities = []; currentProvincePois = {}; rightPanel.classList.add('show'); panelTab.classList.add('hidden');
    const cityColors = { '宁波': '#c4813a', '杭州': '#6a8a5a', '温州': '#5a7a8a', '嘉兴': '#8a6a5a', '湖州': '#6a5a8a', '绍兴': '#5a6a8a', '金华': '#7a5a6a', '舟山': '#4a6a8a' };
    const cities = Object.entries(CITY_TO_PROVINCE).filter(([c, p]) => p === provinceName).map(([c]) => c);
    cities.forEach(cn => {
        const cd = cityDB.find(c => c.name === cn); const pois = originalPOIs[cn];
        if (!cd || !pois || pois.length === 0) return;
        currentProvincePois[cn] = pois;
        const rp = pois[Math.floor(Math.random() * pois.length)]; const ri = iconMap[rp.name];
        const allNames = pois.map(p => p.name).join('、'); const cc = cityColors[cn] || '#3a2a1a';
        if (ri) { const e = viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(cd.lng, cd.lat, 0), billboard: { image: ri, width: 120, height: 120, verticalOrigin: Cesium.VerticalOrigin.CENTER, disableDepthTestDistance: Number.POSITIVE_INFINITY } }); e._cityName = cn; e._pois = pois; currentProvinceEntities.push(e); }
        viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(cd.lng, cd.lat, 0), label: { text: cn, font: 'bold 24px sans-serif', fillColor: Cesium.Color.fromCssColorString('#3a2a1a'), outlineColor: Cesium.Color.fromCssColorString('#fffaf0'), outlineWidth: 4, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, 80), disableDepthTestDistance: Number.POSITIVE_INFINITY } });
        viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(cd.lng, cd.lat, 0), label: { text: allNames, font: '14px sans-serif', fillColor: Cesium.Color.fromCssColorString(cc), outlineColor: Cesium.Color.fromCssColorString('#f8f5e6'), outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.TOP, pixelOffset: new Cesium.Cartesian2(0, -80), disableDepthTestDistance: Number.POSITIVE_INFINITY } });
    });
    refreshRightPanel();
    if (viewer._provinceClickHandler) { viewer._provinceClickHandler.destroy(); }
    const h = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    h.setInputAction((cl) => { const pk = viewer.scene.pick(cl.position); if (pk?.id?._cityName) { rightPanel.classList.add('show'); panelTab.classList.add('hidden'); refreshRightPanel(); } }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    viewer._provinceClickHandler = h;
}

function renderMultiCityPreview(cityNames) {
    currentProvinceEntities = []; currentProvincePois = {}; rightPanel.classList.add('show'); panelTab.classList.add('hidden');
    const cityColors = { '宁波': '#c4813a', '杭州': '#6a8a5a', '温州': '#5a7a8a', '嘉兴': '#8a6a5a', '湖州': '#6a5a8a', '绍兴': '#5a6a8a', '金华': '#7a5a6a', '舟山': '#4a6a8a' };
    cityNames.forEach(cn => {
        const cd = cityDB.find(c => c.name === cn); const pois = originalPOIs[cn];
        if (!cd || !pois || pois.length === 0) return;
        currentProvincePois[cn] = pois;
        const rp = pois[Math.floor(Math.random() * pois.length)]; const ri = iconMap[rp.name];
        const allNames = pois.map(p => p.name).join('、'); const cc = cityColors[cn] || '#3a2a1a';
        if (ri) { const e = viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(cd.lng, cd.lat, 0), billboard: { image: ri, width: 120, height: 120, verticalOrigin: Cesium.VerticalOrigin.CENTER, disableDepthTestDistance: Number.POSITIVE_INFINITY } }); e._cityName = cn; e._pois = pois; currentProvinceEntities.push(e); }
        viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(cd.lng, cd.lat, 0), label: { text: cn, font: 'bold 24px sans-serif', fillColor: Cesium.Color.fromCssColorString('#3a2a1a'), outlineColor: Cesium.Color.fromCssColorString('#fffaf0'), outlineWidth: 4, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, 80), disableDepthTestDistance: Number.POSITIVE_INFINITY } });
        viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(cd.lng, cd.lat, 0), label: { text: allNames, font: '14px sans-serif', fillColor: Cesium.Color.fromCssColorString(cc), outlineColor: Cesium.Color.fromCssColorString('#f8f5e6'), outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.TOP, pixelOffset: new Cesium.Cartesian2(0, -80), disableDepthTestDistance: Number.POSITIVE_INFINITY } });
    });
    refreshRightPanel();
}

async function flyToMultiCities(cityNames) {
    if (viewer._provinceClickHandler) { viewer._provinceClickHandler.destroy(); viewer._provinceClickHandler = null; }
    viewer.entities.removeAll(); currentProvinceEntities = []; clearRoute(); currentProvincePois = {};
    labelEl.textContent = '📍 ' + cityNames.join(' & ');
    const cities = cityNames.map(n => cityDB.find(c => c.name === n)).filter(Boolean);
    const cl = cities.reduce((s, c) => s + c.lng, 0) / cities.length;
    const clat = cities.reduce((s, c) => s + c.lat, 0) / cities.length;
    const maxDist = Math.max(...cities.flatMap(a => cities.map(b => calculateDistance(a.lat, a.lng, b.lat, b.lng))));
    const zoom = Math.max(80000, maxDist * 600);
    viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(cl, clat, zoom), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }, duration: 1.8, complete: () => { renderMultiCityPreview(cityNames); } });
    addHistory(cityNames.join(' & '));
}

async function flyToLocation(locationName) {
    if (viewer._provinceClickHandler) { viewer._provinceClickHandler.destroy(); viewer._provinceClickHandler = null; }
    viewer.entities.removeAll(); currentProvinceEntities = []; clearRoute(); currentProvincePois = {};
    const pf = locationName === '浙江' ? '浙江省' : locationName;
    if (PROVINCE_MAP[pf]) {
        labelEl.textContent = '📍 ' + pf; 
        showLoading(true);
        try {
            await loadBoundary(PROVINCE_MAP[pf]);
            const pc = { '浙江省': [120.15, 29.28], '江苏省': [118.78, 32.07], '四川省': [104.07, 30.57] };
            const ctr = pc[pf] || [120, 30];
            viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(ctr[0], ctr[1], 500000), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }, duration: 1.8, complete: () => { renderProvincePreview(pf); showLoading(false); } });
            addHistory(pf);
        } catch (err) {
            showLoading(false);
            showToast('加载失败，请重试');
            console.error(err);
        }
    } else {
        showLoading(true);
        try {
            // 1. 优先从本地数据库找
            let city = cityDB.find(c => c.name === locationName);
            let isDynamic = false;
            if (!city) { // 动态城市
                const geo = await geocodeCity(locationName);
                if (geo) {
                    city = { name: locationName, lng: geo.lng, lat: geo.lat, isDynamic: true };
                    isDynamic = true;
                } else {
                    city = { name: locationName, lng: 120, lat: 30, isDynamic: true };
                }
            }
            currentCity = city; labelEl.textContent = '📍 ' + city.name;
            const pa = getProvinceAdcode(city.name); if (pa) { await loadBoundary(pa); } else { await loadChinaBoundary(); }
            // 2. POI 来源：动态城市用 API，否则用本地数据
            if (isDynamic) {
                currentPOIs = await fetchDynamicPOIs(city.name);
            } else {
                currentPOIs = originalPOIs[city.name] || [];
                // 如果本地数据为空，降级到动态 POI
                if (currentPOIs.length === 0) {
                    currentPOIs = await fetchDynamicPOIs(city.name);
                    currentCity.isDynamic = true;
                }
            }
            viewer.entities.removeAll(); renderCityPOIs(currentPOIs);
            currentProvincePois[currentCity.name] = currentPOIs;
            rightPanel.classList.add('show');
            panelTab.classList.add('hidden');
            refreshRightPanel();
            viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, 35000), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }, duration: 1.8 });
            addHistory(city.name);
            showLoading(false);
        } catch (err) {
            showLoading(false);
            showToast('加载失败，请重试');
            console.error(err);
        }
    }
    hideFirstGuide();
}

function renderCityPOIs(pois) {
    if (!currentCity) return; const cx = currentCity.lng, cy = currentCity.lat;
    viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(cx, cy, 0), label: { text: currentCity.name, font: 'bold 28px sans-serif', fillColor: Cesium.Color.fromCssColorString('#3a2a1a'), outlineColor: Cesium.Color.fromCssColorString('#fffaf0'), outlineWidth: 4, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.CENTER, pixelOffset: new Cesium.Cartesian2(0, -30), disableDepthTestDistance: Number.POSITIVE_INFINITY } });
    pois.forEach((poi, i) => { const angle = (i / pois.length) * Math.PI * 2; const r = 0.15; const x = cx + Math.cos(angle) * r; const y = cy + Math.sin(angle) * r; viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(x, y, 0), ellipse: { semiMinorAxis: 2500, semiMajorAxis: 2500, material: Cesium.Color.fromCssColorString('#f5ede0').withAlpha(0.2), height: 0 } }); const billboard = iconMap[poi.name] || ''; const entity = viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(x, y, 0), billboard: { image: billboard, width: 120, height: 120, verticalOrigin: Cesium.VerticalOrigin.CENTER, disableDepthTestDistance: Number.POSITIVE_INFINITY }, point: billboard ? undefined : { pixelSize: 16, color: Cesium.Color.fromCssColorString('#c4813a'), disableDepthTestDistance: Number.POSITIVE_INFINITY }, label: { text: poi.name, font: 'bold 16px sans-serif', fillColor: Cesium.Color.fromCssColorString('#3a2a1a'), outlineColor: Cesium.Color.fromCssColorString('#fffaf0'), outlineWidth: 3, pixelOffset: new Cesium.Cartesian2(0, 80), disableDepthTestDistance: Number.POSITIVE_INFINITY } }); entity._poiName = poi.name; entity._poi = poi; currentProvinceEntities.push(entity); });
    if (viewer._cityClickHandler) viewer._cityClickHandler.destroy();
    const cityHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    cityHandler.setInputAction((click) => {
        const picked = viewer.scene.pick(click.position);
        if (picked?.id?._poiName) {
            const poi = picked.id._poi || currentPOIs.find(p => p.name === picked.id._poiName);
            if (poi) showFloatCard(poi, { clientX: click.position.x, clientY: click.position.y });
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    viewer._cityClickHandler = cityHandler;
}

// ==================== 搜索框 ====================
searchInput.addEventListener('input', () => { const val = searchInput.value.trim(); if (!val) { suggestionsDiv.style.display = 'none'; return; } const allNames = [...Object.keys(PROVINCE_MAP), ...cityDB.map(c => c.name)]; const matched = [...new Set(allNames.filter(n => n.includes(val)))]; suggestionsDiv.innerHTML = matched.map(n => `<div class="suggestion-item">${n}</div>`).join(''); suggestionsDiv.style.display = matched.length ? 'block' : 'none'; document.querySelectorAll('.suggestion-item').forEach((el,i) => { el.onclick = () => { searchInput.value = matched[i]; suggestionsDiv.style.display='none'; flyToLocation(matched[i]); } }); });
searchInput.addEventListener('keydown', e => { 
    if (e.key === 'Enter') { 
        const val = searchInput.value.trim(); 
        if (!val) return;
        Perf.increment('searchCount');
        const allCities = cityDB.filter(c => c.level !== 'province').map(c => c.name);
        const matchedCities = allCities.filter(c => val.includes(c));
        if (matchedCities.length >= 2) { 
            flyToMultiCities(matchedCities); 
        } else if (matchedCities.length === 1) { 
            flyToLocation(matchedCities[0]); 
        } else { 
            flyToLocation(val); 
        }
        suggestionsDiv.style.display = 'none';
    }
});
searchInput.addEventListener('focus', () => { 
    if (!searchInput.value.trim() && searchHistory.length > 0) { 
        suggestionsDiv.innerHTML = searchHistory.map(h => `<div class="suggestion-item" style="color:#b0a090;">📋 ${h}</div>`).join(''); 
        suggestionsDiv.style.display = 'block'; 
        document.querySelectorAll('.suggestion-item').forEach((item, idx) => { 
            item.addEventListener('click', () => { 
                flyToLocation(searchHistory[idx]); 
                suggestionsDiv.style.display = 'none'; 
            }); 
        }); 
    } 
});

// ==================== 首次引导 ====================
if (!localStorage.getItem('popmap_first_visit')) {
    const guideEl = document.getElementById('first-guide');
    if (guideEl) guideEl.style.display = 'flex';
}

// ==================== 按钮事件 ====================
btnRoute.addEventListener('click', renderRoute);
btnShare.addEventListener('click', () => {
    if (tripList.length === 0) return;
    Perf.increment('shareCount');
    const shareData = {
        v: 2,
        t: tripList.map(p => ({
            n: p.name,
            c: p.city || '',
            g: p.lng,
            a: p.lat,
            r: p.rating || 0,
            h: p.hours || '',
            k: p.ticket || ''
        })),
        ts: Date.now()
    };
    // LZString 压缩（体积减少 60-70%）
    const json = JSON.stringify(shareData);
    let compressed;
    if (typeof LZString !== 'undefined') {
        compressed = LZString.compressToEncodedURIComponent(json);
    } else {
        compressed = btoa(unescape(encodeURIComponent(json)));
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?d=${compressed}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('行程链接已复制到剪贴板');
    }).catch(() => {
        const tempInput = document.createElement('input');
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showToast('行程链接已复制到剪贴板');
    });
});

btnExport.addEventListener('click', async () => {
    if (tripList.length === 0) return;

    const tripSection = document.getElementById('trip-section');
    const routeBottomPanel = document.getElementById('route-bottom-panel');

    // 如果底部路线面板正在显示，先隐藏它（避免被截进去）
    const routeWasVisible = routeBottomPanel.classList.contains('show');
    if (routeWasVisible) routeBottomPanel.classList.remove('show');

    // 1. 生成行程标题（优先使用自定义名称，否则自动生成）
    const tripTitleEl = document.getElementById('trip-title');
    let title = tripTitleEl.textContent.trim();
    if (title === '🗺️ 我的行程' || title === '我的行程' || !title) {
        const cities = [...new Set(tripList.map(t => t.city))];
        if (cities.length === 1) {
            title = cities[0] + '旅行计划';
        } else if (cities.length === 2) {
            title = cities.join('·') + '旅行计划';
        } else {
            title = cities.slice(0, 2).join('·') + `等${cities.length}城旅行计划`;
        }
    } else {
        // 移除开头的🗺️表情符号
        title = title.replace(/^🗺️\s*/, '');
    }

    // 2. 临时插入标题栏
    const headerEl = document.createElement('div');
    headerEl.id = 'export-temp-header';
    headerEl.style.cssText = 'padding:8px 0;font-size:16px;font-weight:bold;color:#3a2a1a;text-align:center;border-bottom:1px solid #e0d5c0;margin-bottom:8px;';
    headerEl.textContent = '🗺️ ' + title;
    tripSection.insertBefore(headerEl, tripSection.firstChild);

    // 3. 临时插入品牌水印
    const footerEl = document.createElement('div');
    footerEl.id = 'export-temp-footer';
    footerEl.style.cssText = 'padding:6px 0 0 0;font-size:10px;color:#b0a090;text-align:center;border-top:1px solid #e0d5c0;margin-top:10px;';
    footerEl.textContent = 'Made with ❤️ by PopMap · q1ngshi.github.io/popmap';
    tripSection.appendChild(footerEl);

    // 4. 截图
    try {
        const canvas = await html2canvas(tripSection, {
            backgroundColor: '#f8f5e6',
            scale: 2,
            useCORS: true,
            logging: false
        });

        // 5. 触发下载
        const safeFileName = title.replace(/[\\/:*?"<>|]/g, '_').replace(/\s/g, '_');
        const link = document.createElement('a');
        link.download = `PopMap_${safeFileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        showToast('✅ 行程图片已保存');
    } catch (e) {
        console.error('导出失败', e);
        showToast('导出失败，请重试');
    }

    // 6. 移除临时元素
    document.getElementById('export-temp-header')?.remove();
    document.getElementById('export-temp-footer')?.remove();

    // 7. 恢复底部路线面板（如果之前是显示的）
    if (routeWasVisible) routeBottomPanel.classList.add('show');
});

btnClearTrip.addEventListener('click', () => { 
    if (confirm('确定要清空所有行程吗？')) {
        tripList = []; 
        updateTripDisplay(); 
        clearRoute(); 
        routeBottomPanel.classList.remove('show');
        // 重置行程名称
        const tripTitle = document.getElementById('trip-title');
        if (tripTitle) { tripTitle.textContent = '🗺️ 我的行程'; localStorage.removeItem('popmap_trip_name'); }
    }
});
document.getElementById('panel-close').addEventListener('click', () => { rightPanel.classList.remove('show'); panelTab.classList.remove('hidden'); });
document.getElementById('panel-back').addEventListener('click', backToList);
document.getElementById('panel-close-detail').addEventListener('click', () => { rightPanel.classList.remove('show'); panelTab.classList.remove('hidden'); backToList(); });

// 筛选按钮事件（统一管理 active 态 + 全部/动态城市/本地城市）
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.type;
        if (type === '全部') {
            if (currentCity?.isDynamic) {
                showLoading(true);
                try {
                    currentPOIs = await fetchDynamicPOIs(currentCity.name);
                    viewer.entities.removeAll();
                    renderCityPOIs(currentPOIs);
                    if (rightPanel.classList.contains('show')) {
                        currentProvincePois[currentCity.name] = currentPOIs;
                        refreshRightPanel();
                    }
                } catch (e) { showToast('加载失败'); }
                finally { showLoading(false); }
            } else if (currentCity) {
                currentPOIs = originalPOIs[currentCity.name] || [];
                viewer.entities.removeAll();
                renderCityPOIs(currentPOIs);
                if (rightPanel.classList.contains('show')) {
                    currentProvincePois[currentCity.name] = currentPOIs;
                    refreshRightPanel();
                }
            }
        } else {
            refreshDynamicCityPOIs(type);
        }
    });
});

// 右侧面板拉出箭头
panelTab.addEventListener('click', () => {
    rightPanel.classList.add('show');
    panelTab.classList.add('hidden');
});
// 初始显示箭头（面板隐藏时）
panelTab.classList.remove('hidden');

// 分享链接解析（支持 v1 Base64 和 v2 LZString 两种格式）
function parseShareLink() {
    const urlParams = new URLSearchParams(window.location.search);
    let shareData = urlParams.get('d');  // v2 LZString 格式
    const legacyData = urlParams.get('share');  // v1 Base64 兼容
    
    if (!shareData && !legacyData) return;
    
    let decoded = null;
    try {
        if (shareData) {
            // v2: LZString 压缩格式
            if (typeof LZString !== 'undefined') {
                const json = LZString.decompressFromEncodedURIComponent(shareData);
                decoded = JSON.parse(json);
            } else {
                decoded = JSON.parse(decodeURIComponent(escape(atob(shareData))));
            }
        } else if (legacyData) {
            // v1: Base64 兼容旧版
            decoded = JSON.parse(atob(legacyData));
        }
    } catch (e) {
        console.warn('分享链接解析失败', e);
        return;
    }
    if (!decoded) return;
    
    // v2 格式转换
    if (decoded.v === 2 && Array.isArray(decoded.t)) {
        tripList = decoded.t.map(p => ({
            name: p.n,
            city: p.c,
            lng: p.g,
            lat: p.a,
            rating: p.r,
            hours: p.h,
            ticket: p.k
        }));
        updateTripDisplay();
        showToast('已加载好友分享的行程');
        if (tripList.length > 0) {
            const first = tripList[0];
            if (first.city) flyToLocation(first.city);
        }
    }
    // v1 兼容
    else if (decoded.version === 'popmap-v1' && Array.isArray(decoded.trip)) {
        tripList = decoded.trip;
        updateTripDisplay();
        showToast('已加载好友分享的行程');
        if (tripList.length > 0) {
            const first = tripList[0];
            if (first.city) flyToLocation(first.city);
        }
    }
}

loadChinaBoundary();
parseShareLink();
console.log('✅ PopMap 全功能版已启动');
// 隐藏启动画面
setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) { splash.style.transition = 'opacity 0.5s'; splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); }
}, 1000);
window.addEventListener('load', () => setTimeout(() => Perf.report(), 500));

// ==================== 行程名称编辑器 ====================
(function() {
    const tripTitle = document.getElementById('trip-title');
    // 恢复保存的行程名称
    const savedName = localStorage.getItem('popmap_trip_name');
    if (savedName && tripTitle) tripTitle.textContent = savedName;
    // 编辑时自动保存
    tripTitle.addEventListener('blur', () => {
        localStorage.setItem('popmap_trip_name', tripTitle.textContent.trim());
    });
})();

// ==================== 反馈入口 ====================
document.getElementById('feedback-btn').addEventListener('click', () => {
    const msg = prompt('💬 告诉我们你的想法（建议 / Bug / 夸赞都可以）：');
    if (!msg || !msg.trim()) return;
    
    const title = encodeURIComponent('[用户反馈] ' + msg.trim().substring(0, 30));
    const body = encodeURIComponent(msg.trim() + '\n\n---\n提交自: ' + navigator.userAgent);
    window.open(`https://github.com/q1ngshi/popmap/issues/new?title=${title}&body=${body}`, '_blank');
});

// ==================== 随机飞 ====================
document.getElementById('btn-random').addEventListener('click', () => {
    const randomCities = [
        '北京', '上海', '杭州', '成都', '广州', '深圳', '南京',
        '西安', '重庆', '武汉', '长沙', '厦门', '青岛', '大连',
        '苏州', '昆明', '丽江', '拉萨', '哈尔滨', '三亚', '桂林',
        '张家界', '黄山', '敦煌', '喀纳斯', '稻城', '漠河'
    ];
    const randomCity = randomCities[Math.floor(Math.random() * randomCities.length)];
    searchInput.value = randomCity;
    flyToLocation(randomCity);
});

// ==================== 移动端底部导航 ====================
document.querySelectorAll('#mobile-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'search') {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth' });
        } else if (action === 'trip') {
            if (!rightPanel.classList.contains('show')) {
                panelTab.click();
            }
        } else if (action === 'share') {
            btnShare.click();
        } else if (action === 'random') {
            document.getElementById('btn-random').click();
        }
    });
});

// ==================== 暗色模式切换 ====================
(function() {
    const btn = document.getElementById('btn-darkmode');
    // 恢复用户偏好
    if (localStorage.getItem('popmap_darkmode') === 'true') {
        document.body.classList.add('dark-mode');
        btn.textContent = '☀️';
    }
    btn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        btn.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('popmap_darkmode', isDark);
    });
})();