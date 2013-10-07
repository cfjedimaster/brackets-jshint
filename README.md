brackets-jshint
=================

A Brackets extension to enable JSHint support. To install, place in your ```brackets/src/extensions/user``` folder.
Uses the linting API.

Currently only the default options are supported.

Issues/Updates
=====
[10/7/2013] Updated to the new Linting API. This required me to remove support for the default global config and per project
config. The Linting API doesn't support an async response yet. In theory I could work around this, but for now I went
the easier route. Don't forget that inline options should still work fine.

NOTE - There is a bug in Brackets where if you open up Brackets and JS file is automatically loaded, it will lint with
JSLint. Just edit/save the file one time and it should switch to JSHint for good. See https://github.com/adobe/brackets/issues/5442.

[10/5/2013] jshint 2.1.11

[8/15/2013] So - I'm having some issues with the defaults. It appears as if you pass NO options to JSHint, it is a bit
too lax. One option in particular, undef, must default to false, and that to me is a mistake. So I've added it to
config.js. As I think I've said before - I'm looking for feedback on how to make this better.

[8/12/2013] jshint 2.1.9. Fixes https://github.com/cfjedimaster/brackets-jshint/issues/13.

[7/11/2013] Looks like a slight change to APIs made the language check break. This fixes https://github.com/cfjedimaster/brackets-jshint/issues/12

[7/2/2013] Another fix by DaBungalow - https://github.com/cfjedimaster/brackets-jshint/pull/11

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