export const ORDER_STATUS = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  DONE: "Выполнена",
  CANCELLED: "Отменена",
} as const;

export const DELIVERY = { PICKUP: "Самовывоз", DELIVERY: "Доставка" } as const;

export const STOCK = { IN_STOCK: "В наличии", ON_ORDER: "Под заказ", OUT_OF_STOCK: "Нет в наличии" } as const;

export const CONSUMPTION = {
  NONE: "Без калькулятора",
  PER_AREA: "кг (л) на 1 м²",
  PER_AREA_MM: "кг на 1 м² на 1 мм толщины",
  PER_LENGTH: "кг на 1 погонный метр",
  PER_AREA_UNITS: "упаковок на 1 м²",
  FIXED: "фиксированное число упаковок",
} as const;

export const PACK_UNIT = { KG: "кг", L: "л", PCS: "шт", M: "м" } as const;

export const ATTRIBUTE_TYPE = {
  NUMBER: "Число (фильтр от–до)",
  SELECT: "Список (фильтр галочками)",
  TEXT: "Текст (без фильтра)",
} as const;

export const fmtDate = (d: Date) =>
  d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
