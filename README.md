
# PlaneShift module

PlaneShift is a [FoundryVTT](https://foundryvtt.com/) module that allows [ArUco markers](https://docs.opencv.org/4.x/d5/dae/tutorial_aruco_detection.html) 
to be tracked within Foundry when using an horizontally mounted TV. This allows for a simple and cheap way to play with physical tokens on a digital system.

The system uses printed ArUco markers and a webcam for the tracking.
The software is split into two components:
## Server
The server is where the computer vision processing is done.
See [the server page](https://github.com/foundry-planeshift/server).

## Module
The FoundryVTT module