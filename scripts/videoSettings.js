import { 
    MODULE_ID, 
    SOCKET_MODULE_ID, 
    SOCKET_SHOW_CALIBRATION_PATTERN,
    SOCKET_HIDE_CALIBRATION_PATTERN,
    SOCKET_HIDE_BATTLEAREA_MARKERS, 
    PlaneShift, 
    SETTING_OBSERVER_USER,
    EndPoint,
    planeShift,
    planeshift_log
} from "../planeshift.js"

export class VideoSettings extends FormApplication {
    
    constructor() {
        super();
        this.originalImagePC = null;
        this.roiImagePC = null;
    }
    
    static get defaultOptions() {
        const defaults = super.defaultOptions;
        
        const overrides = {
            height: 'auto',
            width: 'auto',
            id: 'planeshift',
            template: PlaneShift.TEMPLATES.PLANESHIFT,
            title: 'Display video'
        };
        
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
        
        return mergedOptions;
    }
    
    async negotiate(pc, url) {
        planeshift_log("pc", this.pc)
        pc.addTransceiver('video', {direction: 'recvonly'});
        
        return pc.createOffer().then(function(offer) {
            planeshift_log("WebRTC negotiate: Creating offer");
            return pc.setLocalDescription(offer);
        }).then(function() {
            // wait for ICE gathering to complete
            return new Promise(function(resolve) {
                if (pc.iceGatheringState === 'complete') {
                    planeshift_log("WebRTC negotiate: Gathering state complete");
                    resolve();
                } else {
                    planeshift_log("WebRTC negotiate: Waiting for gathering state");
                    function checkState() {
                        if (pc.iceGatheringState === 'complete') {
                            pc.removeEventListener('icegatheringstatechange', checkState);
                            resolve();
                        }
                    }
                    pc.addEventListener('icegatheringstatechange', checkState);
                }
            });
        }).then(function() {
            planeshift_log("WebRTC negotiate: Fetching content");
            var offer = pc.localDescription;
            return fetch(url, {
                body: JSON.stringify({
                    sdp: offer.sdp,
                    type: offer.type,
                }),
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST'
            });
        }).then(function(response) {
            planeshift_log("WebRTC negotiate: Parsing content");
            return response.json();
        }).then(function(answer) {
            planeshift_log("WebRTC negotiate: Returning answer");
            return pc.setRemoteDescription(answer);
        }).catch(function(e) {
            console.error(e);
        });
    }
    
    connectToOriginalImage() {
        var config = {
            sdpSemantics: 'unified-plan'
        };
        
        config.iceServers = [{urls: ['stun:stun.l.google.com:19302']}];
        
        this.originalImagePC = new RTCPeerConnection(config);
        
        // connect audio / video
        this.originalImagePC.addEventListener('track', function(evt) {
            if (evt.track.kind == 'video') {
                document.getElementById('originalimage').srcObject = evt.streams[0];
            }
        });
        
        this.negotiate(this.originalImagePC, planeShift.getEndpointAddress(EndPoint.ORIGINAL_IMAGE));
    }
    
    connectToROIImage() {
        var config = {
            sdpSemantics: 'unified-plan'
        };
        
        config.iceServers = [{urls: ['stun:stun.l.google.com:19302']}];
        
        this.roiImagePC = new RTCPeerConnection(config);
        
        // connect audio / video
        this.roiImagePC.addEventListener('track', function(evt) {
            if (evt.track.kind == 'video') {
                const roiVideo = document.getElementById('roiimage');
                roiVideo.srcObject = evt.streams[0];
            }
        });
        
        this.negotiate(this.roiImagePC, planeShift.getEndpointAddress(EndPoint.ROI_IMAGE));
    }
    
    async selectBattleArea(event) {
        planeshift_log("Selecting battle area")
        const settings = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            }
        };
        
        try {
            const fetchResponse = await fetch(planeShift.getEndpointAddress(EndPoint.SELECT_ROI), settings);
            const data = await fetchResponse;

            let observerUser = game.settings.get(MODULE_ID, SETTING_OBSERVER_USER);
            socket.emit(SOCKET_MODULE_ID, {
                userID: observerUser,
                action: SOCKET_HIDE_BATTLEAREA_MARKERS
            });
            
            return data;
        } catch (e) {
            console.log("Error selectBattleArea():", e);
        }    
    }
    
    static async http_getCalibrationPattern() {
        const request = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({width: screen.availWidth, height: screen.availHeight})
        };
        
        try {
            const fetchResponse = await fetch(planeShift.getEndpointAddress(EndPoint.CALIBRATION_IMAGE), request);
            const blob = await fetchResponse.blob();

            return blob;
        } catch (e) {
            console.log(e)
        }  
    }

     static async http_calibrateCamera() {
        const request = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            }
        };
        
        try {
            const fetchResponse = await fetch(planeShift.getEndpointAddress(EndPoint.CALIBRATE_CAMERA), request);
            const blob = await fetchResponse.blob();

            return blob;
        } catch (e) {
            console.log(e)
        }  
    }

    async calibrateCamera(event) {
        
        let calibrationPattern = await VideoSettings.http_getCalibrationPattern();
        let observerUser = game.settings.get(MODULE_ID, SETTING_OBSERVER_USER);
        
        var reader = new FileReader();
        reader.readAsDataURL(calibrationPattern); 

        reader.onloadend = function() {
            socket.emit(SOCKET_MODULE_ID, {
                userID: observerUser,
                action: SOCKET_SHOW_CALIBRATION_PATTERN,
                pattern: reader.result
            });
        }
        
        await VideoSettings.http_calibrateCamera();
        socket.emit(SOCKET_MODULE_ID, {
            userID: observerUser,
            action: SOCKET_HIDE_CALIBRATION_PATTERN
        });
    }
    
    activateListeners(html) {
        html.on('click', "#selectROI", this.selectBattleArea);
        html.on('click', "#calibrateCamera", this.calibrateCamera);
        
        this.connectToOriginalImage()
        this.connectToROIImage()
    }

    close() {
        this.originalImagePC?.close();
        this.roiImagePC?.close();
        return super.close();
    }
}

