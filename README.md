##chromadex
Download Dexcom data on almost any platform Chrome runs on. (Developed and tested on Mac OSX). A good deal of this data is corrupt. 
##Don't use it for treatment. Seriously. A lot of this data is wrong. Not a little wrong. OMG WTF out of left field wrong.

###Install
1. Get code in folder
2. Go to chrome://extensions
3. Check developer mode
4. Load unpacked extension
5. Pick your folder

###Use
1. Plug in your Dexcom
2. Click "Background page" next to "Inspect views:"
3. It'll open web inspector. Flip over to Console, and enter **dexcom.connect()**
4. It'll return a list of serial ports. Dexcom will be something like **/dev/cu.usbmodem14241**
5. Open driver.js in your editor and plug in that port on line 18. Save.
6. In Chrome, press the Reload button for Dex on the extensions page.
7. Back in Web Inspector, again run **dexcom.connect()**
8. Now run **dexcom.readFromReceiver(1, function(d) { console.log(d); })**
9. In about 30 seconds, you'll get a dump of Dex data.

Lots of steps and right now about half the data is corrupt. (If you'd like to fix the bit shift problems, they're the source of most of the errors.)

###To Do
* Fix bugs in bit shifts (Most important)
* Auto detect the proper serial port. (Blast them all and see what responds?)
* UI to browse results
* Ability to upload to common providers
