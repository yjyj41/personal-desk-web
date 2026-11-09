import {validate, type Data} from './routine.ts';

export type SavedState = {data: Data | null; revision: number};
export interface StateStore {
  accountLabel: string;
  load(): Promise<SavedState>;
  save(data: Data, revision: number): Promise<number>;
  logout(): Promise<void>;
  subscribe?(changed: (revision: number) => void, failed: () => void): () => void;
}
export const conflictMessage = '다른 기기에서 기록이 변경되었습니다. 입력창을 닫고 최신 기록을 불러온 뒤 다시 저장하세요. 현재 입력은 유지했습니다.';
export const sitesStore: StateStore = {
  accountLabel: 'ChatGPT',
  async load() {
    const res = await fetch('/api/state', {cache: 'no-store'});
    if (!res.ok) throw Error('기록을 불러오지 못했습니다. 로그인과 연결 상태를 확인하세요.');
    const value = await res.json() as SavedState;
    return {data: value.data ? validate(value.data) : null, revision: value.revision};
  },
  async save(data, revision) {
    const res = await fetch('/api/state', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({data, revision})});
    if (res.status === 409) throw Error(conflictMessage);
    if (!res.ok) throw Error('저장하지 못했습니다. 연결 상태를 확인하고 다시 시도하세요.');
    return (await res.json() as {revision:number}).revision;
  },
  async logout() {window.location.assign('/signout-with-chatgpt?return_to=%2F');},
};
