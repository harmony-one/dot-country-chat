import React, { useContext, useEffect, useState } from 'react'
import { BaseText, Desc, DescLeft } from './components/Text'
import { Button } from './components/Controls'
import { TelegramContext } from './Context'
import { LoginState } from './util'

const TestChat = (): React.JSX.Element => {
  const { loginState, client } = useContext(TelegramContext)
  const [prompts, setPrompts] = useState<string[]>([])
  async function testChat (): Promise<void> {
    if (!client) {
      return
    }
    const message = 'You just sent a message to yourself! Check "Saved Messages" on Telegram'
    await client.sendMessage('me', { message })
    setPrompts(e => [...e, message])
  }
  if (loginState !== LoginState.Done) {
    return <Desc><BaseText>You have not logged in</BaseText></Desc>
  }
  return <DescLeft>
    {prompts.map((p, i) => {
      return <React.Fragment key={`m-${i}`}>
        <BaseText>You:</BaseText>
        <BaseText>{p}</BaseText>
      </React.Fragment>
    })}
    <Button onClick={testChat}>Test Chat</Button>
  </DescLeft>
}

export default TestChat
