brackets-jshint
=================

A Brackets extension to enable JSHint support. To install, place in your ```brackets/src/extensions/user``` folder.

To see the extension in action, open a JavaScript file. In the bottom right corner of your editor you will either see a green checkmark (which means no problems were found) or a yellow exclamation mark. Click on the exclamation mark and a bottom panel will open listing all the problems found.

JSHint can be configured by .jshintrc file located in the project root or by adding or modifying "jshint.options" and "jshint.globals" under "Debug > Open Preferences File". See
[jshint documentation](http://www.jshint.com/docs/) for configuration options details and .jshintrc file format.

Brackets has JSLint built in and if you wish to ignore JSLint results, you must tell Brackets to explicitly use JSHint only. This can be done via a .brackets.json file in the root of your project. Simply use this block:

```json
"language": {
    "javascript": {
        "linting.prefer": "JSHint",
        "linting.usePreferredOnly": true
    }
}
```

Issues/Updates
=====
[12/29/2016] JSHint 2.9.4 thanks to hacker112

[3/4/2016] JSHint 2.9.1 thanks to hacker112

[6/2/2015] JSHint 2.8 back thanks to fix by marcelgerber

[6/2/2015] JSHint 2.8 pooped the bed. Bad to 2.6.3.

[6/1/2015] JSHint 2.8.0 - hopefully. On GitHub it was marked 2.8, but the comment on top still says 2.7, which I'm assuming is just a typo.

[5/27/2015] Adding support for global preferences

[3/11/2015] JSHint 2.6.3 @Hirse

[2/7/2015] JSHint 2.6.0

[12/26/2014] JSHint 2.5.11

[12/10/2014] temp version bump for reg

[10/20/2014] JSHint 2.5.6

[8/22/2014] JSHint 2.5.2

[6/5/2014] Two merges:

@D1SoveR - https://github.com/cfjedimaster/brackets-jshint/pull/53
JSHint has added support for overrides within .jshintrc file, as per jshint/jshint#1401.
Additional routine within the config loading procedure attempts to match this behaviour.

@busykai - https://github.com/cfjedimaster/brackets-jshint/pull/55
Fix #52. Scan entire file tree for config.

Also, add jshint.scanProjectOnly extension pref. When set to true would only scan up to the project root. The default is false -- scan the entire tree up to the root.

In order to set the pref to limit the scan to project subtree, add the following to your brackets.json or to project's .brackets.json:

{
    "jshint.scanProjectOnly": true 
}

[6/2/2014] Merge in an improvement by hacker112 to add "extends" support to .jshintrc. Details here: https://github.com/cfjedimaster/brackets-jshint/pull/54

[5/20/2014] Fix by cgcgbcbc - update JSHint to 2.5.1

[5/15/2014] Fix by busykai - issue 49.

[5/9/2014] Yet another mod by busykai, this one is pretty big. It will now do 'proper' .jshintrc lookup - starting from current folder all the way up. Details at this PR: https://github.com/cfjedimaster/brackets-jshint/pull/48

[4/14/2014] Fix #46 - Basically just flesh out the package.json.

[3/13/2014] Fix #44

[2/20/2014] Includes two types fixes by mturkson23 and I added some text to the readme.md to explain how it works.

[2/11/2014] busykai fix for empty projects

[2/9/2014] Remove comments in .jshintrc fix by https://github.com/santhoshtr. Also updated to latest JSHint library.

[1/8/2014] lint and cleanup by busykai

[12/10/2013] License added by busykai

[11/29/2013] Pull req by busykai (updated readme, package.json)

[11/28/2013] Added display of the JSHint code. Fixes #21

[11/19/2013] Brought in a .jshintrc fix and new FS support by busykai

[11/8/2013] Updated to JSHint 2.3.0

[11/2/2013] User busykai (Arzhan "kai" Kinzhalin) restored the ability to handle .jshintrc
files in the project directory. I was initially against this request as I thought it made
sense to wait and see if the linting API would help make this simpler, but, crap, what's the
point of source control/contributions/etc if we can't move nimbly, right?? Not sure if that
even makes sense. Anyway, thanks to busykai the feature is back!

[10/18/2013] Oddly, JSHint isn't giving me a type anymore, *and*, in the array it returned 
for a file, one entry was null. I don't get it - but i handle it.

[10/8/2013] Small mod to fix a loading issue with linting (temp)

[10/8/2013] Off by one error w/ line #.

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
