##chromadex
Download Dexcom data on almost any platform Chrome runs on. (Developed and tested on Mac OSX). A good deal of this data is corrupt. It should work on Windows if [Dexcom Studio](http://dexcom.com/dexcom-studio) is installed, but other platforms should work more magically. 

##Don't use it for treatment. Seriously. A lot of this data is wrong. Not a little wrong. OMG WTF out of left field wrong.

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
2. Magic happens
2. If magic did not happen, open chrome://extensions
3. Click launch

Lots of steps and right now. Some times you get no data back, usually preceded by completely inaccurate graphs- if that happens, press the Reset button. This'll wipe out all the data it's accumulated. Doesn't seem like you really need to unplug/replug anymore.
