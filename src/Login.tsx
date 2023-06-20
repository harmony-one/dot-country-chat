import React, { useState } from 'react'

import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import config from '../config'
import { getStoredSessionString, simpleCallback } from './util'

const Session = new StringSession(getStoredSessionString())
const Client = new TelegramClient(Session, config.tg.apiId, config.tg.apiHash, { connectionRetries: 5 })
const initialState = { phoneNumber: '', password: '', phoneCode: '' }

export const Login: React.FC = () => {
  const [{ phoneNumber, password, phoneCode }, setAuthInfo] = useState(initialState)

  async function sendCodeHandler (): Promise<void> {
    await Client.connect() // Connecting to the server
    await Client.sendCode(
      {
        apiId: config.tg.apiId,
        apiHash: config.tg.apiHash
      },
      phoneNumber
    )
  }

  async function clientStartHandler (): Promise<void> {
    try {
      await Client.start({
        phoneNumber,
        password: simpleCallback(password),
        phoneCode: simpleCallback(phoneCode),
        onError: (err) => {
          console.error(err)
        }
      })
      localStorage.setItem('dc-chat-session', Client.session.save() as string) // Save session to local storage
      await Client.sendMessage('me', { message: "You're successfully logged in!" })
    } catch (ex: any) {
      console.error(ex)
    }
  }

  function inputChangeHandler ({ target: { name, value } }): void {
    setAuthInfo((authInfo) => ({ ...authInfo, [name]: value }))
  }

  return (
    <>
      <input
                type="text"
                name="phoneNumber"
                value={phoneNumber}
                onChange={inputChangeHandler}
            />

      <input
                type="text"
                name="password"
                value={password}
                onChange={inputChangeHandler}
            />

      <input type="button" value="start client" onClick={sendCodeHandler} />

      <input
                type="text"
                name="phoneCode"
                value={phoneCode}
                onChange={inputChangeHandler}
            />

      <input type="button" value="insert code" onClick={clientStartHandler} />
    </>
  )
}
