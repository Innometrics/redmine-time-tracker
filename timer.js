var Timer = function(cfg){
	var el = cfg.timerEl;
	
	this.views = {
        search:					document.getElementById('q'),
        origTimer: 				el,
        baseTimerContainer:		el.parentNode,
        newTimerContainer:		document.createElement('li'),
	};
	
	this.resources = cfg.theme;
	
	this.buildHTML();
	this.buildStyles();
	this.initStorage();
    this.initEvents();
    this.restoreState();
    
};

Timer.prototype = {
	buildHTML: function(){
		var container = this.views.newTimerContainer,
			base = this.views.baseTimerContainer,
			orig = this.views.origTimer,
			action = {},
			self = this;
			
		container.className = 'ht-main';
        
        var timer = this.generateLink(
			function(e){
				//do nothing;
			},
			'ht-main-item-timer'
		);
			
		var start = this.generateLink(
			function(e){
				self.onStartButtonClick.apply(self, arguments);
			},
			'ht-main-item-start'
		);
		
		var stop = this.generateLink(
			function(e){
				self.onStopButtonClick.apply(self, arguments);
			},
			'ht-main-item-stop'
		);
		
		var pause = this.generateLink(
			function(e){
				self.onPauseButtonClick.apply(self, arguments);
			},
			'ht-main-item-pause'
		);
		
		var title = this.generateLink(
			function(e){
				var s = self.views.search;
				s.value = this.textContent;
				s.parentNode.submit();
			},
			'ht-main-item-title'
		);

        var loader = document.createElement('p');
        loader.className = 'ht-main-item-loader';
		
		[timer, start, pause, stop, title, loader].forEach(function(item){
			container.appendChild(item);
		});
		
        this.views.timer = timer;
		this.views.start = start;
		this.views.stop = stop;
		this.views.pause = pause;
        this.views.loader = loader;
        
        timer.style.display = 'none';
		this.views.titleEl = title;
		
		base.insertBefore(container, orig.nextSibling);
	},
	
	buildStyles: function(styles){
		var stylesContent = '',
			self = this;
		
		['start', 'pause', 'stop', 'loader'].forEach(function(item){
			stylesContent += '.ht-main .ht-main-item-'+item+' { background-image: url(data:image/png;base64,'+self.resources[item]+'); } ';
		});
		
		var style = document.createElement('style');
		style.innerHTML = stylesContent;
		
		document.body.appendChild(style);
	},
	
	generateLink: function(handler, className){
		var a = document.createElement('a');
		a.className = 'ht-main-item' + (className ? ' '+className : '');
		if(handler){
			a.addEventListener('click', function(e){
				e.preventDefault();
				handler.apply(this, arguments);
			});
		}
		return a;
	},
    
    
	
	initStorage: function(){
		var self = this, data,
		storage = window.localStorage;

        var data = storage.getItem('ht-mfix');
        if(!data){
            storage.setItem('ht-mfix', JSON.stringify({}));
        }
        
		this.storage = { //add cache or optimize it
			get: function(prop){
                var data = this.getData();
                return data[prop];
			},
            
			set: function(prop, val){
				var data = this.getData();
                data[prop] = val;
                this.setData(data);
			},
            
            clear: function(prop){
                var data = this.getData();
                if(data[prop]){
                    delete data[prop];
                }
                this.setData(data);
            },
            
            getData: function(){
                return JSON.parse(storage.getItem('ht-mfix'));
            },
            
            setData: function(data){
                storage.setItem('ht-mfix', JSON.stringify(data));
            }
		};
	},
	
	changeButtons: function(start, pause, stop, title){
        start ? this.showEl(this.views.start) : this.hideEl(this.views.start); 
        stop ? this.showEl(this.views.stop) : this.hideEl(this.views.stop); 
        pause ? this.showEl(this.views.pause) : this.hideEl(this.views.pause);
        
        if(title){
            this.views.titleEl.textContent = '#' + title;
            this.showEl(this.views.titleEl);
        } else {
            this.views.titleEl.textContent = '';
            this.hideEl(this.views.titleEl);
        }
        
	},
	
	onStartButtonClick: function(){
		var self = this;
		var task = window.location.href.match(/\/issues\/(\d+)/),
            data = this.storage.getData();
        
        var freeze = data.freeze;
        var ctask = data.ctask;
        
        task = freeze ? ctask : (task && task[1]);
        
		if(!task){
			task = prompt('What number of issue will start?');
		}
		
        if(!task){
            return false;
        }
        
		this.startRequest(task, function(){
            var time = (new Date()).valueOf();
            if(freeze){
                time = (time - (1*data.freezets - 1*data.ts));
                data.freezets = false;
            }
            
            data.ts = time;
            data.ctask = task;
            data.freeze = false;
            
            self.storage.setData(data);
			self.changeButtons(false, true, true, task);
            self.onClockEvent();
		});
	},
    
    initEvents: function(){
        var self = this;
        document.addEventListener('mouseenter', function(){
            self.restoreState();
        });
        
        window.addEventListener('focus', function(){
            self.restoreState();
        });
        
        document.addEventListener('visibilitychange', function(){
            self.restoreState();
        });
        
        window.setInterval(function(){
            self.onClockEvent();
        },60000);
    },
	
	onStopButtonClick: function(){
		var self = this,
            data = this.storage.getData();
		var freeze = this.storage.get('freeze');

        var callback = function(){
            delete data.ts;
            delete data.freezets;
            delete data.ctask;
            delete data.freeze;
            
            self.storage.setData(data);
            self.changeButtons(true);
            self.onClockEvent();
        };
        
		if(freeze){
            callback();
		} else {
			this.stopRequest(callback);
		}
	},
	
	onPauseButtonClick: function(){
		var self = this,
            data = this.storage.getData();
        var ctask = this.storage.get('ctask');
        
		this.stopRequest(function(){
            data.freeze = true;
            data.freezets = (new Date()).valueOf();
            
            self.storage.setData(data);
			self.changeButtons(true, false, true, ctask);
		});
	},
    
    onClockEvent: function(){
        var data = this.storage.getData(),
            clock = this.views.timer;
        
        if(data.ts){
            if(data.freeze){
                return false;
            }
            clock.textContent = this.prepareTime((new Date()).valueOf() - 1*data.ts);
            if(clock.style.display === 'none'){
                this.showEl(clock);
            }
        } else {
            if(!(clock.style.display === 'none')){
                this.hideEl(clock);
            }
        }

    },
    
    prepareTime: function(ts){
        if(!ts && ts !== 0){
            return false;
        }

        ts = Math.ceil(ts/1000);
        
        var m = Math.floor(ts/60),
            h = Math.floor(m/60);
    
        m = (m - h*60);
    
        var tplData = [h, (m < 10 ? '0'+m : m)],
            tIndex = 0;
        
        var time = '%s:%s'.replace(/%s/g, function(){
            return tplData[tIndex++];
        });
        
        return time;
    },
    
    restoreState: function(){
        var freeze = this.storage.get('freeze');
        var ctask = this.storage.get('ctask');
        
        this.changeButtons((freeze || !ctask), (!freeze && ctask), ctask, ctask);
        this.onClockEvent();
    },
	
	showEl: function(el){
		el.style.display = 'inline-block';
	},
	
	hideEl: function(el){
		el.style.display = 'none';
	},
    
    hideAllButtons: function(){
        var btns = [ this.views.start, this.views.stop, this.views.pause, this.views.titleEl ],
            self = this;
        btns.forEach(function(b){
            self.hideEl(b);
        });
    },
    
    showLoader: function(){
        this.showEl(this.views.loader);
    },
    
    hideLoader: function(){
        this.hideEl(this.views.loader);
    },
	
	startRequest: function(task, callback){
		var url = 'https://rm.innomdc.com/time_trackers/start?time_tracker%5Bissue_id%5D='+task+'&time_tracker%5Bactivity_id%5D=9';
		this.request(url, callback, this.failback);
	},
	
	stopRequest: function(callback){
		var url = 'https://rm.innomdc.com/time_trackers/stop';
		this.request(url, callback, this.failback);
	},

	request: function(url, callback, failback){
        this.showLoader();
		var req = new XMLHttpRequest(),
            self = this;
		req.open('GET', url, true);
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				if(req.status == 200) {
					callback && callback();
				} else {
					failback && failback();
				}
                self.hideLoader();
			}
		};
		req.send(null);
	},
	
	failback: function(){
		//console.log('fail');
	}
};

var timerEl = document.querySelector('#account ul li:first-child');
var theme = {
	pause: 	'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABK9JREFUeNrsWktME0EYnn95+ERBfBu1EExM0MBFPaqJjxgfNOq9jd44ITdO1BM3xQs3CQ1XNK2PGF+x8aZeaoyJiQZajRqfgEZgC93ff3YBBW23u8zsbLV/8tOS7j878833f/PP7DJWspKVTJXh+/4m7ir7AJ4M9N3lrfQRpNvtI28mD+S4MkWeJE/QPzHYeDZd1ADg254QY1qbNWhXLRAYRjdsao0WFQD45gIfeCT3TDtukZhhRGBze9TXAODrLqI69FlUlwItpQaGYUtH2ncAYKqzhWadD75asqKMEBvCEDgf9w0AONQRsmbe0zUkDHVdUeUA4OC5kDXzKoyYUH8xqgwAfNVKtIeY4moiCA09cc8BwJdnuOAl5ed8IZqAzbCt15Uwlrtnn97HQPXgTatmiDwF93vGAHxxWoHoFSCK2wei3jAA9YjNFUmzEAIYmRuH1bygoW/NguO48d+j0hmAzw8WMvtBaLwT/3v8oRZe5wuO+8WCxrtRuQxAvc0W1R0P86jyZIJhVmjcb9bmlAWOGIDPdpHyaynbRnc+gvzt7EGRcfPUOQA7n6TlMMDQg0KKR2NCYhxSH9klOQCgLmaTgxMy4/bJA8CYaCaFFgCALi8O0dHZg0MGZAIMBTDA0GXGBSQCMMGKIAXkFEL4eEmT65nzlgFmX2H3+FOxDMApgVXrpLdxeUwruGDYM/mUIQlgIW47EMFx89zsqwwNQEPMCZrbdkTdfwEiCCmnKptzJuXFpeQBYPADEAEAuJ3JwuKSUjTAmgGWMOsAO7dvR2zcXE9IBABiPA/tvJBcFhk3pw10dkbpCABt71iabpD08SqQNPsojQFWJ7rtOpK9v7wlV7j5m+C437xb+omQ2Zl7VUM2YshPiyNlB77Ff8WsWGnt1NDmSMxVnKn+ZQe+13kCwNTdFSH66GP+snD5wW9RTwAwQbi98sH03tsPlig/POrqWNz9cwEGYVpy+Jqr+tnACE1j2PUoFnLnqVs1JExM7aMxYMHyI8NxJQCYINxcFUJFegA8749+VfdwdMYmb9SqEMVwxbEv6h+Pz4JwvZanQ58HmmDmfMXxL/55QWIWhGurt06DIGt1SJiDP/HZf6/IzAEitiZEQESE7BxntrjAIhXBT/5+SWq+Za6u5drQZlPB2W1tuytPfiyu1+T+AOLKuukXJSk10AQjkGemkybVGYtVnvqQZv+yZQbWN3Fn/6Ph+/6l3FX3Q3oK4LvLldbSCFXkS8gX5bhSJx8n/86XOth4NlPUAODbnhrGtDXWoF21QGAYn2BT63BRAYBvLtD+XVtLTVcKapGYYHyEze2jvgYAX3fRzhI2kEvKaxzjygFbOqZ8BwCmOmnQ2jpqTpOsKAax4QMEzo/5BgAc6lhGzaz2eA35DHVdP5QDgIPnSOC0VWoWMOMr1F8cVwYAvmolkYMaxdXEMDT0ZDwHAF+eoVwHUnsAxQAg+Shs6zXctuDuTNDQF9PYs8wPhriY/o55xgB8cbosdzWnDAUdtg9kvWEA6nypy7cWEy217B/ZwdnKjLI8oLuN48b7lJXOAHx+iBWw1hvQeDtH/OGZzoqMm60RoPEOK1nJSubIfgowAHNQTn0Y3MjOAAAAAElFTkSuQmCC',
	stop:	'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABJlJREFUeNrsWklMFEEUrd/AiDuL4hZ1MJKQIIGLy01MAGNcmKj3meiNE3Dj5HDihnjhhmHiFc3gEqNinHhyuYwxJCYamdGoUUFAI9AD099fPUDiAlPddnX16Pzkz5JUann1/vu/qpuxvOUtb6oMP1yp465yDuDKQt/376avAA3XQF5P7l+mZYI8Th6jP1HYfj6Z0wDgu74gY1pbZtG2eiAwjF7Y0RrJKQDwbQ9feHj5nbbcIzHDCMPOjoinAcA33UR1GMhQXQq0FBoYgl2dSc8BgIkLLbTrfPElkhVlktgQAn/XkGcAwNHOYGbnXc0hIajsjigHAF+3BzM7r8KICXsuRpQBgK9aifYQVVxNBGBv35DrAODLc1zw4vJjXkQTsB6qLtsSxkL77NMHGKhevGklDJGH4BHXGIAvzioQPQFRrB6MuMMA1MMCreJmMQQw+XfrwhJeBNGvbNUkbxORzgAcaRLd/QDU3HUkV+NIcws/GwixoOZeRC4DUG8TQnbfwyHn6D0XY5gWadhmlQWWGIDP95PyawmhjmsfO1tmPz+Igursh9qnSTkMMPSASyfoP4w9K1wX0MclOQCg3sBUGYoCwBrkAWDM1pOqKwJAF80alu4eLDIg5WeoiAGGLtrSLxGAWZYDISCnEMInq+ss7IJKBphzhQMzz5xlAM4rrnTnpHRrrQ545BNWADiUcrYOkDS2JQ1AA9QRQNLYFkUQElZV1jkEhAFIyAPA4BcgigAQZ0DcSreatV1gMbMOEHHHGSDsMYkAQJTHoojL0AChcdHaHaUlALTD00kaIG7GYzaXoQHZPW7OURoDMhPpFZlM+v66FqfWbvYlBkCv9Bshc0LD60cFxJDfGIcLGr/avhhJD2/YmDndYZhlvxJLFDR+q3QFgPl7G4L0NcC8ZaHCpq8RVwAwQbiz8cHC2dsLFis8OmXrWtz+cwEGIUo5POeqfjYwSdsYcuUs8BsLbpeSODG1j8aABQqPTQwpAcAE4VZZEBXpAfC4P/5F3cPRRZu7Wa5CFENFJ8bVPx5fAuFGOQ+HARc0wYz5opPj3nlBYgmE65t2L4AgKzvEzMWfGvPeKzI/ARHdHCQgwg6eHBM003BR4LO3X5L61VLXKrg2tAlUcSsdbXt9pz/l1mtyvwFxdcvCi5IUGmiC4V9hp+Mm1RmL+s58TLJ/2VKDW+u4s//R8MOVNdxVz0N6COD7fl8mNcJ68tXkq5ZpqZPPkH/jqQ62n0/lNAD4rq+UMW1zZtG2eiAwjM+wo3UipwDAtz10htcqqGufQz0SE4xPsLNjytMA4JtuOlnCNnJJcY3TXDlgV+e85wDAxAVatLaFutMkK4pBbPgI/q5pzwCAo51rqZtNLueQMajs/q4cAHzdTgKnlalJYMYX2HNxRhkA+KqVRA5KFVcTE7C3L+U6APjyHMU6kNoDKAYAyaeg6rJhtwd7d4KGXkxrTzMvGGIxfU67xgB8cbZg+WpOGQo6VA+m3WEA6jzVZcvFRE0t/dcRwhnOjAKBjeJzSktnAI40M8Fcb0DNHWf2duTo4gKz1ghQc5flLW95s2Q/BBgA75XqL8/21I0AAAAASUVORK5CYII=',
	start:	'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',
    loader: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAALPSURBVDjLjZNbSFNxHMcXm+BDBEFBvgRS9CBFrxJRoUlPs4ceJMiHsIshSTdSi7AI1K6KOfOSaZgXQmyic5u3TJ3zNue8TEvP5tl0czed7uy+nW//DV3ajQ58D+fh9/nwP/8fX85s9e1okkySVhKKhCEJqspvYKjoEnrykoOtD08zjbeOU++vxbYKUvdlFqbsjgbACYVDhgcWxfkwDApgVlbBOvUBFlUNVkYqsdxXCl1HIaiWfEzX5mCg6DKas0+BCAYiAnXtA9WWwKSoJHkHo7wcS18FWJS8BiV8htmGJ1BW3kXfy9SwoCg1RhURyCbpOIWsFwviCszUP8KIIA09+edBjg1ybFRfP4SytIOoyDiKhqcXUFFSgJI6cVxEEHr1zPskCr0XVocfbh8Lj5+FzRnAjMGNMdoFrdULyuJF27gFJe1ayRYcEYQiVbs+S9VOdpEMM54gDHY/Zo0eaAgo+76Bt1Id+0akbd4O7xCEIlSux7co7dQw5YBu1ReG2ydsKJXS88UiTfyv8G+CrdQPmvvHaQZjWgcEErrvTzP/FDQOmuQTegYKIihu0/T/t6BeZjohHDXTkzoHbEwAxnU/RGMmFDTNLYjTE0p7+XvorgQeK03i6kiydwhq+1eETUMmVmN2hzfhDbDYcAehs/nQXfYCynsn4Ra9AquWwNl4B6MZxwIdibybYbimzyjtnLJh2e6D0xuEj8CBIAuGfCv1LnRdPAwXgVHMB7L2AnmxsDw/A+lZrobT0DkVV9dvQK96DeYNfxgmbFhgdwXwbcWDrsQosIrQBn8+a7kHEPqdcBempWUYkMsgn7NCb3Fh3UlWaHSg/osWjz9OoCU5BkxVGkAgz30OVknodC7IPSztKNPfuqDI5WP46hEYsmJhzokCdWUXuvm8gCSJ+4Czvc6kwhSpMLNZ4XAXSIWDpMLMp5T9NtE5nnNzC0shOHR/PwBGKPcL7gZY5gAAAABJRU5ErkJggg=='
};

if(timerEl){
    var timer = new Timer({
        timerEl: 	timerEl,
        theme:		theme
    });
}
