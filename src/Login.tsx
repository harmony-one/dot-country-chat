import React, { useContext, useEffect, useState } from 'react'

import { TelegramClient, Api, password as Password } from 'telegram'
import { StringSession } from 'telegram/sessions'
import config from '../config'
import { getStoredSessionString, useWindowDimensions } from './util'
import { Button } from './components/Controls'
import { Desc } from './components/Text'
import { InputBox, SmallTextGrey, WideLabel } from './Common'
import { Col, Row } from './components/Layout'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import qrcode from 'qrcode'
import { Loading } from './components/Misc'
import { TelegramContext } from './Context'
const LoginContainer = styled.div`
  max-width: 480px;
`

const Session = new StringSession(getStoredSessionString())
const Client = new TelegramClient(Session, config.tg.apiId, config.tg.apiHash, { connectionRetries: 5 })
const initialState = { phoneNumber: '', password: '', phoneCode: '' }

export const LoginState = {
  LoginByQrCode: 1,
  LoginByPhone: 11,
  VerifyCode: 12,
  VerifyPassword: 13,
  Done: 100
}
const Login: React.FC = () => {
  const { setUser, setSession, setLoginState, setClient } = useContext(TelegramContext)
  const { isMobile } = useWindowDimensions()
  const [{ phoneNumber, password, phoneCode }, setAuthInfo] = useState(initialState)
  const [currentLoginState, setCurrentLoginState] = useState(LoginState.LoginByQrCode)
  const [requirePassword, setRequirePassword] = useState(false)
  const [sendCodeResponse, setSendCodeResponse] = useState<{
    phoneCodeHash?: string
    isCodeViaApp?: boolean
  }>({})
  const [loginToken, setLoginToken] = useState<{ token?: Buffer, expires?: number }>({})
  const [qrCodeData, setQrCodeData] = useState<string>('')
  const [qrScanAccepted, setQrScanAccepted] = useState(false)
  const [qrCodeExpired, setQrCodeExpired] = useState(false)

  useEffect(() => {
    async function f (): Promise<number> {
      const result = await Client.invoke(
        new Api.auth.ExportLoginToken({
          apiId: config.tg.apiId,
          apiHash: config.tg.apiHash,
          exceptIds: []
        })
      )
      // console.log(result)
      if (!(result instanceof Api.auth.LoginToken)) {
        toast.error('Cannot retrieve login QR code')
      }
      const { token, expires } = result as { token?: Buffer, expires?: number }
      console.log(expires)
      if (!token || !expires) {
        toast.error('Invalid QR code response from Telegram')
        return
      }
      setLoginToken({ token, expires })
      return expires
    }
    let h
    Client.connect().then(async () => {
      setClient(Client)
      const expires = await f()
      setTimeout(() => { setQrCodeExpired(true) }, expires - Date.now())
    }).catch(console.error)

    return () => { clearInterval(h) }
  }, [setClient, currentLoginState])

  useEffect(() => {
    async function f (): Promise<void> {
      if (!loginToken.token) {
        return
      }
      const encodedToken = loginToken.token.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const uri = `tg://login?token=${encodedToken}`

      const dataUrl = await qrcode.toDataURL(uri, { errorCorrectionLevel: 'low', width: isMobile ? 192 : 256 })
      // console.log('dataUrl', dataUrl)
      setQrCodeData(dataUrl)
    }
    f().catch(console.error)

    Client.addEventHandler((update: Api.TypeUpdate) => {
      if (update instanceof Api.UpdateLoginToken) {
        setQrScanAccepted(true)
      }
    })
  }, [loginToken, isMobile])

  useEffect(() => {
    async function f (): Promise<void> {
      if (!qrScanAccepted) {
        return
      }
      try {
        const r = await Client.invoke(
          new Api.auth.ExportLoginToken({
            apiId: config.tg.apiId,
            apiHash: config.tg.apiHash,
            exceptIds: []
          })
        )
        if (
          r instanceof Api.auth.LoginTokenSuccess &&
            r.authorization instanceof Api.auth.Authorization
        ) {
          toast.success('Login Successful')
          setUser(r.authorization.user)
        } else if (r instanceof Api.auth.LoginTokenMigrateTo) {
          await Client._switchDC(r.dcId)
          const mr = await Client.invoke(
            new Api.auth.ImportLoginToken({ token: r.token })
          )
          if (
            mr instanceof Api.auth.LoginTokenSuccess &&
              mr.authorization instanceof Api.auth.Authorization
          ) {
            toast.success('Login Successful')
            setUser(mr.authorization.user)
          } else {
            console.log(mr)
            toast.error('Unexpected error during login. Please refresh and try again')
          }
        } else {
          console.log(r)
          toast.error('Login with QR code failed')
        }
      } catch (ex: any) {
        if (ex.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          setRequirePassword(true)
          setCurrentLoginState(LoginState.VerifyPassword)
          setLoginState(LoginState.VerifyPassword)
        } else {
          console.error(ex)
          toast.error(`Error during QR Code sign in: ${ex.toString()}`)
        }
      }
    }
    f().catch(console.error)
  }, [setLoginState, setUser, qrScanAccepted])

  async function sendCodeHandler (): Promise<void> {
    setSendCodeResponse(await Client.sendCode(
      {
        apiId: config.tg.apiId,
        apiHash: config.tg.apiHash
      },
      phoneNumber
    ))
    setCurrentLoginState(LoginState.VerifyCode)
    setLoginState(LoginState.VerifyCode)
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
      setUser(user)
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const session = Client.session.save() as unknown as string
      localStorage.setItem('dc-chat-session', session) // Save session to local storage
      setSession(session)
      setCurrentLoginState(LoginState.Done)
      setLoginState(LoginState.Done)
    } catch (ex: any) {
      console.error(ex)
      toast.error(`Error during sign in: ${ex.toString()}`)
    }
  }

  async function signInWithCode (): Promise<void> {
    if (requirePassword && !password) {
      setCurrentLoginState(LoginState.VerifyPassword)
      setLoginState(LoginState.VerifyPassword)
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
      setCurrentLoginState(LoginState.Done)
      setLoginState(LoginState.Done)
    } catch (ex: any) {
      if (ex.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        setRequirePassword(true)
        setCurrentLoginState(LoginState.VerifyPassword)
        setLoginState(LoginState.VerifyPassword)
      } else {
        console.error(ex)
        toast.error(`Error during sign in: ${ex.toString()}`)
      }
    }
  }

  function inputChangeHandler ({ target: { name, value } }): void {
    setAuthInfo((authInfo) => ({ ...authInfo, [name]: value }))
  }

  if (currentLoginState === LoginState.Done) {
    return <></>
  }

  return (<LoginContainer>
    <Desc style={{ marginBottom: 36 }}>
      <SmallTextGrey >Using your Telegram account</SmallTextGrey>
    </Desc>
    {currentLoginState === LoginState.LoginByQrCode && <Desc>
      {!qrCodeData && <Col style={{ width: isMobile ? 192 : 256, justifyContent: 'center' }}>
        <Row style={{ height: isMobile ? 192 : 256, justifyContent: 'center' }}>
          <Loading size={48}/>
        </Row>
      </Col>}
      {qrCodeData && <img
          alt={'QR Code'}
          src={qrCodeData}
          style={ { border: '1px solid lightgrey', borderRadius: 8, boxShadow: '0px 0px 10px lightgrey', width: isMobile ? 192 : 256 }}
      />}
      <SmallTextGrey>Login by scanning the QR Code on Telegram</SmallTextGrey>
    </Desc>}
    {currentLoginState === LoginState.LoginByPhone && <Desc>
      <Row>
        <WideLabel>Phone</WideLabel>
        <InputBox $width={'100%'} name={'phoneNumber'} value={phoneNumber} placeholder={'+16501234...'} onChange={inputChangeHandler}/>
      </Row>
      <Button onClick={sendCodeHandler}>Login</Button>
    </Desc>}
    {currentLoginState === LoginState.VerifyCode && <Desc>
      <Row>
        <SmallTextGrey>Your login code was just sent to {sendCodeResponse.isCodeViaApp ? 'Telegram app' : 'phone via SMS'}</SmallTextGrey>
        <WideLabel>Login Code</WideLabel>
        <InputBox $width={'100%'} name='phoneCode' value={phoneCode} onChange={inputChangeHandler}/>
      </Row>
      <Button onClick={signInWithCode}>Verify Code</Button>
      </Desc>}
    {currentLoginState === LoginState.VerifyPassword && <Desc>
      <SmallTextGrey>You have 2FA enabled. Please provide your 2FA password</SmallTextGrey>
      <Row>
        <WideLabel>Password</WideLabel>
        <InputBox name="password" type={'password'} $width={'100%'} value={password} onChange={inputChangeHandler}/>
      </Row>
      <Button onClick={verifyPassword}>Verify Password</Button>
    </Desc>}
  </LoginContainer>
  )
}

export default Login
