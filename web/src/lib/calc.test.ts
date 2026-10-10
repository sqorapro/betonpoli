import assert from "node:assert/strict";
import { test } from "node:test";
import { calcKit, packsNeeded } from "./calc";

// Значения сверены с КАЛЬКУЛЯТОРЫ.xlsx

test("PER_AREA: Краска ПУ, 593.12 м² × 0.7 кг / 30 кг → 14 вёдер", () => {
  assert.equal(packsNeeded({ type: "PER_AREA", rate: 0.7 }, { area: 593.12 }, 30), 14);
});

test("PER_AREA_MM: Ansaf 770 м² × 33 мм × 2.4 / 20 → 3050 мешков", () => {
  assert.equal(packsNeeded({ type: "PER_AREA_MM", rate: 2.4 }, { area: 770, thickness: 33 }, 20), 3050);
});

test("PER_AREA_MM без толщины → 0", () => {
  assert.equal(packsNeeded({ type: "PER_AREA_MM", rate: 2.4 }, { area: 770 }, 20), 0);
});

test("PER_LENGTH: плинтус Lincrete TX, 100 м.п. × 4 / 19.24 → 21", () => {
  assert.equal(packsNeeded({ type: "PER_LENGTH", rate: 4 }, { area: 100 }, 19.24), 21);
});

test("рулон на 100 м²: Хард 60 м² → 1 рулон", () => {
  assert.equal(packsNeeded({ type: "PER_AREA", rate: 1 }, { area: 60 }, 100), 1);
});

test("FIXED не зависит от площади", () => {
  assert.equal(packsNeeded({ type: "FIXED", rate: 8 }, { area: 1 }, 2.6), 8);
  assert.equal(packsNeeded({ type: "FIXED", rate: 8 }, { area: 10000 }, 2.6), 8);
});

test("ровное деление не даёт лишнюю упаковку", () => {
  // 0.1 * 3 = 0.30000000000000004
  assert.equal(packsNeeded({ type: "PER_AREA", rate: 0.1 }, { area: 3 }, 0.3), 1);
  assert.equal(packsNeeded({ type: "PER_AREA", rate: 0.6 }, { area: 100 }, 20), 3);
});

test("calcKit: Praspan Стандарт 46 м²", () => {
  const r = calcKit(
    [
      { key: "EP-C251", rule: { type: "PER_AREA", rate: 2.2 }, packAmount: 25, packPrice: 660 * 25 },
      { key: "EP-P150", rule: { type: "PER_AREA", rate: 0.6 }, packAmount: 20, packPrice: 745 * 20 },
    ],
    { area: 46 },
  );
  assert.deepEqual(r.items.map((i) => i.packs), [5, 2]);
  assert.equal(r.total, 5 * 16500 + 2 * 14900);
});
