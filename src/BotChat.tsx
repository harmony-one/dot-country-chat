import React, { useEffect, useState } from 'react'
import Login from './Login'
import { Main } from './components/Layout'
import { Container, SmallTextGrey } from './Common'
import { Desc, Title } from './components/Text'
import TestChat from './TestChat'

const BotChat: React.FC = () => {
  return <Container>
    <Title style={{ marginTop: 64 }}>Chat with Harmony AI Bot</Title>
    <TestChat/>
    <Login/>
  </Container>
}

export default BotChat
