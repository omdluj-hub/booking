"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Download,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  X,
  Eye,
} from "lucide-react";
import { format, parseISO, addDays, subDays, startOfMonth, endOfMonth, addMonths, subMonths, getDay } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Types
type Status = "pending" | "confirmed" | "completed" | "cancelled";

interface Reservation {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  patientName: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
  gender: "남" | "여";
  doctor: string;
  treatment: string;
  symptom: string;
  status: Status;
  notes?: string;
  createdAt: string;
}

const STATUS_LABEL: Record<Status, string> = {
  pending: "대기",
  confirmed: "확정",
  completed: "완료",
  cancelled: "취소",
};

const STATUS_COLOR: Record<Status, string> = {
  pending: "status-pending",
  confirmed: "status-confirmed",
  completed: "status-completed",
  cancelled: "status-cancelled",
};

const TREATMENTS = ["피부", "다이어트", "자보", "기타"];

// Generate realistic seed data
function generateSeedData(): Reservation[] {
  const today = new Date();
  const seed: Reservation[] = [
    {
      id: "RES-250409-001",
      date: format(subDays(today, 2), "yyyy-MM-dd"),
      time: "09:30",
      patientName: "김영희",
      phone: "010-2345-6789",
      birthDate: "1978-05-12",
      gender: "여",
      doctor: "김민수 한의사",
      treatment: "침구치료",
      symptom: "허리 통증, 좌골신경통",
      status: "completed",
      notes: "3회차 치료. 호전 중",
      createdAt: format(subDays(today, 3), "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-002",
      date: format(subDays(today, 1), "yyyy-MM-dd"),
      time: "10:00",
      patientName: "박철수",
      phone: "010-3456-7890",
      birthDate: "1965-11-03",
      gender: "남",
      doctor: "이서현 한의사",
      treatment: "한약 처방",
      symptom: "소화불량, 피로감",
      status: "completed",
      createdAt: format(subDays(today, 2), "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-003",
      date: format(today, "yyyy-MM-dd"),
      time: "09:00",
      patientName: "정미경",
      phone: "010-4567-8901",
      birthDate: "1982-02-28",
      gender: "여",
      doctor: "박준호 한의사",
      treatment: "추나요법",
      symptom: "목·어깨 결림",
      status: "confirmed",
      createdAt: format(subDays(today, 1), "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-004",
      date: format(today, "yyyy-MM-dd"),
      time: "10:30",
      patientName: "이준호",
      phone: "010-5678-9012",
      birthDate: "1990-07-15",
      gender: "남",
      doctor: "김민수 한의사",
      treatment: "침구치료",
      symptom: "만성 두통",
      status: "confirmed",
      createdAt: format(subDays(today, 1), "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-005",
      date: format(today, "yyyy-MM-dd"),
      time: "14:00",
      patientName: "최수진",
      phone: "010-6789-0123",
      birthDate: "1975-09-22",
      gender: "여",
      doctor: "이서현 한의사",
      treatment: "뜸·부항",
      symptom: "생리통, 하복부 냉증",
      status: "pending",
      createdAt: format(today, "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-006",
      date: format(addDays(today, 1), "yyyy-MM-dd"),
      time: "11:00",
      patientName: "한상민",
      phone: "010-7890-1234",
      birthDate: "1988-04-05",
      gender: "남",
      doctor: "박준호 한의사",
      treatment: "약침치료",
      symptom: "무릎 관절염",
      status: "confirmed",
      notes: "MRI 결과 확인 필요",
      createdAt: format(today, "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-007",
      date: format(addDays(today, 1), "yyyy-MM-dd"),
      time: "15:30",
      patientName: "송지은",
      phone: "010-8901-2345",
      birthDate: "2001-12-11",
      gender: "여",
      doctor: "김민수 한의사",
      treatment: "침구치료",
      symptom: "스트레스성 불면",
      status: "pending",
      createdAt: format(today, "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-008",
      date: format(subDays(today, 4), "yyyy-MM-dd"),
      time: "16:00",
      patientName: "오태현",
      phone: "010-9012-3456",
      birthDate: "1962-08-19",
      gender: "남",
      doctor: "이서현 한의사",
      treatment: "한방물리치료",
      symptom: "어깨 회전근개 손상",
      status: "completed",
      createdAt: format(subDays(today, 5), "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-009",
      date: format(addDays(today, 2), "yyyy-MM-dd"),
      time: "09:30",
      patientName: "윤아름",
      phone: "010-0123-4567",
      birthDate: "1995-03-30",
      gender: "여",
      doctor: "박준호 한의사",
      treatment: "상담 및 진찰",
      symptom: "체중 감량 상담 (한약)",
      status: "confirmed",
      createdAt: format(today, "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-010",
      date: format(subDays(today, 3), "yyyy-MM-dd"),
      time: "13:30",
      patientName: "강동현",
      phone: "010-1234-5678",
      birthDate: "1970-01-25",
      gender: "남",
      doctor: "김민수 한의사",
      treatment: "한약 처방",
      symptom: "고혈압 관리",
      status: "cancelled",
      notes: "환자 사정으로 취소",
      createdAt: format(subDays(today, 4), "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-011",
      date: format(today, "yyyy-MM-dd"),
      time: "16:30",
      patientName: "임혜진",
      phone: "010-2345-6780",
      birthDate: "1984-06-08",
      gender: "여",
      doctor: "이서현 한의사",
      treatment: "추나요법",
      symptom: "골반 틀어짐, 요통",
      status: "pending",
      createdAt: format(today, "yyyy-MM-dd'T'HH:mm"),
    },
    {
      id: "RES-250409-012",
      date: format(addDays(today, 3), "yyyy-MM-dd"),
      time: "10:00",
      patientName: "조민수",
      phone: "010-3456-7891",
      birthDate: "1958-10-14",
      gender: "남",
      doctor: "박준호 한의사",
      treatment: "침구치료",
      symptom: "퇴행성 관절염",
      status: "confirmed",
      createdAt: format(addDays(today, -1), "yyyy-MM-dd'T'HH:mm"),
    },
  ];
  return seed;
}

// Helpers
function formatDateTime(dateStr: string, timeStr: string): string {
  try {
    const d = parseISO(dateStr);
    const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    const formattedDate = format(d, "yyyy.MM.dd");
    return `${formattedDate} (${weekday}) ${timeStr}`;
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

// Generate 15-minute time slots (e.g. 08:00 ~ 20:00)
function generate15MinTimeSlots(startHour = 8, endHour = 20): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === endHour && m > 0) break; // stop at exactly endHour:00 if needed
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generate15MinTimeSlots(8, 20); // 08:00 ~ 20:00 every 15 min

// Generate days for a mini calendar grid (always 42 cells for 6 weeks)
function getCalendarDays(viewMonth: string) {
  const firstOfMonth = parseISO(`${viewMonth}-01`);
  const monthStart = startOfMonth(firstOfMonth);
  const monthEnd = endOfMonth(firstOfMonth);
  const startWeekday = getDay(monthStart); // 0=Sun, 1=Mon, ..., 6=Sat

  const days: { date: string; isCurrentMonth: boolean }[] = [];

  // Previous month padding (gray)
  for (let i = 0; i < startWeekday; i++) {
    const d = subDays(monthStart, startWeekday - i);
    days.push({ date: format(d, "yyyy-MM-dd"), isCurrentMonth: false });
  }

  // Current month
  let d = monthStart;
  while (d <= monthEnd) {
    days.push({ date: format(d, "yyyy-MM-dd"), isCurrentMonth: true });
    d = addDays(d, 1);
  }

  // Next month padding to complete the grid (6 weeks = 42 cells)
  while (days.length < 42) {
    const last = parseISO(days[days.length - 1].date);
    const nextDay = addDays(last, 1);
    days.push({ date: format(nextDay, "yyyy-MM-dd"), isCurrentMonth: false });
  }

  return days;
}


function getStatusBadge(status: Status) {
  return (
    <span className={`status-badge ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}



// Main Component
export default function HanuiwonReservationApp() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Day navigation (main focus now)
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Filters (scoped to the selected day; status distinction removed)
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'fallback'>('checking');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // States for pickers in modal
  const [calendarView, setCalendarView] = useState(() => format(new Date(), "yyyy-MM"));
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Form state (greatly simplified)
  const [formData, setFormData] = useState({
    date: "",
    time: "09:00",
    patientName: "",
    treatment: TREATMENTS[0],
    symptom: "",
  });

  // Helper to convert Supabase row (snake_case columns) to our camelCase Reservation type
  function mapSupabaseRow(row: any): Reservation {
    return {
      id: row.id,
      date: row.date,
      time: row.time,
      patientName: row.patient_name,
      phone: row.phone || '',
      birthDate: row.birth_date || '',
      gender: (row.gender as '남' | '여') || '여',
      doctor: row.doctor || '',
      treatment: row.treatment,
      symptom: row.symptom,
      status: row.status as Status,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    };
  }

  // Load from Supabase
  useEffect(() => {
    // Debug: see what Supabase URL the client bundle is using (very useful on Vercel)
    console.log('Supabase runtime config:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'using placeholder (env var not present at build time)',
    });

    const loadReservations = async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading reservations from Supabase:", error);
        const seed = generateSeedData();
        setReservations(seed);
        setSupabaseStatus('fallback');
        setIsLoaded(true);
        return;
      }

      if (data && data.length > 0) {
        setReservations(data.map(mapSupabaseRow));
        setSupabaseStatus('connected');
      } else {
        // First time: insert seed data to Supabase
        const seed = generateSeedData();
        const { error: insertError } = await supabase.from("reservations").insert(
          seed.map((s) => ({
            date: s.date,
            time: s.time,
            patient_name: s.patientName,
            phone: s.phone,
            birth_date: s.birthDate,
            gender: s.gender,
            doctor: s.doctor,
            treatment: s.treatment,
            symptom: s.symptom,
            status: s.status,
            notes: s.notes,
          }))
        );
        if (insertError) {
          console.error("Seed insert error:", insertError);
        }
        setReservations(seed.map(mapSupabaseRow));
        setSupabaseStatus('connected');
      }
      setIsLoaded(true);
    };

    loadReservations();
  }, []);

  // Daily reservations for the selected date (sorted by time ascending - schedule order)
  // Status distinction removed; only search filter remains
  const dailyReservations = useMemo(() => {
    let result = reservations.filter((r) => r.date === selectedDate);

    // Sort by time ascending (morning first)
    result.sort((a, b) => a.time.localeCompare(b.time));

    return result;
  }, [reservations, selectedDate]);

  // Time slots for the schedule table (as requested)
  const isSaturday = getDay(parseISO(selectedDate)) === 6;

  const allBookedTimesThisDay = [...new Set(dailyReservations.map(r => r.time))];

  let sections = [];

  if (isSaturday) {
    // Saturday: 09:50, 10:00, then 15-min up to 12:30
    const satBase = ['09:50', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30'];
    const satDisplay = Array.from(new Set([
      ...satBase,
      ...allBookedTimesThisDay.filter(t => t >= '09:00' && t <= '13:00')
    ])).sort();
    sections = [
      {
        title: '토요일 진료 (09:50 ~ 12:30, 15분 간격)',
        times: satDisplay
      }
    ];
  } else {
    const morningSlots = ['10:30', '10:45', '11:00', '11:15', '11:30'];
    const afternoonSlots = [
      '14:00', '14:20', '14:40',
      '15:00', '15:20', '15:40',
      '16:00', '16:20', '16:40',
      '17:00', '17:20', '17:40',
      '18:00', '18:20', '18:40',
      '19:00',
    ];
    const morningDisplayTimes = Array.from(new Set([
      ...morningSlots,
      ...allBookedTimesThisDay.filter(t => t < '14:00')
    ])).sort();
    const afternoonDisplayTimes = Array.from(new Set([
      ...afternoonSlots,
      ...allBookedTimesThisDay.filter(t => t >= '14:00')
    ])).sort();
    sections = [
      {
        title: '오전 진료 (10:30 ~ 11:30, 15분 간격)',
        times: morningDisplayTimes
      },
      {
        title: '오후 진료 (14:00 ~ 19:00, 20분 간격)',
        times: afternoonDisplayTimes
      }
    ];
  }



  // Helper to open add modal prefilled with a specific time slot
  const handleEmptySlotClick = (time: string) => {
    setFormData({
      date: selectedDate,
      time,
      patientName: '',
      treatment: TREATMENTS[0],
      symptom: '',
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  // Simple day stats (for the currently selected day)
  const dayStats = useMemo(() => {
    const total = dailyReservations.length;
    const pending = dailyReservations.filter((r) => r.status === "pending").length;
    const confirmed = dailyReservations.filter((r) => r.status === "confirmed").length;
    const completed = dailyReservations.filter((r) => r.status === "completed").length;
    return { total, pending, confirmed, completed };
  }, [dailyReservations]);

  // Day navigation
  function goToPrevDay() {
    const prev = format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd");
    setSelectedDate(prev);
  }

  function goToNextDay() {
    const next = format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd");
    setSelectedDate(next);
  }

  function goToToday() {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setSelectedDate(todayStr);
  }

  function changeSelectedDate(newDate: string) {
    setSelectedDate(newDate);
  }

  // Open add modal (prefill with currently selected day)
  function openAddModal() {
    setModalMode("add");
    setSelectedReservation(null);
    const initialDate = selectedDate;
    setFormData({
      date: initialDate,
      time: "09:00",
      patientName: "",
      treatment: TREATMENTS[0],
      symptom: "",
    });
    setCalendarView(initialDate.slice(0, 7));
    setShowTimePicker(false);
    setIsModalOpen(true);
  }

  // Open edit modal (simplified fields)
  function openEditModal(res: Reservation) {
    setModalMode("edit");
    setSelectedReservation(res);
    setFormData({
      date: res.date,
      time: res.time,
      patientName: res.patientName,
      treatment: res.treatment,
      symptom: res.symptom,
    });
    setCalendarView(res.date.slice(0, 7));
    setShowTimePicker(false);
    setIsModalOpen(true);
    setDetailOpen(false);
  }

  // Open detail view
  function openDetail(res: Reservation) {
    setSelectedReservation(res);
    setDetailOpen(true);
  }

  // Close all modals
  function closeModals() {
    setIsModalOpen(false);
    setDetailOpen(false);
    setSelectedReservation(null);
    setShowTimePicker(false);
  }

  // Form field update
  function updateForm(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Save reservation (add or edit) using Supabase
  async function saveReservation(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!formData.patientName.trim() || !formData.symptom.trim()) {
      toast.error("환자명과 기타(방문사유)는 필수 입력입니다.");
      return;
    }

    if (modalMode === "add") {
      const { error } = await supabase.from("reservations").insert({
        date: formData.date,
        time: formData.time,
        patient_name: formData.patientName.trim(),
        treatment: formData.treatment,
        symptom: formData.symptom.trim(),
        status: "pending",
      });

      if (error) {
        toast.error(`등록에 실패했습니다: ${error.message || error}`);
        console.error("Supabase insert error:", error);
        return;
      }
      toast.success("새 예약이 등록되었습니다.");
    } else if (selectedReservation) {
      const { error } = await supabase
        .from("reservations")
        .update({
          date: formData.date,
          time: formData.time,
          patient_name: formData.patientName.trim(),
          treatment: formData.treatment,
          symptom: formData.symptom.trim(),
        })
        .eq("id", selectedReservation.id);

      if (error) {
        toast.error(`수정에 실패했습니다: ${error.message || error}`);
        console.error("Supabase update error:", error);
        return;
      }
      toast.success("예약 정보가 수정되었습니다.");
    }

    // Refetch data
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setReservations(data as Reservation[]);

    closeModals();
  }

  // Quick status change
  async function changeStatus(id: string, newStatus: Status) {
    const { error } = await supabase
      .from("reservations")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error(`상태 변경에 실패했습니다: ${error.message || error}`);
      console.error("Supabase status update error:", error);
      return;
    }

    // Refetch
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setReservations(data as Reservation[]);

    const label = STATUS_LABEL[newStatus];
    toast.success(`상태가 "${label}"(으)로 변경되었습니다.`);
  }

  // Delete reservation
  async function deleteReservation(id: string) {
    if (!confirm("정말 이 예약을 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("reservations").delete().eq("id", id);

    if (error) {
      toast.error(`삭제에 실패했습니다: ${error.message || error}`);
      console.error("Supabase delete error:", error);
      return;
    }

    // Refetch
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setReservations(data as Reservation[]);

    setDetailOpen(false);
    toast.error("예약이 삭제되었습니다.");
  }

  // Reset all data to seed (Supabase version)
  async function resetToSeed() {
    if (!confirm("모든 예약 데이터를 초기 상태로 되돌릴까요?")) return;

    // Delete all current
    await supabase.from("reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const seed = generateSeedData();
    const { error } = await supabase.from("reservations").insert(
      seed.map((s) => ({
        date: s.date,
        time: s.time,
        patient_name: s.patientName,
        phone: s.phone,
        birth_date: s.birthDate,
        gender: s.gender,
        doctor: s.doctor,
        treatment: s.treatment,
        symptom: s.symptom,
        status: s.status,
        notes: s.notes,
      }))
    );

    if (error) {
      toast.error("초기화 중 오류가 발생했습니다.");
      console.error(error);
      return;
    }

    setReservations(seed);
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    toast.info("데이터가 초기화되었습니다.");
  }

  // Export current day's reservations to CSV (simple)
  function exportCSV() {
    if (dailyReservations.length === 0) {
      toast.error("내보낼 예약이 없습니다.");
      return;
    }

    const headers = ["예약번호", "시간", "환자명", "성별", "담당의", "진료내용", "증상", "상태", "비고"];

    const rows = dailyReservations.map((r) => [
      r.id,
      r.time,
      r.patientName,
      r.gender,
      r.doctor,
      r.treatment,
      r.symptom,
      STATUS_LABEL[r.status],
      r.notes || "",
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
    link.download = `예약내역_${selectedDate.replace(/-/g, "")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${dailyReservations.length}건을 CSV로 내보냈습니다.`);
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-1 sm:py-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0f766e] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-base sm:text-xl tracking-tighter text-slate-900 whitespace-nowrap break-keep">
                후한의원 구미점
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 -mt-1">예약 관리 시스템</div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 sm:gap-2 bg-[#0f766e] hover:bg-[#115e59] active:bg-[#134e4b] text-white px-2 sm:px-4 h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">새 예약 등록</span>
              <span className="sm:hidden">등록</span>
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 sm:gap-2 border border-slate-200 hover:bg-slate-50 px-2 sm:px-4 h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-medium text-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV 내보내기</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              onClick={() => window.open(`/print?date=${selectedDate}`, '_blank')}
              className="flex items-center gap-1.5 sm:gap-2 border border-slate-200 hover:bg-slate-50 px-2 sm:px-4 h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-medium text-slate-700 transition-colors"
            >
              인쇄
            </button>
            <button
              onClick={resetToSeed}
              className="text-[10px] sm:text-xs text-slate-400 hover:text-slate-500 px-1.5 sm:px-2 py-1"
              title="데이터 초기화"
            >
              초기화
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Supabase connection status - very visible for Vercel debugging */}
        {supabaseStatus === 'fallback' && (
          <div className="mb-4 p-4 bg-red-600 text-white rounded-lg text-sm font-bold border-2 border-red-800">
            ⚠️ Supabase 연결 실패 — 현재 시드(더미) 데이터만 사용 중입니다.<br />
            <span className="font-normal">Vercel 대시보드 → Project → Settings → Environment Variables 에서 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 <strong>Production</strong> 환경에 추가하고 Sensitive 체크를 해제한 후 반드시 Redeploy 하세요.</span>
          </div>
        )}


        {/* Page Title - simplified */}
        <div className="mb-5">
          <h1 className="text-3xl font-semibold tracking-tighter text-slate-900">
            예약 내역
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            하루 단위로 날짜를 넘겨가며 확인하세요
          </p>
        </div>

        {/* Day Navigator - Main control */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm no-print">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevDay}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                aria-label="이전 날"
              >
                ←
              </button>

              <button
                onClick={goToToday}
                className="px-4 h-10 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 active:bg-slate-100"
              >
                오늘
              </button>

              <button
                onClick={goToNextDay}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                aria-label="다음 날"
              >
                →
              </button>
            </div>

            {/* Current selected date - large and clear */}
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => changeSelectedDate(e.target.value)}
                className="input h-11 text-base font-semibold w-auto px-4 cursor-pointer"
              />
              <div className="text-lg font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                {format(parseISO(selectedDate), "M월 d일")} ({["일","월","화","수","목","금","토"][parseISO(selectedDate).getDay()]})
              </div>
            </div>

            <div className="text-sm text-slate-500">
              {dayStats.total}건의 예약
            </div>
          </div>
        </div>

        {/* Day Summary (simplified, no status distinction) */}
        <div className="flex flex-wrap gap-2 mb-4 text-sm no-print">
          <div className="px-3 py-1 bg-white border rounded-full text-slate-600">오늘 <span className="font-semibold text-slate-900">{dayStats.total}</span>건</div>
        </div>



        {/* Time-based Schedule Table */}
        {/* Print-only header - shows nicely when printing */}
        <div className="hidden print:block text-center mb-4 border-b pb-3">
          <div className="text-xl sm:text-2xl font-bold tracking-tighter whitespace-nowrap">후한의원 구미점</div>
          <div className="text-base mt-1">
            진료 시간표 — {format(parseISO(selectedDate), "yyyy년 M월 d일")} ({["일","월","화","수","목","금","토"][parseISO(selectedDate).getDay()]})
          </div>
        </div>

        {/* Warning banner if using seed data (Supabase not connected) - visible on Vercel if env vars missing */}
        {supabaseStatus === 'fallback' && (
          <div className="mb-3 p-3 bg-red-600 text-white rounded text-sm font-semibold">
            ⚠️ Supabase 연결 실패 — 현재 시드(더미) 데이터만 사용 중입니다.<br />
            Vercel 대시보드에서 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 <strong>Production</strong> 환경에 추가하고 "Sensitive" 체크를 해제한 후 재배포하세요.
          </div>
        )}
        <div className="mb-2 px-1">
          <div className="text-sm font-medium text-slate-600">
            진료 시간표
          </div>
        </div>

        {sections.map((section, index) => (
          <div className="mb-6" key={index}>
            <div className="text-xs font-semibold text-emerald-700 mb-1.5 px-1">{section.title}</div>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y bg-white">
              <div className="flex text-[11px] font-medium text-slate-500 bg-slate-100 px-3 py-1.5 border-b">
                <div className="w-20">시간</div>
                <div className="flex-1">예약 내용</div>
              </div>
              {section.times.map((time) => {
                const slotReservations = dailyReservations.filter((r) => r.time === time);
                return (
                  <div
                    key={time}
                    className={`flex items-stretch hover:bg-slate-50 transition-colors ${slotReservations.length === 0 ? 'bg-slate-50/60 cursor-pointer' : ''}`}
                    onClick={() => slotReservations.length === 0 && handleEmptySlotClick(time)}
                  >
                    <div className="w-20 shrink-0 border-r px-3 py-3 font-mono text-sm text-slate-600 bg-slate-100 flex items-center justify-center">
                      {time}
                    </div>
                    <div className="flex-1 px-4 py-3 min-h-[52px]">
                      {slotReservations.length > 0 ? (
                        <div className="space-y-2">
                          {slotReservations.map((res) => (
                            <div key={res.id} className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-slate-900">{res.patientName}</span>
                                <span className="ml-2 text-slate-600 text-sm">
                                  {res.treatment} · {res.symptom}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 no-print">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditModal(res); }}
                                  className="p-1 text-slate-500 hover:text-[#0f766e]"
                                  title="수정"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteReservation(res.id); }}
                                  className="p-1 text-slate-500 hover:text-red-600"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => handleEmptySlotClick(time)}
                            className="text-emerald-600 hover:underline text-xs mt-1 no-print"
                          >
                            + 이 시간대에 추가 예약
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-emerald-600 font-medium no-print">+ 이 시간대 예약하기</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}



        <div className="mt-2 px-1 text-xs text-slate-400">
          빈 시간대를 클릭하면 해당 날짜와 시간으로 예약 등록이 바로 시작됩니다. (환자명과 기타 정보만 입력하면 됩니다)
        </div>
      </main>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModals}
        >
          <div
            className="modal bg-white w-full max-w-[520px] rounded-2xl shadow-xl border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">
                  {modalMode === "add" ? "새 예약 등록" : "예약 정보 수정"}
                </div>
                <div className="text-xs text-slate-500">후한의원 구미점</div>
              </div>
              <button onClick={closeModals} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveReservation} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 예약일 컬럼: 표시 + 작은 사이즈 달력 (항상 보이도록, 나란히 배치) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">예약일</label>

                  {/* 선택된 날짜 표시 */}
                  <div className="mb-1.5 px-2 py-1.5 border rounded-lg bg-slate-50 text-sm font-medium">
                    {formData.date
                      ? (() => {
                          const d = parseISO(formData.date);
                          const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
                          return `${format(d, "yyyy. MM. dd")} (${wd})`;
                        })()
                      : "날짜를 선택하세요"}
                  </div>

                  {/* 작은 사이즈 달력 - 항상 표시, 컴팩트하게 */}
                  <div className="border rounded-xl p-2 bg-white">
                    {/* 월 이동 - 아주 작게 */}
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setCalendarView(format(subMonths(parseISO(calendarView + "-01"), 1), "yyyy-MM"))}
                        className="px-1 hover:bg-slate-100 rounded"
                      >
                        ←
                      </button>
                      <span className="font-medium text-xs">
                        {format(parseISO(calendarView + "-01"), "M월")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCalendarView(format(addMonths(parseISO(calendarView + "-01"), 1), "yyyy-MM"))}
                        className="px-1 hover:bg-slate-100 rounded"
                      >
                        →
                      </button>
                    </div>

                    {/* 요일 헤더 - 작게 */}
                    <div className="grid grid-cols-7 text-center text-[9px] text-slate-500 mb-0.5">
                      {["일","월","화","수","목","금","토"].map((w, i) => (
                        <div key={i} className={i===0 ? "text-red-400" : ""}>{w}</div>
                      ))}
                    </div>

                    {/* 날짜 그리드 - 아주 컴팩트 */}
                    <div className="grid grid-cols-7 gap-px text-[10px]">
                      {getCalendarDays(calendarView).map((dayInfo, idx) => {
                        const isSelected = dayInfo.date === formData.date;
                        const isPast = modalMode === "add" && dayInfo.date < format(new Date(), "yyyy-MM-dd");
                        const isDisabled = !dayInfo.isCurrentMonth || isPast;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (!isDisabled) {
                                updateForm("date", dayInfo.date);
                              }
                            }}
                            className={`
                              py-px text-center rounded transition-colors
                              ${isSelected ? "bg-[#0f766e] text-white font-semibold" : "hover:bg-slate-100"}
                              ${!dayInfo.isCurrentMonth ? "text-slate-300" : ""}
                              ${isPast ? "text-slate-300" : ""}
                              ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                            `}
                          >
                            {parseISO(dayInfo.date).getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 시간 컬럼: 직접 입력 + 시계 아이콘으로 팝업 */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">시간</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={formData.time}
                      onChange={(e) => {
                        updateForm("time", e.target.value);
                        setShowTimePicker(false);
                      }}
                      onFocus={() => setShowTimePicker(false)}
                      placeholder="09:00"
                      className="input h-10 flex-1 rounded-r-none border-r-0 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowTimePicker(!showTimePicker);
                      }}
                      className="h-10 w-11 flex items-center justify-center border border-l-0 rounded-r-xl bg-white hover:bg-slate-50 active:bg-slate-100"
                      title="시 + 15분 단위 분 선택"
                    >
                      <Clock className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>

                  {/* 시간 선택 팝업: 시는 세로 스크롤, 분은 15분 단위 */}
                  {showTimePicker && (
                    <>
                      <div
                        className="fixed inset-0 z-[55]"
                        onClick={() => setShowTimePicker(false)}
                      />
                      <div className="absolute z-[60] mt-1 w-full rounded-2xl border bg-white shadow-xl p-3">
                        <div className="text-xs text-slate-500 mb-2">시간 선택</div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* 시: 세로 스크롤 + 큰 버튼 (분과 동일 스타일) */}
                          <div>
                            <div className="text-[10px] font-medium text-slate-600 mb-1">시</div>
                            <div className="max-h-[160px] overflow-auto flex flex-col gap-1 text-sm">
                              {Array.from({ length: 13 }, (_, i) => 8 + i).map((h) => {
                                const hh = String(h).padStart(2, "0");
                                const current = formData.time.split(":")[0];
                                return (
                                  <button
                                    key={h}
                                    type="button"
                                    onClick={() => {
                                      const currentMin = formData.time.split(":")[1] || "00";
                                      updateForm("time", `${hh}:${currentMin}`);
                                    }}
                                    className={`px-3 py-2 text-left rounded-lg border transition-colors ${
                                      current === hh 
                                        ? "bg-[#0f766e] text-white border-[#0f766e]" 
                                        : "hover:bg-slate-50"
                                    }`}
                                  >
                                    {hh}시
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 분: 15분 단위, 큰 버튼 */}
                          <div>
                            <div className="text-[10px] font-medium text-slate-600 mb-1">분 (15분 단위)</div>
                            <div className="flex flex-col gap-1 text-sm">
                              {["00", "15", "30", "45"].map((m) => {
                                const currentMin = formData.time.split(":")[1] || "00";
                                const currentHour = formData.time.split(":")[0] || "09";
                                return (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                      updateForm("time", `${currentHour}:${m}`);
                                    }}
                                    className={`px-3 py-2 text-left rounded-lg border transition-colors ${
                                      currentMin === m 
                                        ? "bg-[#0f766e] text-white border-[#0f766e]" 
                                        : "hover:bg-slate-50"
                                    }`}
                                  >
                                    {m}분
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 text-[10px] text-center text-slate-400">
                          입력창에 직접 입력도 가능
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">환자명</label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => updateForm("patientName", e.target.value)}
                  className="input h-10"
                  placeholder="홍길동"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">진료 내용</label>
                <select
                  value={formData.treatment}
                  onChange={(e) => updateForm("treatment", e.target.value)}
                  className="input h-10"
                >
                  {TREATMENTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">기타</label>
                <input
                  type="text"
                  value={formData.symptom}
                  onChange={(e) => updateForm("symptom", e.target.value)}
                  className="input h-10"
                  placeholder="방문 사유나 기타 요청 사항"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 h-11 rounded-xl border text-sm font-medium hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-[#0f766e] hover:bg-[#115e59] text-white text-sm font-semibold transition-colors"
                >
                  {modalMode === "add" ? "예약 등록하기" : "수정 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal - simplified */}
      {detailOpen && selectedReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setDetailOpen(false);
            setSelectedReservation(null);
          }}
        >
          <div
            className="modal bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b flex justify-between items-start">
              <div>
                <div className="font-semibold text-xl tracking-tight">{selectedReservation.patientName}</div>
              </div>
              <button onClick={() => setDetailOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <div>
                <div className="text-slate-500 text-xs mb-0.5">예약 일시</div>
                <div className="font-medium text-lg tracking-tight">
                  {formatDateTime(selectedReservation.date, selectedReservation.time)}
                </div>
              </div>

              <div>
                <div className="text-slate-500 text-xs mb-0.5">진료 내용</div>
                <div className="text-slate-800">{selectedReservation.treatment}</div>
              </div>

              <div>
                <div className="text-slate-500 text-xs mb-0.5">기타</div>
                <div className="text-slate-800">{selectedReservation.symptom}</div>
              </div>

              <div className="flex gap-8">
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">상태</div>
                  <div className="mt-0.5">{getStatusBadge(selectedReservation.status)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">예약번호</div>
                  <div className="font-mono text-xs text-slate-500 mt-0.5">{selectedReservation.id}</div>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-slate-50 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                {selectedReservation.status !== "completed" && (
                  <button
                    onClick={() => changeStatus(selectedReservation.id, "completed")}
                    className="px-3 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    진료 완료 처리
                  </button>
                )}
                {selectedReservation.status === "pending" && (
                  <button
                    onClick={() => changeStatus(selectedReservation.id, "confirmed")}
                    className="px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    예약 확정
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(selectedReservation)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border hover:bg-white"
                >
                  <Edit2 className="w-3.5 h-3.5" /> 수정
                </button>
                <button
                  onClick={() => deleteReservation(selectedReservation.id)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 text-center text-xs text-slate-400">
        후한의원 구미점 예약 관리 시스템 · 내부용
      </footer>
    </div>
  );
}
