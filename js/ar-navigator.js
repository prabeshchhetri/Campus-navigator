const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    /* CAMERA */
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 2.5,
        5,
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    camera.attachControl(canvas, true);

    /* LIGHT */
    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 0.9;

    const glow = new BABYLON.GlowLayer("glow", scene);
    glow.intensity = 0.6;

    /* STATE */
    let latestHit = null;
    let selectedRoom = "ROOM 101";
    let currentPath = null;
    let currentAnchor = null;

    /* GUI */
    const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("ui", true, scene);

    function makeButton(name, text, left, top, onClick, width = "140px") {
        const button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
        button.width = width;
        button.height = "45px";
        button.color = "white";
        button.background = "black";
        button.alpha = 0.85;
        button.cornerRadius = 10;
        button.thickness = 1;
        button.left = left;
        button.top = top;
        button.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        button.onPointerUpObservable.add(onClick);
        ui.addControl(button);
        return button;
    }

    makeButton("room101", "Room 101", "16px", "90px", () => {
        selectedRoom = "ROOM 101";
        document.getElementById("info").textContent =
            "Room 101 selected. Scan the floor until the green ring appears, then press Place Path.";
    });

    makeButton("room102", "Room 102", "16px", "145px", () => {
        selectedRoom = "ROOM 102";
        document.getElementById("info").textContent =
            "Room 102 selected. Scan the floor until the green ring appears, then press Place Path.";
    });

    makeButton("office", "Office", "16px", "200px", () => {
        selectedRoom = "OFFICE";
        document.getElementById("info").textContent =
            "Office selected. Scan the floor until the green ring appears, then press Place Path.";
    });

    makeButton("placePath", "Place Path", "16px", "255px", async () => {
        await placePath();
    }, "150px");

    makeButton("reset", "Reset", "16px", "310px", () => {
        if (currentPath) {
            currentPath.dispose(false, true);
            currentPath = null;
        }

        if (currentAnchor && typeof currentAnchor.remove === "function") {
            currentAnchor.remove();
        }
        currentAnchor = null;

        marker.isVisible = true;

        document.getElementById("info").textContent =
            "Path cleared. Select a room, scan the floor, then press Place Path.";
    });

    /* WEBXR */
    const xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
            sessionMode: "immersive-ar",
            referenceSpaceType: "local-floor"
        },
        optionalFeatures: true
    });

    const fm = xr.baseExperience.featuresManager;

    /* HIT TEST */
    const hitTest = fm.enableFeature(
        BABYLON.WebXRHitTest.Name,
        "latest"
    );

    /* ANCHORS */
    const anchorSystem = fm.enableFeature(
        BABYLON.WebXRAnchorSystem.Name,
        "latest"
    );

    /* SURFACE MARKER */
    const marker = BABYLON.MeshBuilder.CreateTorus(
        "marker",
        { diameter: 0.25, thickness: 0.03 },
        scene
    );
    marker.isVisible = false;

    const markerMat = new BABYLON.StandardMaterial("markerMat", scene);
    markerMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
    markerMat.emissiveColor = new BABYLON.Color3(0, 0.6, 0);
    marker.material = markerMat;

    hitTest.onHitTestResultObservable.add((results) => {
        if (results.length > 0) {
            const hit = results[0];
            latestHit = hit;
            marker.isVisible = true;

            const mat = hit.transformationMatrix;
            marker.position.x = mat.m[12];
            marker.position.y = mat.m[13];
            marker.position.z = mat.m[14];
        } else {
            latestHit = null;
            marker.isVisible = false;
        }
    });

    /* PLACE PATH FUNCTION */
    async function placePath() {
        if (!latestHit) {
            document.getElementById("info").textContent =
                "No floor detected yet. Move slowly and keep looking at the floor until the green ring appears.";
            return;
        }

        if (currentPath) {
            currentPath.dispose(false, true);
            currentPath = null;
        }

        if (currentAnchor && typeof currentAnchor.remove === "function") {
            currentAnchor.remove();
        }
        currentAnchor = null;

        try {
            currentAnchor = await anchorSystem.addAnchorPointUsingHitTestResultAsync(latestHit);
            currentPath = createNavigationPath(scene, selectedRoom);
            currentAnchor.attachedNode = currentPath;
            marker.isVisible = false;

            document.getElementById("info").textContent =
                `${selectedRoom} path placed. Follow the arrows to the destination.`;
        } catch (error) {
            console.error("Anchor placement failed:", error);
            document.getElementById("info").textContent =
                "Could not place the path. Try scanning the floor again.";
        }
    }

    /* PATH CREATION */
    function createNavigationPath(scene, roomName) {
        const parent = new BABYLON.TransformNode("path", scene);

        let routeSteps = [];

        if (roomName === "ROOM 101") {
            routeSteps = ["forward", "forward", "forward", "forward", "forward"];
        } else if (roomName === "ROOM 102") {
            routeSteps = ["forward", "forward", "left", "forward", "forward"];
        } else if (roomName === "OFFICE") {
            routeSteps = ["forward", "forward", "right", "forward", "forward"];
        }

        buildPathFromSteps(parent, routeSteps, scene, roomName);
        return parent;
    }

    function buildPathFromSteps(parent, steps, scene, roomName) {
        let currentPosition = new BABYLON.Vector3(0, 0.2, 0);
        let currentRotationY = 0;
        const stepDistance = 0.8;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            if (step === "left") {
                currentRotationY -= Math.PI / 2;
            } else if (step === "right") {
                currentRotationY += Math.PI / 2;
            }

            const arrow = BABYLON.MeshBuilder.CreateCylinder(
                `arrow-${i}`,
                {
                    diameterTop: 0,
                    diameterBottom: 0.3,
                    height: 0.5,
                    tessellation: 4
                },
                scene
            );

            arrow.rotation.x = Math.PI / 2;
            arrow.rotation.z = currentRotationY;
            arrow.position.copyFrom(currentPosition);

            const arrowMat = new BABYLON.StandardMaterial(`arrowMat-${i}`, scene);
            arrowMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
            arrowMat.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
            arrow.material = arrowMat;

            arrow.parent = parent;

            const direction = new BABYLON.Vector3(
                Math.sin(currentRotationY),
                0,
                Math.cos(currentRotationY)
            );

            currentPosition = currentPosition.add(direction.scale(stepDistance));
        }

        const destination = BABYLON.MeshBuilder.CreateBox(
            "destination",
            { size: 0.35 },
            scene
        );
        destination.position.copyFrom(currentPosition);
        destination.position.y = 0.18;

        const destMat = new BABYLON.StandardMaterial("destMat", scene);
        destMat.diffuseColor = new BABYLON.Color3(0, 0, 1);
        destMat.emissiveColor = new BABYLON.Color3(0, 0, 0.5);
        destination.material = destMat;
        destination.parent = parent;

        createRoomLabel(roomName, parent, currentPosition);
    }

    /* ROOM LABEL */
    function createRoomLabel(text, parent, pos) {
        const plane = BABYLON.MeshBuilder.CreatePlane(
            "textPlane",
            { width: 1.8, height: 0.6 },
            scene
        );
        plane.position = new BABYLON.Vector3(pos.x, 1.1, pos.z);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        plane.parent = parent;

        const texture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);

        const rect = new BABYLON.GUI.Rectangle();
        rect.width = 1;
        rect.height = 0.7;
        rect.cornerRadius = 20;
        rect.color = "white";
        rect.thickness = 2;
        rect.background = "black";
        rect.alpha = 0.85;
        texture.addControl(rect);

        const label = new BABYLON.GUI.TextBlock();
        label.text = `${text}\nYou have arrived!`;
        label.color = "white";
        label.fontSize = 64;
        rect.addControl(label);
    }

    return scene;
};

createScene().then((scene) => {
    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
});