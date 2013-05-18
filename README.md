brackets-jshint
=================

A Brackets extension to enable JSHint support. To install, place in your ```brackets/src/extensions/user``` folder.
When installed, you can enable JSHint by clicking 'Enable JSHint' in your View menu.

Currently only the default options are supported. I'm looking for feedback on how to provide ways to customize the options
on each parse.

Issues/Updates
=====
[5/18/2013] It should, hopefully, not act like JSLint in terms of autohiding when switch to a HTML file (and auto showing when you go to a .js file)

[5/10/2013] Updated to JSHint 2.0.0. The older library is still there in case you want to switch back.  

[4/16/2013] Tweak to menu add

[11/12/2012] Update code to properly insert the content over the status bar. Also made it resizable.  

[9/26/2012] Fix width issue. Thanks to Randy Edmunds for the reports.

Per feedback from Narciso Jaramillo, I use a checkbox to show enabled/disabled status and move to the item when you click a row.

Credit
=====
Built with [JSHint](http://www.jshint.com/) and heavily based on the work of [Jonathan Rowny](http://www.jonathanrowny.com/). 