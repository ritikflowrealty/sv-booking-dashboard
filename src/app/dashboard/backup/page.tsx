"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, Upload, AlertCircle, CheckCircle } from "lucide-react";

export default function BackupPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (session?.user.role !== "admin") {
    router.push("/dashboard");
    return null;
  }

  const handleExport = async () => {
    const res = await fetch("/api/backup/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow-realty-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded successfully");
    setMessageType("success");
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("This will replace ALL current data with the backup. Are you sure?")) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setRestoring(true);
    setMessage("");

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });

      if (res.ok) {
        setMessage("Backup restored successfully! All data has been replaced.");
        setMessageType("success");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to restore backup");
        setMessageType("error");
      }
    } catch {
      setMessage("Invalid backup file");
      setMessageType("error");
    }

    setRestoring(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Backup and Restore</h1>
        <p className="text-gray-500">Export a full backup or restore from a previous backup file</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {messageType === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message}
        </div>
      )}

      {/* Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Export Backup</h3>
        <p className="text-sm text-gray-500 mb-4">
          Download a complete backup of all data including team leads, sales managers, projects, entries, and cancellation details.
        </p>
        <button onClick={handleExport} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-4 rounded-lg transition">
          <Download className="w-4 h-4" /> Download Full Backup
        </button>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Restore from Backup</h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload a previously exported backup file to restore all data. This will replace all current data.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-700 font-medium">Warning: This will delete all current data and replace it with the backup.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition cursor-pointer">
            <Upload className="w-4 h-4" />
            {restoring ? "Restoring..." : "Upload Backup File"}
            <input ref={fileRef} type="file" accept=".json" onChange={handleRestore} disabled={restoring} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
