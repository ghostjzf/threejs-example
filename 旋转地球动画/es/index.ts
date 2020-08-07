// @ts-nocheck
import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from './MeshLine';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 颜色组：绿色、黄色
let colors = ['rgb(27, 180, 176)', '#ffe100', 'blue'];
// 光线投射
let raycaster: any = null;
// 渲染器
let renderer: any = null;
// 相机
let camera: any = null;
// 场景
let scene: any = null;
// 包裹画布dom
let dom: any = null;
// 地球对象
let earthBall: any = null;
// 标记点集合对象
let marking: any = null;
// 标记位置对象
let markingPos: any[] = [];
// 地球大小
let earthBallSize = 30;
// 地球贴图
let earthImg = '/static/images/home/world_map.jpg';
// 迁徙路径分段数
let metapNum = 150;
// 迁徙路径标记分段数
let markingNum = 50;
// 轨迹线条颜色
let metapLineColor = colors[1];
// 球上标记点大小
let dotWidth = 1;
// 球上标记点颜色
let dotColor = '#ffe100';
// 轨迹上运动的球大小
let slideBallSize = 0.2;
// 轨迹上运动的球颜色
let slideBallColor = '#ffe100';
// 自转方向，-1向左旋转，1向右旋转
let autoRotateDirection = 1;
// 鼠标
let mouse: any = {};
// 是否捕捉交点
let captureMark = false;
// 坐标与data映射的二维数组
let posToData: any[] = [];
// 控制器
let orbitcontrols: any = null;

if (window.screen.width <= 500) {
    earthBallSize = 15;
    dotWidth = 0.6;
}

function start() {
    if (orbitcontrols.autoRotate === false) {
        orbitcontrols.autoRotate = true;

        render();
    }
}

function stop() {
    orbitcontrols.autoRotate = false;
}

// 经纬度转换函数(经度、纬度、半径)
function getPosition(longitude, latitude, radius) {
    let lg = THREE.Math.degToRad(longitude);
    let lt = THREE.Math.degToRad(latitude);
    let temp = radius * Math.cos(lt);
    let x = temp * Math.sin(lg);
    let y = radius * Math.sin(lt);
    let z = temp * Math.cos(lg);

    return {
        x: x,
        y: y,
        z: z
    };
}

// 计算球体上两个点的中点
function getVCenter(v1, v2) {
    let v = v1.add(v2);

    return v.divideScalar(2);
}

// 计算球体两点向量固定长度的点
function getLenVcetor(v1, v2, len) {
    let v1v2Len = v1.distanceTo(v2);

    return v1.lerp(v2, len / v1v2Len);
}

// 添加轨迹函数
function addLine(v0, v3) {
    let angle = (v0.angleTo(v3) * 180) / Math.PI;
    let aLen = angle * 0.5 * (1 - angle / (Math.PI * 90));
    let hLen = angle * angle * 1.2 * (1 - angle / (Math.PI * 90));
    let p0 = new THREE.Vector3(0, 0, 0);
    // 法线向量
    let rayLine = new THREE.Ray(p0, getVCenter(v0.clone(), v3.clone()));
    // 顶点坐标
    let vtop = rayLine.at(hLen / rayLine.at(1).distanceTo(p0));
    // 控制点坐标
    let v1 = getLenVcetor(v0.clone(), vtop, aLen);
    let v2 = getLenVcetor(v3.clone(), vtop, aLen);
    // 绘制贝塞尔曲线
    let curve = new THREE.CubicBezierCurve3(v0, v1, v2, v3);
    let geometry = new THREE.Geometry();

    geometry.vertices = curve.getPoints(100);

    let line = new MeshLine() as any;

    line.setGeometry(geometry);

    let material = new MeshLineMaterial({
        color: metapLineColor,
        lineWidth: 0.15,
        transparent: true,
        opacity: 1
    });

    return {
        curve: curve,
        lineMesh: new THREE.Mesh(line.geometry, material)
    };
}

// 执行函数
function render() {
    if (captureMark) {
        // 通过摄像机和鼠标位置更新射线
        raycaster.setFromCamera(mouse, camera);

        // 计算物体和射线的焦点
        const intersects = raycaster.intersectObjects([scene.children[2]], true);

        const clickObject = intersects.length && intersects[0].object;

        if (clickObject) {
            let matchData = posToData.filter(item => {
                const pos: any = item[0];

                return (
                    pos.x === clickObject.position.x &&
                    pos.y === clickObject.position.y &&
                    pos.z === clickObject.position.z
                );
            });

            intersects.length && intersects[0].object.material.color.set(0xff0000);

            const [position, itemData, callback] = matchData[0];

            if (callback) {
                callback({
                    controls: {
                        start,
                        stop
                    },
                    position,
                    selectItem: itemData
                });
            }

            setTimeout(() => {
                intersects.length && intersects[0].object.material.color.set(dotColor);
            }, 200);
        } else {
            // if (orbitcontrols.autoRotate === false) {
            //     orbitcontrols.autoRotate = true;
            //     render();
            // }
        }
    }

    scene.rotation.y += autoRotateDirection * 0.001;
    renderer.render(scene, camera);
    orbitcontrols.update();

    if (orbitcontrols.autoRotate) {
        requestAnimationFrame(render);
    }
}

// 鼠标移动
function onMouseClick(event) {
    captureMark = true;

    // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
    mouse.x = ((event.clientX - dom.getBoundingClientRect().left) / dom.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - dom.getBoundingClientRect().top) / dom.clientHeight) * 2 + 1;
}

// 初始化函数
function initThree(onMarkClick) {
    // 初始化场景
    scene = new THREE.Scene();
    // 初始化相机
    camera = new THREE.PerspectiveCamera(20, dom.clientWidth / dom.clientHeight, 1, 100000);
    // 设置相机位置
    camera.position.set(0, 0, 200);
    // 初始化光线投射
    raycaster = new THREE.Raycaster();

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });

    // 设置窗口尺寸
    renderer.setSize(dom.clientWidth, dom.clientHeight);
    // 初始化控制器
    orbitcontrols = new OrbitControls(camera, renderer.domElement);

    orbitcontrols.autoRotate = true;
    orbitcontrols.autoRotateSpeed = 0.001;
    orbitcontrols.enableZoom = false;

    // 防止重复添加
    if (!dom.children.length) {
        dom.appendChild(renderer.domElement);
    }

    // 设置光线
    scene.add(new THREE.HemisphereLight('#ffffff', '#ffffff', 1));
    // 定义地球材质

    let earthTexture = THREE.ImageUtils.loadTexture(earthImg, {}, () => {
        renderer.render(scene, camera);
    });

    // 创建地球
    earthBall = new THREE.Mesh(
        new THREE.SphereGeometry(earthBallSize, 50, 50),
        new THREE.MeshBasicMaterial({
            map: earthTexture
        })
    );

    scene.add(earthBall);
    // 标记点组合
    marking = new THREE.Group();

    // 将标记点添加到地球上
    markingPos.forEach((markingItem, index) => {
        // 创建标记点球体
        let ball = new THREE.Mesh(
            new THREE.SphereGeometry(index === 0 ? dotWidth + 0.3 : dotWidth, 30, 30),
            new THREE.MeshBasicMaterial({
                color: dotColor
            })
        );

        // 获取标记点坐标
        let ballPos = getPosition(markingItem.pos[0] + 90, markingItem.pos[1], earthBallSize);

        // 缓存坐标与数据的映射
        posToData.push([ballPos, markingItem, onMarkClick]);
        ball.position.set(ballPos.x, ballPos.y, ballPos.z);
        marking.add(ball);
    });

    scene.add(marking);

    let animateDots: any[] = [];
    // 线条对象集合
    let groupLines = new THREE.Group();

    // 线条
    marking.children.forEach(item => {
        const line = addLine(marking.children[0].position, item.position);

        groupLines.add(line.lineMesh);
        animateDots.push(line.curve.getPoints(metapNum));
    });

    scene.add(groupLines);

    // 线上滑动的小球
    let aGroup = new THREE.Group();

    for (let i = 0; i < animateDots.length; i++) {
        for (let j = 0; j < markingNum; j++) {
            let aGeo = new THREE.SphereGeometry(slideBallSize, 10, 10);
            let aMaterial = new THREE.MeshBasicMaterial({
                color: slideBallColor,
                transparent: true,
                opacity: 1 - j * 0.02
            });
            let aMesh = new THREE.Mesh(aGeo, aMaterial);

            aGroup.add(aMesh);
        }
    }

    let vIndex = 0;
    let firstBool = true;

    function animationLine() {
        aGroup.children.forEach((elem, index) => {
            // @ts-ignore
            let _index = parseInt(index / markingNum);
            let index2 = index - markingNum * _index;
            let _vIndex = 0;

            if (firstBool) {
                _vIndex = vIndex - (index2 % markingNum) >= 0 ? vIndex - (index2 % markingNum) : 0;
            } else {
                _vIndex =
                    vIndex - (index2 % markingNum) >= 0 ? vIndex - (index2 % markingNum) : metapNum + vIndex - index2;
            }

            let v = animateDots[_index][_vIndex];

            elem.position.set(v.x, v.y, v.z);
        });

        vIndex++;

        if (vIndex > metapNum) {
            vIndex = 0;
        }

        if (vIndex === metapNum && firstBool) {
            firstBool = false;
        }

        requestAnimationFrame(animationLine);
    }

    scene.add(aGroup);
    animationLine();
    // 渲染
    render();
}

// 页面资源点击捕捉
window.addEventListener('mousedown', onMouseClick, false);
window.addEventListener('touchstart', onMouseClick, false);

window.addEventListener(
    'mousemove',
    () => {
        captureMark = false;
    },
    false
);

window.addEventListener(
    'mouseup',
    () => {
        captureMark = false;
    },
    false
);

// 窗口resize事件
window.onresize = () => {
    // 重新初始化尺寸
    camera.aspect = dom.clientWidth / dom.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(dom.clientWidth, dom.clientHeight);
};

function init(options) {
    const { el, marks, onMarkClick } = options;

    markingPos = marks;
    dom = el;

    if (dom) {
        initThree(onMarkClick);
    }
}

export const $earth = {
    init
};
