'use client'

import { useState } from 'react'

export default function Home() {
  const [funds, setFunds] = useState(0)

  const handlePurchaseFloor = () => {
    if (funds >= 5000) {
      setFunds(funds - 5000)
      alert('新しいフロアを購入しました！')
    } else {
      alert('資金が不足しています。')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-800">
            現在の資金: ${funds.toLocaleString()}
          </h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">
            フロア購入
          </h2>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                新しいフロア
              </h3>
              <p className="text-gray-600 mb-4">
                新しいフロアを購入して、建物を拡張しましょう。
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">
                  $5,000
                </span>
                <button
                  onClick={handlePurchaseFloor}
                  disabled={funds < 5000}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    funds >= 5000
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  新しいフロアを購入（$5000）
                </button>
              </div>
            </div>
          </div>

          {/* デバッグ用の資金追加ボタン */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">デバッグ用:</p>
            <button
              onClick={() => setFunds(funds + 1000)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              資金を$1,000追加
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}