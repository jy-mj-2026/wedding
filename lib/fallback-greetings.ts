export type FallbackGreeting = { firstLine: string; secondLine: string };

export const FALLBACK_GREETINGS: readonly FallbackGreeting[] = [
  {
    firstLine: "이 초대가 닿아 기쁩니다.",
    secondLine: "저희의 새로운 시작에 모시고 싶습니다.",
  },
  {
    firstLine: "이 초대가 닿아 기쁩니다.",
    secondLine: "저희 두 사람의 첫걸음을 함께해 주세요.",
  },
  {
    firstLine: "반가운 이름을 확인했습니다.",
    secondLine: "저희 두 사람의 첫걸음을 함께해 주세요.",
  },
  {
    firstLine: "반가운 이름을 확인했습니다.",
    secondLine: "좋은 날, 함께해 주시면 더없이 기쁘겠습니다.",
  },
  {
    firstLine: "좋은 소식을 전할 수 있어 기쁩니다.",
    secondLine: "새로운 시작을 함께 축복해 주세요.",
  },
  {
    firstLine: "좋은 소식을 전할 수 있어 기쁩니다.",
    secondLine: "저희의 새로운 시작에 모시고 싶습니다.",
  },
  {
    firstLine: "저희에게 소중한 순간이 찾아왔습니다.",
    secondLine: "좋은 날, 함께해 주시면 더없이 기쁘겠습니다.",
  },
  {
    firstLine: "저희에게 소중한 순간이 찾아왔습니다.",
    secondLine: "저희 두 사람의 첫걸음을 함께해 주세요.",
  },
  {
    firstLine: "설레는 마음으로 인사드립니다.",
    secondLine: "저희 두 사람의 첫걸음을 함께해 주세요.",
  },
  {
    firstLine: "설레는 마음으로 인사드립니다.",
    secondLine: "저희의 새로운 시작에 모시고 싶습니다.",
  },
  {
    firstLine: "저희의 기쁜 소식을 전합니다.",
    secondLine: "새로운 시작을 함께 축복해 주세요.",
  },
  {
    firstLine: "저희의 기쁜 소식을 전합니다.",
    secondLine: "좋은 날, 함께해 주시면 더없이 기쁘겠습니다.",
  },
];

export function createFallbackGreeting(random: () => number = Math.random): FallbackGreeting {
  const index = Math.floor(random() * FALLBACK_GREETINGS.length);
  return FALLBACK_GREETINGS[index];
}
