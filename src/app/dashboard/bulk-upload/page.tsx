"use client";

import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import { Download, Upload, CheckCircle, AlertCircle } from "lucide-react";

interface ProjectOption {
  id: string;
  name: string;
  developer: { name: string };
}

interface UploadResult {
  created: number;
  updated: number;
  errors: string[];
  total: number;
}

export default function BulkUploadPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/my-projects")
      .then((res) => res.json())
      .then((data) => { setProjects(data); setLoading(false); });
  }, []);

  const handleDownloadTemplate = async () => {
    if (!selectedProject) return;
    const res = await fetch(`/api/entries/template?projectId=${selectedProject}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sv-booking-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    setUploading(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      comments: "#",
      complete: async (results) => {
        try {
          const res = await fetch("/api/entries/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: results.data, projectId: selectedProject }),
          });
          const data = await res.json();
          setResult(data);
        } catch {
          setResult({ created: 0, updated: 0, errors: ["Upload failed"], total: 0 });
        }
        setUploading(false);
      },
      error: () => {
        setResult({ created: 0, updated: 0, errors: ["Failed to parse CSV file"], total: 0 });
        setUploading(false);
      },
    });

    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>
        <p className="text-gray-500">Upload entries for all sales managers via CSV file</p>
      </div>

      {/* Step 1: Select Project */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 1: Select Project</h3>
        <select
          value={selectedProject}
          onChange={(e) => { setSelectedProject(e.target.value); setResult(null); }}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Choose a project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Step 2: Download Template */}
      {selectedProject && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Step 2: Download Template</h3>
          <p className="text-sm text-gray-500 mb-4">
            Download a CSV template with all your sales managers pre-filled. Fill in the numbers and upload.
          </p>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition"
          >
            <Download className="w-4 h-4" /> Download CSV Template
          </button>
        </div>
      )}

      {/* Step 3: Upload */}
      {selectedProject && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Step 3: Upload Filled CSV</h3>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">Select your filled CSV file</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
              className="text-sm"
            />
            {uploading && <p className="text-sm text-teal-600 mt-3">Uploading...</p>}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Upload Results</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{result.created}</p>
              <p className="text-xs text-green-600">Created</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
              <p className="text-xs text-blue-600">Updated</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>

          {result.errors.length === 0 && result.created + result.updated > 0 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">All entries uploaded successfully!</span>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Errors:</span>
              </div>
              <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">{err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Format Guide */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">CSV Format Guide</h3>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Column</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-3 py-2 font-mono">sales_manager</td><td className="px-3 py-2">Name of sales manager</td><td className="px-3 py-2">Rahul Kumar</td></tr>
              <tr><td className="px-3 py-2 font-mono">year</td><td className="px-3 py-2">Year</td><td className="px-3 py-2">2026</td></tr>
              <tr><td className="px-3 py-2 font-mono">month</td><td className="px-3 py-2">Month (1-12)</td><td className="px-3 py-2">8</td></tr>
              <tr><td className="px-3 py-2 font-mono">period</td><td className="px-3 py-2">1 = 1st-15th, 2 = 16th-End</td><td className="px-3 py-2">1</td></tr>
              <tr><td className="px-3 py-2 font-mono">site_visits</td><td className="px-3 py-2">Number of site visits</td><td className="px-3 py-2">10</td></tr>
              <tr><td className="px-3 py-2 font-mono">bookings</td><td className="px-3 py-2">Number of bookings</td><td className="px-3 py-2">5</td></tr>
              <tr><td className="px-3 py-2 font-mono">cancellations</td><td className="px-3 py-2">Number of cancellations in this period</td><td className="px-3 py-2">2</td></tr>
              <tr><td className="px-3 py-2 font-mono">cancel_count</td><td className="px-3 py-2">How many were cancelled (from a specific period)</td><td className="px-3 py-2">2</td></tr>
              <tr><td className="px-3 py-2 font-mono">cancel_booked_year</td><td className="px-3 py-2">Year when cancelled units were booked</td><td className="px-3 py-2">2026</td></tr>
              <tr><td className="px-3 py-2 font-mono">cancel_booked_month</td><td className="px-3 py-2">Month when cancelled units were booked</td><td className="px-3 py-2">6</td></tr>
              <tr><td className="px-3 py-2 font-mono">cancel_booked_period</td><td className="px-3 py-2">Period when booked (1 or 2)</td><td className="px-3 py-2">1</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
