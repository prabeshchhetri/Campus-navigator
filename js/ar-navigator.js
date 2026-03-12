// Canvas
const canvas = document.getElementById("renderCanvas");

// Babylon engine
const engine = new BABYLON.Engine(canvas, true);

// Create Scene
const createScene = async function () {

const scene = new BABYLON.Scene(engine);


/* CAMERA */
const camera = new BABYLON.ArcRotateCamera(
    "camera",
    -Math.PI / 2,
    Math.PI / 2.5,
    5,
    new BABYLON.Vector3(0,1,0),
    scene
);
camera.attachControl(canvas, true);


/* LIGHTING */
const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0,1,0),
    scene
);
light.intensity = 0.8;


/* NAVIGATION ARROW */

const arrow = BABYLON.MeshBuilder.CreateCylinder(
    "arrow",
    {diameterTop:0, diameterBottom:0.3, height:0.6},
    scene
);

arrow.position = new BABYLON.Vector3(0,0.3,-2);

const arrowMat = new BABYLON.StandardMaterial("arrowMat",scene);
arrowMat.diffuseColor = new BABYLON.Color3(1,0,0);
arrow.material = arrowMat;


/* DESTINATION BOX */

const roomMarker = BABYLON.MeshBuilder.CreateBox(
    "room",
    {size:0.3},
    scene
);

roomMarker.position = new BABYLON.Vector3(0,0.15,-4);

const roomMat = new BABYLON.StandardMaterial("roomMat",scene);
roomMat.diffuseColor = new BABYLON.Color3(0,0,1);
roomMarker.material = roomMat;


/* ENABLE WEBXR AR */

const xr = await scene.createDefaultXRExperienceAsync({
    uiOptions:{
        sessionMode:"immersive-ar",
        referenceSpaceType:"local-floor"
    }
});


return scene;
};


// Start scene
createScene().then((scene)=>{

engine.runRenderLoop(function(){
scene.render();
});

window.addEventListener("resize",function(){
engine.resize();
});

});