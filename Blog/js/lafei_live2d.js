const live2d = PIXI.live2d;
const hitAreaFrames = new live2d.HitAreaFrames();
hitAreaFrames.visible = false;


const mapper_url = "https://cdn.jsdelivr.net/gh/eipip1e0/BlogCDN/Blog/live2d/mapper.json";


const live2dWidget = document.getElementById("user-live2d").getElementsByClassName('item-content')[0];


var app;
var mapper;
var currentModelIndex = 0;
var cubismModels;
var cubismModelsNum;

;
(async function initModelLoader() {
  //载入mapper.json文件
  //先本地后网络
  console.log("正在加载mapper中的live2d模型");
  mapper = await fetch(mapper_url).then(res => {
    if (res.ok) {
      return res.json();
    } else {
      console.log("mapper不存在，尝试加载默认live2d模型");
      return null;
    }
  });

  console.log(mapper);
  if (mapper === null) {
    mapper = await fetch(mapper_url).then(res => res.json());
  }
  //创建live2d画布
  app = new PIXI.Application({
    view: document.getElementById('live2d'),
    // backgroundAlpha: 0, //0透明，1不透明
    transparent: true,
    antialias: true, //抗锯齿
    // resolution、autoDensity两者联合使用，提高渲染分辨率
    resolution: 3,
    autoDensity: true, //保证修改resolution之后，模型不被放大
    resizeTo: live2dWidget, //配合butterfly主题的widget
    //使用width与height，相比resizeTo: window也能达到同样的初始页面效果，但resizeTo，缩放页面时，模型会脱离原有相对位置
    // width: window.innerWidth*0.6,
    height: live2dWidget.offsetWidth * 1.0
  });

  // 载入初始模型
  cubismModels = mapper.models;
  cubismModelsNum = cubismModels.length;
  //取随机数
  // currentModelIndex = Math.floor(cubismModelsNum * Math.random());
  loadModel(cubismModels[currentModelIndex]);
  live2d.config.sound = false;
  // live2d.config.motionFadingDuration = 0;
  // live2d.config.idleMotionFadingDuration = 0;
  // live2d.config.expressionFadingDuration = 0;
  console.log("模型初始化完成");
})();

async function loadModel(cubismModel) {
  // 载入live2d模型
  const modelJson = await fetch(cubismModel).then(res => res.json());
  const model = await live2d.Live2DModel.from(cubismModel);
  app.stage.addChild(model);

  // 模型位姿变换
  const scaleX = live2dWidget.offsetWidth * 0.9 / model.width;
  const scaleY = live2dWidget.offsetHeight * 0.9 / model.height;
  model.scale.set(Math.min(scaleX, scaleY)); //TODO: 写入配置文件，使用配置文件重写缩放比例以及模型初始位置
  model.x = 0;
  model.y = live2dWidget.offsetHeight * 0.9 - model.height; //此时模型位于左下角
  // model.anchor.set(-0.5, -0.5);//x左移，y上移

  // 加入模型拖动功能
  draggable(model);

  // 显示模型可点击区域------------
  model.addChild(hitAreaFrames);

  // 加入模型点击-----------------
  let hitAreaDefs;
  let modelVersion = 3;

  // 模型版本判断，并加载hitAreas--------------------
  if (modelJson.Version == 3) {
    hitAreaDefs = modelJson.HitAreas;
  } else {
    hitAreaDefs = modelJson.hit_areas;
    modelVersion = 2;
  }

  // Cubism4加入模型点击功能
  if (modelVersion == 3) {
    model.on('hit', hitAreas => {
      let motion = {};
      let maxOrder = -2;
      for (let i = 0; i < hitAreas.length; i++) {
        hitAreaDefs.forEach(hitAreaDef => {
          // 遍历对比点击区域与可点击区域。
          if (hitAreaDef.Name == hitAreas[i]) { // 可点击区域中找到被点击区域了
            if (hitAreaDef.Order === undefined) { // 如果点击区域中的order全部都是未定义，则取第一个获取到的点击区域对应的动作
              if (maxOrder == -2) {
                motion = hitAreaDef.Motion;
                maxOrder = -1;
              }
            } else { // 否则选取order最大的点击区域对应的动作
              if (hitAreaDef.Order > maxOrder) {
                maxOrder = hitAreaDef.Order;
                motion = hitAreaDef.Motion;
              }
            }
          }
        })
      }
      // 执行动作
      model.motion(motion);
    })
  } else {
    // Cubism2加入模型点击功能
    model.on('hit', hitAreas => {
      let motion = {};
      let maxOrder = -2;
      for (let i = 0; i < hitAreas.length; i++) {
        hitAreaDefs.forEach(hitAreaDef => {
          // 遍历对比点击区域与可点击区域。
          if (hitAreaDef.name == hitAreas[i]) { // 可点击区域中找到被点击区域了
            if (hitAreaDef.order === undefined) { // 如果点击区域中的order全部都是未定义，则取第一个获取到的点击区域对应的动作
              if (maxOrder == -2) {
                motion = hitAreaDef.motion;
                maxOrder = -1;
              }
            } else { // 否则选取order最大的点击区域对应的动作
              if (hitAreaDef.order > maxOrder) {
                maxOrder = hitAreaDef.order;
                motion = hitAreaDef.motion;
              }
            }
          }
        })
      }
      // 执行动作
      model.motion(motion);
    });
  }
}


async function removeModel() {
  app.stage.children.forEach(child => child.destroy());
  // removeChildAt(0);
}

async function hitAreaDisplay() {
  hitAreaFrames.visible = !hitAreaFrames.visible;
}

async function loadNextModel() {
  console.log("加载下一个模型");
  removeModel();
  currentModelIndex += 1;
  currentModelIndex %= cubismModelsNum;
  loadModel(cubismModels[currentModelIndex]);
}

async function loadRandomModel() {
  removeModel();
  currentModelIndex = Math.floor(cubismModelsNum * Math.random());
  loadModel(cubismModels[currentModelIndex]);
}

function soundSwticher() {
  live2d.config.sound = !live2d.config.sound;
}

async function closeModelWindow() {
  app.stage.destroy(true);
}


// 记录模型位置，加载下一个模型时使用该位置
function draggable(model) {
  model.buttonMode = true;
  model.on("pointerdown", (e) => {
    model.dragging = true;
    model._pointerX = e.data.global.x - model.x;
    model._pointerY = e.data.global.y - model.y;
  });
  model.on("pointermove", (e) => {
    if (model.dragging) {
      model.position.x = e.data.global.x - model._pointerX;
      model.position.y = e.data.global.y - model._pointerY;
    }
  });
  model.on("pointerupoutside", () => (model.dragging = false));
  model.on("pointerup", () => (model.dragging = false));
}

// module.exports = {
//   // initModelLoader,
//   loadNextModel,
//   loadRandomModel,
//   closeModelWindow,
//   soundSwticher,
//   hitAreaDisplay,
// }