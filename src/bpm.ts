"use strict";

var $ = document.querySelector.bind(document);

var ONE_MINUTE_MS = 60000;
var RESET_TIMEOUT_MS: number = 5000;

// https://en.wikipedia.org/wiki/Confidence_interval#Basic_steps
// 99% Confidence Interval
var Z_STAR_99_PERCENT = 2.576;
// Adjacent tap deviations are correlated, so normal confidence interval
// estimation is actually kind of useless. This adjustment doesn't mean much, but it works roughly right in practice.
var CONFIDENCE_INTERVAL_SCALE = 2;

class Statistics {

  private static total(l: number[]): number {
    var total = 0;
    for (var i in l) {
      total += l[i];
    }
    return total;
  }

  public static mean(l: number[]): number {
    return this.total(l) / l.length;
  }

  private static compareNumbers(a: number, b: number) {
    return a - b;
  }

  public static sort(l: number[]) {
    return l.sort(this.compareNumbers);
  }

  // // From timer.cubing.net
  // Removes the highest 5% and lowest 5% of values in l (rounded up to a whole
  // number of entries in each case, and returns the rest sorted.
  public static trim(l: number[]): number[] {
    var len = l.length;
    if (len < 3) {
      return [];
    }

    var trimFromEachEnd = Math.ceil(len / 20);
    return this.sort(l).slice(trimFromEachEnd, len - trimFromEachEnd);
  }

  public static stdDev(l: number[]) {
    var m = this.mean(l);
    var deltas = [];
    for (var i in l) {
      deltas.push(Math.pow(l[i] - m, 2));
    }
    return Math.sqrt(this.mean(deltas));
  }
}

class Estimate {
  constructor(public bpm: number, public confidence_radius_99_percent: number|null) {}
}

// Calculates a 99% confidence interval.
class TempoEstimator {
  private lastBeat: number|null = null;
  private beatDurations: number[] = []; // TODO: Keep sorted for performance?

  public isLastBeatWithin(duration: number, timeStamp: number): boolean {
    return this.lastBeat !== null && timeStamp - this.lastBeat < duration;
  }

  public reset(): void {
    this.lastBeat = null;
    this.beatDurations = [];
  }

  public addBeat(timeStamp: number): void {
    this.beatDurations.push(timeStamp - this.lastBeat);
    this.lastBeat = timeStamp;
  }

  public getEstimate(): Estimate {
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
  }
}

class App {
  private tempoEstimator: TempoEstimator = new TempoEstimator();

  public registerListeners(el): void {
    document.body.addEventListener("keypress", this.onKey.bind(this));
    $(".bpm-app .display").addEventListener("touchstart", this.onTouch.bind(this));
  }

  private displayValue(elem: HTMLElement, val: number, defaultRest: string): void {
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
  }

  private display() {
    var estimate = this.tempoEstimator.getEstimate();
    this.displayValue($("#bpm-value"), estimate.bpm, "__");
    this.displayValue($("#uncertainty"), estimate.confidence_radius_99_percent, "_");
  }

  public flashBody(): void {
    document.body.classList.remove("slow-transition");
    document.body.classList.add("flash");
    setTimeout(function() {
      document.body.classList.add("slow-transition");
      document.body.classList.remove("flash");
    }, 10);
  }

  private onBeat(timeStamp: number): void {
    if (!this.tempoEstimator.isLastBeatWithin(RESET_TIMEOUT_MS, timeStamp)) {
      this.tempoEstimator.reset();
    }
    this.tempoEstimator.addBeat(timeStamp);
    this.display();
    this.flashBody();
  }

  public onKey(ev: KeyboardEvent): void {
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
  }

  public onTouch(ev: TouchEvent): void {
    ev.preventDefault();
    this.onBeat(ev.timeStamp);
  }
}

var appInstance = new App();

window.addEventListener("load", function() {
  appInstance.registerListeners(document.body);
});
