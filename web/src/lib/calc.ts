// Калькулятор расхода. Чистые функции — используются и на сервере, и в браузере.

export type ConsumptionType =
  | "NONE"
  | "PER_AREA"
  | "PER_AREA_MM"
  | "PER_LENGTH"
  | "PER_AREA_UNITS"
  | "FIXED";

export type CalcInput = {
  /** м² (или погонные метры для PER_LENGTH) */
  area: number;
  /** мм, нужен только для PER_AREA_MM */
  thickness?: number;
};

export type CalcRule = { type: ConsumptionType; rate: number };

/**
 * Сколько материала нужно в единицах упаковки (кг, л, шт, м).
 * FIXED возвращает не количество материала, а сразу число упаковок — см. packsNeeded.
 */
export function amountNeeded(rule: CalcRule, input: CalcInput): number {
  const area = Math.max(0, input.area || 0);
  switch (rule.type) {
    case "PER_AREA":
    case "PER_LENGTH":
    case "PER_AREA_UNITS":
      return area * rule.rate;
    case "PER_AREA_MM":
      return area * Math.max(0, input.thickness || 0) * rule.rate;
    case "FIXED":
    case "NONE":
      return 0;
  }
}

// Защита от 3.0000000004 → 4 упаковки
const EPS = 1e-9;

/** Число упаковок с округлением вверх. */
export function packsNeeded(rule: CalcRule, input: CalcInput, packAmount: number): number {
  if (rule.type === "NONE") return 0;
  if (rule.type === "FIXED") return Math.ceil(rule.rate - EPS);
  if (!(packAmount > 0)) return 0;
  const amount = amountNeeded(rule, input);
  if (amount <= 0) return 0;
  return Math.ceil(amount / packAmount - EPS);
}

export type KitLine = {
  key: string;
  rule: CalcRule;
  packAmount: number;
  packPrice: number;
};

export type KitLineResult = { key: string; amount: number; packs: number; sum: number };

export function calcKit(lines: KitLine[], input: CalcInput) {
  const items: KitLineResult[] = lines.map((l) => {
    const packs = packsNeeded(l.rule, input, l.packAmount);
    return {
      key: l.key,
      amount: l.rule.type === "FIXED" ? packs * l.packAmount : amountNeeded(l.rule, input),
      packs,
      sum: packs * l.packPrice,
    };
  });
  return { items, total: items.reduce((s, i) => s + i.sum, 0) };
}

/** Подпись нормы для карточки: «1,4 кг/м² на 1 мм» */
export function rateLabel(rule: CalcRule, unit = "кг"): string {
  const r = formatNumber(rule.rate);
  switch (rule.type) {
    case "PER_AREA":
      return `${r} ${unit}/м²`;
    case "PER_AREA_MM":
      return `${r} ${unit}/м² на 1 мм`;
    case "PER_LENGTH":
      return `${r} ${unit}/м.п.`;
    case "PER_AREA_UNITS":
      return `${r} шт/м²`;
    case "FIXED":
      return `${r} шт на объект`;
    case "NONE":
      return "";
  }
}

export function formatNumber(n: number, maxFrac = 2): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: maxFrac });
}

export function formatPrice(n: number): string {
  if (n <= 0) return "Цена по запросу"; // цену заказчик ещё не выставил
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}
