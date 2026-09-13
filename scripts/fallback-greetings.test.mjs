import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackGreeting, FALLBACK_GREETINGS } from "../lib/fallback-greetings.ts";

test("fallback greetings contain exactly the twelve approved complete pairs", () => {
  const expected = [
    ["이 초대가 닿아 기쁩니다.", "저희의 새로운 시작에 모시고 싶습니다."],
    ["이 초대가 닿아 기쁩니다.", "저희 두 사람의 첫걸음을 함께해 주세요."],
    ["반가운 이름을 확인했습니다.", "저희 두 사람의 첫걸음을 함께해 주세요."],
    ["반가운 이름을 확인했습니다.", "좋은 날, 함께해 주시면 더없이 기쁘겠습니다."],
    ["좋은 소식을 전할 수 있어 기쁩니다.", "새로운 시작을 함께 축복해 주세요."],
    ["좋은 소식을 전할 수 있어 기쁩니다.", "저희의 새로운 시작에 모시고 싶습니다."],
    ["저희에게 소중한 순간이 찾아왔습니다.", "좋은 날, 함께해 주시면 더없이 기쁘겠습니다."],
    ["저희에게 소중한 순간이 찾아왔습니다.", "저희 두 사람의 첫걸음을 함께해 주세요."],
    ["설레는 마음으로 인사드립니다.", "저희 두 사람의 첫걸음을 함께해 주세요."],
    ["설레는 마음으로 인사드립니다.", "저희의 새로운 시작에 모시고 싶습니다."],
    ["저희의 기쁜 소식을 전합니다.", "새로운 시작을 함께 축복해 주세요."],
    ["저희의 기쁜 소식을 전합니다.", "좋은 날, 함께해 주시면 더없이 기쁘겠습니다."],
  ];
  assert.equal(FALLBACK_GREETINGS.length, 12);
  assert.deepEqual(FALLBACK_GREETINGS.map(({ firstLine, secondLine }) => [firstLine, secondLine]), expected);
});

test("one random choice returns one whole set without mixing lines", () => {
  for (let index = 0; index < FALLBACK_GREETINGS.length; index += 1) {
    let calls = 0;
    const greeting = createFallbackGreeting(() => {
      calls += 1;
      return (index + 0.5) / FALLBACK_GREETINGS.length;
    });
    assert.equal(calls, 1);
    assert.strictEqual(greeting, FALLBACK_GREETINGS[index]);
  }
});
