# Phase 4.7 — Selective Bake

## 문제
이전엔 UI 조작 전부 `_updateUniforms` → `baker.bake()` 호출. 대기·조명·링·회전·gas giant 같은 **runtime 파라미터**도 쓸데없이 3-pass bake를 트리거해서 슬라이더가 끊김.

## 수정
`src/ui.js`에 `BAKE_KEYS` Set 선언. Slider/select helper가 key 이름으로 자동 분기:
- `BAKE_KEYS.has(key)` → `updateFull()` (bake + uniform)
- 아니면 → `updateRuntime()` (uniform만)

### Bake 필요 키 (cubemap 영향)
`archetype`, `rockyMode`, `hue`, `amp`, `seaLevel`, `plateFreq`, `warp`,
`mountains`, `craters`, `craterL/M/S`, `normalStrength`, `crackFreq`,
`crackIntensity`, `lunarLightness`, `lunarSaturation`

### Bake 불필요 키 (runtime uniform만)
- 조명: `sunAz`, `sunEl`, `sunTemp`
- 대기/구름/링 전부
- 회전 전부
- Gas giant realtime: `bands`, `flowSpeed`, `stormDensity`, `stormSize`
- `polarCaps` (fragment에서 처리)

## 개선 체감
- 조명·대기·구름·링 슬라이더: 바로 부드러움 (bake 없음)
- 지형 슬라이더: 여전히 bake 트리거 (필요함). Phase 7 debounce로 이후 추가 개선 예정.

## 확인
- [ ] Sun azimuth 드래그 시 매끄럽게 조명 변화
- [ ] Cloud coverage/Haze/Scatter 등 대기 슬라이더 지연 없음
- [ ] Storm density 등 gas giant 슬라이더 즉시 반영
- [ ] Amplitude/Plate freq 등 지형 슬라이더는 여전히 bake (잠깐 멈칫)
