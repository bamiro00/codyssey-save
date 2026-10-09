// Vercel에서는 같은 도메인의 /api 경로를 사용하고,
// 로컬 실행에서는 배포된 Render API에 직접 연결합니다.
window.K_BEAUTY_API_URL = window.location.hostname.endsWith(".vercel.app")
  ? window.location.origin
  : "https://k-beauty-ai-api.onrender.com";
