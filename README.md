##chromadex
Download Dexcom data on almost any platform Chrome runs on. (Developed and tested on Mac OSX). A good deal of this data is corrupt. 
##Don't use it for treatment. Seriously. A lot of this data is wrong. Not a little wrong. OMG WTF out of left field wrong.

###Install
1. Get code in folder
2. Go to chrome://extensions
3. Check developer mode
4. Load unpacked extension
5. Pick your folder
6. If you use NightScout- Dupe /mongoconfig.sample.json to /mongoconfig.json. Your API key is the important part. IF YOU DON'T USE NIGHTSCOUT YOU CAN SKIP THIS STEP.
7. If you use DIYPS- Duple /diypsconfig.sample.json to /diypsconfig.json. Add chromeext.php into DIYPS directory and point diypsconfig.json's endpoint to that resulting URL. IF YOU DON'T USE DIYPS YOU CAN SKIP THIS STEP.

###Use
1. Plug in your Dexcom
2. Go to chrome://extensions
3. Click launch

Lots of steps and right now. Some times you get no data back, usually preceded by completely inaccurate graphs- if that happens, press the Reset button. This'll wipe out all the data it's accumulated. Doesn't seem like you really need to unplug/replug anymore.
