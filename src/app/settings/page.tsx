"use client";

import { useState, useEffect } from "react";
import { UserPreferences, Persona, Category } from "@/types";

const PERSONAS: { value: Persona; label: string; desc: string; icon: string }[] = [
  { value: "satellite", label: "衛星全般", desc: "光学・SAR・マルチスペクトルなど衛星データ全般", icon: "🛰" },
  { value: "urban", label: "都市計画", desc: "都市構造・建物変化に注目", icon: "🏙" },
  { value: "agriculture", label: "農業", desc: "農地モニタリング・収量予測", icon: "🌾" },
  { value: "environment", label: "環境", desc: "気候変動・森林・水域変化", icon: "🌿" },
  { value: "defense", label: "防衛", desc: "物体検出・動態把握に特化", icon: "🛡" },
  { value: "general", label: "一般", desc: "すべての分野をバランスよく", icon: "🌍" },
];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "ObjectDetection", label: "物体検出" },
  { value: "Segmentation", label: "セグメンテーション" },
  { value: "ChangeDetection", label: "変化抽出" },
  { value: "SuperResolution", label: "超解像" },
  { value: "FoundationModel", label: "基盤モデル" },
];

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then(setPrefs)
      .catch(console.error);
  }, []);

  const savePrefs = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: Category) => {
    if (!prefs) return;
    const cats = prefs.categories;
    setPrefs({
      ...prefs,
      categories: cats.includes(cat)
        ? cats.filter((c) => c !== cat)
        : [...cats, cat],
    });
  };

  const triggerCollect = async () => {
    setCollecting(true);
    setCollectResult(null);
    try {
      const res = await fetch("/api/collect", { method: "POST" });
      const data = await res.json();
      setCollectResult(data.message || "完了しました");
    } catch {
      setCollectResult("エラーが発生しました");
    } finally {
      setCollecting(false);
    }
  };

  if (!prefs) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-lg font-bold text-gray-900 mb-6">設定</h1>

      {/* Persona selection */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">ペルソナ選択</h2>
        <p className="text-xs text-gray-500 mb-4">
          あなたの専門分野を選ぶと、フィードの並び順が最適化されます
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PERSONAS.map(({ value, label, desc, icon }) => (
            <button
              key={value}
              onClick={() => setPrefs({ ...prefs, persona: value })}
              className={`p-3 rounded-xl border text-left transition-all ${
                prefs.persona === value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-200"
              }`}
            >
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-sm font-semibold text-gray-900">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Category preferences */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">優先カテゴリ</h2>
        <p className="text-xs text-gray-500 mb-4">
          選択したカテゴリの記事が優先表示されます（未選択の場合はすべて表示）
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleCategory(value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                prefs.categories.includes(value)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Notify time */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">通知時刻</h2>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={prefs.notifyAt}
            onChange={(e) => setPrefs({ ...prefs, notifyAt: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">に朝のダイジェストを受信</span>
        </div>
      </section>

      {/* Save button */}
      <button
        onClick={savePrefs}
        disabled={saving}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
          saved
            ? "bg-green-500 text-white"
            : "bg-blue-600 text-white hover:bg-blue-700"
        } disabled:opacity-60`}
      >
        {saving ? "保存中..." : saved ? "✓ 保存しました" : "設定を保存"}
      </button>

      {/* Data collection section */}
      <section className="mt-8 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">データ収集</h2>
        <p className="text-xs text-gray-500 mb-4">
          arXiv と NewsAPI から最新の論文・ニュースを手動収集します
        </p>
        <button
          onClick={triggerCollect}
          disabled={collecting}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60 transition-all"
        >
          {collecting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              収集中...（数分かかります）
            </span>
          ) : (
            "今すぐ収集する"
          )}
        </button>
        {collectResult && (
          <p className="mt-2 text-sm text-center text-gray-600">{collectResult}</p>
        )}
      </section>
    </div>
  );
}
