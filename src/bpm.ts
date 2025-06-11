const ONE_MINUTE_MS = 60000;
const RESET_TIMEOUT_MS = 5000;

function mustExist<T>(t: T | null): NonNullable<T> {
  if (!t) {
    throw new Error("Missing element");
  }
  return t;
}

// https://en.wikipedia.org/wiki/Confidence_interval#Basic_steps
// 99% Confidence Interval
const Z_STAR_99_PERCENT = 2.576;
// Adjacent tap deviations are correlated, so normal confidence interval
// estimation is actually kind of useless. This adjustment doesn't mean much, but it works roughly right in practice.
const CONFIDENCE_INTERVAL_SCALE = 2;

class Estimate {
  constructor(
    public bpm: number,
    public confidence_radius_99_percent: number | null,
  ) {}
}

// biome-ignore lint/complexity/noStaticOnlyClass: legacy code
class Statistics {
  public static total(l: number[]): number {
    let total = 0;
    for (const i in l) {
      total += l[i];
    }
    return total;
  }

  public static mean(l: number[]): number {
    return Statistics.total(l) / l.length;
  }

  public static compareNumbers(a: number, b: number) {
    return a - b;
  }

  public static sort(l: number[]) {
    return l.sort(Statistics.compareNumbers);
  }

  // // From timer.cubing.net
  // Removes the highest 5% and lowest 5% of values in l (rounded up to a whole
  // number of entries in each case, and returns the rest sorted.
  public static trim(l: number[]): number[] {
    const len = l.length;
    if (len < 3) {
      return [];
    }

    const trimFromEachEnd = Math.ceil(len / 20);
    return Statistics.sort(l).slice(trimFromEachEnd, len - trimFromEachEnd);
  }

  public static stdDev(l: number[]) {
    const m = Statistics.mean(l);
    const deltas = [];
    for (const i in l) {
      deltas.push((l[i] - m) ** 2);
    }
    return Math.sqrt(Statistics.mean(deltas));
  }
}

// Calculates a 99% confidence interval.
class TempoEstimator {
  // biome-ignore lint/style/noInferrableTypes: dude
  private lastBeat: number = 0;
  private beatDurations: number[] = []; // TODO: Keep sorted for performance?

  public isLastBeatWithin(duration: number, timeStamp: number): boolean {
    return this.lastBeat !== null && timeStamp - this.lastBeat < duration;
  }

  public reset(): void {
    this.lastBeat = 0;
    this.beatDurations = [];
  }

  public addBeat(timeStamp: number): void {
    this.beatDurations.push(timeStamp - this.lastBeat);
    this.lastBeat = timeStamp;
  }

  public getEstimate(): Estimate {
    const trimmed = Statistics.trim(this.beatDurations);
    const mean = Statistics.mean(trimmed);
    const stdDev = Statistics.stdDev(trimmed);
    const bpm_estimate = ONE_MINUTE_MS / mean;

    const duration_confidence_radius_99_percent =
      (Z_STAR_99_PERCENT * stdDev) /
      Math.sqrt(trimmed.length) /
      CONFIDENCE_INTERVAL_SCALE;
    // The radius becomes slightly asymmetric when inverted, so we take the larger one.
    let bpm_confidence_radius_99_percent: number | null =
      ONE_MINUTE_MS / (mean - duration_confidence_radius_99_percent) -
      bpm_estimate;

    if (trimmed.length < 4) {
      bpm_confidence_radius_99_percent = null;
    }
    return new Estimate(bpm_estimate, bpm_confidence_radius_99_percent);
  }
}

class App {
  private tempoEstimator: TempoEstimator = new TempoEstimator();

  public registerListeners(el: HTMLElement): void {
    el.addEventListener("keypress", this.onKey.bind(this));
    mustExist(
      document.querySelector<HTMLElement>(".bpm-app .display"),
    ).addEventListener("touchstart", this.onTouch.bind(this));
  }

  private displayValue(
    elem: HTMLElement,
    val: number,
    defaultRest: string,
  ): void {
    let intFirstStr = "_";
    let intRestStr = defaultRest;
    let decimalStr = "_";
    if (val) {
      const strValTimes10 = `${Math.round(val * 10)}`;
      intFirstStr = val < 1 ? String("0") : strValTimes10[0];
      intRestStr = strValTimes10.slice(1, -1);
      decimalStr = strValTimes10.slice(-1);
    }
    mustExist(elem.querySelector(".int .first")).textContent = intFirstStr;
    mustExist(elem.querySelector(".int .rest")).textContent = intRestStr;
    mustExist(elem.querySelector(".decimal")).textContent = decimalStr;
  }

  private display() {
    const estimate = this.tempoEstimator.getEstimate();
    this.displayValue(
      mustExist(document.querySelector("#bpm-value")),
      estimate.bpm,
      "__",
    );
    this.displayValue(
      mustExist(document.querySelector("#uncertainty")),
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      estimate.confidence_radius_99_percent!,
      "_",
    );
  }

  public flashBody(): void {
    document.body.classList.remove("slow-transition");
    document.body.classList.add("flash");
    setTimeout(() => {
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

const appInstance = new App();

window.addEventListener("load", () => {
  appInstance.registerListeners(document.body);
});
