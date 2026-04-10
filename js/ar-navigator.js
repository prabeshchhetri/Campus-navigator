const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // CAMERA
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 2.5,
        5,
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    camera.attachControl(canvas, true);

    // LIGHT
    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 0.9;

    const glow = new BABYLON.GlowLayer("glow", scene);
    glow.intensity = 0.6;

    // STATE
    let latestHit = null;
    let selectedRoom = "ROOM 101";
    let currentPath = null;
    let currentAnchor = null;

    // GUI
    const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("ui", true, scene);

    function makeButton(name, text, left, top, onClick) {
        const button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
        button.width = "140px";
        button.height = "45px";
        button.color = "white";
        button.background = "black";
        button.alpha = 0.8;
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
            "Room 101 selected. Scan the floor, then tap once to place the path.";
    });

    makeButton("room102", "Room 102", "16px", "145px", () => {
        selectedRoom = "ROOM 102";
        document.getElementById("info").textContent =
            "Room 102 selected. Scan the floor, then tap once to place the path.";
    });

    makeButton("office", "Office", "16px", "200px", () => {
        selectedRoom = "OFFICE";
        document.getElementById("info").textContent =
            "Office selected. Scan the floor, then tap once to place the path.";
    });

    makeButton("reset", "Reset", "16px", "255px", () => {
        if (currentPath) {
            currentPath.dispose(false, true);
            currentPath = null;
        }

        if (currentAnchor && typeof currentAnchor.remove === "function") {
            currentAnchor.remove();
        }
        currentAnchor = null;

        document.getElementById("info").textContent =
            "Path cleared. Select a room, scan the floor, then tap once to place the navigation path.";
    });

    // WEBXR
    const xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
            sessionMode: "immersive-ar",
            referenceSpaceType: "local-floor"
        },
        optionalFeatures: true
    });

    const fm = xr.baseExperience.featuresManager;

    // HIT TEST
    const hitTest = fm.enableFeature(
        BABYLON.WebXRHitTest.Name,
        "latest"
    );

    // ANCHORS
    const anchorSystem = fm.enableFeature(
        BABYLON.WebXRAnchorSystem.Name,
        "latest"
    );

    // SURFACE MARKER
    const marker = BABYLON.MeshBuilder.CreateTorus(
        "marker",
        { diameter: 0.25, thickness: 0.03 },
        scene
    );
    marker.isVisible = false;

    const markerMat = new BABYLON.StandardMaterial("markerMat", scene);
    markerMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
    markerMat.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
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

    // PLACE PATH
    canvas.addEventListener("pointerdown", async () => {
        if (!latestHit) {
            document.getElementById("info").textContent =
                "No surface detected yet. Move the device slowly and scan the floor.";
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
    });

    // NAVIGATION PATH
    function createNavigationPath(scene, roomName) {
        const parent = new BABYLON.TransformNode("path", scene);

        const arrowCount = 5;
        const spacing = 0.8;

        for (let i = 0; i < arrowCount; i++) {
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
            arrow.position.z = i * spacing;
            arrow.position.y = 0.2;

            const arrowMat = new BABYLON.StandardMaterial(`arrowMat-${i}`, scene);
            arrowMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
            arrowMat.emissiveColor = new BABYLON.Color3(0.4, 0, 0);
            arrow.material = arrowMat;

            arrow.parent = parent;
        }

        const destination = BABYLON.MeshBuilder.CreateBox(
            "destination",
            { size: 0.35 },
            scene
        );
        destination.position.z = arrowCount * spacing;
        destination.position.y = 0.18;

        const destMat = new BABYLON.StandardMaterial("destMat", scene);
        destMat.diffuseColor = new BABYLON.Color3(0, 0, 1);
        destMat.emissiveColor = new BABYLON.Color3(0, 0, 0.4);
        destination.material = destMat;
        destination.parent = parent;

        createRoomLabel(roomName, parent, destination.position.z);

        return parent;
    }

    // ROOM LABEL
    function createRoomLabel(text, parent, zPos) {
        const plane = BABYLON.MeshBuilder.CreatePlane(
            "textPlane",
            { width: 1.8, height: 0.6 },
            scene
        );
        plane.position.z = zPos;
        plane.position.y = 1.1;
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