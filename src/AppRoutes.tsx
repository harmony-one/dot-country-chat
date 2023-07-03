import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BotChat from './BotChat'
import './app.scss'
import TelegramProvider from './Context'
const AppRoutes: React.FC = () => {
  return (
    <TelegramProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/*' element={ <BotChat />} />
        </Routes>
      </BrowserRouter>
    </TelegramProvider>
  )
}

export default AppRoutes
