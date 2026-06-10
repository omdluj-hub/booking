"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Search,
  Users,
  ArrowLeft,
  Download,
  X,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Types (subset of main app)
type Status = "pending" | "confirmed" | "completed" | "cancelled";

interface Reservation {
  id: string;
  date: string;
  time: string;
  patientName: string;
  phone: string;
  birthDate: string;
  gender: "남" | "여";
  doctor: string;
  treatment: string;
  symptom: string;
  status: Status;
  notes?: string;
  createdAt: string;
}

interface PatientRecord {
  name: string;
  visits: Reservation[];
  visitCount: number;
  lastVisit: string;
  lastTime: string;
  firstVisit: string;
  treatments: Record<string, number>;
}

// Helper to map Supabase snake_case row to camelCase
function mapSupabaseRow(row: any): Reservation {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    patientName: row.patient_name,
    phone: row.phone || "",
    birthDate: row.birth_date || "",
    gender: (row.gender as "남" | "여") || "여",
    doctor: row.doctor || "",
    treatment: row.treatment,
    symptom: row.symptom,
    status: row.status as Status,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export default function PatientRecordsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<
    "checking" | "connected" | "fallback"
  >("checking");
  const [search, setSearch] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"recent" | "count" | "name">("recent");

  // Load all reservations from Supabase (no seed data)
  useEffect(() => {
    const loadAll = async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (error) {
        console.error("Error loading patient data from Supabase:", error);
        setReservations([]);
        setSupabaseStatus("fallback");
        setIsLoaded(true);
        return;
      }

      const mapped = (data || []).map(mapSupabaseRow);
      setReservations(mapped);
      setSupabaseStatus("connected");
      setIsLoaded(true);
    };

    loadAll();
  }, []);

  // Aggregate into patient records
  const patientRecords = useMemo(() => {
    const byName = new Map<string, Reservation[]>();

    reservations.forEach((r) => {
      const nm = r.patientName.trim();
      if (!byName.has(nm)) byName.set(nm, []);
      byName.get(nm)!.push(r);
    });

    let list: PatientRecord[] = Array.from(byName.entries()).map(
      ([name, visits]) => {
        const sortedVisits = [...visits].sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.time.localeCompare(a.time);
        });

        const last = sortedVisits[0];
        const first = [...visits].sort((a, b) =>
          a.date.localeCompare(b.date)
        )[0];

        const treatCount: Record<string, number> = {};
        visits.forEach((v) => {
          treatCount[v.treatment] = (treatCount[v.treatment] || 0) + 1;
        });

        return {
          name,
          visits: sortedVisits,
          visitCount: visits.length,
          lastVisit: last.date,
          lastTime: last.time,
          firstVisit: first.date,
          treatments: treatCount,
        };
      }
    );

    // Apply sort
    if (sortMode === "recent") {
      list = list.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
    } else if (sortMode === "count") {
      list = list.sort((a, b) => b.visitCount - a.visitCount || a.name.localeCompare(b.name));
    } else {
      list = list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [reservations, sortMode]);

  // Filtered + searched
  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patientRecords;
    return patientRecords.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
  }, [patientRecords, search]);

  const totalVisits = useMemo(
    () => filteredPatients.reduce((sum, p) => sum + p.visitCount, 0),
    [filteredPatients]
  );

  // Currently selected patient detail
  const selectedPatient = useMemo(() => {
    if (!selectedPatientName) return null;
    return patientRecords.find((p) => p.name === selectedPatientName) || null;
  }, [selectedPatientName, patientRecords]);

  // Export current filtered patients (all their visits) as CSV
  function exportFilteredCSV() {
    if (filteredPatients.length === 0) {
      toast.error("내보낼 환자 내역이 없습니다.");
      return;
    }

    const headers = [
      "환자명",
      "예약일",
      "시간",
      "진료내용",
      "기타",
      "상태",
    ];

    const rows: string[][] = [];

    filteredPatients.forEach((p) => {
      p.visits.forEach((v) => {
        rows.push([
          p.name,
          v.date,
          v.time,
          v.treatment,
          v.symptom,
          v.status,
        ]);
      });
    });

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `환자내역_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${filteredPatients.length}명 환자의 ${rows.length}건 방문 내역을 CSV로 내보냈습니다.`);
  }

  // Export only the selected patient's visits
  function exportSelectedPatientCSV() {
    if (!selectedPatient) return;

    const headers = ["예약일", "시간", "진료내용", "기타", "상태"];
    const rows = selectedPatient.visits.map((v) => [
      v.date,
      v.time,
      v.treatment,
      v.symptom,
      v.status,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `환자내역_${selectedPatient.name.replace(/\s+/g, "")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${selectedPatient.name} 환자의 ${rows.length}건 내역을 CSV로 내보냈습니다.`);
  }

  function closeDetail() {
    setSelectedPatientName(null);
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400">불러오는 중...</div>
      </div>
    );
  }

  const weekday = (dateStr: string) =>
    ["일", "월", "화", "수", "목", "금", "토"][parseISO(dateStr).getDay()];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - consistent with main app */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-1 sm:py-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0f766e] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-base sm:text-xl tracking-tighter text-slate-900 whitespace-nowrap break-keep">
                후한의원 구미점
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 -mt-1">환자 내역</div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 sm:gap-2 border border-slate-200 hover:bg-slate-50 px-2 sm:px-4 h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-medium text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">예약 시간표</span>
              <span className="sm:hidden">시간표</span>
            </Link>
            <button
              onClick={exportFilteredCSV}
              className="flex items-center gap-1.5 sm:gap-2 border border-slate-200 hover:bg-slate-50 px-2 sm:px-4 h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-medium text-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV 내보내기</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Supabase status warning (consistent with main) */}
        {supabaseStatus === "fallback" && (
          <div className="mb-4 p-4 bg-red-600 text-white rounded-lg text-sm font-bold border-2 border-red-800">
            ⚠️ Supabase 연결 실패 — 환자 내역을 불러올 수 없습니다.<br />
            <span className="font-normal">Vercel 대시보드에서 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY (Production) 환경 변수를 확인하고 재배포하세요.</span>
          </div>
        )}

        {/* Title + search */}
        <div className="mb-5">
          <h1 className="text-3xl font-semibold tracking-tighter text-slate-900 mb-1">
            환자 내역
          </h1>
          <p className="text-slate-500 text-sm">
            전체 예약 기록에서 환자별 방문 이력과 진료 내용을 확인하세요
          </p>
        </div>

        {/* Search and controls */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="환자명 검색 (예: 김영희)"
              className="input w-full h-11 pl-10 text-base"
            />
          </div>

          {/* Sort controls */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm shrink-0">
            <button
              onClick={() => setSortMode("recent")}
              className={`px-3 py-2 transition-colors ${sortMode === "recent" ? "bg-[#0f766e] text-white font-medium" : "hover:bg-slate-50"}`}
            >
              최근 방문순
            </button>
            <button
              onClick={() => setSortMode("count")}
              className={`px-3 py-2 border-l border-slate-200 transition-colors ${sortMode === "count" ? "bg-[#0f766e] text-white font-medium" : "hover:bg-slate-50"}`}
            >
              방문 횟수순
            </button>
            <button
              onClick={() => setSortMode("name")}
              className={`px-3 py-2 border-l border-slate-200 transition-colors ${sortMode === "name" ? "bg-[#0f766e] text-white font-medium" : "hover:bg-slate-50"}`}
            >
              이름순
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600">
            검색 결과 <span className="font-semibold text-slate-900">{filteredPatients.length}</span>명 환자
          </div>
          <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600">
            총 <span className="font-semibold text-slate-900">{totalVisits}</span>회 방문
          </div>
        </div>

        {/* Patient list */}
        {filteredPatients.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
            <Users className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <div className="text-slate-500">일치하는 환자가 없습니다.</div>
            <div className="text-xs text-slate-400 mt-1">검색어를 변경해보세요.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPatients.map((patient) => {
              const lastDate = parseISO(patient.lastVisit);
              const topTreatments = Object.entries(patient.treatments)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              return (
                <div
                  key={patient.name}
                  onClick={() => setSelectedPatientName(patient.name)}
                  className="group bg-white border border-slate-200 hover:border-slate-300 active:bg-slate-50 transition-colors rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xl text-slate-900 tracking-tight">
                        {patient.name}
                      </span>
                      <span className="inline-flex items-center justify-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#0f766e] text-white">
                        {patient.visitCount}회
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      최근 방문{" "}
                      <span className="font-medium tabular-nums text-slate-800">
                        {format(lastDate, "yyyy.MM.dd")} ({weekday(patient.lastVisit)}) {patient.lastTime}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600 sm:text-right sm:min-w-[220px]">
                    {topTreatments.length > 0 ? (
                      <span>
                        {topTreatments
                          .map(([t, c]) => `${t} ${c}회`)
                          .join(" · ")}
                        {Object.keys(patient.treatments).length > 3 && (
                          <span className="text-slate-400"> 외</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">진료 기록 없음</span>
                    )}
                  </div>

                  <div className="shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatientName(patient.name);
                      }}
                      className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-white group-hover:bg-white transition-colors"
                    >
                      상세 보기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-slate-400">
          브라우저에서 보는 모든 데이터는 Supabase에 저장된 실제 예약 기록입니다.
        </div>
      </main>

      {/* Patient detail modal */}
      {selectedPatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeDetail}
        >
          <div
            className="modal bg-white w-full max-w-[820px] rounded-2xl shadow-xl border overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-5 border-b flex items-start justify-between bg-white">
              <div>
                <div className="font-semibold text-2xl tracking-tight flex items-center gap-2">
                  {selectedPatient.name}
                  <span className="text-sm font-medium px-3 py-0.5 rounded-full bg-[#0f766e] text-white align-middle">
                    {selectedPatient.visitCount}회
                  </span>
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  첫 방문 {format(parseISO(selectedPatient.firstVisit), "yyyy.MM.dd")} · 
                  최근 {format(parseISO(selectedPatient.lastVisit), "yyyy.MM.dd")} ({weekday(selectedPatient.lastVisit)})
                </div>
              </div>
              <button
                onClick={closeDetail}
                className="p-1 text-slate-400 hover:text-slate-600 mt-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Treatment summary */}
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-2">진료 프로그램별 방문 횟수</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedPatient.treatments)
                    .sort((a, b) => b[1] - a[1])
                    .map(([treatment, count]) => (
                      <div
                        key={treatment}
                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                      >
                        {treatment} <span className="font-semibold text-slate-900">{count}회</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Full visit history */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-600">
                    전체 방문 내역 (최근 순)
                  </div>
                  <div className="text-xs text-slate-400">
                    총 {selectedPatient.visits.length}건
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-left">
                        <th className="px-4 py-2.5 font-medium w-28">날짜</th>
                        <th className="px-4 py-2.5 font-medium w-16 text-center">시간</th>
                        <th className="px-4 py-2.5 font-medium">진료내용</th>
                        <th className="px-4 py-2.5 font-medium">기타 (방문 사유)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPatient.visits.map((v, idx) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-700 whitespace-nowrap">
                            {format(parseISO(v.date), "yyyy.MM.dd")} ({weekday(v.date)})
                          </td>
                          <td className="px-4 py-2.5 font-mono text-center text-slate-700">{v.time}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{v.treatment}</td>
                          <td className="px-4 py-2.5 text-slate-600">{v.symptom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal footer actions */}
            <div className="border-t px-6 py-4 bg-slate-50 flex flex-col sm:flex-row gap-2 justify-between items-center">
              <div className="text-xs text-slate-500 order-2 sm:order-1">
                이 환자의 예약은 메인 페이지에서 직접 등록/수정하세요.
              </div>
              <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                <button
                  onClick={exportSelectedPatientCSV}
                  className="flex-1 sm:flex-none px-4 h-10 rounded-xl border text-sm font-medium hover:bg-white flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> 이 환자 CSV
                </button>
                <Link
                  href="/"
                  className="flex-1 sm:flex-none px-4 h-10 rounded-xl bg-[#0f766e] hover:bg-[#115e59] text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" /> 예약 시간표로 이동
                </Link>
                <button
                  onClick={closeDetail}
                  className="flex-1 sm:flex-none px-4 h-10 rounded-xl border text-sm font-medium hover:bg-white"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
