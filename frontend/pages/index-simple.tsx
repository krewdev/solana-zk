import React from 'react'
import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>VeriSol</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            VeriSol
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Zero-Knowledge Proof of GitHub Developer Activity
          </p>
          <div className="text-center">
            <p className="text-green-600 font-semibold">
              ✅ Frontend is rendering successfully!
            </p>
            <p className="text-sm text-gray-500 mt-4">
              The application is now loading properly.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}