var Timer = function (cfg) {
    var oldTimer = cfg.oldTimer;

    this.views = {
        search:                document.getElementById('q'),
        oldTimer:              oldTimer,
        oldTimerContainer:     oldTimer.parentNode,
        newTimerContainer:     document.createElement('li'),
        masks:                 {}
    };

    this.resources = cfg.theme;
    this.meetingIssueId = 6666;
    this.redmineBaseUrl = 'https://rm.innomdc.com/';
    this.storageName = 'rtt-data';
    this.notifyable = false;
    this.notification = null;
    this.notificationInt = null;
    this.notificationPeriod = 5 * 60 * 1000;

    this.isNotifyable(function () {
        this.buildHTML();
        this.buildStyles();

        this.initStorage();
        this.initEvents();
        this.restoreState();
    });
};

Timer.prototype = {
    buildHTML: function () {
        var views = this.views,
            newTimerContainer = views.newTimerContainer,
            oldTimerContainer = views.oldTimerContainer,
            oldTimer = views.oldTimer,
            self = this;

        newTimerContainer.className = 'ht-main';

        var timer = this.generateLink(
            function () {},
            'ht-main-item-timer'
        );

        var start = this.generateLink(
            this.onStartButtonClick.bind(this),
            'ht-main-item-start'
        );

        var stop = this.generateLink(
            this.onStopButtonClick.bind(this),
            'ht-main-item-stop'
        );

        var pause = this.generateLink(
            this.onPauseButtonClick.bind(this),
            'ht-main-item-pause'
        );

        var title = this.generateLink(
            function () {
                self.openIssue(this.textContent);
            },
            'ht-main-item-title'
        );

        var loader = document.createElement('p');
        loader.className = 'ht-main-item-loader';

        var meetingStart = this.generateLink(
            this.onMeetingStartButtonClick.bind(this),
            'ht-main-item-meeting-start'
        );

        var meetingStatus = this.generateLink(
            function () {},
            'ht-main-item-meeting-status'
        );

        var meetingTitle = this.generateLink(
            function () {
                self.openIssue(this.textContent);
            },
            'ht-main-item-meeting-title'
        );

        [start, pause, stop, title, timer, loader, meetingStart, meetingStatus, meetingTitle].forEach(function (item) {
            newTimerContainer.appendChild(item);
        });

        views.timer = timer;
        views.start = start;
        views.stop = stop;
        views.pause = pause;
        views.loader = loader;
        views.title = title;
        views.meetingStart = meetingStart;
        views.meetingStatus = meetingStatus;
        views.meetingTitle = meetingTitle;

        timer.style.display = 'none';

        meetingStatus.style.display = 'none';
        meetingTitle.textContent = '#' + this.meetingIssueId;

        oldTimerContainer.insertBefore(newTimerContainer, oldTimer.nextSibling);
    },

    buildStyles: function () {
        var view2img = {
                start: 'start',
                pause: 'pause',
                stop: 'stop',
                loader: 'loader',
                'meeting-start': 'start',
                'meeting-status': 'meeting'
            },
            stylesContent = '',
            self = this,
            view;

        for (view in view2img) {
            if (view2img.hasOwnProperty(view)) {
                stylesContent += '.ht-main .ht-main-item-' + view + ' { background-image: url(data:image/png;base64,' + self.resources[view2img[view]] + '); } ';
            }
        }

        var style = document.createElement('style');
        style.innerHTML = stylesContent;

        document.body.appendChild(style);
    },

    generateLink: function (handler, className) {
        var a = document.createElement('a');
        a.className = 'ht-main-item' + (className ? ' ' + className : '');
        if (handler) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                handler.apply(this, arguments);
            });
        }
        return a;
    },

    initStorage: function () {
        var storage = window.localStorage,
            data = storage.getItem(this.storageName);

        if (!data) {
            storage.setItem(this.storageName, JSON.stringify({}));
        }

        // add cache or optimize it
        this.storage = {
            name: this.storageName,
            get: function (prop) {
                var data = this.getData();
                return data[prop];
            },

            set: function (prop, val) {
                var data = this.getData();
                data[prop] = val;
                this.setData(data);
            },

            clear: function (prop) {
                var data = this.getData();
                if (data[prop]) {
                    delete data[prop];
                }
                this.setData(data);
            },

            getData: function () {
                return JSON.parse(storage.getItem(this.name));
            },

            setData: function (data) {
                storage.setItem(this.name, JSON.stringify(data));
            }
        };
    },

    initEvents: function () {
        var self = this;
        document.addEventListener('mouseenter', function () {
            self.restoreState();
        });

        window.addEventListener('focus', function () {
            self.restoreState();
        });

        document.addEventListener('visibilitychange', function () {
            self.restoreState();
        });

        window.addEventListener('resize', function () {
            self.fixMasks();
        });

        window.setInterval(function () {
            self.refreshTimer();
        }, 60000);
    },

    setViewVisible: function (viewName, visible) {
        var view = this.views[viewName];
        if (view) {
            this[visible ? 'showEl' : 'hideEl'](view);
        }
    },

    setTitle: function (title) {
        var view = this.views.title;
        if (title) {
            view.textContent = '#' + title;
            this.showEl(view);
        } else {
            view.textContent = '';
            this.hideEl(view);
        }
    },

    getIssueIdFromUrl: function () {
        var m = window.location.href.match(/\/issues\/(\d+)/);
        return m && +m[1];
    },

    getItemState: function (name) {
        var data = this.storage.getData();
        return data && data[name] || {};
    },

    setItemState: function (name, state) {
        var data = this.storage.getData();
        data[name] = state;
        this.storage.setData(data);
        return state;
    },

    getCurrentIssueState: function () {
        return this.getItemState('currentIssue');
    },

    setCurrentIssueState: function (state) {
        return this.setItemState('currentIssue', state || {});
    },

    getMeetingIssueState: function () {
        return this.getItemState('meetingIssue');
    },

    setMeetingIssueState: function (state) {
        return this.setItemState('meetingIssue', state || {});
    },

    isCurrentIssueRunning: function () {
        var ciState = this.getCurrentIssueState();
        return ciState.started && !ciState.paused;
    },

    isCurrentIssuePaused: function () {
        var ciState = this.getCurrentIssueState();
        return ciState.started && ciState.paused;
    },

    isCurrentIssueStopped: function () {
        var ciState = this.getCurrentIssueState();
        return !ciState.started;
    },

    isMeetingIssueRunning: function () {
        var miState = this.getMeetingIssueState();
        return miState.started && !miState.paused;
    },

    onStartButtonClick: function () {
        var self = this,
            ciState = this.getCurrentIssueState(),
            issueId = ciState.paused ? ciState.id : this.getIssueIdFromUrl();

        if (issueId === this.meetingIssueId) {
            if (!this.isMeetingIssueRunning()) {
                this.onMeetingStartButtonClick();
            }

            issueId = 0;
        }

        if (!issueId) {
            issueId = prompt('What number of issue will start?');
        }

        if (!issueId) {
            return;
        }

        if (this.isMeetingIssueRunning()) {
            this.stopMeetingIssue(function () {
                self.startCurrentIssue(issueId);
            });
        } else {
            this.startCurrentIssue(issueId);
        }
    },

    onStopButtonClick: function () {
        var self = this,
            callback = function () {
                self.setCurrentIssueState();

                self.setViewVisible('start', true);
                self.setViewVisible('pause', false);
                self.setViewVisible('stop', false);
                self.setTitle(self.getIssueIdFromUrl());

                self.refreshTimer();
            };

        if (this.isCurrentIssuePaused()) {
            callback();
        } else {
            this.stopIssue(callback);
        }
    },

    onPauseButtonClick: function () {
        var self = this,
            ciState = this.getCurrentIssueState(),
            currentIssueId = ciState.id;

        this.pauseCurrentIssue(function () {
            self.setTitle(currentIssueId);
        });
    },

    onMeetingStartButtonClick: function () {
        var self = this;

        if (this.isCurrentIssuePaused() || this.isCurrentIssueStopped()) {
            this.startMeetingIssue();
        } else {
            this.pauseCurrentIssue(function () {
                self.startMeetingIssue();
            });
        }
    },

    refreshTimer: function () {
        var ciState = this.getCurrentIssueState(),
            miState = this.getMeetingIssueState(),
            timer = this.views.timer,
            state;

        if (this.isCurrentIssueStopped() && !this.isMeetingIssueRunning()) {
            this.hideEl(timer);
            return;
        }

        /*
        if (this.isCurrentIssuePaused()) {
            return;
        }
        */

        state = this.isCurrentIssueRunning() ? ciState : miState;

        timer.textContent = this.prepareTime(+new Date() - 1 * state.startedTime);
        this.showEl(timer);
    },

    prepareTime: function (ts) {
        if (!ts && ts !== 0) {
            return false;
        }

        ts = Math.ceil(ts / 1000);

        var m = Math.floor(ts / 60),
            h = Math.floor(m / 60);

        m = (m - h * 60);

        var tplData = [h, (m < 10 ? '0' + m : m)],
            tIndex = 0;

        var time = '%s:%s'.replace(/%s/g, function () {
            return tplData[tIndex++];
        });

        return time;
    },

    restoreState: function () {
        var ciState = this.getCurrentIssueState(),
            ciPaused = this.isCurrentIssuePaused(),
            ciId = ciState.id,
            miRunning = this.isMeetingIssueRunning();

        this.setViewVisible('start', ciPaused || !ciId);
        this.setViewVisible('pause', !ciPaused && ciId);
        this.setViewVisible('stop', ciId);
        this.setTitle(ciId || this.getIssueIdFromUrl());

        this.setViewVisible('meetingStart', !miRunning);
        this.setViewVisible('meetingStatus', miRunning);

        if (miRunning) {
            this.showNotification();
        }

        this.refreshTimer();
    },

    showEl: function (el) {
        el.style.display = 'inline-block';
    },

    hideEl: function (el) {
        el.style.display = 'none';
    },

    hideAllButtons: function () {
        var btns = [this.views.start, this.views.stop, this.views.pause, this.views.title];
        btns.forEach(function (b) {
            this.hideEl(b);
        }, this);
    },

    showLoader: function () {
        this.showEl(this.views.loader);
    },

    hideLoader: function () {
        this.hideEl(this.views.loader);
    },

    openIssue: function (issueId) {
        var s = this.views.search;
        s.value = issueId;
        s.parentNode.submit();
    },

    startIssue: function (issueId, callback) {
        var url = this.redmineBaseUrl + 'time_trackers/start?time_tracker%5Bissue_id%5D=' + issueId + '&time_tracker%5Bactivity_id%5D=9';
        this.request(url, callback, this.failback);
    },

    startCurrentIssue: function (currentIssueId) {
        var ciState = this.getCurrentIssueState(),
            self = this;

        this.startIssue(currentIssueId, function () {
            var time = +new Date();
            if (ciState.paused) {
                time = (time - (1 * ciState.pausedTime - 1 * ciState.startedTime));
                ciState.pausedTime = false;
                ciState.paused = false;
            }

            ciState.startedTime = time;
            ciState.started = true;
            ciState.id = currentIssueId;

            self.setCurrentIssueState(ciState);

            self.setViewVisible('start', false);
            self.setViewVisible('pause', true);
            self.setViewVisible('stop', true);
            self.setTitle(currentIssueId);

            self.refreshTimer();
        });
    },

    startMeetingIssue: function () {
        var self = this,
            miState = this.getMeetingIssueState(),
            meetingIssueId = this.meetingIssueId;

        this.startIssue(meetingIssueId, function () {
            var time = +new Date();

            miState.startedTime = time;
            miState.id = meetingIssueId;
            miState.started = true;
            miState.paused = false;
            self.setMeetingIssueState(miState);

            self.setViewVisible('meetingStart', false);
            self.setViewVisible('meetingStatus', true);

            self.showNotification();

            self.refreshTimer();
        });
    },

    stopIssue: function (callback) {
        var url = this.redmineBaseUrl + 'time_trackers/stop';
        this.request(url, callback, this.failback);
    },

    stopMeetingIssue: function (callback) {
        var self = this;

        this.stopIssue(function () {
            self.setMeetingIssueState();

            self.setViewVisible('meetingStart', true);
            self.setViewVisible('meetingStatus', false);

            self.hideNotification();

            if (typeof callback === 'function') {
                callback();
            }
        });
    },

    pauseCurrentIssue: function (callback) {
        var self = this,
            ciState = this.getCurrentIssueState();

        this.stopIssue(function () {
            ciState.paused = true;
            ciState.pausedTime = +new Date();
            self.setCurrentIssueState(ciState);

            self.setViewVisible('start', true);
            self.setViewVisible('pause', false);
            self.setViewVisible('stop', true);

            if (typeof callback === 'function') {
                callback();
            }
        });
    },

    request: function (url, callback, failback) {
        var req = new XMLHttpRequest(),
            self = this;

        this.showLoader();

        req.open('GET', url, true);
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    callback && callback();
                } else {
                    failback && failback();
                }
                self.hideLoader();
            }
        };
        req.send(null);
    },

    failback: function () {},

    showMasks: function () {
        this.showMask('header', document.getElementById('header'));
        this.showMask('main', document.getElementById('main'));
        this.showMask('footer', document.getElementById('footer'));
    },

    hideMasks: function () {
        this.hideMask('header');
        this.hideMask('main');
        this.hideMask('footer');
    },

    fixMasks: function () {
        var masks = this.views.masks;
        var name;
        for (name in masks) {
            if (masks.hasOwnProperty(name)) {
                this.fixMask(masks[name]);
            }
        }
    },

    showMask: function (name, parentEl) {
        var masks = this.views.masks;
        if (masks[name]) {
            this.showEl(masks[name]);
            return masks[name];
        }

        var mask = document.createElement('div');
        mask.className += 'ht-window-mask';

        parentEl.appendChild(mask);

        this.fixMask(mask);

        masks[name] = mask;
        return mask;
    },

    hideMask: function (name) {
        var masks = this.views.masks;
        if (masks[name]) {
            this.hideEl(masks[name]);
        }
    },

    fixMask: function (mask) {
        var parentEl = mask.parentNode;
        var parentStyle = window.getComputedStyle(parentEl, null);
        var parentMargin = {
            left: parseInt(parentStyle.marginLeft),
            right: parseInt(parentStyle.marginRight),
            top: parseInt(parentStyle.marginTop),
            bottom: parseInt(parentStyle.marginBottom)
        };

        var rects = parentEl.getClientRects()[0];
        mask.style.top = (-parentMargin.top || 0) + 'px';
        mask.style.left = (-parentMargin.left || 0) + 'px';
        mask.style.width = (Math.round(rects.width) + parentMargin.left + parentMargin.right) + 'px';
        mask.style.height = (Math.round(rects.height) + parentMargin.top + parentMargin.bottom) + 'px';
    },

    fixLayout: function () {
        var mainEl = document.getElementById('main');
        mainEl.style.position = 'relative';

        var footerEl = document.getElementById('footer');
        footerEl.style.position = 'relative';
    },

    isNotifyable: function (callback) {
        if (!("Notification" in window)) {
            return;
        }

        if (Notification.permission === "granted") {
            this.notifyable = true;
            callback.call(this);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                this.notifyable = permission === "granted";
                callback.call(this);
            });
        }
    },

    showNotification: function () {
        if (!this.notifyable || this.notification || this.notificationInt) {
            return;
        }

        var self = this;

        this.notification = this.createNotification();

        this.notificationInt = setInterval(function () {
            if (self.notification) {
                return;
            }

            self.notification = self.createNotification();
        }, this.notificationPeriod);
    },

    hideNotification: function () {
        if (this.notification) {
            this.notification.close();
            this.notification = null;
        }

        clearInterval(this.notificationInt);
        this.notificationInt = null;
    },

    closeNotification: function () {
        this.notification = null;
    },

    createNotification: function () {
        var title = 'Meeting issue is running';
        var options = {
            body: 'Please be sure that your are on meeting now',
            icon: window.rttBaseUrl + 'meeting.png'
        };

        var notification = new Notification(title, options);
        notification.onclose = this.closeNotification.bind(this);
        return notification;
    }

};

var theme = {
    pause:  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABK9JREFUeNrsWktME0EYnn95+ERBfBu1EExM0MBFPaqJjxgfNOq9jd44ITdO1BM3xQs3CQ1XNK2PGF+x8aZeaoyJiQZajRqfgEZgC93ff3YBBW23u8zsbLV/8tOS7j878833f/PP7DJWspKVTJXh+/4m7ir7AJ4M9N3lrfQRpNvtI28mD+S4MkWeJE/QPzHYeDZd1ADg254QY1qbNWhXLRAYRjdsao0WFQD45gIfeCT3TDtukZhhRGBze9TXAODrLqI69FlUlwItpQaGYUtH2ncAYKqzhWadD75asqKMEBvCEDgf9w0AONQRsmbe0zUkDHVdUeUA4OC5kDXzKoyYUH8xqgwAfNVKtIeY4moiCA09cc8BwJdnuOAl5ed8IZqAzbCt15Uwlrtnn97HQPXgTatmiDwF93vGAHxxWoHoFSCK2wei3jAA9YjNFUmzEAIYmRuH1bygoW/NguO48d+j0hmAzw8WMvtBaLwT/3v8oRZe5wuO+8WCxrtRuQxAvc0W1R0P86jyZIJhVmjcb9bmlAWOGIDPdpHyaynbRnc+gvzt7EGRcfPUOQA7n6TlMMDQg0KKR2NCYhxSH9klOQCgLmaTgxMy4/bJA8CYaCaFFgCALi8O0dHZg0MGZAIMBTDA0GXGBSQCMMGKIAXkFEL4eEmT65nzlgFmX2H3+FOxDMApgVXrpLdxeUwruGDYM/mUIQlgIW47EMFx89zsqwwNQEPMCZrbdkTdfwEiCCmnKptzJuXFpeQBYPADEAEAuJ3JwuKSUjTAmgGWMOsAO7dvR2zcXE9IBABiPA/tvJBcFhk3pw10dkbpCABt71iabpD08SqQNPsojQFWJ7rtOpK9v7wlV7j5m+C437xb+omQ2Zl7VUM2YshPiyNlB77Ff8WsWGnt1NDmSMxVnKn+ZQe+13kCwNTdFSH66GP+snD5wW9RTwAwQbi98sH03tsPlig/POrqWNz9cwEGYVpy+Jqr+tnACE1j2PUoFnLnqVs1JExM7aMxYMHyI8NxJQCYINxcFUJFegA8749+VfdwdMYmb9SqEMVwxbEv6h+Pz4JwvZanQ58HmmDmfMXxL/55QWIWhGurt06DIGt1SJiDP/HZf6/IzAEitiZEQESE7BxntrjAIhXBT/5+SWq+Za6u5drQZlPB2W1tuytPfiyu1+T+AOLKuukXJSk10AQjkGemkybVGYtVnvqQZv+yZQbWN3Fn/6Ph+/6l3FX3Q3oK4LvLldbSCFXkS8gX5bhSJx8n/86XOth4NlPUAODbnhrGtDXWoF21QGAYn2BT63BRAYBvLtD+XVtLTVcKapGYYHyEze2jvgYAX3fRzhI2kEvKaxzjygFbOqZ8BwCmOmnQ2jpqTpOsKAax4QMEzo/5BgAc6lhGzaz2eA35DHVdP5QDgIPnSOC0VWoWMOMr1F8cVwYAvmolkYMaxdXEMDT0ZDwHAF+eoVwHUnsAxQAg+Shs6zXctuDuTNDQF9PYs8wPhriY/o55xgB8cbosdzWnDAUdtg9kvWEA6nypy7cWEy217B/ZwdnKjLI8oLuN48b7lJXOAHx+iBWw1hvQeDtH/OGZzoqMm60RoPEOK1nJSubIfgowAHNQTn0Y3MjOAAAAAElFTkSuQmCC',
    stop:   'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABJlJREFUeNrsWklMFEEUrd/AiDuL4hZ1MJKQIIGLy01MAGNcmKj3meiNE3Dj5HDihnjhhmHiFc3gEqNinHhyuYwxJCYamdGoUUFAI9AD099fPUDiAlPddnX16Pzkz5JUann1/vu/qpuxvOUtb6oMP1yp465yDuDKQt/376avAA3XQF5P7l+mZYI8Th6jP1HYfj6Z0wDgu74gY1pbZtG2eiAwjF7Y0RrJKQDwbQ9feHj5nbbcIzHDCMPOjoinAcA33UR1GMhQXQq0FBoYgl2dSc8BgIkLLbTrfPElkhVlktgQAn/XkGcAwNHOYGbnXc0hIajsjigHAF+3BzM7r8KICXsuRpQBgK9aifYQVVxNBGBv35DrAODLc1zw4vJjXkQTsB6qLtsSxkL77NMHGKhevGklDJGH4BHXGIAvzioQPQFRrB6MuMMA1MMCreJmMQQw+XfrwhJeBNGvbNUkbxORzgAcaRLd/QDU3HUkV+NIcws/GwixoOZeRC4DUG8TQnbfwyHn6D0XY5gWadhmlQWWGIDP95PyawmhjmsfO1tmPz+Igursh9qnSTkMMPSASyfoP4w9K1wX0MclOQCg3sBUGYoCwBrkAWDM1pOqKwJAF80alu4eLDIg5WeoiAGGLtrSLxGAWZYDISCnEMInq+ss7IJKBphzhQMzz5xlAM4rrnTnpHRrrQ545BNWADiUcrYOkDS2JQ1AA9QRQNLYFkUQElZV1jkEhAFIyAPA4BcgigAQZ0DcSreatV1gMbMOEHHHGSDsMYkAQJTHoojL0AChcdHaHaUlALTD00kaIG7GYzaXoQHZPW7OURoDMhPpFZlM+v66FqfWbvYlBkCv9Bshc0LD60cFxJDfGIcLGr/avhhJD2/YmDndYZhlvxJLFDR+q3QFgPl7G4L0NcC8ZaHCpq8RVwAwQbiz8cHC2dsLFis8OmXrWtz+cwEGIUo5POeqfjYwSdsYcuUs8BsLbpeSODG1j8aABQqPTQwpAcAE4VZZEBXpAfC4P/5F3cPRRZu7Wa5CFENFJ8bVPx5fAuFGOQ+HARc0wYz5opPj3nlBYgmE65t2L4AgKzvEzMWfGvPeKzI/ARHdHCQgwg6eHBM003BR4LO3X5L61VLXKrg2tAlUcSsdbXt9pz/l1mtyvwFxdcvCi5IUGmiC4V9hp+Mm1RmL+s58TLJ/2VKDW+u4s//R8MOVNdxVz0N6COD7fl8mNcJ68tXkq5ZpqZPPkH/jqQ62n0/lNAD4rq+UMW1zZtG2eiAwjM+wo3UipwDAtz10htcqqGufQz0SE4xPsLNjytMA4JtuOlnCNnJJcY3TXDlgV+e85wDAxAVatLaFutMkK4pBbPgI/q5pzwCAo51rqZtNLueQMajs/q4cAHzdTgKnlalJYMYX2HNxRhkA+KqVRA5KFVcTE7C3L+U6APjyHMU6kNoDKAYAyaeg6rJhtwd7d4KGXkxrTzMvGGIxfU67xgB8cbZg+WpOGQo6VA+m3WEA6jzVZcvFRE0t/dcRwhnOjAKBjeJzSktnAI40M8Fcb0DNHWf2duTo4gKz1ghQc5flLW95s2Q/BBgA75XqL8/21I0AAAAASUVORK5CYII=',
    start:  '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',
    loader: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAALPSURBVDjLjZNbSFNxHMcXm+BDBEFBvgRS9CBFrxJRoUlPs4ceJMiHsIshSTdSi7AI1K6KOfOSaZgXQmyic5u3TJ3zNue8TEvP5tl0czed7uy+nW//DV3ajQ58D+fh9/nwP/8fX85s9e1okkySVhKKhCEJqspvYKjoEnrykoOtD08zjbeOU++vxbYKUvdlFqbsjgbACYVDhgcWxfkwDApgVlbBOvUBFlUNVkYqsdxXCl1HIaiWfEzX5mCg6DKas0+BCAYiAnXtA9WWwKSoJHkHo7wcS18FWJS8BiV8htmGJ1BW3kXfy9SwoCg1RhURyCbpOIWsFwviCszUP8KIIA09+edBjg1ybFRfP4SytIOoyDiKhqcXUFFSgJI6cVxEEHr1zPskCr0XVocfbh8Lj5+FzRnAjMGNMdoFrdULyuJF27gFJe1ayRYcEYQiVbs+S9VOdpEMM54gDHY/Zo0eaAgo+76Bt1Id+0akbd4O7xCEIlSux7co7dQw5YBu1ReG2ydsKJXS88UiTfyv8G+CrdQPmvvHaQZjWgcEErrvTzP/FDQOmuQTegYKIihu0/T/t6BeZjohHDXTkzoHbEwAxnU/RGMmFDTNLYjTE0p7+XvorgQeK03i6kiydwhq+1eETUMmVmN2hzfhDbDYcAehs/nQXfYCynsn4Ra9AquWwNl4B6MZxwIdibybYbimzyjtnLJh2e6D0xuEj8CBIAuGfCv1LnRdPAwXgVHMB7L2AnmxsDw/A+lZrobT0DkVV9dvQK96DeYNfxgmbFhgdwXwbcWDrsQosIrQBn8+a7kHEPqdcBempWUYkMsgn7NCb3Fh3UlWaHSg/osWjz9OoCU5BkxVGkAgz30OVknodC7IPSztKNPfuqDI5WP46hEYsmJhzokCdWUXuvm8gCSJ+4Czvc6kwhSpMLNZ4XAXSIWDpMLMp5T9NtE5nnNzC0shOHR/PwBGKPcL7gZY5gAAAABJRU5ErkJggg==',
    meeting: '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'
};

var oldTimer = document.querySelector('#account ul li:first-child');
if (oldTimer) {
    var timer = window.rttInstance = new Timer({
        oldTimer: oldTimer,
        theme:    theme
    });
}
