import React, { useEffect, useState } from 'react'
import Login from './Login'
import { Main } from './components/Layout'
import { Container, SmallTextGrey } from './Common'
import { Desc, Title } from './components/Text'
import TestChat from './TestChat'
import AIBotChat from './AIBotChat'

const ChatApp: React.FC = () => {
  return <Container>
    <Title style={{ marginTop: 64 }}>Chat with Harmony AI Bot</Title>
    <AIBotChat/>
    {/* <TestChat/> */}
    <Login/>
  </Container>
}

export default ChatApp
