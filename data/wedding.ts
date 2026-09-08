import { publicAssetPath } from "@/lib/public-path";

export const weddingData = {
  groomName: "최종윤",
  brideName: "장민정",
  groomEnglishName: "JONGYOON",
  brideEnglishName: "MINJEONG",
  date: "2026.12.19.",
  weekday: "토요일",
  time: "오전 11시",
  venue: "성균관컨벤션웨딩홀",
  hall: "3층 스토리홀",
  groomFather: "최지현",
  groomMother: "강은주",
  brideFather: "장영근",
  brideMother: "손미숙",
  invitationMessage: `그리고 두 사람은 오래오래 행복하게 살았답니다.
는 아닐 거예요. 지금까지 그래왔던 것처럼요.

웃음이 많던 날도 있었고,
쉽지 않았던 날도 있었고,

그렇게 어느새 8번째 겨울을 함께 맞이했습니다.

완벽하진 않지만,
그래도 지금까지는 꽤 괜찮았으니

오늘은 그 '꽤 괜찮음'을
평생으로 늘려보려 합니다.

그 시작에, 편하게 함께해 주세요.`,
  missionCode: "JY-MJ-2026",
  mainImage: {
    src: publicAssetPath("/images/main/main.jpg"),
    alt: "최종윤 장민정의 메인 웨딩 사진",
  },
  galleryImages: [
    { src: publicAssetPath("/images/gallery/gallery-01.jpg"), alt: "최종윤·장민정 웨딩 사진 1" },
    { src: publicAssetPath("/images/gallery/gallery-02.jpg"), alt: "최종윤·장민정 웨딩 사진 2" },
    { src: publicAssetPath("/images/gallery/gallery-03.jpg"), alt: "최종윤·장민정 웨딩 사진 3" },
    { src: publicAssetPath("/images/gallery/gallery-04.jpg"), alt: "최종윤·장민정 웨딩 사진 4" },
    { src: publicAssetPath("/images/gallery/gallery-05.jpg"), alt: "최종윤·장민정 웨딩 사진 5" },
    { src: publicAssetPath("/images/gallery/gallery-06.jpg"), alt: "최종윤·장민정 웨딩 사진 6" },
    { src: publicAssetPath("/images/gallery/gallery-07.jpg"), alt: "최종윤·장민정 웨딩 사진 7" },
    { src: publicAssetPath("/images/gallery/gallery-08.jpg"), alt: "최종윤·장민정 웨딩 사진 8" },
    { src: publicAssetPath("/images/gallery/gallery-09.jpg"), alt: "최종윤·장민정 웨딩 사진 9" },
    { src: publicAssetPath("/images/gallery/gallery-10.jpg"), alt: "최종윤·장민정 웨딩 사진 10" },
    { src: publicAssetPath("/images/gallery/gallery-11.jpg"), alt: "최종윤·장민정 웨딩 사진 11" },
  ],
  location: {
    address: "서울 종로구 성균관로 31",
    lotAddress: "(명륜동 3가 53번지)",
    mapImage: {
      src: publicAssetPath("/images/location/venue-map.png"),
      alt: "성균관컨벤션웨딩홀 오시는 길 약도",
      width: 1448,
      height: 1086,
    },
    mapLinks: [
      {
        id: "naver",
        label: "네이버지도",
        url: "https://map.naver.com/p/search/%EC%84%B1%EA%B7%A0%EA%B4%80%EC%BB%A8%EB%B2%A4%EC%85%98%EC%9B%A8%EB%94%A9%ED%99%80",
      },
      {
        id: "kakao",
        label: "카카오맵",
        url: "https://map.kakao.com/link/search/%EC%84%B1%EA%B7%A0%EA%B4%80%EC%BB%A8%EB%B2%A4%EC%85%98%EC%9B%A8%EB%94%A9%ED%99%80",
      },
      { id: "tmap", label: "TMAP", url: "tmap://search" },
    ],
  },
  transportation: {
    subway: {
      title: "지하철",
      route: "4호선 혜화역 4번 출구",
      details: [
        { label: "셔틀버스", value: "T스토어 앞 · 7~10분 간격" },
        { label: "도보", value: "약 8~10분" },
      ],
    },
    bus: {
      title: "버스",
      stop: "명륜3가, 성대입구 하차",
      routes: [
        { label: "간선", numbers: ["100", "102", "104", "107", "140", "143", "150", "151", "160", "162", "171", "172", "272", "301", "710"] },
        { label: "지선", numbers: ["8101", "8111"] },
        { label: "광역", numbers: ["1101", "7101"] },
      ],
    },
    car: {
      title: "자가용",
      description: "'성균관컨벤션웨딩홀'을 검색해 주세요.",
    },
    parking: {
      title: "주차 안내",
      benefit: "2시간 무료 주차",
      description: "정문 안 주차팀의 안내를 따라 이용해 주세요.",
    },
  },
  accounts: {
    notice: "멀리서 축하해 주시는 분들을 위해\n작은 안내를 드리는 점 양해 부탁드립니다.",
    groom: [
      { role: "신랑", name: "최종윤", bank: "", accountNumber: "" },
      { role: "신랑 아버지", name: "최지현", bank: "", accountNumber: "" },
      { role: "신랑 어머니", name: "강은주", bank: "", accountNumber: "" },
    ],
    bride: [
      { role: "신부", name: "장민정", bank: "신한은행", accountNumber: "" },
      { role: "신부 아버지", name: "장영근", bank: "", accountNumber: "" },
      { role: "신부 어머니", name: "손미숙", bank: "", accountNumber: "" },
    ],
  },
  flowerNotice: [
    "화환은 정중히 사양합니다.",
    "축하해 주시는 마음만 감사히 받겠습니다.",
  ],
} as const;
