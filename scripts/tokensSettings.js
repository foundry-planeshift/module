import { planeShift, MODULE_ID } from "../planeshift.js"
import { generateArucoMarker } from "../libs/aruco-marker.js";

export var SETTINGS = {
  PHYSICAL_TO_DIGITAL_TOKENS: "physicalToDigitalTokens",
  PHYSICAL_TOKEN: "physicalToken"
}

export async function renderTokenConfigHandler(tokenConfig, html) {
  let digitalToken = tokenConfig.actor.id;

  let physicalToDigitalTokensSetting = game.settings.get(MODULE_ID, SETTINGS.PHYSICAL_TO_DIGITAL_TOKENS);

  let previousPhysicalToken = await tokenConfig.actor.getFlag(MODULE_ID, SETTINGS.PHYSICAL_TOKEN);
  
  
  let tokens = planeShift.physicalTokenIDs().map(function(e, i) {
    let encodedMarker = "data:image/svg+xml;base64," + window.btoa(generateArucoMarker(4, 4, "4x4_1000", e).outerHTML);
    return {
      id: e, 
      image: encodedMarker,
      selected: (previousPhysicalToken == e)
    };
  });


  const posTab = html.find('.tab[data-tab="character"]');
	let data = {
    tokens: tokens
	};

	const insertHTML = await renderTemplate("modules/" + MODULE_ID + "/templates/tokenConfig.hbs", data);
	posTab.append(insertHTML);

  const physicalTokenSelect = posTab.find("#physicalTokenSelect");
  physicalTokenSelect.on("change", async (event) => {
    let newPhysicalToken = parseInt(event.target.value);

    previousPhysicalToken = await tokenConfig.actor.getFlag(MODULE_ID, SETTINGS.PHYSICAL_TOKEN);
    
    // Remove digital token from previous physical token, if set
    if (previousPhysicalToken !== undefined && physicalToDigitalTokensSetting.hasOwnProperty(previousPhysicalToken)) {
      let previousPhysicalTokenSetting = physicalToDigitalTokensSetting[previousPhysicalToken];
      previousPhysicalTokenSetting.splice(previousPhysicalTokenSetting.indexOf(digitalToken), 1);
    }

    // Set digital token on new physical token setting
    if (newPhysicalToken >= 0) {
      let currentPhysicalTokenSetting = physicalToDigitalTokensSetting[newPhysicalToken];
      currentPhysicalTokenSetting.push(digitalToken)
    }

    // Update setting
    game.settings.set(MODULE_ID, SETTINGS.PHYSICAL_TO_DIGITAL_TOKENS, physicalToDigitalTokensSetting);
    
    // Save setting for foundry token
    await tokenConfig.actor.setFlag(
      MODULE_ID,
      SETTINGS.PHYSICAL_TOKEN,
      newPhysicalToken
    );

  });
}