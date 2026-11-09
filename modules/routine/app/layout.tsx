import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'루틴 160 · 개인 대시보드',description:'운동, 식사, 회복을 기록하는 개인용 로컬 대시보드'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
