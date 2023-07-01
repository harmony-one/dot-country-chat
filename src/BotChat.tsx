import React, { useEffect, useState } from 'react'
import Login from './Login'
import { Main } from './components/Layout'
import { Container } from './Common'

const BotChat: React.FC = () => {
  return <Container>
    <Login/>
  </Container>
}

export default BotChat
