import { MODULE_ID, SETTING_OBSERVER_USER, planeShift } from "../planeshift.js";
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

class OverlayLayer extends CanvasLayer {
  constructor() {
    super();
  }

  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "overlay",
      zIndex: 0,
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

function blobToBase64(blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
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
        name: "enabled",
        title: "Enabled",
        icon: "fas fa-power-off",
        visible: true,
        toggle: true,
        onClick: (toggled) => { planeShift.getTokenLocationsEnabled = toggled; }
      },
      {
        name: "video-settings",
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
  game.settings.register(MODULE_ID, SETTING_OBSERVER_USER, {
    name: "Observer User",
    hint: "The observer user that is shown on the TV.",
    scope: "world",     // This specifies a client-stored setting
    config: true,        // This specifies that the setting appears in the configuration view
    type: String,
    choices: playerIDs(),
    restricted: true                   // Restrict this submenu to gamemaster only?
  });

  game.settings.registerMenu(MODULE_ID, "videoSettings", {
    name: "Video settings",
    label: "Video settings",      // The text label used in the button
    hint: "A description of what will occur in the submenu dialog.",
    icon: "fas fa-bars",               // A Font Awesome icon used in the submenu button
    type: VideoSettings,   // A FormApplication subclass
    config: true,
    restricted: false                // Restrict this submenu to gamemaster only?
  });

  console.log("Registering setting", MODULE_ID, SETTINGS.PHYSICAL_TO_DIGITAL_TOKENS)
  game.settings.register(MODULE_ID, SETTINGS.PHYSICAL_TO_DIGITAL_TOKENS, {
    scope: 'world',     // "world" = sync to db, "client" = local storage
    config: false,      // we will use the menu above to edit this setting
    type: Object,
    default: {},        // can be used to set up the default structure
    restricted: true,                   // Restrict this submenu to gamemaster only?,
    onChange: value => console.log(`Changed "PHYSICAL_TO_DIGITAL_TOKENS" setting to:`, value)
  });
  
}