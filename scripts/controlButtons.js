import { planeshift_log, MODULE_ID, SETTING_OBSERVER_USER, planeShift } from "../planeshift.js";
import { VideoSettings } from "./videoSettings.js";
import { SETTINGS } from "./tokensSettings.js"

export function registerLayer() {
    const layers =  {
      planeshift: {
            layerClass: PlaneShiftLayer,
            group: "primary"
        }
    }
 
    CONFIG.Canvas.layers = foundry.utils.mergeObject(Canvas.layers, layers);

    if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
        const layers = Canvas.layers;
        Object.defineProperty(Canvas, 'layers', {
            get: function () {
                return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers)
            }
        })
    }
}

class PlaneShiftLayer extends CanvasLayer {
    constructor() {
      super();
    }
  
    static get layerOptions() {
      return foundry.utils.mergeObject(super.layerOptions, {
        name: MODULE_ID,
        zIndex: 246,
      });
    }
  
    activate() {
      CanvasLayer.prototype.activate.apply(this);
      return this;
    }
  
    deactivate() {
      CanvasLayer.prototype.deactivate.apply(this);
      return this;
    }
  
    async draw() {
      super.draw();
    }
}

export function pushControlButtons(controls){
  if (game.user.isGM == false || canvas == null) return;
  

  controls.push({
    name: "PlaneShift",
    title: "PlaneShift",
    icon: "fas fa-map-marker",
    layer: "planeshift",
    tools: [
      {
        name: "planeshift-enabled",
        title: "Enabled",
        icon: "fas fa-power-off",
        visible: true,
        toggle: true,
        active: planeShift.getTokenLocationsEnabled,
        onClick: (toggled) => { 
          planeShift.getTokenLocationsEnabled = toggled; 

          if (toggled) {
            planeShift.getTokenLocations();
          }          
        }
      },
      {
        name: "planeshift-video-settings",
        title: "Video Settings",
        icon: "fas fa-video",
        visible: true,
        button: true,
        onClick: () => { new VideoSettings().render(true) }
      }
    ]
  });
}

function playerIDs() {
  let users = game.users.filter((key, value) => {
    return !key.isGM
  });

  let options = {}
  for (let user of users) {
    options[user.id] = user.name;
  }

  return options;
}

export const registerSettings = function() {
  game.settings.register(MODULE_ID, "hostname", {
    name: "Hostname",
    label: "Hostname",
    hint: "The hostname used by the PlaneShift server.",
    default: "localhost",
    type: String,
    config: true,
    restricted: true
  });

  game.settings.register(MODULE_ID, "port", {
    name: "Port",
    label: "Port",
    hint: "The port used by the PlaneShift server.",
    default: "8337",
    type: String,
    config: true,
    restricted: true
  });

  game.settings.register(MODULE_ID, SETTING_OBSERVER_USER, {
    name: "Observer User",
    hint: "The observer user that is shown on the TV.",
    scope: "world",
    config: true,
    type: String,
    choices: playerIDs(),
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "videoSettings", {
    name: "Video settings",
    label: "Video settings",
    hint: "A description of what will occur in the submenu dialog.",
    icon: "fas fa-bars",
    type: VideoSettings,
    config: true,
    restricted: true 
  });

  game.settings.register(MODULE_ID, SETTINGS.PHYSICAL_TO_DIGITAL_TOKENS, {
    scope: 'world',
    config: false,
    type: Object,
    default: {},
    restricted: true,
    onChange: value => planeshift_log(`Changed "PHYSICAL_TO_DIGITAL_TOKENS" setting to:`, value)
  });
  
} 