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

const light = new BABYLON.HemisphericLight(
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
{diameter:0.2, thickness:0.02},
scene
);

marker.isVisible=false;

const markerMat = new BABYLON.StandardMaterial("mat",scene);
markerMat.diffuseColor = new BABYLON.Color3(0,1,0);
marker.material = markerMat;


/* HIT RESULT STORAGE */

let latestHit=null;

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


/* TAP TO PLACE ARROW PATH */

window.addEventListener("click", async ()=>{

if(!latestHit) return;

const anchor = await anchorSystem.addAnchorPointUsingHitTestResultAsync(latestHit);

/* CREATE NAVIGATION PATH */

const path = createArrowPath(scene);

anchor.attachedNode = path;

});


/* ARROW PATH FUNCTION */

function createArrowPath(scene){

const parent = new BABYLON.TransformNode("path");

for(let i=0;i<5;i++){

const arrow = BABYLON.MeshBuilder.CreateCylinder(
"arrow",
{
diameterTop:0,
diameterBottom:0.2,
height:0.4
},
scene
);

arrow.position.z = i * 0.6;
arrow.position.y = 0.2;

arrow.rotation.x = Math.PI/2;

const mat = new BABYLON.StandardMaterial("arrowMat",scene);
mat.diffuseColor = new BABYLON.Color3(1,0,0);

arrow.material = mat;

arrow.parent = parent;

}

/* DESTINATION BOX */

const dest = BABYLON.MeshBuilder.CreateBox(
"destination",
{size:0.3},
scene
);

dest.position.z = 3.5;
dest.position.y = 0.15;

const destMat = new BABYLON.StandardMaterial("destMat",scene);
destMat.diffuseColor = new BABYLON.Color3(0,0,1);

dest.material = destMat;

dest.parent = parent;

return parent;

}

return scene;

};


createScene().then((scene)=>{

engine.runRenderLoop(function(){
scene.render();
});

window.addEventListener("resize",function(){
engine.resize();
});

});