const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function(){

const scene = new BABYLON.Scene(engine);

/* CAMERA */

const camera = new BABYLON.ArcRotateCamera(
"camera",
-Math.PI/2,
Math.PI/2.5,
5,
new BABYLON.Vector3(0,1,0),
scene
);

camera.attachControl(canvas,true);


/* LIGHT */

new BABYLON.HemisphericLight(
"light",
new BABYLON.Vector3(0,1,0),
scene
);


/* WEBXR */

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


/* SURFACE MARKER */

const marker = BABYLON.MeshBuilder.CreateTorus(
"marker",
{diameter:0.25, thickness:0.03},
scene
);

marker.isVisible=false;

const markerMat = new BABYLON.StandardMaterial("markerMat",scene);
markerMat.diffuseColor = new BABYLON.Color3(0,1,0);
marker.material = markerMat;


/* STORE HIT RESULT */

let latestHit = null;

hitTest.onHitTestResultObservable.add((results)=>{

if(results.length){

const hit = results[0];
latestHit = hit;

marker.isVisible=true;

const mat = hit.transformationMatrix;

marker.position.x = mat.m[12];
marker.position.y = mat.m[13];
marker.position.z = mat.m[14];

}else{

marker.isVisible=false;

}

});


/* ANCHOR SYSTEM */

const anchorSystem = fm.enableFeature(
BABYLON.WebXRAnchorSystem.Name,
"latest"
);


/* TAP TO PLACE PATH */

window.addEventListener("click", async ()=>{

if(!latestHit) return;

const anchor = await anchorSystem.addAnchorPointUsingHitTestResultAsync(latestHit);

const path = createNavigationPath(scene);

anchor.attachedNode = path;

});


/* NAVIGATION PATH */

function createNavigationPath(scene){

const parent = new BABYLON.TransformNode("path");


/* ARROWS */

for(let i=0;i<5;i++){

const arrow = BABYLON.MeshBuilder.CreateCylinder(
"arrow",
{diameterTop:0, diameterBottom:0.3, height:0.5},
scene
);

arrow.rotation.x = Math.PI/2;

arrow.position.z = i * 0.8;
arrow.position.y = 0.25;

const mat = new BABYLON.StandardMaterial("arrowMat",scene);
mat.diffuseColor = new BABYLON.Color3(1,0,0);

arrow.material = mat;

arrow.parent = parent;

}


/* DESTINATION */

const dest = BABYLON.MeshBuilder.CreateBox(
"destination",
{size:0.4},
scene
);

dest.position.z = 4;
dest.position.y = 0.2;

const destMat = new BABYLON.StandardMaterial("destMat",scene);
destMat.diffuseColor = new BABYLON.Color3(0,0,1);

dest.material = destMat;

dest.parent = parent;


/* DESTINATION TEXT */

const plane = BABYLON.MeshBuilder.CreatePlane(
"textPlane",
{size:1},
scene
);

plane.position.z = 4;
plane.position.y = 1;

plane.parent = parent;

const texture = new BABYLON.DynamicTexture(
"texture",
512,
scene,
true
);

texture.drawText(
"ROOM 101",
100,
250,
"bold 70px Arial",
"white",
"transparent",
true
);

const mat = new BABYLON.StandardMaterial("textMat",scene);
mat.diffuseTexture = texture;

plane.material = mat;

return parent;

}

return scene;

};


createScene().then((scene)=>{

engine.runRenderLoop(()=>{

scene.render();

});

window.addEventListener("resize",()=>{

engine.resize();

});

});