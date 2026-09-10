export class SeededRng {
  private stateValue: number;

  constructor(seed: number) {
    this.stateValue = normalizeSeed(seed);
  }

  get state(): number {
    return this.stateValue >>> 0;
  }

  reset(seed: number): void {
    this.stateValue = normalizeSeed(seed);
  }

  nextUint(): number {
    let value = this.stateValue | 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.stateValue = value >>> 0;
    return this.stateValue;
  }

  next(): number {
    return this.nextUint() / 0x1_0000_0000;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.next() * maxExclusive);
  }
}

export function normalizeSeed(seed: number): number {
  const normalized = Number.isFinite(seed) ? seed >>> 0 : 1;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
}
