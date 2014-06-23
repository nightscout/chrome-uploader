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
2. Go to chrome://extensions
3. Click "Background page" next to "Inspect views:"
4. It'll open web inspector. Flip over to Console, and enter **dexcom.connect()**
5. Now run **dexcom.readFromReceiver(1, console.log.bind(console))**
6. In about 30 seconds, you'll get a dump of Dex data.

Lots of steps and right now. Often times you get no data back- if that happens, unplug, replug, go to chrome://extensions, and press the reload button on Dexcom upchuck.

###To Do
* Move this to github issues
* UI to browse results
* Ability to upload to common providers
* ~~Fix bugs in bit shifts (Most important)~~ Done (it was actually not clipping 4 bytes of header data)
* ~~Auto detect the proper serial port. (Blast them all and see what responds?)~~ Done, always uses TTY.
