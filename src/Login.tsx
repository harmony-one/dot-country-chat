import React, { useEffect, useState } from 'react'

import { TelegramClient, Api, password as Password } from 'telegram'
import { StringSession } from 'telegram/sessions'
import config from '../config'
import { extractError, getStoredSessionString, simpleCallback } from './util'
import { Button, Input } from './components/Controls'
import { BaseText, Desc, Heading, SmallText } from './components/Text'
import { InputBox, LabelText, SmallTextGrey, WideLabel } from './Common'
import { Row } from './components/Layout'
import styled from 'styled-components'
import { toast } from 'react-toastify'

const LoginContainer = styled.div`
  max-width: 480px;
`
const Session = new StringSession(getStoredSessionString())
const Client = new TelegramClient(Session, config.tg.apiId, config.tg.apiHash, { connectionRetries: 5 })
const initialState = { phoneNumber: '', password: '', phoneCode: '' }

const Sections = {
  LoginByQrCode: 1,
  LoginByPhone: 11,
  VerifyCode: 12,
  VerifyPassword: 13,
  Done: 100
}
const Login: React.FC = () => {
  const [{ phoneNumber, password, phoneCode }, setAuthInfo] = useState(initialState)
  const [section, setSection] = useState(Sections.LoginByPhone)
  const [requirePassword, setRequirePassword] = useState(false)
  const [sendCodeResponse, setSendCodeResponse] = useState<{
    phoneCodeHash?: string
    isCodeViaApp?: boolean
  }>({})
  const [qrCodeData, setQrCodeData] = useState<{ token?: Buffer, expires?: number }>({})

  useEffect(() => {
    async function f (): Promise<void> {
      const result = await Client.invoke(
        new Api.auth.ExportLoginToken({
          apiId: config.tg.apiId,
          apiHash: config.tg.apiHash,
          exceptIds: []
        })
      )
      if (!(result instanceof Api.auth.LoginToken)) {
        toast.error('Cannot retrieve login QR code')
      }

      const { token, expires } = result as { token?: Buffer, expires?: number }
      if (!token || !expires) {
        toast.error('Invalid QR code response from Telegram')
        return
      }
      setQrCodeData({ token, expires })
    }
    const h = setInterval(() => {
      f().catch(console.error)
    }, 30000)
    return () => { clearInterval(h) }
  }, [])

  async function sendCodeHandler (): Promise<void> {
    await Client.connect() // Connecting to the server
    setSendCodeResponse(await Client.sendCode(
      {
        apiId: config.tg.apiId,
        apiHash: config.tg.apiHash
      },
      phoneNumber
    ))
    setSection(Sections.VerifyCode)
  }

  async function verifyPassword (): Promise<void> {
    try {
      const passwordData = await Client.invoke(
        new Api.account.GetPassword()
      )
      const passwordSrpCheck = await Password.computeCheck(
        passwordData,
        password
      )
      const { user } = (await Client.invoke(
        new Api.auth.CheckPassword({ password: passwordSrpCheck })
      )) as Api.auth.Authorization
      console.log(user)
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const session = Client.session.save() as unknown as string
      localStorage.setItem('dc-chat-session', session) // Save session to local storage
      setSection(Sections.Done)
    } catch (ex: any) {
      console.error(ex)
      toast.error(`Error during sign in: ${ex.toString()}`)
    }
  }

  async function signInWithCode (): Promise<void> {
    if (requirePassword && !password) {
      setSection(Sections.VerifyPassword)
    }
    try {
      const result = await Client.invoke(new Api.auth.SignIn({ phoneNumber, phoneCodeHash: sendCodeResponse.phoneCodeHash, phoneCode }))
      if (result instanceof Api.auth.AuthorizationSignUpRequired) {
        toast.error('You have not signed up at Telegram')
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const session = Client.session.save() as unknown as string
      localStorage.setItem('dc-chat-session', session) // Save session to local storage
      setSection(Sections.Done)
    } catch (ex: any) {
      if (ex.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        setRequirePassword(true)
        setSection(Sections.VerifyPassword)
      } else {
        console.error(ex)
        toast.error(`Error during sign in: ${ex.toString()}`)
      }
    }
  }

  async function startChat (): Promise<void> {
    await Client.sendMessage('me', { message: "You're successfully logged in!" })
  }

  function inputChangeHandler ({ target: { name, value } }): void {
    setAuthInfo((authInfo) => ({ ...authInfo, [name]: value }))
  }

  return (<LoginContainer>
    <Desc style={{ marginBottom: 36 }}>
      <SmallTextGrey >Using your Telegram account</SmallTextGrey>
    </Desc>
    {section === Sections.LoginByQrCode && <Desc>

    </Desc>}
    {section === Sections.LoginByPhone && <Desc>
      <Row>
        <WideLabel>Phone</WideLabel>
        <InputBox $width={'100%'} name={'phoneNumber'} value={phoneNumber} placeholder={'+16501234...'} onChange={inputChangeHandler}/>
      </Row>
      <Button onClick={sendCodeHandler}>Login</Button>
    </Desc>}
    {section === Sections.VerifyCode && <Desc>
      <Row>
        <SmallTextGrey>Your login code was just sent to {sendCodeResponse.isCodeViaApp ? 'Telegram app' : 'phone via SMS'}</SmallTextGrey>
        <WideLabel>Login Code</WideLabel>
        <InputBox $width={'100%'} name='phoneCode' value={phoneCode} onChange={inputChangeHandler}/>
      </Row>
      <Button onClick={signInWithCode}>Verify Code</Button>
      </Desc>}
    {section === Sections.VerifyPassword && <Desc>
      <SmallTextGrey>You have 2FA enabled. Please provide your 2FA password</SmallTextGrey>
      <Row>
        <WideLabel>Password</WideLabel>
        <InputBox name="password" type={'password'} $width={'100%'} value={password} onChange={inputChangeHandler}/>
      </Row>
      <Button onClick={verifyPassword}>Verify Password</Button>
    </Desc>}
    {section === Sections.Done && <Desc>
      <Button onClick={startChat}>Start Chat</Button>
    </Desc>}
  </LoginContainer>
  )
}

export default Login
