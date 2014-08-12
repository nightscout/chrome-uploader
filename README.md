##chromadex
Download Dexcom data on almost any platform Chrome runs on. (Developed and tested on Mac OSX). A good deal of this data is corrupt. 

###Changelog
mongolabconfig.json has dropped "baseUri", "user" and "password" and added "collection" and "database." So If you're integrated against Nightscout be sure to update that file.

##Don't use it for treatment. Seriously. A lot of this data is wrong. Not a little wrong. OMG WTF out of left field wrong.

###Install
1. Get code in folder
2. Open a terminal and CD to that folder
3. Install bower if you haven't already (npm install bower)
4. Install bower dependencies (bower install)
5. You're done with your terminal. Give yourself a pat on the back.
6. Go to chrome://extensions
7. Check developer mode
8. Load unpacked extension
9. Pick your folder
10. If you use NightScout- Dupe FOLDER/mongoconfig.sample.json to FOLDER/mongoconfig.json. Your API key is the important part. IF YOU DON'T USE NIGHTSCOUT YOU CAN SKIP THIS STEP.
11. If you use DIYPS- Dupe FOLDER/diypsconfig.sample.json to /diypsconfig.json. Add chromeext.php into DIYPS directory and point diypsconfig.json's endpoint to that resulting URL. IF YOU DON'T USE DIYPS YOU CAN SKIP THIS STEP.

###Use
1. Plug in your Dexcom
2. Go to chrome://extensions
3. Click launch

Lots of steps and right now. Some times you get no data back, usually preceded by completely inaccurate graphs- if that happens, press the Reset button. This'll wipe out all the data it's accumulated. Doesn't seem like you really need to unplug/replug anymore.
