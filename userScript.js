// ==UserScript==
// @name       fixTimer
// @version    0.62
// @grant       none
// @description Script for fix bugs with time-tracker plugin and add some features in redmine
// @match      https://rm.innomdc.com/*
// @copyright  2014+, Broznich Dmitry
// ==/UserScript==
var debugBranch = localStorage.getItem('ht-debug-branch');

window.tsRepoBaseUrl = location.protocol + (debugBranch ? '//rawgit.com/broznich/time-tracker-script/'+(debugBranch || 'master')+'/' : '//s3-eu-west-1.amazonaws.com/gui.bookmarklets/time-tracker/');
document.head.appendChild((function(){ 
    var el = document.createElement('script');
    el.type = 'text/javascript';
    el.src = tsRepoBaseUrl + 'loader.js';
    return el;
})());
