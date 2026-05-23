/**
 * PopMap 项目配置文件
 */

// Cesium Ion Token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YmFhYWQxMy0xMzZlLTQzMWItOTY4Ny00OGVmYmY5ZTg4NGYiLCJpZCI6NDMwNDgyLCJzdWIiOiJxaW5nc2hpXzIwMjZjaGluYSIsImlzcyI6Imh0dHBzOi8vaW9uLmNlc2l1bS5jb20iLCJhdWQiOiJQb3BtYXAiLCJpYXQiOjE3Nzg2NzI0Mzl9.SCIxuKi9MrpWGJMItlvOlQQxfOpKnIf3O1wtGU_3qHM';

// 高德地图 API Key
window.AMAP_KEY = '9206d43d00cc229b5e0c6621715021aa';

// GitHub Pages 路径适配
const isGitHubPages = location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages ? '/PopMap/' : './';

window.POPMAP_CONFIG = {
    cesiumToken: Cesium.Ion.defaultAccessToken,
    amapKey: window.AMAP_KEY,
    cesiumBaseUrl: window.CESIUM_BASE_URL,
    basePath: BASE_PATH,
    isGitHubPages: isGitHubPages
};