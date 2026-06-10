"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO, getDay } from "date-fns";

interface Reservation {
  id: string;
  date: string;
  time: string;
  patientName: string;
  treatment: string;
  symptom: string;
  status: string;
}

function PrintContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isReady, setIsReady] = useState(false);

  const selectedDate = dateParam || format(new Date(), "yyyy-MM-dd");
  const isSaturday = getDay(parseISO(selectedDate)) === 6;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hanui_reservations");
      if (saved) {
        const parsed = JSON.parse(saved) as Reservation[];
        setReservations(parsed);
      }
    } catch (e) {
      console.error("Failed to load reservations for print");
    }
    setIsReady(true);
  }, []);

  const dailyReservations = reservations.filter((r) => r.date === selectedDate);

  // Generate display times (same logic as main app)
  let sections: { title: string; times: string[] }[] = [];

  if (isSaturday) {
    const satBase = [
      "09:50", "10:00", "10:15", "10:30", "10:45",
      "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30",
    ];
    const satDisplay = Array.from(
      new Set([
        ...satBase,
        ...dailyReservations
          .map((r) => r.time)
          .filter((t) => t >= "09:00" && t <= "13:00"),
      ])
    ).sort();

    sections = [
      {
        title: "토요일 진료 (09:50 ~ 12:30, 15분 간격)",
        times: satDisplay,
      },
    ];
  } else {
    const morningBase = ["10:30", "10:45", "11:00", "11:15", "11:30"];
    const afternoonBase = [
      "14:00", "14:20", "14:40",
      "15:00", "15:20", "15:40",
      "16:00", "16:20", "16:40",
      "17:00", "17:20", "17:40",
      "18:00", "18:20", "18:40",
      "19:00",
    ];

    const morningDisplay = Array.from(
      new Set([
        ...morningBase,
        ...dailyReservations
          .map((r) => r.time)
          .filter((t) => t < "14:00"),
      ])
    ).sort();

    const afternoonDisplay = Array.from(
      new Set([
        ...afternoonBase,
        ...dailyReservations
          .map((r) => r.time)
          .filter((t) => t >= "14:00"),
      ])
    ).sort();

    sections = [
      {
        title: "오전 진료 (10:30 ~ 11:30, 15분 간격)",
        times: morningDisplay,
      },
      {
        title: "오후 진료 (14:00 ~ 19:00, 20분 간격)",
        times: afternoonDisplay,
      },
    ];
  }

  const weekday = ["일", "월", "화", "수", "목", "금", "토"][
    parseISO(selectedDate).getDay()
  ];
  const formattedDate = format(parseISO(selectedDate), "yyyy년 M월 d일");

  const handlePrint = () => {
    window.print();
  };

  if (!isReady) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-[10pt] leading-tight print:p-2 print:pt-1 print:pb-3 print:m-0">
      {/* Screen controls - hidden when printing */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <div className="text-lg font-semibold">인쇄 미리보기</div>
          <div className="text-xs text-gray-500">
            이 페이지가 인쇄에 최적화되어 있습니다.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="rounded bg-[#0f766e] px-5 py-2 text-sm font-medium text-white hover:bg-[#115e59]"
          >
            인쇄하기
          </button>
          <button
            onClick={() => window.close()}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Actual printable content */}
      <div className="mx-auto max-w-[210mm] print-area">
        {/* Print header */}
        <div className="mb-4 text-center">
          <div className="text-xl font-bold tracking-tighter">우리한의원</div>
          <div className="mt-0.5 text-sm font-semibold">
            진료 시간표 — {formattedDate} ({weekday})
          </div>
        </div>

        {/* Schedule sections */}
        {sections.map((section, index) => (
          <div key={index} className="mb-7 print:mb-3">
            <div className="mb-1.5 text-sm font-semibold text-[#0f766e]">
              {section.title}
            </div>

            <table className="w-full border-collapse border border-gray-400 text-[10pt]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="w-[68px] border border-gray-400 px-3 py-2 text-left font-medium">
                    시간
                  </th>
                  <th className="border border-gray-400 px-3 py-2 text-left font-medium">
                    환자명
                  </th>
                  <th className="border border-gray-400 px-3 py-2 text-left font-medium">
                    진료내역
                  </th>
                </tr>
              </thead>
              <tbody>
                {section.times.map((time) => {
                  const slotRes = dailyReservations.filter((r) => r.time === time);
                  if (slotRes.length === 0) {
                    return (
                      <tr key={time} className="align-top">
                        <td className="border border-gray-300 px-3 py-2 font-mono text-[10pt]">
                          {time}
                        </td>
                        <td className="border border-gray-300 px-3 py-2"></td>
                        <td className="border border-gray-300 px-3 py-2"></td>
                      </tr>
                    );
                  }
                  return slotRes.map((res, idx) => (
                    <tr key={res.id} className="align-top">
                      <td className="border border-gray-300 px-3 py-2 font-mono text-[10pt]">
                        {idx === 0 ? time : ""}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {res.patientName}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {`${res.treatment} · ${res.symptom}`}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        ))}

        <div className="mt-3 print:mt-1 text-center text-[9pt] text-gray-500">
          본 시간표는 내부 참고용입니다.
        </div>
      </div>

      {/* Screen-only hint */}
      <div className="mt-8 text-center text-xs text-gray-400 print:hidden">
        인쇄하기 버튼을 누르면 깔끔하게 한 페이지로 정리되어 출력됩니다.
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">로딩 중...</div>}>
      <PrintContent />
    </Suspense>
  );
}
