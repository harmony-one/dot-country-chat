import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BotChat from './BotChat'

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/*' element={ <BotChat />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
