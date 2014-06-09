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
4. Now run **dexcom.readFromReceiver(1, console.log.bind(console))**
5. In about 30 seconds, you'll get a dump of Dex data.

Lots of steps and right now about half the data is corrupt. (If you'd like to fix the bit shift problems, they're the source of most of the errors.)

###To Do
* Fix bugs in bit shifts (Most important)
* UI to browse results
* Ability to upload to common providers
* ~~Auto detect the proper serial port. (Blast them all and see what responds?)~~ Done
