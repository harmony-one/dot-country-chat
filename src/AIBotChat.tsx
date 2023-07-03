import React, { useContext, useEffect, useState } from 'react'
import { BaseText, Desc, DescLeft } from './components/Text'
import { Button } from './components/Controls'
import { TelegramContext } from './Context'
import { LoginState } from './util'
import { Row } from './components/Layout'
import { InputBox, SmallTextGrey } from './Common'
import { toast } from 'react-toastify'
import { Api, utils } from 'telegram'
import bigInt from 'big-integer'
import { FileMigrateError } from 'telegram/errors'
import styled from 'styled-components'
import config from '../config'
export interface ChatLog {
  id: number
  user: string
  message: string
  photo?: string
}

const ChatImage = styled.img`
  width: 100%;
  object-fit: contain;
`
const ChatImageContainer = styled.div`
  max-width: 400px;
  max-height: 400px;
`

const AIBotChat = (): React.JSX.Element => {
  const { loginState, client } = useContext(TelegramContext)
  const [input, setInput] = useState('')
  const [prompts, setPrompts] = useState<ChatLog[]>([])
  const [canSubmit, setCanSubmit] = useState(true)
  async function submit (): Promise<void> {
    if (!client) {
      return
    }
    const message = input
    await client.sendMessage('@harmonyoneaibot', { message })
    setPrompts(e => [...e, { message, id: e.length, user: 'You' }])
  }
  const onKeyPress = async (e): Promise<void> => {
    if (input.length < 1) {
      return
    }
    if (e?.charCode === 13) {
      setCanSubmit(false)
      setInput('')
      try {
        await submit()
      } catch (ex: any) {
        console.error(ex)
        toast.error(`Error sending message: ${ex.toString()}`)
      } finally {
        setCanSubmit(true)
      }
    }
  }
  useEffect(() => {
    if (!client) {
      return
    }
    client.addEventHandler(async (update: any) => {
      // console.log(update)
      if (update instanceof Api.UpdateShortMessage) {
        setPrompts(p => [...p, { id: p.length, user: 'HarmonyOneAIBot', message: update.message }])
      } else if (update instanceof Api.UpdateNewMessage) {
        if (!(update.message.peerId instanceof Api.PeerUser)) {
          console.log('Skipped non-user/bot message')
          return
        }
        if (update.message.peerId.userId.neq(bigInt(config.tg.botUserId))) {
          console.log('Skipped irrelevant message')
          return
        }
        console.log('Receive bot message', update.message)
        if (!(update.message instanceof Api.Message)) {
          return
        }
        const msg = update.message
        if (msg.media && msg.media instanceof Api.MessageMediaPhoto) {
          const buf = await client.downloadMedia(msg.media)
          const p = msg.media.photo as Api.Photo
          if (!buf) {
            toast.error('Cannot load generated photo')
            return
          }
          setPrompts(p => [
            ...p,
            { id: p.length, user: 'HarmonyOneAIBot', message: msg.message, photo: `data:image/jpeg;base64,${buf.toString('base64')}` }
          ])
        }
      }
    })
  }, [client])
  if (loginState !== LoginState.Done) {
    return <Desc><BaseText>You have not logged in</BaseText></Desc>
  }
  return <DescLeft>
    {prompts.map((p, i) => {
      return <React.Fragment key={`m-${i}`}>
        <BaseText><b>{p.user}</b></BaseText>
        <SmallTextGrey style={{ marginLeft: 16 }}>{p.message}</SmallTextGrey>
        {p.photo && <ChatImageContainer style={{ marginLeft: 16 }}>
          <ChatImage src={p.photo}/>
        </ChatImageContainer>
        }
      </React.Fragment>
    })}
    <Row>
      <InputBox style={{ flex: 1, padding: 8 }}
                placeholder={'Type your command or message for @HarmonyOneAIBot'}
                disabled={!canSubmit}
                value={input}
                onChange={({ target: { value } }) => { setInput(value) }}
                onKeyPress={onKeyPress}/>
      <Button onClick={submit}>Send</Button>
    </Row>

  </DescLeft>
}

export default AIBotChat
