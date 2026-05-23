// TSP Web Worker - 行程智能优化（最近邻 + 2-opt）
// 在后台线程运行，避免阻塞主线程 UI

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

// 构建距离矩阵
function buildDistanceMatrix(points) {
    const n = points.length;
    const matrix = [];
    for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
            matrix[i][j] = parseFloat(calculateDistance(
                points[i].lat, points[i].lng,
                points[j].lat, points[j].lng
            ));
        }
    }
    return matrix;
}

// 最近邻贪心算法
function nearestNeighbor(matrix, n) {
    const visited = new Array(n).fill(false);
    const route = [0];
    visited[0] = true;

    for (let step = 1; step < n; step++) {
        const last = route[route.length - 1];
        let nearestIdx = -1;
        let nearestDist = Infinity;

        for (let j = 0; j < n; j++) {
            if (!visited[j] && matrix[last][j] < nearestDist) {
                nearestDist = matrix[last][j];
                nearestIdx = j;
            }
        }

        visited[nearestIdx] = true;
        route.push(nearestIdx);
    }

    return route;
}

// 2-opt 局部搜索（消除路线交叉）
function twoOpt(route, matrix) {
    const n = route.length;
    let improved = true;
    let iterations = 0;
    const maxIter = 100;

    while (improved && iterations < maxIter) {
        improved = false;
        iterations++;

        for (let i = 0; i < n - 2; i++) {
            for (let j = i + 2; j < n - 1; j++) {
                const distBefore = matrix[route[i]][route[i + 1]] + matrix[route[j]][route[j + 1]];
                const distAfter = matrix[route[i]][route[j]] + matrix[route[i + 1]][route[j + 1]];

                if (distAfter < distBefore) {
                    // 反转 i+1..j 段
                    const reversed = route.slice(i + 1, j + 1).reverse();
                    route.splice(i + 1, j - i, ...reversed);
                    improved = true;
                }
            }
        }
    }

    return route;
}

// 计算路线总距离
function totalDistance(route, matrix) {
    let sum = 0;
    for (let i = 0; i < route.length - 1; i++) {
        sum += matrix[route[i]][route[i + 1]];
    }
    return sum;
}

// 主入口
self.onmessage = function (e) {
    const startTime = performance.now();
    const { points } = e.data;

    const n = points.length;
    if (n <= 2) {
        self.postMessage({
            optimizedRoute: points,
            originalDistance: 0,
            optimizedDistance: 0,
            timeMs: 0
        });
        return;
    }

    // 原始顺序距离
    const matrix = buildDistanceMatrix(points);
    const originalIndices = points.map((_, i) => i);
    const originalDist = totalDistance(originalIndices, matrix);

    // 最近邻 + 2-opt 优化
    const nnRoute = nearestNeighbor(matrix, n);
    const optimizedRoute = twoOpt(nnRoute, matrix);
    const optimizedDist = totalDistance(optimizedRoute, matrix);

    // 按优化后的顺序重排
    const result = optimizedRoute.map(i => points[i]);

    const endTime = performance.now();
    const timeMs = (endTime - startTime).toFixed(1);

    self.postMessage({
        optimizedRoute: result,
        originalDistance: originalDist,
        optimizedDistance: optimizedDist,
        timeMs: parseInt(timeMs)
    });
};