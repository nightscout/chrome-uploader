##chromadex
Download Dexcom data on almost any platform Chrome runs on. (Developed and tested on Mac OSX). A good deal of this data is corrupt. 
##Don't use it for treatment. Seriously. A lot of this data is wrong. Not a little wrong. OMG WTF out of left field wrong.

Important: Install directions updated. Do 6 and 7 if you haven't already.

###Install
1. Get code in folder
2. Go to chrome://extensions
3. Check developer mode
4. Load unpacked extension
5. Pick your folder
6. Set up /diypsconfig.json Dupe the sample files with these names. For DIYPS, add chromeext.php into DIYPS directory and point diypsconfig.json's endpoint to that resulting URL. If you don't use it, leave endPoint blank.
7. Dupe /mongoconfig.sample.json to /mongoconfig.json. Your API key is the important part.

###Use
1. Plug in your Dexcom
2. Go to chrome://extensions
3. Click launch

Lots of steps and right now. Some times you get no data back, usually preceded by completely inaccurate graphs- if that happens, press the Reset button. This'll wipe out all the data it's accumulated. Doesn't seem like you really need to unplug/replug anymore.
