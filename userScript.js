// ==UserScript==
// @name       fixTimer
// @version    0.1
// @grant       none
// @description Script for fix bugs with time-tracker plugin and add some features in redmine
// @match      https://rm.innomdc.com/*
// @copyright  2016, Innometrics
// ==/UserScript==

var debugBranch = localStorage.getItem('rtt-debug-branch');
var rttBaseUrl;
if (debugBranch) {
    rttBaseUrl = location.protocol + '//rawgit.com/Innometrics/redmine-time-tracker/' + debugBranch;
} else {
    rttBaseUrl = location.protocol + '//s3-eu-west-1.amazonaws.com/gui.bookmarklets/time-tracker/';
}

window.rttBaseUrl = rttBaseUrl;
document.head.appendChild((function () {
    var el = document.createElement('script');
    el.type = 'text/javascript';
    el.src = rttBaseUrl + 'loader.js';
    return el;
})());
