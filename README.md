brackets-jshint
=================

A Brackets extension to enable JSHint support. To install, place in your ```brackets/src/extensions/user``` folder.
When installed, you can enable JSHint by clicking 'Enable JSHint' in your View menu.

Currently only the default options are supported.

Issues/Updates
=====
[6/16/2013] Merged in a bootstrap fix by DaBungalow

[6/4/2013] Fixed a bug when .jshintrc didn't exist. Also switched to PanelManager. Note - if you do not
see *any* JSHint results, I believe that is expected when no default options are specified. I think
I may need to ship config.js with better default options.

[5/24/2013] Added package.json

[5/21/2013] Fixed a really dumb mistake. Thanks Jogchum Koerts.

[5/20/2013] Now supports reading .jshintrc files. Note - I do this on EVERY parse, and that is bad. I need
to add some per-project caching. In my tests I couldn't tell that things had slowed down, but it really
needs to be re-engineered to cache those checks.

[5/20/2013] I broke hiding jshint.

[5/18/2013] It should, hopefully, not act like JSLint in terms of autohiding when switch to a HTML file (and auto showing when you go to a .js file)

[5/10/2013] Updated to JSHint 2.0.0. The older library is still there in case you want to switch back.  

[4/16/2013] Tweak to menu add

[11/12/2012] Update code to properly insert the content over the status bar. Also made it resizable.  

[9/26/2012] Fix width issue. Thanks to Randy Edmunds for the reports.

Per feedback from Narciso Jaramillo, I use a checkbox to show enabled/disabled status and move to the item when you click a row.

Credit
=====
Built with [JSHint](http://www.jshint.com/) and heavily based on the work of [Jonathan Rowny](http://www.jonathanrowny.com/). 