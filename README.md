##chromadex##
=========
Download Dexcom data on almost any platform Chrome runs on. (Developed and tested on Mac OSX). A good deal of this data is corrupt. 
##Don't use it for treatment. Seriously. A lot of this data is wrong. Not a little wrong. OMG WTF out of left field wrong.## 

###Install###
======
Get code in folder
Go to chrome://extensions
Check developer mode
Load unpacked extension
Pick your folder

###Use###
===
Plug in your Dexcom
CLick "Background page" next to "Inspect views:"
It'll open web inspector. Flip over to Console, and enter
    dexcom.connect()
It'll return a list of serial ports. Dexcom will be something like '''/dev/cu.usbmodem14241'''
Open driver.js in your editor and plug in that port on line 18. Save.
In Chrome, press the Reload button for Dex on the extensions page.
Back in Web Inspector, again run 
    dexcom.connect()
Now run 
    dexcom.readFromReceiver(1, function(d) { console.log(d); })
In about 30 seconds, you'll get a dump of Dex data.
Lots of steps and right now about half the data is corrupt. (If you'd like to fix the bit shift problems, they're the source of most of the errors.)

###To Do###
=====
* Fix bugs in bit shifts (Most important)
* Auto detect the proper serial port. (Blast them all and see what responds?)
* UI to browse results
* Ability to upload to common providers
