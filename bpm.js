"use strict";
var $ = document.querySelector.bind(document);
var ONE_MINUTE_MS = 60000;
var RESET_TIMEOUT_MS = 5000;
// https://en.wikipedia.org/wiki/Confidence_interval#Basic_steps
// 99% Confidence Interval
var Z_STAR_99_PERCENT = 2.576;
// Adjacent tap deviations are correlated, so normal confidence interval
// estimation is actually kind of useless. This adjustment doesn't mean much, but it works roughly right in practice.
var CONFIDENCE_INTERVAL_SCALE = 2;
var Statistics = /** @class */ (function () {
    function Statistics() {
    }
    Statistics.total = function (l) {
        var total = 0;
        for (var i in l) {
            total += l[i];
        }
        return total;
    };
    Statistics.mean = function (l) {
        return this.total(l) / l.length;
    };
    Statistics.compareNumbers = function (a, b) {
        return a - b;
    };
    Statistics.sort = function (l) {
        return l.sort(this.compareNumbers);
    };
    // // From timer.cubing.net
    // Removes the highest 5% and lowest 5% of values in l (rounded up to a whole
    // number of entries in each case, and returns the rest sorted.
    Statistics.trim = function (l) {
        var len = l.length;
        if (len < 3) {
            return [];
        }
        var trimFromEachEnd = Math.ceil(len / 20);
        return this.sort(l).slice(trimFromEachEnd, len - trimFromEachEnd);
    };
    Statistics.stdDev = function (l) {
        var m = this.mean(l);
        var deltas = [];
        for (var i in l) {
            deltas.push(Math.pow(l[i] - m, 2));
        }
        return Math.sqrt(this.mean(deltas));
    };
    return Statistics;
}());
var Estimate = /** @class */ (function () {
    function Estimate(bpm, confidence_radius_99_percent) {
        this.bpm = bpm;
        this.confidence_radius_99_percent = confidence_radius_99_percent;
    }
    return Estimate;
}());
// Calculates a 99% confidence interval.
var TempoEstimator = /** @class */ (function () {
    function TempoEstimator() {
        this.lastBeat = null;
        this.beatDurations = []; // TODO: Keep sorted for performance?
    }
    TempoEstimator.prototype.isLastBeatWithin = function (duration, timeStamp) {
        return this.lastBeat !== null && timeStamp - this.lastBeat < duration;
    };
    TempoEstimator.prototype.reset = function () {
        this.lastBeat = null;
        this.beatDurations = [];
    };
    TempoEstimator.prototype.addBeat = function (timeStamp) {
        this.beatDurations.push(timeStamp - this.lastBeat);
        this.lastBeat = timeStamp;
    };
    TempoEstimator.prototype.getEstimate = function () {
        var trimmed = Statistics.trim(this.beatDurations);
        var mean = Statistics.mean(trimmed);
        var stdDev = Statistics.stdDev(trimmed);
        var bpm_estimate = ONE_MINUTE_MS / mean;
        var duration_confidence_radius_99_percent = Z_STAR_99_PERCENT * stdDev / Math.sqrt(trimmed.length) / CONFIDENCE_INTERVAL_SCALE;
        // The radius becomes slightly asymmetric when inverted, so we take the larger one.
        var bpm_confidence_radius_99_percent = ONE_MINUTE_MS / (mean - duration_confidence_radius_99_percent) - bpm_estimate;
        if (trimmed.length < 4) {
            bpm_confidence_radius_99_percent = null;
        }
        return new Estimate(bpm_estimate, bpm_confidence_radius_99_percent);
    };
    return TempoEstimator;
}());
var App = /** @class */ (function () {
    function App() {
        this.tempoEstimator = new TempoEstimator();
    }
    App.prototype.registerListeners = function (el) {
        document.body.addEventListener("keypress", this.onKey.bind(this));
        $(".bpm-app .display").addEventListener("touchstart", this.onTouch.bind(this));
    };
    App.prototype.displayValue = function (elem, val, defaultRest) {
        var intFirstStr = "_";
        var intRestStr = defaultRest;
        var decimalStr = "_";
        if (val) {
            var strValTimes10 = "" + Math.round(val * 10);
            intFirstStr = val < 1 ? String("0") : strValTimes10[0];
            intRestStr = strValTimes10.slice(1, -1);
            decimalStr = strValTimes10.slice(-1);
        }
        elem.querySelector(".int .first").textContent = intFirstStr;
        elem.querySelector(".int .rest").textContent = intRestStr;
        elem.querySelector(".decimal").textContent = decimalStr;
    };
    App.prototype.display = function () {
        var estimate = this.tempoEstimator.getEstimate();
        this.displayValue($("#bpm-value"), estimate.bpm, "__");
        this.displayValue($("#uncertainty"), estimate.confidence_radius_99_percent, "_");
    };
    App.prototype.flashBody = function () {
        document.body.classList.remove("slow-transition");
        document.body.classList.add("flash");
        setTimeout(function () {
            document.body.classList.add("slow-transition");
            document.body.classList.remove("flash");
        }, 10);
    };
    App.prototype.onBeat = function (timeStamp) {
        if (!this.tempoEstimator.isLastBeatWithin(RESET_TIMEOUT_MS, timeStamp)) {
            this.tempoEstimator.reset();
        }
        this.tempoEstimator.addBeat(timeStamp);
        this.display();
        this.flashBody();
    };
    App.prototype.onKey = function (ev) {
        if (ev.repeat) {
            return;
        }
        switch (ev.which) {
            case 32: // space
            case 98: // B
                ev.preventDefault();
                this.onBeat(ev.timeStamp);
                break;
            case 114: // R
                this.tempoEstimator.reset();
                this.display();
                break;
        }
    };
    App.prototype.onTouch = function (ev) {
        ev.preventDefault();
        this.onBeat(ev.timeStamp);
    };
    return App;
}());
var appInstance = new App();
window.addEventListener("load", function () {
    appInstance.registerListeners(document.body);
});
//# sourceMappingURL=bpm.js.map