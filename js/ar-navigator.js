// Canvas
const canvas = document.getElementById("renderCanvas");

// Babylon engine
const engine = new BABYLON.Engine(canvas, true);

// Create scene
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


/* TEST OBJECT (Navigation Arrow) */

const arrow = BABYLON.MeshBuilder.CreateCylinder(
"arrow",
{diameterTop:0, diameterBottom:0.3, height:0.6},
scene
);

arrow.position.z = -2;
arrow.position.y = 0.5;

const arrowMat = new BABYLON.StandardMaterial("arrowMat",scene);
arrowMat.diffuseColor = new BABYLON.Color3(1,0,0);
arrow.material = arrowMat;


/* ENABLE WEBXR */

const xr = await scene.createDefaultXRExperienceAsync({
uiOptions:{
sessionMode:"immersive-ar",
referenceSpaceType:"local-floor"
}
});

const fm = xr.baseExperience.featuresManager;


/* HIT TEST */

const hitTest = fm.enableFeature(
BABYLON.WebXRHitTest.Name,
"latest"
);


/* MARKER */

const marker = BABYLON.MeshBuilder.CreateTorus(
"marker",
{diameter:0.15, thickness:0.02},
scene
);

marker.isVisible = false;

const markerMat = new BABYLON.StandardMaterial("markerMat",scene);
markerMat.diffuseColor = new BABYLON.Color3(0,1,0);
marker.material = markerMat;


/* HIT TEST RESULTS */

let latestHit = null;

hitTest.onHitTestResultObservable.add((results)=>{

if(results.length){

const hit = results[0];
latestHit = hit;

marker.isVisible = true;

const mat = hit.transformationMatrix;

marker.position.x = mat.m[12];
marker.position.y = mat.m[13];
marker.position.z = mat.m[14];

}else{

marker.isVisible = false;

}

});


/* ANCHOR SYSTEM */

const anchorSystem = fm.enableFeature(
BABYLON.WebXRAnchorSystem.Name,
"latest"
);


/* TAP TO PLACE OBJECT */

window.addEventListener("click", async ()=>{

if(latestHit){

const anchor = await anchorSystem.addAnchorPointUsingHitTestResultAsync(latestHit);

const box = buildRandomBox();

anchor.attachedNode = box;

}

});


/* FUNCTION TO CREATE RANDOM BOX */

function buildRandomBox(){

const box = BABYLON.MeshBuilder.CreateBox(
"box",
{size:0.1},
scene
);

box.position.y = 0.05;
box.bakeCurrentTransformIntoVertices();

const mat = new BABYLON.StandardMaterial("boxMat",scene);

mat.diffuseColor = new BABYLON.Color3(
Math.random(),
Math.random(),
Math.random()
);

box.material = mat;

return box;

}


return scene;

};


// Run scene
createScene().then((scene)=>{

engine.runRenderLoop(function(){
scene.render();
});

window.addEventListener("resize",function(){
engine.resize();
});

});