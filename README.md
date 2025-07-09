# @K-Roon/homebridge-hejhome-IR

현재 버전: **0.0.2** (Homebridge 플러그인 등록 완료)

한국어가 지원되는 Homebridge IR 서비스입니다. 아래 단계에 따라 Homebridge와 헤이홈(Hejhome)을 시작할 수 있는 기본 환경을 구축할 수 있습니다.

현재 버전에서는 다음과 같은 5가지 IR 기기 종류를 지원합니다.

- IR 에어컨
- IR 선풍기
- IR Lamp
- IR 공기청정기
- IR TV

플러그인은 Homebridge UI에서 ID와 비밀번호를 입력할 수 있는 간단한 로그인 화면을 제공합니다.

## 기본 환경 준비

1. **Node.js 설치**
   - Homebridge를 사용하려면 Node.js 16 이상이 필요합니다.
   - 운영체제에 맞는 Node.js를 설치합니다.

2. **Homebridge 설치**
   ```bash
   sudo npm install -g homebridge
   ```

3. **Hejhome 플러그인 설치**
   - NPM을 사용해 이 저장소의 플러그인을 전역으로 설치합니다.
   ```bash
   sudo npm install -g @K-Roon/homebridge-hejhome-IR
   ```

4. **Homebridge 설정**
   - 홈브리지의 설정 파일(`~/.homebridge/config.json`)에 Hejhome 플러그인을 추가합니다.
   - 예시:
   ```json
   {
     "platforms": [
       {
         "platform": "HejhomeIR",
         "name": "Hejhome IR",
         "host": "http://localhost:8080",
         "username": "YOUR_ID",
         "password": "YOUR_PASSWORD"
       }
     ]
   }
   ```

5. **Homebridge 실행**
   ```bash
   homebridge
   ```

실행 후 웹 UI 또는 로그에서 Hejhome 플랫폼이 정상적으로 로드되는지 확인합니다.

이 플러그인은 Homebridge 플러그인 레지스트리에 등록되어 있어 npm을 통해 설치할 수 있습니다.
