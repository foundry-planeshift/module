import { pushControlButtons, registerLayer, registerSettings } from "./scripts/controlButtons.js";
import { renderTokenConfigHandler, SETTINGS } from "./scripts/tokensSettings.js";
import { generateArucoMarker } from "./libs/aruco-marker.js";

export const MODULE_NAME = "PlaneShift";
export const MODULE_ID = "planeshift";

export const SOCKET_MODULE_ID = `module.${MODULE_ID}`;
export const SOCKET_SHOW_CALIBRATION_PATTERN = "showCalibrationPattern";
export const SOCKET_HIDE_CALIBRATION_PATTERN = "hideCalibrationPattern";
export const SOCKET_SHOW_BATTLEAREA_MARKERS = "showBattleAreaMarkers";
export const SOCKET_HIDE_BATTLEAREA_MARKERS = "hideBattleAreaMarkers";

export const SETTING_OBSERVER_USER = "observerUser";

export var planeshift_log = function(text) {
    var context = "PlaneShift |";
    return Function.prototype.bind.call(console.log, console, context);
}();

export const EndPoint = {
    HEALTH_CHECK: 'healthcheck',
    TOKENS_LOCATION: 'tokenslocation',
    ORIGINAL_IMAGE: 'originalimage',
    ROI_IMAGE: 'roiimage',
    SELECT_ROI: 'selectroi',
    CALIBRATION_IMAGE: "calibrationimage",
    CALIBRATE_CAMERA: "calibratecamera"
};

export class PlaneShift {
    static ID = 'planeshift';
    
    static FLAGS = {
        VIDEO: 'video'
    }
    
    static TEMPLATES = {
        PLANESHIFT: `modules/${this.ID}/templates/videoSettings.hbs`,
        TOKENSETTINGS: `modules/${this.ID}/templates/tokenSettings.hbs`
    }
    
    
    constructor() {
        this.serverIsAlive = false;

        this.physicalTokens = [];
        this.getTokenLocationsEnabled = false;
    }

    physicalTokenIDs() {
        return this.physicalTokens;
    }
    
    getEndpointAddress(endpoint) {
        const hostname = game.settings.get(MODULE_ID, "hostname");
        const port = game.settings.get(MODULE_ID, "port");
        return `http://${hostname}:${port}/${endpoint}`
    }

    async healthCheck() {
        while (true) {
            try {
                await fetch(this.getEndpointAddress(EndPoint.HEALTH_CHECK));

                this.serverIsAlive = true;
                $('*[data-tool="planeshift-enabled"]').removeClass("server-dead").addClass("server-alive")

                
            } catch {
                this.serverIsAlive = false;
                $('*[data-tool="planeshift-enabled"]').removeClass("server-alive").addClass("server-dead")
            }
            
            await new Promise(r => setTimeout(r, 500));
        }
    }

    async getTokenLocations() {
        if (!this.getTokenLocationsEnabled) return;

        let gridLayer = canvas.layers[2];
        let connected = false;
        
        while (this.getTokenLocationsEnabled) { 
            const endpoint = this.getEndpointAddress(EndPoint.TOKENS_LOCATION);
            
            try {

                    const response = await fetch(endpoint);
                    const json = await response.json()
                    // console.log(json)

                    if (!connected) {
                        connected = true;
                        planeshift_log(`Connected to ${this.getEndpointAddress(EndPoint.TOKENS_LOCATION)}.`);
                    }
                    
                    if (json.length == 0) {
                        continue
                    }
                    
                    var physicalToDigitalTokensSetting = game.settings.get(MODULE_ID, SETTINGS.PHYSICAL_TO_DIGITAL_TOKENS);
                    
                    let updates = []
                    // If a new physical ID shows up, add it to list
                    for (var tokenJson of json) {
                        let physicalToken = JSON.parse(tokenJson)
                        
                        if (!this.physicalTokens.includes(physicalToken.id)) {
                            this.physicalTokens.push(physicalToken.id);
                        }
                        
                        // Initialize object for the physical token if it doesn't exist
                        if (!physicalToDigitalTokensSetting.hasOwnProperty(physicalToken.id)) {
                            physicalToDigitalTokensSetting[physicalToken.id] = [];
                        }

                        var digitalTokens = physicalToDigitalTokensSetting[physicalToken.id];
                        for (var actorID of digitalTokens) {
                            // If this physical token doesn´t yet have a digital counterpart, skip
                            if (actorID === null || actorID === undefined) continue;
                            
                            var digitalToken = game.actors.get(actorID).getActiveTokens()[0]
                            // If this doesn´t exist in the scene, skip
                            if (digitalToken === undefined) continue;

                            let sceneRect = canvas.dimensions.sceneRect;
                            let x = sceneRect.x + sceneRect.width * physicalToken.coordinates[0];
                            let y = sceneRect.y + sceneRect.height * physicalToken.coordinates[1];
                            
                            let digitalTokenCenter = digitalToken.getCenter(x, y);
                            let physicalTokenCenter = {x: 2*x - digitalTokenCenter.x, y: 2*y - digitalTokenCenter.y};

                            let snapPosition = gridLayer.getSnappedPosition(physicalTokenCenter.x, physicalTokenCenter.y);

                            if (digitalToken != snapPosition) {
                                updates.push({_id: digitalToken.id, x: snapPosition.x, y: snapPosition.y });
                            }
                            
                        }

                    }
                    
                    canvas.scene.updateEmbeddedDocuments("Token", updates);

                    // Update setting with new empty arrays for new physical tokens
                    game.settings.set(MODULE_ID, SETTINGS.PHYSICAL_TO_DIGITAL_TOKENS, physicalToDigitalTokensSetting);
            
                await new Promise(r => setTimeout(r, 100));
            } catch (error) {
                planeshift_log(`Could not connect to ${endpoint}. Error: ${error}. Retrying...`)
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        planeshift_log(`Disconnected from ${this.getEndpointAddress(EndPoint.TOKENS_LOCATION)}.`);
    }
}

function createCircle(radius) {
    let g = new PIXI.Graphics();
    g.beginFill(0x0000DD);
    g.drawCircle(0, 0, radius);
    g.endFill();

    canvas.app.stage.addChild(g);
    return g;
}

function createRect(width, height) {
    let g = new PIXI.Graphics();
    g.beginFill(0x0000DD);
    g.drawRect(0, 0, width, height);
    g.endFill();

    canvas.app.stage.addChild(g);
    return g;
}

export var planeShift = new PlaneShift();

export function createArucoMarkerElement(id) {
    let markerContainer = $("<div>");
    markerContainer.addClass("battleAreaMarker")
    
    let marker = generateArucoMarker(4, 4, "4x4_1000", id);
    marker.setAttribute('width', '13mm')
    marker.setAttribute('height', '13mm')
    markerContainer.html(marker.outerHTML);
    
    return markerContainer;
}

function showCalibrationPattern(pattern) {
    planeshift_log("Showing calibration pattern")
    let body = $("body");

    var calibrationPattern = $('<img />', { 
        class: 'calibrationPattern',
        src: pattern
      });

    body.append(calibrationPattern);
}

function hideCalibrationPattern() {
    $(".calibrationPattern").remove()
}

function showBattleAreaMarkers() {
    let body = $("body");
    
    let topLeftMarker = createArucoMarkerElement(0);
    body.append(topLeftMarker);
    
    let topRightMarker = createArucoMarkerElement(1);
    topRightMarker.css("right", 0);
    body.append(topRightMarker);
    
    let bottomRightMarker = createArucoMarkerElement(2);
    bottomRightMarker.css({"right": 0, "bottom": 0});
    body.append(bottomRightMarker);
    
    let bottomLeftMarker = createArucoMarkerElement(3);
    bottomLeftMarker.css("bottom", 0);
    body.append(bottomLeftMarker);
}

function hideBattleAreaMarkers() {
    $(".battleAreaMarker").remove()
}


Hooks.once('init', function() {
    registerLayer();
});

Hooks.once('ready', function() {
    registerSettings(); 

    if (game.user.isGM) {
        planeShift.healthCheck();
        planeShift.getTokenLocations();
    }
    
    socket.on(SOCKET_MODULE_ID, (data) => {
        if (game.user.id == data.userID) {
            switch (data.action) {
                case SOCKET_SHOW_CALIBRATION_PATTERN:
                    showCalibrationPattern(data.pattern);
                    break;
                
                case SOCKET_HIDE_CALIBRATION_PATTERN:
                    hideCalibrationPattern();
                    break;

                case SOCKET_SHOW_BATTLEAREA_MARKERS:
                    showBattleAreaMarkers();
                    break;
                    
                case SOCKET_HIDE_BATTLEAREA_MARKERS:
                    hideBattleAreaMarkers();
                    break;
            }
        }
    });
});
    
Hooks.on("renderTokenConfig", renderTokenConfigHandler);
Hooks.on("getSceneControlButtons", (controls) => { pushControlButtons(controls) });
// Disable getting token locations on scene change
Hooks.on("canvasInit", () => { planeShift.getTokenLocationsEnabled = false; });