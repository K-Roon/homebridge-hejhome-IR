# homebridge-hejhome-IR
### Hejhome IR. 스마트 리모컨을 더 스마트하게 활용하는 방법.
[![npm version](https://badge.fury.io/js/%40k-roon%2Fhomebridge-hejhome-ir.svg)](https://badge.fury.io/js/%40k-roon%2Fhomebridge-hejhome-ir)
[![homebridge verified](https://img.shields.io/badge/homebridge-verified-brightgreen)](https://github.com/homebridge/homebridge)
[![license](https://img.shields.io/github/license/K-Roon/homebridge-hejhome-ir)](./LICENSE)

---

## ✨ 주요 특징

* **간편하게 설정하고, Siri에게 바로 요청.**
  * Homebridge 플러그인 설치 후 Hejhome ID, Password만 입력하면 자동 로그인, 계속 로그인 되도록 알아서 연결.
  * Apple Home 앱에서 간단하게 설정만 해주면, Siri가 알아서 해주니까.
  * Aple Home 앱에서 자동화까지 설정해준다면 금상첨화.
* **간편하게. 그러나 더욱 안전하게.**
   * **ID / PW 입력**만으로 간편하게. **OAuth 2.0**(HEJ SQUARE) 기반으로 더욱 안전해진 연결.
* **쓰고싶은 기기만. 이름만 알려주면 알아서. (추후 지원 예정)**
  * ~~`deviceNames` 배열로 **원하는 IR 기기만** HomeKit에 노출~~
* **번역기 필요 없이. 영어 필요 없이. 직관적인 UI.**
  * 한국어로 시작하고, 한국어로 설정하고.

> **참고**
> * Hejhome 앱에 회원가입 및 로그인이 필요하며, Hejhome IR 신호 전송기기를 별도로 구매하시고 가입한 Hejhome 계정으로 연결, IR 기기 등록까지 모두 마치셔야 합니다.<br>
> * Apple Home 특성 상, Apple Home을 지원하는 네트워크 허브(대표적으로 Apple TV(2세대 이후) 혹은 homePod) 및 Homebridge가 설치된 기기와 동일한 네트워크에 연결되어 있어야 합니다. 만약 허브가 없는 경우, Homebridge 서버와 동일한 Wi-Fi 네트워크에 연결된 경우에만 제어가 가능합니다.<br>
> * IR 신호전송기기의 네트워크 연결은 필수이며, 연결이 안정적이여야 합니다. 단, IR은 Homebridge에 연결된 Wi-Fi에 연결하지 않아도 사용 가능합니다.<br>
> * Hejhome 에서 공개한 방식으로서 작동됩니다. Hejhome 서버를 거쳐서 요청이 전송되기 떄문에, 지연이 발생할 수 있습니다. Hejhome 서버가 불안정할 경우 기기의 정상작동을 보장하지 않습니다.<br>
> * IR 신호전송기기 특성상, IR 신호를 Apple Home 앱에서 전송해주는 기능까지만 가능합니다. 실시간으로 Device의 정보를 가져오지 않습니다.<br>
> * UI만 한국어만 지원하며, 로그 등 작동 상세 내용은 영문으로 표기될 수 있습니다.<br>
> * Homebridge 특성 상 온전한 한국어 지원이 되지 않아, 일부 버튼에서 "추가하기" 버튼이 "ADD TO" 같은 영문으로 버튼이 표시될 수 있습니다.<br>
> * Apple Home 및 Homebridge 특성 상 지원되는 기기가 한정되어 있습니다. 자세한 기기는 아래 "지원 기기"를 참고하세요.
---

## 📦 지원 기기 (스마트 리모컨 제품 구매 후 계정연결 필수!)

| 아이콘 | 기기 종류        |  지원 상태 | 비고                                 |
| :-: | :----------- | :----: | :--------------------------------- |
|  ❄️ | **IR 에어컨**   |  ✅ 지원  | 전원 / 온도 / 풍속 / 모드 전환 모두 가능         |
|  💡 | **IR 램프**    | ⚠️ 미지원 | Hejhome 측 서버 문제로 인한 작동 불가 |
|  🌀 | **IR 선풍기**   | ⚠️ 미지원 | Hejhome 측 서버 문제로 인한 작동 불가 |
| 🌬️ | **IR 공기청정기** |  ✅ 지원  | 전원 / 풍속 |
|  📺 | **IR TV**    |  ✅ 지원  | 전원 / 입력소스 / 볼륨 (채널 조절 불가, 볼륨 조절은 Apple 內 리모컨 앱에서 가능) |

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
