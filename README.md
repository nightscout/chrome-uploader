##NightScout.info CGM Utility
Download Dexcom data on almost any platform Chrome runs on. (Developed and tested on Mac OSX). A good deal of this data is corrupt. It should work on Windows if [Dexcom Studio](http://dexcom.com/dexcom-studio) is installed, but other platforms should work more magically. 

##Don't use this for treatment. Don't. Seriously, don't. This is reverse engineered. Dexcom Studio can be aware of lots of gotchas that this simply isn't. Data might stop updating. Just like how a CGM is just an alert to check your sugar, this is just an alert to check your Dexcom. 

###Install
1. Get code in folder
2. Open a terminal and CD to that folder
3. Install dependencies (npm install)
4. You're done with your terminal. Give yourself a pat on the back.
5. Go to chrome://extensions
6. Check developer mode
7. Load unpacked extension
8. Pick your folder

###Use
1. Plug in your Dexcom
2. open chrome://extensions
3. Click **NightScout.info CGM Utility** icon to launch

Lots of steps and right now. Some times you get no data back, usually preceded by completely inaccurate graphs- if that happens, press the Reset button. This'll wipe out all the data it's accumulated. Doesn't seem like you really need to unplug/replug anymore.
