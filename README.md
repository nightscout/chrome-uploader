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


###Linux
On linux systems the programme doesn't have permission to access the dexcom device. In order to grant this permission, a udev rule has to be supplied.

1. Create a file like /etc/udev/rules.d/99-dexcom.rules with admin rights.
2. Add the following text to this file. Replace YOURGROUP with either a group you are member of or just your username.
SUBSYSTEM=="usb",ATTR{idVendor}=="22a3",ATTR{idProduct}=="0047",MODE="0660",GROUP="YOURGROUP"
3. trigger udev to load the new rules or simply restart.

How to to this on Ubuntu (tested on 12.4):
1. open a terminal
2. run the following command, replacing YOURUSERNAME with your username:
echo "SUBSYSTEM==\"usb\",ATTR{idVendor}==\"22a3\",ATTR{idProduct}==\"0047\",MODE=\"0660\",GROUP=\"YOURUSERNAME\"" | sudo tee /etc/udev/rules.d/99-dexcom.rules
3. restart

