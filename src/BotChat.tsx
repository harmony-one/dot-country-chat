import React, { useEffect, useState } from 'react'
import Login from './Login'
import { Main } from './components/Layout'
import { Container, SmallTextGrey } from './Common'
import { Desc, Title } from './components/Text'

const BotChat: React.FC = () => {
  return <Container>
    <Title style={{ marginTop: 64 }}>Chat with Harmony AI Bot</Title>

    <Login/>
  </Container>
}

export default BotChat
