# homebridge-hejhome-IR

[![npm version](https://badge.fury.io/js/%40k-roon%2Fhomebridge-hejhome-ir.svg)](https://badge.fury.io/js/%40k-roon%2Fhomebridge-hejhome-ir)
[![homebridge verified](https://img.shields.io/badge/homebridge-verified-brightgreen)](https://github.com/homebridge/homebridge)
[![license](https://img.shields.io/github/license/K-Roon/homebridge-hejhome-ir)](./LICENSE)

> **한국어가 지원되는 Homebridge IR 서비스 플러그인입니다.** 헤이홈(Hejhome) IR 리모컨 허브로 제어하는 가전 제품을 **Apple HomeKit**에 손쉽게 통합할 수 있습니다.

---

## ✨ 주요 특징

* **OAuth 2.0**(Hej Square) 기반 원클릭 로그인 및 자동 토큰 갱신
* Web UI에서 **ID / PW 입력**만으로 간단 설정
* ~~`deviceNames` 배열로 **원하는 IR 기기만** HomeKit에 노출~~ (해당 사항은 추후 진행 예정)
* 한국어, 영어 UI 지원 & TypeScript 기반 안정적 코드베이스

---

## 📦 지원 IR 기기

| 아이콘 | 기기 종류        |  지원 상태 | 비고                                 |
| :-: | :----------- | :----: | :--------------------------------- |
|  ❄️ | **IR 에어컨**   |  ✅ 지원  | 전원 / 온도 / 풍속 / 모드 전환 모두 가능         |
|  💡 | **IR 램프**    | ⚠️ 미지원 | Hejhome 측 서버 문제로 인한 작동 불가 |
|  🌀 | **IR 선풍기**   | ⚠️ 미지원 | Hejhome 측 서버 문제로 인한 작동 불가 |
| 🌬️ | **IR 공기청정기** |  ✅ 지원  | 전원 / 풍속 |
|  📺 | **IR TV**    |  ✅ 지원  | 전원 / 입력소스 / 볼륨 (채널 조절 불가, 볼륨 조절은 리모컨 앱에서 가능) |

> **참고 사항**  램프·선풍기는 현재 Hejhome API 문제로 플러그인이 신호를 전송해도 장치가 반응하지 않습니다. Hejhome 측의 서버 오류(500)인 것으로 확인되었습니다.

---

## 🚀 빠른 시작

### 1️⃣ Node.js 설치

Homebridge 및 본 플러그인은 **Node.js LTS 20.x 이상**에서 테스트되었습니다. OS별 설치 방법은 [Homebridge Wiki](https://github.com/homebridge/homebridge/wiki/How-To-Update-Node.js)를 참고하세요.

### 2️⃣ Homebridge 설치

```bash
sudo npm install -g homebridge
```

### 3️⃣ 플러그인 설치

```bash
sudo npm install -g @k-roon/homebridge-hejhome-ir
```

### 4️⃣ `config.json` 예시

```json
{
  "platforms": [
    {
      "platform": "HejhomeIR",
      "name": "Hejhome IR",
      "host": "http://localhost:8080",
      "credentials": {
        "email": "YOUR_ID",
        "password": "YOUR_PASSWORD"
      },
      "deviceNames": ["거실 에어컨", "안방 TV"]
    }
  ]
}
```

### 5️⃣ Homebridge 실행

```bash
homebridge
```

실행 후 Homebridge UI(`http://<IP>:8581`) 또는 터미널 로그에서 **Hejhome IR** 플랫폼이 정상적으로 로드되는지 확인하세요.

---

## 🛠️ 문제 해결

| 증상                                           | 원인 / 해결 방법                                                   |
| -------------------------------------------- | ------------------------------------------------------------ |
| 기기가 HomeKit에 보이지 않음                          | `deviceNames` 값이 **Hejhome 앱의 실제 장치 이름**과 정확히 일치하는지 확인       |
| 램프·선풍기가 작동하지 않음                              | Hejhome OPEN API 서버 오류로 이슈 해소될 때 까지 이용 불가   |
| "Cannot add a Service with the same UUID" 오류 | 동일 UUID 서비스가 중복 등록됨 → `subtype` 지정 또는 `deviceNames` 목록 중복 제거 |

---

## 📝 변경 내역

> 자세한 변경 사항은 [CHANGELOG](./CHANGELOG.md)를 참조하세요.

* **v1.1.3** : 서비스 안정화 및 TV 기기가 TV로서 보이지 않는 Issue 수정, Apple Home 앱에서 선풍기 회전 버튼 Dissappear Issue 수정

---

## 📄 라이선스

```
Apache-2.0 License © 2025 K‑Roon
```
> API 접근방식 등 일부 코드는 [homebridge-hejhome](https://github.com/chazepps/homebridge-hejhome) 프로젝트를 참고했습니다.
