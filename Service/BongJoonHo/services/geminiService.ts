import type { CinematicAnalysis, ViewState } from '../types';

export async function analyzeCurrentView(state: ViewState): Promise<CinematicAnalysis> {
  try {
    const response = await fetch('/api/bongjoonho/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload) {
      throw new Error(payload?.error || '봉준호 분석 요청에 실패했습니다.');
    }

    return {
      angle: String(payload.angle || ''),
      shotType: String(payload.shotType || ''),
      meaning: String(payload.meaning || ''),
      symbolism: String(payload.symbolism || ''),
      status: 'ACTIVE',
    };
  } catch (error) {
    console.error('Analysis failed:', error);
    return {
      angle: '분석 중...',
      shotType: '연결 확인',
      meaning: '데이터를 불러오는 중 오류가 발생했습니다.',
      symbolism: '조작을 멈추고 잠시 기다려주세요.',
      status: 'IDLE',
    };
  }
}
